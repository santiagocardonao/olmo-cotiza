import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProposalFrame } from "../components/ProposalFrame.jsx";
import { formatDate, getQuote, proposalTitle } from "../lib/quotes.js";

// What the client sees: the proposal and a button to save it.
export function PublicQuote() {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);
  const frame = useRef(null);

  useEffect(() => { getQuote(slug).then(setData).catch(() => setData(null)); }, [slug]);

  const title = data ? proposalTitle(data) : null;
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);

  if (data === undefined) {
    return <div className="public-empty" aria-busy="true"><div className="skeleton skeleton--sheet" /></div>;
  }
  if (data === null) {
    return (
      <div className="public-empty">
        <div className="notice">
          <span className="wordmark">olmo</span>
          <p>Esta propuesta no está disponible. Si te la enviaron, pide un enlace nuevo a quien te la compartió.</p>
          <p className="muted small">This proposal is not available. Ask the sender for a new link.</p>
        </div>
      </div>
    );
  }

  const en = data.quote.language === "en";
  const expired = data.quote.status === "expired";

  return (
    <div className="public">
      <header className="public__bar">
        <span className="wordmark">olmo</span>
        <button className="btn btn--primary btn--sm" onClick={() => frame.current?.print()}>
          {en ? "Download PDF" : "Descargar PDF"}
        </button>
      </header>
      {expired && (
        <p className="public__notice" role="status">
          {en
            ? `This proposal expired on ${formatDate(data.quote.expires_on, "en")}. Prices may have changed; ask for an updated version.`
            : `Esta propuesta venció el ${formatDate(data.quote.expires_on)}. Los precios pueden haber cambiado: pide una versión actualizada.`}
        </p>
      )}
      <ProposalFrame ref={frame} data={data} title={title} />
    </div>
  );
}
