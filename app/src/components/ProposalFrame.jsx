import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { renderProposal } from "../../../templates/proposal.js";

// La propuesta se renderiza en un iframe: sus estilos (A4, @page) quedan
// aislados de la app y "Descargar PDF" imprime solo la propuesta.
export const ProposalFrame = forwardRef(function ProposalFrame({ data, title }, ref) {
  const frame = useRef(null);

  useImperativeHandle(ref, () => ({
    print() {
      frame.current?.contentWindow?.focus();
      frame.current?.contentWindow?.print();
    },
  }));

  const html = useMemo(() => `<!doctype html>
<html lang="${data.quote.language ?? "es"}"><head><meta charset="utf-8">
<title>${(title ?? "Propuesta").replace(/</g, "")}</title>
<link rel="stylesheet" href="${location.origin}/proposal/proposal.css">
<style>@media screen { body { padding: 32px 0; } }</style>
</head><body>${renderProposal(data)}
<script>
  // En pantalla, la hoja A4 se escala al ancho disponible; al imprimir vuelve a 1:1.
  const A4 = 794 + 48;
  const fit = () => { document.body.style.zoom = Math.min(1, innerWidth / A4); };
  addEventListener("resize", fit);
  addEventListener("beforeprint", () => { document.body.style.zoom = 1; });
  addEventListener("afterprint", fit);
  fit();
</script></body></html>`, [data, title]);

  return <iframe ref={frame} className="proposal-frame" title="Propuesta" srcDoc={html} />;
});
