import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export function Home({ session, isMember }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  if (session && isMember) return <Navigate to="/app" replace />;

  async function login(e) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/app` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="home">
      <div className="home__hero">
        <span className="wordmark wordmark--lg">olmo</span>
        <h1 className="display">Cotizaciones que se <em>escriben solas</em>,<br />y datos que se quedan.</h1>
        <p className="lead">Escribe el alcance y los precios en texto libre. Olmo Cotiza lo ordena, le pone el diseño de Olmo y guarda el historial: cuánto cotizaste, a quién, qué se abrió y qué se cerró.</p>
        <div className="home__actions">
          <Link to="/demo" className="btn btn--primary">Ver la demo</Link>
        </div>
      </div>

      <div className="card home__login">
        <span className="label">Acceso del equipo</span>
        {session && !isMember ? (
          <p className="muted">Tu cuenta no pertenece a Olmo. Puedes explorar la <Link to="/demo">demo</Link>. <button className="linklike" onClick={() => supabase.auth.signOut()}>Salir</button></p>
        ) : sent ? (
          <p>Te enviamos un enlace a <strong>{email}</strong>. Ábrelo en este navegador.</p>
        ) : (
          <form onSubmit={login} className="inline-form">
            <input type="email" required placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn--primary">Entrar</button>
          </form>
        )}
        {error && <p className="error small">{error}</p>}
      </div>
    </div>
  );
}
