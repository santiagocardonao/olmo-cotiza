import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusPill } from "../components/Layout.jsx";
import { formatDate, formatMoney, listQuotes, metrics } from "../lib/quotes.js";

export function Dashboard({ mode }) {
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const base = mode === "demo" ? "/demo" : "/app";

  useEffect(() => {
    setError(null);
    listQuotes(mode).then(setQuotes).catch(() => setError(true));
  }, [mode, attempt]);

  if (error) {
    return (
      <div className="card empty" role="alert">
        <h3>No se pudieron cargar las cotizaciones.</h3>
        <p className="muted">Revisa tu conexión e intenta de nuevo.</p>
        <button className="btn btn--ghost" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
      </div>
    );
  }
  if (!quotes) return <DashboardSkeleton />;

  const m = metrics(quotes);

  return (
    <>
      <div className="page-head">
        <span className="pill">{mode === "demo" ? "Demo" : "Olmo"}</span>
        <h1 className="h1">Tus cotizaciones, <em>en datos.</em></h1>
      </div>

      <section className="stats">
        <Stat label="Tasa de cierre" value={m.closeRate == null ? "—" : `${Math.round(m.closeRate * 100)}%`} hint="Aceptadas sobre decididas" />
        <Stat label="Ticket promedio" value={m.avgTicket == null ? "—" : formatMoney(m.avgTicket, "COP")} hint="Aceptadas, pago único en COP" />
        <Stat label="En juego" value={formatMoney(m.openPipeline, "COP")} hint="Enviadas sin respuesta" />
        <Stat label="Sin abrir" value={m.unopened} hint="Enviadas que el cliente no ha visto" />
      </section>

      {m.expiringSoon.length > 0 && (
        <div className="callout">
          <strong>Por vencer en 5 días:</strong>{" "}
          {m.expiringSoon.map((q, i) => (
            <span key={q.id}>{i > 0 && ", "}<Link to={`${base}/c/${q.public_slug}`}>{q.clients?.name}</Link> ({formatDate(q.expires_on)})</span>
          ))}
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="card empty">
          <h3>Todavía no hay cotizaciones.</h3>
          <p className="muted">Escribe el alcance y los precios en texto libre y Olmo Cotiza arma la propuesta.</p>
          <Link to={`${base}/nueva`} className="btn btn--primary">Crear la primera</Link>
        </div>
      ) : (
        <div className="card table-card">
          <table className="table">
            <caption className="sr-only">Cotizaciones</caption>
            <thead>
              <tr><th>Cliente</th><th>Propuesta</th><th className="num">Valor</th><th>Estado</th><th>Vence</th><th className="num">Vistas</th></tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link to={`${base}/c/${q.public_slug}`} className="strong">{q.clients?.name}</Link><div className="muted small">{q.prepared_for}</div></td>
                  <td>{q.title}</td>
                  <td className="num">{q.value ? <>{formatMoney(q.value.amount, q.value.currency)}{q.value.recurring && <span className="muted small"> /mes</span>}</> : "—"}</td>
                  <td><StatusPill status={q.status} /></td>
                  <td>{formatDate(q.expires_on)}</td>
                  <td className="num">{q.views || <span className="muted">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando cotizaciones">
      <div className="page-head"><div className="skeleton skeleton--line skeleton--short" /><div className="skeleton skeleton--title" /></div>
      <section className="stats">{[0, 1, 2, 3].map((i) => <div key={i} className="card stat"><div className="skeleton skeleton--block" /></div>)}</section>
      <div className="card table-card">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton--row" />)}</div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="stat__value">{value}</div>
      <div className="muted small">{hint}</div>
    </div>
  );
}
