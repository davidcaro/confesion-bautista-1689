import { listNotes, notesStore, type StudyNote } from "@/lib/notes-store";
import { getModerator } from "@/lib/moderator";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!await getModerator()) return Response.json({ error: "No autorizado." }, { status: 403, headers });
  const notes = (await listNotes()).filter(note => note.status === "pending").slice(0, 100);
  return Response.json({ notes }, { headers });
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origen de solicitud inválido." }, { status: 403 });
  const user = await getModerator();
  if (!user) return Response.json({ error: "No autorizado." }, { status: 403, headers });
  const payload = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!payload || typeof payload.id !== "string" || !/^[0-9a-f-]{36}$/.test(payload.id) || !["approved", "rejected"].includes(payload.status ?? "")) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  const store = notesStore();
  const note = await store.get(`notes/${payload.id}`, { type: "json" }) as StudyNote | null;
  if (!note) return Response.json({ error: "Nota no encontrada." }, { status: 404 });
  await store.setJSON(`notes/${payload.id}`, { ...note, status: payload.status, moderatedAt: new Date().toISOString(), moderatorEmail: user.email });
  return Response.json({ ok: true }, { headers });
}
