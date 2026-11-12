// ============================================================
// Full proposal: cover, intro, scope, investment, process
// and back cover. Takes the shape returned by get_public_quote():
//   { quote, client, options: [{..., lines: [...]}], milestones }
// No dependencies: runs in the browser and in an Edge Function.
// ============================================================

import { renderCover } from "./cover.js";
import { escapeHtml as e, longDate, money, t } from "./i18n.js";
import { linePrice, optionHeadline, passThroughCosts } from "./pricing.js";

const OLMO = {
  email: "hola@olmo.agency",
  whatsapp: "+57 319 332 6821",
};

export function renderProposal(data) {
  const { quote, client, options = [], milestones = [] } = data;
  const lang = quote.language ?? "es";
  const copy = quote.copy ?? {};
  const docTitle = `${t(lang, "proposal")} ${client?.name ?? ""}`.trim();

  const inner = [
    copy.intro && introPage(lang, copy),
    copy.diagnosis && diagnosisPage(lang, copy.diagnosis),
    ...(copy.includes?.length || copy.excludes?.length ? scopePages(lang, copy) : []),
    ...(options.length ? investmentPages(lang, options, milestones, copy.examples) : []),
    copy.process?.length && processPage(lang, copy),
    copy.conditions?.length && conditionsPage(lang, copy.conditions),
  ].filter(Boolean);

  const pages = inner.map((body, i) => interior(docTitle, body, i + 2));
  return [renderCover(quote, client), ...pages, backCover(lang, quote, copy)].join("\n");
}

// ── Shared structure of inner pages ─────────────────────
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

// ── Diagnosis ──────────────────────────────────────────────
function diagnosisPage(lang, d) {
  const points = (d.points ?? []).slice(0, 4).map((p) => `
    <div class="card">
      <h3 class="card__title">${e(p.title)}</h3>
      <p class="support">${e(p.body)}</p>
    </div>`).join("");
  return `
  ${pill(t(lang, "diagnosisPill"))}
  ${heading(d.heading, d.accent)}
  <p class="lead">${e(d.body)}</p>
  ${points ? `<div class="grid grid--2">${points}</div>` : ""}`;
}

// ── Terms ──────────────────────────────────────────────
function conditionsPage(lang, conditions) {
  const cards = conditions.slice(0, 6).map((c) => `
    <div class="card">
      <h3 class="card__title">${e(c.title)}</h3>
      <p class="support">${e(c.body)}</p>
    </div>`).join("");
  return `
  ${pill(t(lang, "conditionsPill"))}
  ${heading(t(lang, "conditionsHeading"), t(lang, "conditionsAccent"))}
  <div class="grid grid--2">${cards}</div>`;
}

// ── Scope ──────────────────────────────────────────────────
// Long lists continue on another page instead of being clipped by the sheet.
const SCOPE_HEIGHT = 740;       // room for the include/exclude lists on one page
const rowsOf = (s, chars) => Math.max(1, Math.ceil(String(s ?? "").length / chars));

function scopePages(lang, copy) {
  const chunk = (items) => {
    const out = [[]];
    let used = 0;
    for (const item of items) {
      const h = 15 + 20 * rowsOf(item, 30);
      if (used + h > SCOPE_HEIGHT && out.at(-1).length) { out.push([]); used = 0; }
      out.at(-1).push(item);
      used += h;
    }
    return { out, used };
  };
  const inc = chunk(copy.includes ?? []), exc = chunk(copy.excludes ?? []);
  const count = Math.max(inc.out.length, exc.out.length);
  const lastUsed = Math.max(inc.out.length === count ? inc.used : 0, exc.out.length === count ? exc.used : 0);
  const notesHeight = 100 + (copy.notes ?? []).reduce((s, n) => s + 6 + 20 * rowsOf(n, 85), 0);
  const notesApart = copy.notes?.length && lastUsed + notesHeight > SCOPE_HEIGHT;

  const list = (items, kind) => `<ul class="checklist checklist--${kind}">${items.map((i) => `<li>${e(i)}</li>`).join("")}</ul>`;
  const notes = copy.notes?.length ? `
  <div class="card card--inset">
    <div class="label label--muted">${t(lang, "goodToKnow")}</div>
    <ul class="notes">${copy.notes.map((n) => `<li>${e(n)}</li>`).join("")}</ul>
  </div>` : "";
  const pages = Array.from({ length: count }, (_, i) => `
  ${pill(t(lang, "scopePill"))}
  ${i === 0 ? heading(t(lang, "scopeHeading"), t(lang, "scopeAccent")) : ""}
  <div class="grid grid--2">
    <div class="card">
      <div class="label label--muted">${t(lang, "includes")}</div>
      ${list(inc.out[i] ?? [], "in")}
    </div>
    <div class="card">
      <div class="label label--muted">${t(lang, "excludes")}</div>
      ${list(exc.out[i] ?? [], "out")}
    </div>
  </div>
  ${i === count - 1 && !notesApart ? notes : ""}`);
  if (notesApart) pages.push(`
  ${pill(t(lang, "scopePill"))}
  ${notes}`);
  return pages;
}

