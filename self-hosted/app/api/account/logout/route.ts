import { env } from "cloudflare:workers";
import { getAuth } from "../../../../lib/auth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { message: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  if (!env.DB)
    return Response.json(
      { message: "저장소 연결을 확인해 주세요." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const auth = getAuth(),
    session = await auth.api.getSession({ headers: request.headers });
  // Also clear stale cookies when only the platform identity remains.
  // Sign-out is idempotent, but a live account must still match the caller.
  if (session && request.headers.get("X-ToDo-Account") !== "account:" + session.user.id)
    return Response.json(
      { message: "로그인 계정이 변경됐습니다. 화면을 새로고침해 주세요." },
      { status: 409 },
    );
  // A pending link must not complete after this account signs out.
  if (session)
    await env.DB.prepare(
      "DELETE FROM auth_verification WHERE CASE WHEN json_valid(value) THEN json_extract(value,'$.link.userId') END=?",
    ).bind(session.user.id).run();
  const result = await auth.handler(
    new Request(new URL("/api/auth/sign-out", request.url), {
      method: "POST",
      headers: request.headers,
      body: "{}",
    }),
  );
  const response = new Response(result.body, result);
  response.headers.set("Cache-Control", "no-store");
  for (const prefix of ["better-auth.", "__Secure-better-auth."])
    for (const name of ["state", "oauth_state"])
      response.headers.append(
        "Set-Cookie",
        prefix + name + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" +
          (prefix.startsWith("__Secure-") ? "; Secure" : ""),
      );
  return response;
}
