import { env } from "cloudflare:workers";
import { getAuth } from "../../../../lib/auth";
import { verifyPassword } from "better-auth/crypto";
import { accountCleanupStatements } from "../../../../lib/account-cleanup.mjs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ message: "허용되지 않은 요청입니다." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return reply({ message: "잘못된 요청입니다." }, 415);
  const db = env.DB;
  if (!db) return reply({ message: "저장소 연결을 확인해 주세요." }, 503);
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return reply({ message: "다시 로그인해 주세요." }, 401);
  if (request.headers.get("X-ToDo-Account") !== "account:" + session.user.id)
    return reply(
      { message: "로그인 계정이 변경됐습니다. 계정 화면을 다시 열어 주세요." },
      409,
    );
  const text = await request.text();
  if (text.length > 2000) return reply({ message: "잘못된 요청입니다." }, 400);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return reply({ message: "잘못된 요청입니다." }, 400);
  }
  if (!body || typeof body !== "object" || body.confirmation !== "회원탈퇴")
    return reply({ message: "회원탈퇴를 정확히 입력해 주세요." }, 400);
  const id = session.user.id,
    now = Date.now(),
    rateKey = "delete:" + id;
  const limit = await db.prepare(
    "INSERT INTO auth_rate_limit (id,key,count,last_request) VALUES (?,?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN last_request < ? THEN 1 ELSE count+1 END,last_request=? RETURNING count",
  )
    .bind(rateKey, rateKey, now, now - 600000, now)
    .first<{ count: number }>();
  if (!limit || limit.count > 5)
    return reply(
      { message: "시도가 많습니다. 10분 후 다시 시도해 주세요." },
      429,
    );
  const credential = await db.prepare(
    "SELECT password FROM auth_account WHERE user_id=? AND provider_id='credential'",
  )
    .bind(id)
    .first<{ password: string }>();
  if (credential) {
    if (
      typeof body.password !== "string" ||
      body.password.length > 64 ||
      !(await verifyPassword({
        hash: credential.password,
        password: body.password,
      }))
    )
      return reply({ message: "비밀번호를 확인해 주세요." }, 400);
  } else if (
    Date.now() - new Date(session.session.createdAt).getTime() >
    300000
  )
    return reply(
      {
        message: "로그아웃 후 Google로 다시 로그인하고 5분 안에 탈퇴해 주세요.",
      },
      403,
    );
  // All account-owned records are removed in one atomic D1 transaction.
  await db.batch(
    accountCleanupStatements(id, session.user.email).map(({ sql, args }) =>
      db.prepare(sql).bind(...args),
    ),
  );
  const response = reply({ success: true });
  for (const cookie of [
    "session_token",
    "session_data",
    "account_data",
    "state",
    "oauth_state",
  ]) {
    for (const prefix of ["better-auth.", "__Secure-better-auth."]) {
      const name = prefix + cookie;
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${prefix.startsWith("__Secure-") ? "; Secure" : ""}`,
      );
    }
  }
  return response;
}