// ── Investment ────────────────────────────────────────────────
// A4 sheets have a fixed height, so the layout is decided before
// rendering, using an estimated height per card (in screen px).
const BODY_HEIGHT = 780;        // usable height of an inner page below the title
const CARD_BASE = 192;          // option card with no lines (compact: 165)
const CARD_LINE = 44;           // each line inside the card (compact: 38)
const GAP = 16;
const TWO_COL_LINES = 12;       // more lines than this: the card splits them into 2 columns
// Characters that fit on one text row of a card (Inter at the sizes in
// proposal.css), by grid columns: [option name, line label, line price / description].
const ROW_CHARS = { 1: [55, 90, 100], 2: [25, 40, 45], 3: [19, 28, 32] };
const SPLIT_CHARS = [55, 42, 46]; // one card with its lines in 2 columns

function cardHeight(lang, o, cols, compact) {
  const lines = (o.lines ?? []).filter((l) => l.pricing_model !== "pass_through");
  const split = cols === 1 && lines.length > TWO_COL_LINES;
  const [nameChars, labelChars, textChars] = split ? SPLIT_CHARS : ROW_CHARS[cols];
  const lineHeights = lines.map((l) => {
    const p = linePrice(lang, l);
    const label = l.label + (l.is_optional ? ` ${t(lang, "optional")}` : "");
    return (compact ? 38 : CARD_LINE)
      + (compact ? 15 : 16) * (rowsOf(label, labelChars) - 1)
      + (compact ? 14 : 15) * (rowsOf(p.price + (p.detail ? ` · ${p.detail}` : ""), textChars) - 1);
  });
  const sum = lineHeights.reduce((s, h) => s + h, 0);
  const head = optionHeadline(lang, o);
  return (compact ? 165 : CARD_BASE)
    + 22 * (rowsOf(o.name, nameChars) - 1)
    + head.amounts.reduce((s, a) => s + (compact ? 25 : 33) * rowsOf(a, compact ? 16 : cols === 1 ? 40 : 20), 0)
    - (head.amounts.length ? (compact ? 25 : 33) : 0)
    + (head.alt ? 20 : 0)
    + (split ? Math.ceil(sum / 2) + CARD_LINE : sum)
    + (o.description ? 12 + 15 * rowsOf(o.description, textChars) : 0);
}

function investmentPages(lang, options, milestones, examples) {
  // Card rows and their estimated height. A row taller than the page
  // switches to compact cards and, if still too tall, to fewer columns.
  const layout = (cols, compact) => {
    const out = [];
    for (let i = 0; i < options.length; i += cols) {
      const row = options.slice(i, i + cols).map((o, j) => ({ o, index: i + j }));
      out.push({ row, height: Math.max(...row.map(({ o }) => cardHeight(lang, o, cols, compact || cols === 3))) });
    }
    return out;
  };
  let cols = options.length >= 3 ? 3 : options.length === 2 ? 2 : 1;
  let rows = layout(cols, false);
  const tall = rows.some((r) => r.height > BODY_HEIGHT);
  if (tall) {
    rows = layout(cols, true);
    while (cols > 1 && rows.some((r) => r.height > BODY_HEIGHT)) rows = layout(--cols, true);
  }

  // Group rows into pages
  const pages = [];
  let current = [], used = 0;
  for (const r of rows) {
    if (current.length && used + GAP + r.height > BODY_HEIGHT) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(r);
    used += (current.length > 1 ? GAP : 0) + r.height;
  }
  pages.push(current);

  const terms = termsBlock(lang, options, milestones) + examplesBlock(lang, examples);
  const termsHeight = termsBlockHeight(options, milestones) + (examples?.rows?.length ? 120 + 34 * examples.rows.length : 0);
  const termsFit = terms && used + GAP + termsHeight <= BODY_HEIGHT;

  const out = pages.map((page, i) => `
  ${pill(t(lang, "investmentPill"))}
  ${i === 0 ? heading(t(lang, "investmentHeading"), t(lang, "investmentAccent")) : ""}
  <div class="grid grid--${cols}${cols === 3 || tall ? " options--compact" : ""}">
    ${page.flatMap((r) => r.row).map(({ o, index }) => optionCard(lang, o, index, options.length, cols)).join("")}
  </div>
  ${i === pages.length - 1 && termsFit ? terms : ""}`);

  if (terms && !termsFit) {
    out.push(`
  ${pill(t(lang, "paymentTerms"))}
  ${heading(t(lang, "investmentHeading"), t(lang, "investmentAccent"))}
  ${terms}`);
  }
  return out;
}

