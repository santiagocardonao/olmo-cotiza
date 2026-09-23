// ============================================================
// Propuesta completa: portada, intro, alcance, inversión, proceso
// y contraportada. Recibe la forma que devuelve get_public_quote():
//   { quote, client, options: [{..., lines: [...]}], milestones }
// Sin dependencias: corre en el navegador y en una Edge Function.
// ============================================================

import { renderCover } from "./cover.js";
import { escapeHtml as e, longDate, money, t } from "./i18n.js";
import { linePrice, optionHeadline, passThroughCosts } from "./pricing.js";

const OLMO = {
  email: "hola@olmo.agency",
  whatsapp: "+57 319 332 6821",
  footer: "Olmo © 2026 · Creado por Santiago Cardona Ortiz · olmo.agency",
};

export function renderProposal(data) {
  const { quote, client, options = [], milestones = [] } = data;
  const lang = quote.language ?? "es";
  const copy = quote.copy ?? {};
  const docTitle = `${t(lang, "proposal")} ${client?.name ?? ""}`.trim();

  const inner = [
    copy.intro && introPage(lang, copy),
    (copy.includes?.length || copy.excludes?.length) && scopePage(lang, copy),
    options.length && investmentPage(lang, options, milestones),
    copy.process?.length && processPage(lang, copy),
  ].filter(Boolean);

  const pages = inner.map((body, i) => interior(docTitle, body, i + 2));
  return [renderCover(quote, client), ...pages, backCover(lang, quote, copy)].join("\n");
}

// ── Estructura común de páginas internas ─────────────────────
function interior(docTitle, body, pageNumber) {
  return `
<section class="page interior">
  <header class="interior__head">
    <span class="wordmark">olmo</span>
    <span class="label">${e(docTitle)}</span>
  </header>
  <div class="interior__body">${body}</div>
  <footer class="interior__foot">
    <span>${e(docTitle)} · Olmo</span>
    <span>${String(pageNumber).padStart(2, "0")}</span>
  </footer>
</section>`;
}

function heading(text, accent) {
  return `<h2 class="h2">${e(text)}${accent ? ` <em>${e(accent)}</em>` : ""}</h2>`;
}

const pill = (text) => `<span class="pill">${e(text)}</span>`;

// ── Intro ────────────────────────────────────────────────────
function introPage(lang, copy) {
  const cards = (copy.highlights ?? []).slice(0, 3).map((h, i) => `
    <div class="card card--feature">
      <span class="card__index">0${i + 1}</span>
      <h3 class="card__title">${e(h.title)}</h3>
      <p class="support">${e(h.body)}</p>
    </div>`).join("");
  return `
  ${pill(t(lang, "introPill"))}
  ${heading(copy.intro.heading, copy.intro.accent)}
  <p class="lead">${e(copy.intro.body)}</p>
  ${cards ? `<div class="grid grid--3 push-bottom">${cards}</div>` : ""}`;
}

// ── Alcance ──────────────────────────────────────────────────
function scopePage(lang, copy) {
  const list = (items, kind) => `<ul class="checklist checklist--${kind}">${items.map((i) => `<li>${e(i)}</li>`).join("")}</ul>`;
  return `
  ${pill(t(lang, "scopePill"))}
  ${heading(t(lang, "scopeHeading"), t(lang, "scopeAccent"))}
  <div class="grid grid--2">
    <div class="card">
      <div class="label label--muted">${t(lang, "includes")}</div>
      ${list(copy.includes ?? [], "in")}
    </div>
    <div class="card">
      <div class="label label--muted">${t(lang, "excludes")}</div>
      ${list(copy.excludes ?? [], "out")}
    </div>
  </div>
  ${copy.notes?.length ? `
  <div class="card card--inset">
    <div class="label label--muted">${t(lang, "goodToKnow")}</div>
    <ul class="notes">${copy.notes.map((n) => `<li>${e(n)}</li>`).join("")}</ul>
  </div>` : ""}`;
}

// ── Inversión ────────────────────────────────────────────────
function investmentPage(lang, options, milestones) {
  const cols = options.length > 1 ? "grid--2" : "grid--1";
  const cards = options.map((o, i) => optionCard(lang, o, i, options.length)).join("");
  const third = passThroughCosts(options);
  const ref = firstOneTimeTotal(options);

  const payment = milestones.length ? `
    <div class="card">
      <div class="label label--muted">${t(lang, "paymentTerms")}</div>
      <dl class="rows">${milestones.map((m) => `
        <div class="row"><dt>${e(m.label)}</dt><dd>${ref ? money(ref.amount * Number(m.percent) / 100, ref.currency) : `${Number(m.percent)}%`}</dd></div>`).join("")}
      </dl>
      ${ref && options.length > 1 ? `<p class="support support--small">${t(lang, "valuesFor")} ${e(ref.option.name)}.</p>` : ""}
    </div>` : "";

  const recurring = third.length ? `
    <div class="card">
      <div class="label label--muted">${t(lang, "recurring")}</div>
      <dl class="rows">${third.map((l) => `
        <div class="row"><dt>${e(l.label)}</dt><dd>${money(l.unit_price, l.currency)} / ${t(lang, "perMonth")}</dd></div>`).join("")}
      </dl>
      <p class="support support--small">${t(lang, "recurringNote")}</p>
    </div>` : "";

  return `
  ${pill(t(lang, "investmentPill"))}
  ${heading(t(lang, "investmentHeading"), t(lang, "investmentAccent"))}
  <div class="grid ${cols}">${cards}</div>
  ${payment || recurring ? `<div class="grid grid--2">${payment}${recurring}</div>` : ""}`;
}

