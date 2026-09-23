// Copia CSS, tokens y fuentes de la propuesta a public/proposal/ para
// que el iframe de vista previa y la impresión los carguen por URL.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const src = new URL("../../templates/", import.meta.url);
const dest = new URL("../public/proposal/", import.meta.url);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const item of ["proposal.css", "tokens", "fonts"]) {
  cpSync(new URL(item, src), new URL(item, dest), { recursive: true });
}
console.log("Plantillas sincronizadas en public/proposal/");
