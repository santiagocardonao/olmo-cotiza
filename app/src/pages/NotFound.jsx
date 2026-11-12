import { useEffect } from "react";
import { Link } from "react-router-dom";

export function NotFound() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Página no encontrada · Olmo Cotiza";
    return () => { document.title = prev; };
  }, []);
  return (
    <main className="public-empty" id="contenido">
      <div className="notice">
        <span className="wordmark">olmo</span>
        <h1 className="h2">Esta página <em>no existe.</em></h1>
        <p className="muted">Puede que el enlace esté incompleto. Si buscabas una propuesta, revisa que el enlace llegue completo.</p>
        <div className="home__actions">
          <Link to="/" className="btn btn--primary">Ir al inicio</Link>
          <Link to="/demo" className="btn btn--ghost">Ver la demo</Link>
        </div>
      </div>
    </main>
  );
}
