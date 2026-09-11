import { getUser } from "@netlify/identity";
export async function getModerator() {
  const user = await getUser();
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return user && allowed && user.email?.toLowerCase() === allowed ? user : null;
}
