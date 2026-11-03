// Explicit account ownership checks; no substring matches or shared IP buckets.
export function accountCleanupStatements(id, email) {
  return [
    {
      sql: `DELETE FROM auth_verification WHERE identifier=? OR value=? OR value=? OR CASE WHEN json_valid(value) THEN json_extract(value,'$.link.userId') END=? OR CASE WHEN json_valid(value) THEN json_extract(value,'$.userId') END=?`,
      args: [email, id, email, id, id],
    },
    {
      sql: "DELETE FROM planner_state WHERE user_id=?",
      args: ["account:" + id],
    },
    { sql: "DELETE FROM auth_session WHERE user_id=?", args: [id] },
    { sql: "DELETE FROM auth_account WHERE user_id=?", args: [id] },
    {
      sql: "DELETE FROM auth_rate_limit WHERE key IN (?,?)",
      args: ["delete:" + id, "google-link:" + id],
    },
    { sql: "DELETE FROM auth_user WHERE id=?", args: [id] },
  ];
}
