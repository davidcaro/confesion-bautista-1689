"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { handleAuthCallback, acceptInvite, updateUser, getUser } from "@netlify/identity";

export default function IdentityCallback({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"normal" | "loading" | "invite" | "recovery" | "error">("normal");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!/^#(?:invite_token|recovery_token|confirmation_token|access_token|email_change_token)=/.test(window.location.hash)) { void getUser(); return; }
    setMode("loading");
    handleAuthCallback().then(result => {
      if (result?.type === "invite") { setToken(result.token ?? ""); setMode("invite"); }
      else if (result?.type === "recovery") setMode("recovery");
      else window.location.replace("/moderacion");
    }).catch(() => { setMessage("El enlace no es válido o ha caducado. Solicita uno nuevo."); setMode("error"); });
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setBusy(true); setMessage("");
    try {
      if (mode === "invite") await acceptInvite(token, password);
      else await updateUser({ password });
      window.location.replace("/moderacion");
    } catch { setMessage("No pudimos guardar la contraseña. Revisa el enlace e inténtalo de nuevo."); }
    finally { setBusy(false); }
  }
  if (mode === "normal") return children;
  return <main className="moderation-shell"><section className="moderation-card"><h1>{mode === "loading" ? "Validando acceso…" : "Configurar acceso"}</h1>{(mode === "invite" || mode === "recovery") && <form className="note-form" onSubmit={submit}><label>Nueva contraseña<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label><button disabled={busy} type="submit">Guardar contraseña</button></form>}<p role="status">{message}</p><a href="/moderacion">Volver al acceso</a></section></main>;
}
