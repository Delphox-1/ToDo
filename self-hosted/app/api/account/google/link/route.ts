import { env } from "cloudflare:workers";
import { getAuth } from "../../../../../lib/auth";
import { verifyPassword } from "better-auth/crypto";
export const dynamic = "force-dynamic";
const reply = (message: string, status: number) =>
  Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin)
    return reply("허용되지 않은 요청입니다.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return reply("잘못된 요청입니다.", 415);
  const db = env.DB;
  if (!db) return reply("저장소 연결을 확인해 주세요.", 503);
  const auth = getAuth(),
    session = await auth.api.getSession({ headers: request.headers });
  if (!session) return reply("다시 로그인해 주세요.", 401);
  if (request.headers.get("X-ToDo-Account") !== "account:" + session.user.id)
    return reply("로그인 계정이 변경됐습니다. 화면을 새로고침해 주세요.", 409);
  const vars = env as unknown as Record<string, string>;
  if (!vars.GOOGLE_CLIENT_ID || !vars.GOOGLE_CLIENT_SECRET)
    return reply("Google 로그인 연결 설정을 확인해 주세요.", 503);
  const raw = await request.text();
  if (raw.length > 2000) return reply("잘못된 요청입니다.", 400);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply("잘못된 요청입니다.", 400);
  }
  if (!body || typeof body.password !== "string" || body.password.length > 64)
    return reply("현재 비밀번호를 입력해 주세요.", 400);
  const id = session.user.id,
    now = Date.now(),
    key = "google-link:" + id;
  const rate = await db.prepare(
    "INSERT INTO auth_rate_limit (id,key,count,last_request) VALUES (?,?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN last_request < ? THEN 1 ELSE count+1 END,last_request=? RETURNING count",
  )
    .bind(key, key, now, now - 600000, now)
    .first<{ count: number }>();
  if (!rate || rate.count > 5)
    return reply("시도가 많습니다. 10분 후 다시 시도해 주세요.", 429);
  const credential = await db.prepare(
    "SELECT password FROM auth_account WHERE user_id=? AND provider_id='credential'",
  )
    .bind(id)
    .first<{ password: string }>();
  if (
    !credential ||
    !(await verifyPassword({
      hash: credential.password,
      password: body.password,
    }))
  )
    return reply("현재 비밀번호를 확인해 주세요.", 400);
  const linked = await db.prepare(
    "SELECT id FROM auth_account WHERE user_id=? AND provider_id='google'",
  )
    .bind(id)
    .first();
  if (linked) return reply("이미 Google 계정이 연결돼 있습니다.", 409);
  return auth.api.linkSocialAccount({
    headers: request.headers,
    body: {
      provider: "google",
      callbackURL: origin + "/account?google=linked",
      errorCallbackURL: origin + "/account?google=error",
      disableRedirect: true,
    },
    asResponse: true,
  });
}
