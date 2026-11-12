// Copies the proposal's CSS, tokens and fonts into public/proposal/ so
// the preview iframe and the print view can load them by URL. Internal
// references get ?v=<hash> (see proposal-version.mjs).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { proposalVersion } from "./proposal-version.mjs";

const src = new URL("../../templates/", import.meta.url);
const dest = new URL("../public/proposal/", import.meta.url);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const item of ["proposal.css", "tokens", "fonts"]) {
  cpSync(new URL(item, src), new URL(item, dest), { recursive: true });
}

const v = proposalVersion();
const stamp = (file, re) => {
  const u = new URL(file, dest);
  writeFileSync(u, readFileSync(u, "utf8").replace(re, (_m, path) => _m.replace(path, `${path}?v=${v}`)));
};
stamp("proposal.css", /@import "([^"?]+\.css)"/g);
stamp("tokens/fonts.css", /url\("([^"?]+)"\)/g);
console.log(`Plantillas sincronizadas en public/proposal/ (v=${v})`);
