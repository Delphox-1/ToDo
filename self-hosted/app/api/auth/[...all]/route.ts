import { env } from "cloudflare:workers";
import { getAuth } from "../../../../lib/auth";
export const dynamic = "force-dynamic";
const handle = (request: Request) =>
  env.DB
    ? getAuth().handler(request)
    : Response.json(
        { message: "저장소 연결을 확인해 주세요." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
export const GET = handle;
export const POST = (request: Request) => {
  // Linking must pass our account and password checks before calling the server API.
  let path;
  try {
    path = decodeURIComponent(new URL(request.url).pathname).replace(
      /\/+$/,
      "",
    );
  } catch {
    return Response.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }
  if (
    ["/link-social", "/unlink-account"].some((endpoint) =>
      path.endsWith(endpoint),
    )
  )
    return Response.json(
      { message: "계정 관리 화면에서 연결해 주세요." },
      { status: 403 },
    );
  return handle(request);
};
