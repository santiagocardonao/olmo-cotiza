// Reads quotes and computes their figures for the dashboard.
import { supabase, ORG_ID } from "./supabase.js";

export const STATUS = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
};

export async function listQuotes(org) {
  const { data, error } = await supabase
    .from("quotes")
    .select(`id, public_slug, title, title_accent, prepared_for, status, issued_on, expires_on, valid_days, created_at,
      clients(name),
      quote_options(position, is_recommended, quote_lines(pricing_model, currency, unit_price, quantity, is_optional)),
      quote_events(type, occurred_at)`)
    .eq("org_id", ORG_ID[org])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((q) => ({
    ...q,
    value: quoteValue(q),
    views: q.quote_events.filter((e) => e.type === "viewed").length,
    lastView: q.quote_events.filter((e) => e.type === "viewed").map((e) => e.occurred_at).sort().at(-1) ?? null,
  }));
}

// Reference value: the one-off total of the recommended option (or the first one);
// if it has no one-off total, its monthly fee.
export function quoteValue(q) {
  const opts = [...(q.quote_options ?? [])].sort((a, b) => a.position - b.position);
  const o = opts.find((x) => x.is_recommended) ?? opts[0];
  if (!o) return null;
  const one = {}, monthly = {};
  for (const l of o.quote_lines ?? []) {
    if (l.is_optional) continue;
    const a = l.pricing_model === "fixed" ? Number(l.unit_price)
      : (l.pricing_model === "hourly" || l.pricing_model === "per_unit") && l.quantity ? Number(l.unit_price) * Number(l.quantity) : 0;
    if (a) one[l.currency] = (one[l.currency] ?? 0) + a;
    if (l.pricing_model === "monthly") monthly[l.currency] = (monthly[l.currency] ?? 0) + Number(l.unit_price);
  }
  const [c1, a1] = Object.entries(one)[0] ?? [];
  if (c1) return { amount: a1, currency: c1, recurring: false };
  const [c2, a2] = Object.entries(monthly)[0] ?? [];
  if (c2) return { amount: a2, currency: c2, recurring: true };
  return null;
}

export function metrics(quotes) {
  const decided = quotes.filter((q) => ["accepted", "rejected", "expired"].includes(q.status));
  const accepted = quotes.filter((q) => q.status === "accepted");
  const acceptedCop = accepted.filter((q) => q.value?.currency === "COP" && !q.value.recurring);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  const pipeline = quotes.filter((q) => q.status === "sent" && q.value?.currency === "COP" && !q.value.recurring);
  return {
    total: quotes.length,
    closeRate: decided.length ? accepted.length / decided.length : null,
    avgTicket: acceptedCop.length ? acceptedCop.reduce((s, q) => s + q.value.amount, 0) / acceptedCop.length : null,
    expiringSoon: quotes.filter((q) => q.status === "sent" && q.expires_on >= today && q.expires_on <= soon),
    openPipeline: pipeline.reduce((s, q) => s + q.value.amount, 0),
    unopened: quotes.filter((q) => q.status === "sent" && q.views === 0).length,
  };
}

export async function getQuote(slug) {
  const { data, error } = await supabase.rpc("get_public_quote", { slug });
  if (error) throw error;
  return data;
}

export async function setStatus(quoteId, status) {
  const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
  if (error) throw error;
  if (["sent", "accepted", "rejected"].includes(status)) {
    await supabase.from("quote_events").insert({ quote_id: quoteId, type: status });
  }
}

export async function generateQuote(input) {
  const { data, error } = await supabase.functions.invoke("generate-quote", { body: input });
  if (error) {
    // functions-js wraps the response; recover the server's message
    let message = "No se pudo generar la cotización.";
    let details;
    try {
      const body = await error.context.json();
      message = body.error ?? message;
      details = body.details;
    } catch { /* response without a JSON body */ }
    const err = new Error(message);
    err.details = details;
    throw err;
  }
  return data;
}

export function formatMoney(amount, currency) {
  if (amount == null) return "—";
  if (currency === "COP") return `$${Math.round(amount).toLocaleString("es-CO")}`;
  return `${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
