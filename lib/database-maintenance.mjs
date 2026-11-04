export async function checkAccountDatabase(db, userId, validate, now = Date.now()) {
  const row = await db.prepare("SELECT payload, revision FROM planner_state WHERE user_id = ?").bind(userId).first();
  let result = { tasks: 0, projects: 0, trash: 0, notes: 0, bytesBefore: 0, bytesAfter: 0, compacted: false, expiredSessionsRemoved: 0 };
  if (row) {
    let state;
    try { state = validate(JSON.parse(row.payload)); } catch { return { ok: false, error: "invalid_data", changed: false }; }
    const compact = JSON.stringify(state);
    result = { ...result, tasks: state.tasks.length, projects: state.projects.length, trash: state.trash.length, notes: Object.keys(state.notes).length, bytesBefore: new TextEncoder().encode(row.payload).length, bytesAfter: new TextEncoder().encode(compact).length };
    if (compact !== row.payload) {
      const update = await db.prepare("UPDATE planner_state SET payload=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=? AND payload=?").bind(compact, new Date(now).toISOString(), userId, row.revision, row.payload).run();
      if (!update.meta.changes) return { ok: false, error: "revision_conflict", changed: false };
      result.compacted = true;
    }
  }
  if (userId.startsWith("account:")) {
    const removed = await db.prepare("DELETE FROM auth_session WHERE user_id=? AND expires_at < ?").bind(userId.slice(8), now).run();
    result.expiredSessionsRemoved = removed.meta.changes;
  }
  return { ok: true, ...result };
}
