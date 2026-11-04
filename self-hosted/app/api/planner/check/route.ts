import { env } from "cloudflare:workers";
import { getPlannerUser } from "../../../../lib/planner-user";
import Core from "../../../../lib/planner-core.mjs";
import { checkAccountDatabase } from "../../../../lib/database-maintenance.mjs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "forbidden" }, 403);
  if (!env.DB) return reply({ error: "storage_unavailable" }, 503);
  const user = await getPlannerUser(request);
  if (!user || request.headers.get("X-ToDo-Account") !== user.userId) return reply({ error: "sign_in_required" }, 401);
  try {
    const result = await checkAccountDatabase(env.DB, user.userId, Core.validate);
    return reply(result, result.ok ? 200 : result.error === "revision_conflict" ? 409 : 422);
  } catch { return reply({ error: "maintenance_failed" }, 503); }
}
