// Short hash of the proposal's CSS, tokens and fonts. The files keep
// stable names under /proposal/, and SiteGround serves them with a long
// max-age, so every URL to them carries ?v=<hash> to bust the cache.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";

const src = new URL("../../templates/", import.meta.url);

function files(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const u = new URL(name, dir);
    return statSync(u).isDirectory() ? files(new URL(`${name}/`, dir)) : [u];
  });
}

export function proposalVersion() {
  const h = createHash("sha256");
  for (const item of ["proposal.css", "tokens/", "fonts/"]) {
    const u = new URL(item, src);
    for (const f of item.endsWith("/") ? files(u) : [u]) h.update(readFileSync(f));
  }
  return h.digest("hex").slice(0, 10);
}
