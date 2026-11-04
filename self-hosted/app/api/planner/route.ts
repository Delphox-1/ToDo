import { env } from "cloudflare:workers";
import { getPlannerUser } from "../../../lib/planner-user";
import Core from "../../../lib/planner-core.mjs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
export async function GET(request: Request) {
  if (!env.DB) return reply({ error: "storage_unavailable" }, 503);
  const user = await getPlannerUser(request);
  if (
    !user ||
    (request.headers.get("X-ToDo-Account") &&
      request.headers.get("X-ToDo-Account") !== user.userId)
  )
    return reply({ error: "sign_in_required" }, 401);
  // Enforce retention before returning data, and persist cleanup with revision checks.
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await env.DB.prepare(
      "SELECT payload, revision FROM planner_state WHERE user_id = ?",
    ).bind(user.userId).first<{ payload: string; revision: number }>();
    if (!row) return reply({ state: null, revision: 0 });
    const state = Core.validate(JSON.parse(row.payload));
    const payload = JSON.stringify(state);
    if (payload === row.payload) return reply({ state, revision: row.revision });
    const result = await env.DB.prepare(
      "UPDATE planner_state SET payload=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=?",
    ).bind(payload, new Date().toISOString(), user.userId, row.revision).run();
    if (result.meta.changes) return reply({ state, revision: row.revision + 1 });
  }
  return reply({ error: "storage_busy" }, 503);
}
export async function PUT(request: Request) {
  if (!env.DB) return reply({ error: "storage_unavailable" }, 503);
  const user = await getPlannerUser(request);
  if (
    !user ||
    (request.headers.get("X-ToDo-Account") &&
      request.headers.get("X-ToDo-Account") !== user.userId)
  )
    return reply({ error: "sign_in_required" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: "forbidden" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return reply({ error: "json_required" }, 415);
  const text = await request.text();
  if (text.length > 5000000) return reply({ error: "too_large" }, 413);
  let state, revision;
  try {
    const data = JSON.parse(text);
    state = Core.validate(data.state);
    revision = data.revision;
    if (!Number.isInteger(revision) || revision < 0)
      throw Error("Invalid revision");
  } catch (error) {
    console.error(
      "Planner validation failed:",
      error instanceof Error ? error.message : "invalid data",
    );
    return reply({ error: "invalid_data" }, 400);
  }
  const payload = JSON.stringify(state),
    updated = new Date().toISOString();
  const result =
    revision === 0
      ? await env.DB.prepare(
          "INSERT INTO planner_state (user_id,payload,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id) DO NOTHING",
        )
          .bind(user.userId, payload, updated)
          .run()
      : await env.DB.prepare(
          "UPDATE planner_state SET payload=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=?",
        )
          .bind(payload, updated, user.userId, revision)
          .run();
  if (!result.meta.changes) return reply({ error: "revision_conflict" }, 409);
  return reply({ revision: revision + 1, updatedAt: updated });
}
