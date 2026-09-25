import { Link, NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export function Shell({ mode, session, children }) {
  const base = mode === "demo" ? "/demo" : "/app";
  return (
    <div className="shell">
      <header className="topbar">
        <Link to={base} className="brand">
          <span className="wordmark">olmo</span>
          <span className="brand__product">Cotiza{mode === "demo" && <span className="demo-flag">Demo</span>}</span>
        </Link>
        <nav className="topbar__nav">
          <NavLink to={base} end>Cotizaciones</NavLink>
          <NavLink to={`${base}/nueva`} className="btn btn--primary btn--sm">Nueva cotización</NavLink>
          {mode === "olmo" && session && (
            <button className="btn btn--ghost btn--sm" onClick={() => supabase.auth.signOut()}>Salir</button>
          )}
        </nav>
      </header>
      {mode === "demo" && (
        <div className="demo-banner">
          Estás en la demo pública: todos los clientes y precios son ficticios. Las cotizaciones reales de Olmo están en un espacio privado que esta vista no puede ver.
        </div>
      )}
      <main className="page-body">{children}</main>
    </div>
  );
}

export function StatusPill({ status }) {
  const labels = { draft: "Borrador", sent: "Enviada", accepted: "Aceptada", rejected: "Rechazada", expired: "Vencida" };
  return <span className={`status status--${status}`}>{labels[status] ?? status}</span>;
}
