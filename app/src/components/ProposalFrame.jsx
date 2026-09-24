import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { renderProposal } from "../../../templates/proposal.js";

// The proposal renders inside an iframe: its styles (A4, @page) stay
// isolated from the app, and "Descargar PDF" prints only the proposal.
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
  // On screen the A4 sheet scales to the available width; in print it returns to 1:1.
  const A4 = 794 + 48;
  const fit = () => { document.body.style.zoom = Math.min(1, innerWidth / A4); };
  addEventListener("resize", fit);
  addEventListener("beforeprint", () => { document.body.style.zoom = 1; });
  addEventListener("afterprint", fit);
  fit();
</script></body></html>`, [data, title]);

  return <iframe ref={frame} className="proposal-frame" title="Propuesta" srcDoc={html} />;
});
