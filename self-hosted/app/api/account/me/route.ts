import { getPlannerUser } from "../../../../lib/planner-user";
import { env } from "cloudflare:workers";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const vars = env as unknown as Record<string, string>;
  const db = env.DB;
  if (!db)
    return Response.json(
      { message: "저장소 연결을 확인해 주세요." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const user = await getPlannerUser(request);
  const accounts =
    user?.source === "account"
      ? (
          await db.prepare(
            "SELECT provider_id FROM auth_account WHERE user_id=?",
          )
            .bind(user.userId.slice(8))
            .all<{ provider_id: string }>()
        ).results
      : [];
  return Response.json(
    {
      user,
      passwordRequired: accounts.some((a) => a.provider_id === "credential"),
      googleLinked: accounts.some((a) => a.provider_id === "google"),
      googleEnabled: !!(vars.GOOGLE_CLIENT_ID && vars.GOOGLE_CLIENT_SECRET),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
