// ============================================================
// Proposal cover.
// No dependencies: runs the same in the browser and in an Edge Function.
// ============================================================

import { escapeHtml, t } from "./i18n.js";

export function renderCover(quote, client) {
  const lang = quote.language ?? "es";
  const year = String(quote.issued_on ?? "").slice(0, 4);
  // Long titles drop one size step so they do not break into 4 lines.
  const longest = Math.max(quote.title?.length ?? 0, quote.title_accent?.length ?? 0);
  const sizeClass = longest > 18 ? " cover--long" : "";

  return `
<section class="page cover${sizeClass}">
  <header class="cover__top">
    <span class="wordmark">olmo</span>
    <span class="label">${t(lang, "proposal")} · ${escapeHtml(year)}</span>
  </header>

  <div class="cover__body">
    <h1 class="cover__title">
      <span class="cover__title-l1">${escapeHtml(quote.title)}</span>
      ${quote.title_accent ? `<span class="cover__title-l2">${escapeHtml(quote.title_accent)}</span>` : ""}
    </h1>
    ${quote.summary ? `<p class="cover__summary">${escapeHtml(quote.summary)}</p>` : ""}

    <div class="cover__meta">
      <div>
        <div class="label">${t(lang, "project")}</div>
        <div class="cover__meta-value">${escapeHtml(client?.name)}</div>
      </div>
      <div>
        <div class="label">${t(lang, "preparedFor")}</div>
        <div class="cover__meta-value">${escapeHtml(quote.prepared_for)}</div>
      </div>
    </div>
  </div>

  <footer class="cover__foot">
    <span>${t(lang, "tagline")}</span>
    <span>olmo.agency</span>
  </footer>
</section>`;
}
