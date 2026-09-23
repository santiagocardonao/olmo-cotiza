import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProposalFrame } from "../components/ProposalFrame.jsx";
import { getQuote } from "../lib/quotes.js";

// Lo que ve el cliente: la propuesta y un botón para guardarla.
export function PublicQuote() {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);
  const frame = useRef(null);

  useEffect(() => { getQuote(slug).then(setData).catch(() => setData(null)); }, [slug]);

  if (data === undefined) return <div className="public-empty muted">Cargando propuesta…</div>;
  if (data === null) return <div className="public-empty">Esta propuesta no está disponible.</div>;

  const title = `Propuesta Olmo · ${data.client?.name ?? ""}`;
  document.title = title;

  return (
    <div className="public">
      <header className="public__bar">
        <span className="wordmark">olmo</span>
        <button className="btn btn--primary btn--sm" onClick={() => frame.current?.print()}>
          {data.quote.language === "en" ? "Download PDF" : "Descargar PDF"}
        </button>
      </header>
      <ProposalFrame ref={frame} data={data} title={title} />
    </div>
  );
}