// Payment terms and third-party costs sit side by side: the taller card sets the height.
function termsBlockHeight(options, milestones) {
  const rowsHeight = (labels) => labels.reduce((s, label) => s + 34 + 16 * (Math.ceil(String(label ?? "").length / 18 || 1) - 1), 0);
  const third = passThroughCosts(options);
  const payment = milestones.length ? 145 + (options.length > 1 ? 30 : 0) + rowsHeight(milestones.map((m) => m.label)) : 0;
  const recurring = third.length ? 110 + rowsHeight(third.map((l) => l.label)) : 0;
  return Math.max(payment, recurring);
}

function examplesBlock(lang, examples) {
  if (!examples?.rows?.length) return "";
  return `
    <div class="card">
      <div class="label label--muted">${t(lang, "examplesTitle")}</div>
      ${examples.intro ? `<p class="support support--small examples__intro">${e(examples.intro)}</p>` : ""}
      <dl class="rows">${examples.rows.map((r) => `
        <div class="row"><dt>${e(r.label)}${r.detail ? ` <span class="muted-inline">· ${e(r.detail)}</span>` : ""}</dt><dd>${e(r.amount)}</dd></div>`).join("")}
      </dl>
    </div>`;
}

function termsBlock(lang, options, milestones) {
  const third = passThroughCosts(options);
  const ref = firstOneTimeTotal(options);

  const payment = milestones.length ? `
    <div class="card">
      <div class="label label--muted">${t(lang, "paymentTerms")}</div>
      <dl class="rows">${milestones.map((m) => `
        <div class="row"><dt>${e(m.label)}</dt><dd>${ref ? milestoneAmount(ref, m.percent) : `${Number(m.percent)}%`}</dd></div>`).join("")}
      </dl>
      ${ref && options.length > 1 ? `<p class="support support--small">${t(lang, "valuesFor")} ${e(ref.option.name)}.</p>` : ""}
      <p class="support support--small"><strong>${t(lang, "paymentMethods")}:</strong> ${t(lang, "paymentMethodsList")}</p>
    </div>` : "";

  const recurring = third.length ? `
    <div class="card">
      <div class="label label--muted">${t(lang, "recurring")}</div>
      <dl class="rows">${third.map((l) => `
        <div class="row"><dt>${e(l.label)}</dt><dd>${e(linePrice(lang, l).price)}</dd></div>`).join("")}
      </dl>
      <p class="support support--small">${t(lang, "recurringNote")}</p>
    </div>` : "";

  return payment || recurring ? `<div class="grid grid--2">${payment}${recurring}</div>` : "";
}

function optionCard(lang, option, index, total, cols) {
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
    ${head.alt ? `<div class="option__alt">${t(lang, "or")} ${e(head.alt)}</div>` : ""}
    <div class="option__suffix">${e(head.suffix)}</div>` : ""}
    <ul class="option__lines${cols === 1 && lines.length > TWO_COL_LINES ? " option__lines--2col" : ""}">${lines.map((l) => {
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
  let amount = 0, amountMax = 0, currency = null;
  for (const l of o?.lines ?? []) {
    if (l.is_optional) continue;
    const factor = l.pricing_model === "fixed" ? 1
      : (l.pricing_model === "hourly" || l.pricing_model === "per_unit") && l.quantity ? Number(l.quantity) : 0;
    const a = factor * Number(l.unit_price);
    if (!a) continue;
    if (currency && currency !== l.currency) return null; // mixed currencies: show percentages
    currency = l.currency;
    amount += a;
    amountMax += factor * Number(l.unit_price_max ?? l.unit_price);
  }
  return amount ? { amount, amountMax, currency, option: o } : null;
}

// A milestone's share of the total; with a price range, the share of each end.
function milestoneAmount(ref, percent) {
  const share = (total) => total * Number(percent) / 100;
  return ref.amountMax > ref.amount
    ? `${money(share(ref.amount), ref.currency).replace(` ${ref.currency}`, "")} – ${money(share(ref.amountMax), ref.currency)}`
    : money(share(ref.amount), ref.currency);
}

// ── Process ──────────────────────────────────────────────────
function processPage(lang, copy) {
  const list = copy.process.slice(0, 8);
  const steps = list.map((s, i) => `
    <div class="card step">
      <span class="step__n">${String(i + 1).padStart(2, "0")}</span>
      <h3 class="card__title">${e(s.title)}</h3>
      <p class="support">${e(s.body)}</p>
    </div>`).join("");
  return `
  ${pill(t(lang, "processPill"))}
  ${heading(t(lang, "processHeading"), t(lang, "processAccent"))}
  <div class="grid ${list.length > 4 ? "grid--2 steps--compact" : "grid--2"}">${steps}</div>`;
}

// ── Back cover ────────────────────────────────────────────
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
    <span>${e(t(lang, "footer"))}</span>
    <span>${t(lang, "tagline")}</span>
  </footer>
</section>`;
}
