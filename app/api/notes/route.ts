import { listNotes, notesStore } from "@/lib/notes-store";
import chapters from "@/app/data/confession.json";
export const dynamic = "force-dynamic";

const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

function isLocal(request: Request) {
  return ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${process.env.NOTE_HASH_SALT ?? "local-notes"}:${value}`));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {

  const url = new URL(request.url);
  const chapter = Number(url.searchParams.get("chapter"));
  const section = Number(url.searchParams.get("section"));
  if (!Number.isInteger(chapter) || !Number.isInteger(section)) return Response.json({ error: "Ubicación inválida." }, { status: 400 });

  const notes = (await listNotes()).filter(note => note.chapter === chapter && note.section === section && note.status === "approved").slice(0,30).map(({ id, authorName, content, createdAt }) => ({ id, authorName, content, createdAt }));
  return Response.json({ notes, siteKey: isLocal(request) ? TEST_SITE_KEY : (process.env.TURNSTILE_SITE_KEY ?? "") });
}

export async function POST(request: Request) {

  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origen de solicitud inválido." }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  if (clean(payload.website, 100)) return Response.json({ ok: true }, { status: 202 });
  const chapter = Number(payload.chapter), section = Number(payload.section);
  const name = clean(payload.name, 60), email = clean(payload.email, 160).toLowerCase(), content = clean(payload.content, 1500), token = clean(payload.turnstileToken, 2048);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 32 || !Number.isInteger(section) || section < 1 || section > (chapters[chapter - 1]?.paragraphs.length ?? 0) || name.length < 2 || content.length < 20 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Revisa el nombre, correo y contenido de la nota." }, { status: 400 });
  }

  if (!isLocal(request) && !process.env.NOTE_HASH_SALT) return Response.json({ error: "Las notas todavía no están configuradas." }, { status: 503 });
  const secret = isLocal(request) ? TEST_SECRET_KEY : (process.env.TURNSTILE_SECRET_KEY ?? "");
  if (!secret || !token) return Response.json({ error: "La verificación de seguridad no está disponible." }, { status: 503 });
  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, response: token, remoteip: request.headers.get("x-nf-client-connection-ip") ?? undefined }) });
  const result = await verification.json() as { success?: boolean; hostname?: string };
  if (!result.success || (!isLocal(request) && result.hostname !== new URL(request.url).hostname)) return Response.json({ error: "No pudimos validar la verificación. Inténtalo de nuevo." }, { status: 400 });

  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("X-Forwarded-For")?.split(",")[0] ?? "unknown";
  const emailHash = await digest(email), ipHash = await digest(ip);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = (await listNotes()).filter(note => note.createdAt >= since && (note.emailHash === emailHash || note.ipHash === ipHash));
  if (recent.length >= 3) return Response.json({ error: "Has alcanzado el límite temporal de notas. Inténtalo más tarde." }, { status: 429 });

  const id = crypto.randomUUID();
  await notesStore().setJSON(`notes/${id}`, { id, chapter, section, authorName: name, authorEmail: email, emailHash, ipHash, content, status: "pending", createdAt: new Date().toISOString() });
  return Response.json({ ok: true, message: "Nota enviada. Será visible después de la revisión." }, { status: 201 });
}
