import { getAuth } from "./auth";
export async function getPlannerUser(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session ? {
    userId: "account:" + session.user.id,
    name: session.user.name,
    username: session.user.username || session.user.email,
    source: "account",
  } : null;
}
