import { getModerator } from "@/lib/moderator";
import ModerationClient from "./moderation-client";
import ModeratorLogin from "./moderator-login";
export const dynamic = "force-dynamic";
export default async function ModerationPage() {
  const user = await getModerator();
  return user ? <ModerationClient moderator={user.name ?? user.email ?? "Moderador"} /> : <ModeratorLogin />;
}
