"use client";
import { useState, type FormEvent } from "react";
import { login, requestPasswordRecovery } from "@netlify/identity";

export default function ModeratorLogin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      await login(email, String(form.get("password")));
      const response = await fetch("/api/moderation", { cache: "no-store" });
      if (!response.ok) throw new Error("Esta cuenta no tiene permiso para moderar notas.");
      window.location.assign("/moderacion");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <main className="moderation-shell"><section className="moderation-card"><h1>Acceso de moderación</h1><p>Ingresa con la cuenta autorizada del sitio.</p><form className="note-form" onSubmit={submit}><label>Correo electrónico<input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Contraseña<input type="password" name="password" required autoComplete="current-password" /></label><button disabled={busy} type="submit">{busy ? "Ingresando…" : "Iniciar sesión"}</button><button type="button" disabled={busy || !email} onClick={async () => { setBusy(true); try { await requestPasswordRecovery(email); setMessage("Revisa tu correo para recuperar el acceso."); } catch { setMessage("No pudimos enviar el correo de recuperación."); } finally { setBusy(false); } }}>Recuperar contraseña</button><p role="status">{message}</p></form><a href="/">Volver a la confesión</a></section></main>;
}