function optionCard(lang, option, index, total) {
  const head = optionHeadline(lang, option);
  const lines = (option.lines ?? []).filter((l) => l.pricing_model !== "pass_through");
  const badge = option.is_recommended
    ? `<span class="badge badge--light">${t(lang, "recommended")}</span>`
    : total > 1 ? `<span class="badge">${t(lang, "optional")}</span>` : "";
  return `
  <div class="card option${option.is_recommended ? " option--recommended" : ""}">
    <div class="option__top">
      <span class="label">${total > 1 ? `${t(lang, "option")} ${index + 1}` : ""}</span>
      ${badge}
    </div>
    <h3 class="option__name">${e(option.name)}</h3>
    ${head.amounts.length ? `
    <div class="option__price">${head.amounts.map((a) => `<span>${e(a)}</span>`).join("")}</div>
    <div class="option__suffix">${e(head.suffix)}</div>` : ""}
    <ul class="option__lines">${lines.map((l) => {
      const p = linePrice(lang, l);
      return `<li>
        <div class="option__line-label">${e(l.label)}${l.is_optional ? ` <span class="tag">${t(lang, "optional")}</span>` : ""}</div>
        <div class="option__line-price">${e(p.price)}${p.detail ? ` · ${e(p.detail)}` : ""}</div>
      </li>`;
    }).join("")}</ul>
    ${option.description ? `<p class="option__desc">${e(option.description)}</p>` : ""}
  </div>`;
}

function firstOneTimeTotal(options) {
  const o = options.find((x) => x.is_recommended) ?? options[0];
  let amount = 0, currency = null;
  for (const l of o?.lines ?? []) {
    if (l.is_optional) continue;
    const a = l.pricing_model === "fixed" ? Number(l.unit_price)
      : (l.pricing_model === "hourly" || l.pricing_model === "per_unit") && l.quantity ? Number(l.unit_price) * Number(l.quantity) : 0;
    if (!a) continue;
    if (currency && currency !== l.currency) return null; // monedas mezcladas: se muestran porcentajes
    currency = l.currency;
    amount += a;
  }
  return amount ? { amount, currency, option: o } : null;
}

// ── Proceso ──────────────────────────────────────────────────
function processPage(lang, copy) {
  const steps = copy.process.slice(0, 4).map((s, i) => `
    <div class="card step">
      <span class="step__n">0${i + 1}</span>
      <h3 class="card__title">${e(s.title)}</h3>
      <p class="support">${e(s.body)}</p>
    </div>`).join("");
  return `
  ${pill(t(lang, "processPill"))}
  ${heading(t(lang, "processHeading"), t(lang, "processAccent"))}
  <div class="grid grid--2">${steps}</div>`;
}

// ── Contraportada ────────────────────────────────────────────
function backCover(lang, quote, copy) {
  const closing = copy.closing ?? {};
  const issued = longDate(lang, quote.issued_on);
  const expires = longDate(lang, quote.expires_on);
  const longest = Math.max(closing.heading?.length ?? 0, closing.accent?.length ?? 0);
  return `
<section class="page cover cover--back${longest > 18 ? " cover--back-long" : ""}">
  <header class="cover__top">
    <span class="wordmark">olmo</span>
  </header>
  <div class="cover__body">
    <h2 class="cover__title">
      ${closing.heading ? `<span class="cover__title-l1">${e(closing.heading)}</span>` : ""}
      ${closing.accent ? `<span class="cover__title-l2">${e(closing.accent)}</span>` : ""}
    </h2>
    ${closing.body ? `<p class="cover__summary">${e(closing.body)}</p>` : ""}
    <div class="cover__meta">
      <div><div class="label">${t(lang, "email")}</div><div class="cover__meta-value">${OLMO.email}</div></div>
      <div><div class="label">${t(lang, "whatsapp")}</div><div class="cover__meta-value">${OLMO.whatsapp}</div></div>
    </div>
    <p class="cover__validity">${e(t(lang, "validity", quote.valid_days, issued, expires))}</p>
  </div>
  <footer class="cover__foot">
    <span>${e(OLMO.footer)}</span>
    <span>${t(lang, "tagline")}</span>
  </footer>
</section>`;
}
