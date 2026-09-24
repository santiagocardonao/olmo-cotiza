// Copies the proposal's CSS, tokens and fonts into public/proposal/ so
// the preview iframe and the print view can load them by URL.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const src = new URL("../../templates/", import.meta.url);
const dest = new URL("../public/proposal/", import.meta.url);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const item of ["proposal.css", "tokens", "fonts"]) {
  cpSync(new URL(item, src), new URL(item, dest), { recursive: true });
}
console.log("Plantillas sincronizadas en public/proposal/");
