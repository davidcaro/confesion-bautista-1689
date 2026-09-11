"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@netlify/identity";

type PendingNote = { id: string; chapter: number; section: number; authorName: string; authorEmail: string; content: string; createdAt: string };

export default function ModerationClient({ moderator }: { moderator: string }) {
  const [notes, setNotes] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => fetch("/api/moderation", { cache: "no-store" }).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error ?? "No pudimos cargar las notas."); setNotes(data.notes ?? []); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const decide = async (id: string, status: "approved" | "rejected") => { setError(""); try { const response = await fetch("/api/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); if (!response.ok) throw new Error("No pudimos guardar la decisión. Revisa tu sesión e inténtalo de nuevo."); setNotes((current) => current.filter((note) => note.id !== id)); } catch (e) { setError(e instanceof Error ? e.message : "Error de conexión."); } };
  return <main className="moderation-shell"><header className="moderation-header"><div><span><ShieldCheck /> Moderación segura</span><h1>Notas pendientes</h1><p>Sesión de {moderator}</p></div><div><a href="/">Volver al sitio</a><button type="button" onClick={async () => { await logout(); window.location.assign("/moderacion"); }}>Cerrar sesión</button></div></header>{error && <p role="alert">{error}</p>}{loading ? <p className="moderation-loading"><LoaderCircle className="spin" /> Cargando notas…</p> : notes.length ? <div className="moderation-list">{notes.map((note) => <article key={note.id}><div className="moderation-meta"><strong>Cap. {note.chapter} · Párrafo {note.section}</strong><span>{new Date(note.createdAt).toLocaleString("es")}</span></div><p>{note.content}</p><div className="moderation-author"><span>{note.authorName}</span><span>{note.authorEmail}</span></div><div className="moderation-actions"><Button variant="outline" onClick={() => decide(note.id, "rejected")}><X /> Rechazar</Button><Button onClick={() => decide(note.id, "approved")}><Check /> Aprobar</Button></div></article>)}</div> : <div className="moderation-empty"><ShieldCheck /><h2>Todo al día</h2><p>No hay notas pendientes de revisión.</p></div>}</main>;
}
