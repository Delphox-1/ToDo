import * as accountMe from "./app/api/account/me/route";
import * as planner from "./app/api/planner/route";
import * as logout from "./app/api/account/logout/route";
import * as removeAccount from "./app/api/account/delete/route";
import * as googleLink from "./app/api/account/google/link/route";
import * as authEndpoint from "./app/api/auth/[...all]/route";
import { getPlannerUser } from "./lib/planner-user";
import { getAuth } from "./lib/auth";

interface Bindings { ASSETS: { fetch(request: Request): Promise<Response> }; DB: D1Database; TODO_AUTH_SECRET: string; TODO_AUTH_ORIGIN: string; }

function privateResponse(response: Response) {
  const result = new Response(response.body, response);
  result.headers.set("Cache-Control", "no-store, private");
  result.headers.set("X-Content-Type-Options", "nosniff");
  return result;
}

export default {
  async fetch(request: Request, bindings: Bindings): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        getAuth();
        await bindings.DB.prepare("SELECT user_id FROM planner_state LIMIT 0").all();
        return privateResponse(Response.json({ ready: true }));
      }
      if (url.pathname.startsWith("/api/auth/")) {
        if (request.method === "GET") return privateResponse(await authEndpoint.GET(request));
        if (request.method === "POST") return privateResponse(await authEndpoint.POST(request));
        return new Response("Method not allowed", {status: 405});
      }
      const routes: Record<string, { method: string; handle: (request: Request) => Promise<Response> }[]> = {
        "/api/account/me": [{ method: "GET", handle: accountMe.GET }],
        "/api/account/logout": [{ method: "POST", handle: logout.POST }],
        "/api/account/delete": [{ method: "POST", handle: removeAccount.POST }],
        "/api/account/google/link": [{ method: "POST", handle: googleLink.POST }],
        "/api/planner": [{ method: "GET", handle: planner.GET }, { method: "PUT", handle: planner.PUT }],
      };
      if (routes[url.pathname]) {
        const route = routes[url.pathname].find(route => route.method === request.method);
        return route ? privateResponse(await route.handle(request)) : new Response("Method not allowed", { status: 405 });
      }
      if (url.pathname.startsWith("/api/")) return privateResponse(Response.json({error: "not_found"}, {status: 404}));
      if (url.pathname === "/" || url.pathname === "/account") {
        if (!(await getPlannerUser(request))) return Response.redirect(new URL("/login", url).href, 302);
        const asset = url.pathname === "/account" ? "/auth-ui/manage.html" : "/index.html";
        return privateResponse(await bindings.ASSETS.fetch(new Request(new URL(asset, url), request)));
      }
      if (url.pathname === "/login") {
        return privateResponse(await bindings.ASSETS.fetch(new Request(new URL("/auth-ui/index.html", url), request)));
      }
      return bindings.ASSETS.fetch(request);
    } catch (error) {
      console.error("ToDo request failed:", error instanceof Error ? error.message : "unknown");
      return privateResponse(Response.json({ error: "service_unavailable", message: "서버 설정 또는 데이터베이스 연결을 확인해 주세요." }, { status: 503 }));
    }
  }
};
