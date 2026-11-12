import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export function Home({ session, isMember }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (session && isMember) return <Navigate to="/app" replace />;

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/app` },
    });
    setBusy(false);
    if (error) {
      setError(error.status === 429
        ? "Ya enviamos varios enlaces. Espera un minuto y revisa tu bandeja de entrada."
        : "No se pudo enviar el enlace. Revisa el correo e intenta de nuevo.");
    } else setSent(true);
  }

  return (
    <main className="home" id="contenido">
      <div className="home__hero">
        <span className="wordmark wordmark--lg">olmo</span>
        <h1 className="display">Cotizaciones que se <em>escriben solas</em>, y datos que se quedan.</h1>
        <p className="lead">Escribe el alcance y los precios en texto libre. Olmo Cotiza lo ordena, le pone el diseño de Olmo y guarda el historial: cuánto cotizaste, a quién, qué se abrió y qué se cerró.</p>
        <div className="home__actions">
          <Link to="/demo" className="btn btn--primary">Ver la demo</Link>
          <Link to="/demo/nueva" className="btn btn--ghost">Probar con un ejemplo</Link>
        </div>
      </div>

      <div className="card home__login">
        <span className="label">Acceso del equipo</span>
        {session && !isMember ? (
          <p className="muted">Tu cuenta no pertenece a Olmo. Puedes explorar la <Link to="/demo">demo</Link>. <button className="linklike" onClick={() => supabase.auth.signOut()}>Salir</button></p>
        ) : sent ? (
          <p role="status">Te enviamos un enlace a <strong>{email}</strong>. Ábrelo en este navegador.{" "}
            <button className="linklike" onClick={() => setSent(false)}>Usar otro correo</button></p>
        ) : (
          <form onSubmit={login} className="inline-form" aria-busy={busy}>
            <label className="sr-only" htmlFor="login-email">Correo</label>
            <input id="login-email" type="email" required autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Entrar"}</button>
          </form>
        )}
        {error && <p className="error small" role="alert">{error}</p>}
      </div>
    </main>
  );
}
