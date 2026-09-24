// ============================================================
// Cómo se lee y se suma cada modelo de cobro.
// Misma regla que la vista quote_option_totals en Postgres:
// fixed + hourly (tarifa × horas) + per_unit con cantidad = pago único;
// monthly aparte; pass_through aparte; percentage no se suma.
// ============================================================

import { money, t } from "./i18n.js";

export function linePrice(lang, line) {
  const base = line.unit_price_max != null
    ? `${money(line.unit_price, line.currency).replace(` ${line.currency}`, "")} – ${money(line.unit_price_max, line.currency)}`
    : money(line.unit_price, line.currency);
  const p = line.alt_currency ? `${base} ${t(lang, "or")} ${money(line.alt_unit_price, line.alt_currency)}` : base;
  switch (line.pricing_model) {
    case "fixed":
      return { price: p, detail: null };
    case "hourly":
      return {
        price: `${p} / ${t(lang, "perHour")}`,
        detail: line.quantity == null
          ? t(lang, "onDemand")
          : t(lang, "hoursEstimated", num(line.quantity), line.cap_quantity ? num(line.cap_quantity) : null),
      };
    case "monthly":
      return { price: `${p} / ${t(lang, "perMonth")}`, detail: line.quantity ? t(lang, "minMonths", num(line.quantity)) : null };
    case "per_unit":
      return {
        price: `${p} / ${t(lang, "perUnit")}`,
        detail: line.quantity ? t(lang, "units", num(line.quantity)) : null,
      };
    case "percentage": {
      const min = line.minimum_amount ? ` · ${t(lang, "minimum")} ${money(line.minimum_amount, line.currency)}` : "";
      return { price: `${num(line.percent)}% ${t(lang, "ofBase")} ${line.percent_base}`, detail: min ? min.slice(3) : null };
    }
    case "pass_through":
      return { price: `${p} / ${t(lang, "perMonth")}`, detail: t(lang, "paidToProvider") };
    default:
      return { price: p, detail: null };
  }
}

// Cifra principal de una opción: pago único si existe; si no, el mensual.
// Con rangos muestra mínimo – máximo; con moneda alterna, el equivalente
// solo si todas las líneas que suman lo tienen en la misma moneda.
export function optionHeadline(lang, option) {
  const lines = (option.lines ?? []).filter((l) => !l.is_optional);
  const oneTimeAmount = (l, price) =>
    l.pricing_model === "fixed" ? Number(price)
    : (l.pricing_model === "hourly" || l.pricing_model === "per_unit") && l.quantity ? Number(price) * Number(l.quantity)
    : 0;

  const summarize = (pick) => {
    const rows = lines.filter((l) => pick(l, l.unit_price));
    if (!rows.length) return null;
    const totals = {};
    for (const l of rows) {
      const t0 = totals[l.currency] ?? { min: 0, max: 0 };
      t0.min += pick(l, l.unit_price);
      t0.max += pick(l, l.unit_price_max ?? l.unit_price);
      totals[l.currency] = t0;
    }
    const amounts = Object.entries(totals).map(([c, { min, max }]) =>
      max > min ? `${money(min, c).replace(` ${c}`, "")} – ${money(max, c)}` : money(min, c));
    const altCur = rows[0].alt_currency;
    const alt = altCur && rows.every((l) => l.alt_currency === altCur) && Object.keys(totals).length === 1
      ? money(rows.reduce((s, l) => s + pick(l, l.alt_unit_price), 0), altCur) : null;
    return { amounts, alt, hasRange: amounts.some((a) => a.includes("–")) };
  };

  const one = summarize(oneTimeAmount);
  if (one) {
    const hourly = lines.some((l) => l.pricing_model === "hourly" && l.quantity != null);
    return { ...one, suffix: t(lang, hourly ? "estimatedCap" : one.hasRange ? "estimatedRange" : "oneTime") };
  }
  const mon = summarize((l, price) => (l.pricing_model === "monthly" ? Number(price) : 0));
  if (mon) return { ...mon, suffix: t(lang, "monthly") };
  return { amounts: [], alt: null, suffix: "" };
}

// Costos de terceros de todas las opciones, sin repetir.
export function passThroughCosts(options) {
  const seen = new Map();
  for (const o of options ?? []) {
    for (const l of o.lines ?? []) {
      if (l.pricing_model !== "pass_through") continue;
      const key = `${l.label}|${l.unit_price}|${l.currency}`;
      if (!seen.has(key)) seen.set(key, l);
    }
  }
  return [...seen.values()];
}

function num(n) {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "");
}
