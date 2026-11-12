import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProposalFrame } from "../components/ProposalFrame.jsx";
import { StatusPill } from "../components/Layout.jsx";
import { formatDate, getQuote, proposalTitle, setStatus } from "../lib/quotes.js";

export function QuoteDetail({ mode }) {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [status, setLocalStatus] = useState(null); // after a change; avoids re-rendering the proposal
  const [statusError, setStatusError] = useState(null);
  const frame = useRef(null);
  const base = mode === "demo" ? "/demo" : "/app";

  useEffect(() => {
    getQuote(slug, { countView: false }).then(setData).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <Problem base={base}>No se pudo cargar la cotización. Revisa tu conexión e intenta de nuevo.</Problem>;
  if (data === undefined) return <DetailSkeleton />;
  if (data === null) return <Problem base={base}>Esta cotización no existe o no tienes acceso a ella.</Problem>;

  const q = { ...data.quote, status: status ?? data.quote.status };
  const publicUrl = `${location.origin}/p/${q.public_slug}`;
  const title = proposalTitle(data);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia el enlace:", publicUrl);
    }
  }

  async function changeStatus(next) {
    setStatusError(null);
    try {
      await setStatus(q.id, next);
      setLocalStatus(next);
    } catch (e) {
      setStatusError(e.message);
    }
  }

  return (
    <div className="detail">
      <aside className="detail__side">
        <Link to={base} className="back-link">← Cotizaciones</Link>
        <h1 className="h2">{data.client?.name}</h1>
        <p className="muted">{q.title} {q.title_accent}</p>
        <StatusPill status={q.status} />

        <dl className="facts">
          <div><dt>Para</dt><dd>{q.prepared_for}</dd></div>
          <div><dt>Emitida</dt><dd>{formatDate(q.issued_on)}</dd></div>
          <div><dt>Vence</dt><dd>{formatDate(q.expires_on)} · {q.valid_days} días</dd></div>
          <div><dt>Idioma</dt><dd>{q.language === "en" ? "Inglés" : "Español"}</dd></div>
        </dl>

        <div className="stack">
          <button className="btn btn--primary" onClick={() => frame.current?.print()}>Descargar PDF</button>
          <button className="btn btn--ghost" onClick={copyLink} aria-live="polite">{copied ? "✓ Enlace copiado" : "Copiar enlace para el cliente"}</button>
          <a className="btn btn--ghost" href={publicUrl} target="_blank" rel="noreferrer">Abrir vista del cliente</a>
        </div>

        {mode === "olmo" && (
          <div className="stack">
            <span className="label">Cambiar estado</span>
            <div className="segmented segmented--wrap">
              {["draft", "sent", "accepted", "rejected"].map((s) => (
                <button key={s} className={q.status === s ? "on" : ""} aria-pressed={q.status === s} onClick={() => changeStatus(s)}>
                  {{ draft: "Borrador", sent: "Enviada", accepted: "Aceptada", rejected: "Rechazada" }[s]}
                </button>
              ))}
            </div>
            {statusError && <p className="error small">{statusError}</p>}
          </div>
        )}
        <p className="muted small">"Descargar PDF" abre el diálogo de impresión: elige "Guardar como PDF". El PDF sale con texto real, no imágenes.</p>
      </aside>

      <div className="detail__doc">
        <ProposalFrame ref={frame} data={data} title={title} />
      </div>
    </div>
  );
}

function Problem({ base, children }) {
  return (
    <div className="card empty">
      <h3>{children}</h3>
      <Link to={base} className="btn btn--ghost">Volver a cotizaciones</Link>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail" aria-busy="true" aria-label="Cargando cotización">
      <div className="detail__side">
        <div className="skeleton skeleton--line skeleton--short" />
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--block" />
      </div>
      <div className="skeleton skeleton--sheet" />
    </div>
  );
}
