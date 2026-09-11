"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BookOpenCheck, CheckCircle2, LoaderCircle, MessageSquareText, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type chapters from "./data/confession.json";
import studyQuestions from "./data/study-questions.json";

type Chapter = (typeof chapters)[number];
type PublicNote = { id: string; authorName: string; content: string; createdAt: string };

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

export function StudyNotesPanel({ chapter, section, onClose }: { chapter: number; section: number; onClose: () => void }) {
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [siteKey, setSiteKey] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sending" | "sent" | "error">("loading");
  const [message, setMessage] = useState("");
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/notes?chapter=${chapter}&section=${section}`).then(async (response) => {
      const data = await response.json() as { notes?: PublicNote[]; siteKey?: string; error?: string };
      if (!response.ok) throw new Error(data.error);
      setNotes(data.notes ?? []); setSiteKey(data.siteKey ?? ""); setStatus("idle");
    }).catch(() => { setStatus("error"); setMessage("No pudimos cargar las notas en este momento."); });
  }, [chapter, section]);

  useEffect(() => {
    if (!siteKey || !captchaRef.current) return;
    const timer = window.setInterval(() => {
      if (!window.turnstile || !captchaRef.current || widgetRef.current) return;
      widgetRef.current = window.turnstile.render(captchaRef.current, { sitekey: siteKey, callback: setToken, "expired-callback": () => setToken("") });
      window.clearInterval(timer);
    }, 200);
    return () => { window.clearInterval(timer); if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current); };
  }, [siteKey]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!token) { setMessage("Completa la verificación de seguridad."); return; }
    setStatus("sending"); setMessage("");
    const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapter, section, name: form.get("name"), email: form.get("email"), content: form.get("content"), website: form.get("website"), turnstileToken: token }) });
    const data = await response.json() as { message?: string; error?: string };
    if (response.ok) { setStatus("sent"); setMessage(data.message ?? "Nota enviada para revisión."); formElement.reset(); }
    else { setStatus("error"); setMessage(data.error ?? "No pudimos enviar la nota."); if (widgetRef.current) window.turnstile?.reset(widgetRef.current); setToken(""); }
  };

  return <div className="study-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="study-panel" role="dialog" aria-modal="true" aria-label={`Notas de estudio del párrafo ${section}`}>
      <div className="study-panel-header"><div><span>Capítulo {chapter} · Párrafo {section}</span><h2><MessageSquareText /> Notas de estudio</h2></div><button onClick={onClose} aria-label="Cerrar notas"><X /></button></div>
      <div className="study-panel-body">
        <section><h3>Notas aprobadas</h3>{status === "loading" ? <p className="panel-muted"><LoaderCircle className="spin" /> Cargando…</p> : notes.length ? <div className="public-notes">{notes.map((note) => <article key={note.id}><p>{note.content}</p><footer><strong>{note.authorName}</strong><span>{new Date(note.createdAt).toLocaleDateString("es")}</span></footer></article>)}</div> : <p className="panel-muted">Todavía no hay notas aprobadas para este párrafo.</p>}</section>
        <form className="note-form" onSubmit={submit}><h3>Agregar una nota</h3><p>Tu correo será privado. La nota aparecerá después de la aprobación.</p><label>Nombre<input name="name" minLength={2} maxLength={60} required /></label><label>Correo electrónico<input name="email" type="email" maxLength={160} required /></label><label>Nota de estudio<textarea name="content" minLength={20} maxLength={1500} rows={6} required /></label><input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" /><div ref={captchaRef} className="turnstile-box" />{message && <p className={`form-message ${status}`}>{status === "sent" && <CheckCircle2 />}{message}</p>}<Button type="submit" disabled={status === "sending" || status === "sent" || !siteKey}>{status === "sending" ? <LoaderCircle className="spin" /> : <Send />} Enviar para revisión</Button></form>
      </div>
    </aside>
  </div>;
}

export function ReflectionPanel({ chapter, onClose }: { chapter: Chapter; onClose: () => void }) {
  const sourceQuestions = studyQuestions.find((item) => item.chapter === chapter.number)?.questions ?? [];
  const questions = [
    ...sourceQuestions.map((text) => ({ text, source: true })),
    { text: "¿Qué textos bíblicos citados estudiarías con mayor profundidad y por qué?", source: false },
    { text: "¿Cómo podría una iglesia aplicar fielmente esta enseñanza en su vida comunitaria?", source: false },
  ];
  return <div className="study-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="study-panel reflection-panel" role="dialog" aria-modal="true" aria-label="Preguntas de estudio"><div className="study-panel-header"><div><span>Capítulo {String(chapter.number).padStart(2, "0")}</span><h2><BookOpenCheck /> Preguntas de estudio</h2></div><button onClick={onClose} aria-label="Cerrar preguntas"><X /></button></div><div className="reflection-intro"><h3>{chapter.title}</h3><p>Cinco preguntas abiertas para estudio personal o conversación en grupo. No tienen puntuación.</p></div><ol className="reflection-questions">{questions.map((question, index) => <li key={`${index}-${question.text}`}><span>{index + 1}</span><div><small>{question.source ? "Del material" : "Para profundizar"}</small><p>{question.text}</p></div></li>)}</ol><footer className="reflection-source"><strong>Fuente de las preguntas 1-3</strong><cite>G3 Ministries, <i>Baptist Foundations: A Study of the 1689 Baptist Confession</i> (2025), capítulo {chapter.number}. Traducción al español para esta edición.</cite></footer></aside></div>;
}
