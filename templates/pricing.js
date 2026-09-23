// ============================================================
// Cómo se lee y se suma cada modelo de cobro.
// Misma regla que la vista quote_option_totals en Postgres:
// fixed + hourly (tarifa × horas) + per_unit con cantidad = pago único;
// monthly aparte; pass_through aparte; percentage no se suma.
// ============================================================

import { money, t } from "./i18n.js";

export function linePrice(lang, line) {
  const p = money(line.unit_price, line.currency);
  switch (line.pricing_model) {
    case "fixed":
      return { price: p, detail: null };
    case "hourly":
      return {
        price: `${p} / ${t(lang, "perHour")}`,
        detail: t(lang, "hoursEstimated", num(line.quantity), line.cap_quantity ? num(line.cap_quantity) : null),
      };
    case "monthly":
      return { price: `${p} / ${t(lang, "perMonth")}`, detail: null };
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
export function optionHeadline(lang, option) {
  const oneTime = {};
  const monthly = {};
  for (const l of option.lines ?? []) {
    if (l.is_optional) continue;
    const amount =
      l.pricing_model === "fixed" ? Number(l.unit_price)
      : (l.pricing_model === "hourly" || l.pricing_model === "per_unit") && l.quantity ? Number(l.unit_price) * Number(l.quantity)
      : 0;
    if (amount) oneTime[l.currency] = (oneTime[l.currency] ?? 0) + amount;
    if (l.pricing_model === "monthly") monthly[l.currency] = (monthly[l.currency] ?? 0) + Number(l.unit_price);
  }
  const one = Object.entries(oneTime);
  if (one.length) {
    const hourly = (option.lines ?? []).some((l) => l.pricing_model === "hourly" && !l.is_optional);
    return { amounts: one.map(([c, a]) => money(a, c)), suffix: t(lang, hourly ? "estimatedCap" : "oneTime") };
  }
  const mon = Object.entries(monthly);
  if (mon.length) {
    return { amounts: mon.map(([c, a]) => money(a, c)), suffix: t(lang, "monthly") };
  }
  return { amounts: [], suffix: "" };
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
