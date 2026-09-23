import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProposalFrame } from "../components/ProposalFrame.jsx";
import { StatusPill } from "../components/Layout.jsx";
import { formatDate, getQuote, setStatus } from "../lib/quotes.js";

export function QuoteDetail({ mode }) {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const frame = useRef(null);
  const base = mode === "demo" ? "/demo" : "/app";

  useEffect(() => { getQuote(slug).then(setData).catch((e) => setError(e.message)); }, [slug]);

  if (error) return <p className="error">{error}</p>;
  if (data === undefined) return <p className="muted">Cargando…</p>;
  if (data === null) return <p className="error">No existe esta cotización o no tienes acceso.</p>;

  const q = data.quote;
  const publicUrl = `${location.origin}/p/${q.public_slug}`;
  const title = `Propuesta Olmo · ${data.client?.name ?? ""}`;

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function changeStatus(status) {
    try {
      await setStatus(q.id, status);
      setData({ ...data, quote: { ...q, status } });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="detail">
      <aside className="detail__side">
        <Link to={base} className="muted small">← Cotizaciones</Link>
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
          <button className="btn btn--ghost" onClick={copyLink}>{copied ? "✓ Enlace copiado" : "Copiar enlace para el cliente"}</button>
          <a className="btn btn--ghost" href={publicUrl} target="_blank" rel="noreferrer">Abrir vista del cliente</a>
        </div>

        {mode === "olmo" && (
          <div className="stack">
            <span className="label">Cambiar estado</span>
            <div className="segmented segmented--wrap">
              {["draft", "sent", "accepted", "rejected"].map((s) => (
                <button key={s} className={q.status === s ? "on" : ""} onClick={() => changeStatus(s)}>
                  {{ draft: "Borrador", sent: "Enviada", accepted: "Aceptada", rejected: "Rechazada" }[s]}
                </button>
              ))}
            </div>
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
