// Textos fijos de las plantillas, por idioma de la cotización.

const STRINGS = {
  es: {
    proposal: "Propuesta",
    project: "Proyecto",
    preparedFor: "Preparado para",
    tagline: "Filtramos el ruido.",
    introPill: "Introducción",
    scopePill: "Alcance",
    scopeHeading: "Qué incluye,",
    scopeAccent: "y qué no.",
    includes: "Incluye",
    excludes: "No incluye",
    goodToKnow: "Para tener en cuenta",
    investmentPill: "Inversión",
    investmentHeading: "Una inversión",
    investmentAccent: "clara.",
    option: "Opción",
    recommended: "Recomendada",
    optional: "Opcional",
    paymentTerms: "Forma de pago",
    valuesFor: "Valores calculados sobre la opción",
    recurring: "Costos mensuales de terceros",
    recurringNote: "Se pagan directo a cada proveedor, no a Olmo.",
    processPill: "Cómo trabajamos",
    processHeading: "Un proceso",
    processAccent: "simple.",
    email: "Email",
    whatsapp: "WhatsApp",
    validity: (days, issued, expires) => `Cotización válida por ${days} días · Emitida el ${issued} · Vence el ${expires}`,
    perHour: "hora",
    perMonth: "mes",
    perUnit: "unidad",
    hoursEstimated: (q, cap) => cap ? `${q} h estimadas · máximo ${cap} h` : `${q} h estimadas`,
    units: (q) => `${q} unidades`,
    ofBase: "de",
    minimum: "mínimo",
    paidToProvider: "se paga al proveedor",
    oneTime: "pago único",
    estimatedCap: "estimado según horas, con techo",
    monthly: "al mes",
    months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    longDate: (d, m, y) => `${d} de ${m} de ${y}`,
  },
  en: {
    proposal: "Proposal",
    project: "Project",
    preparedFor: "Prepared for",
    tagline: "We filter the noise.",
    introPill: "Introduction",
    scopePill: "Scope",
    scopeHeading: "What's included,",
    scopeAccent: "and what's not.",
    includes: "Included",
    excludes: "Not included",
    goodToKnow: "Good to know",
    investmentPill: "Investment",
    investmentHeading: "A clear",
    investmentAccent: "investment.",
    option: "Option",
    recommended: "Recommended",
    optional: "Optional",
    paymentTerms: "Payment terms",
    valuesFor: "Amounts based on the option",
    recurring: "Monthly third-party costs",
    recurringNote: "Paid directly to each provider, not to Olmo.",
    processPill: "How we work",
    processHeading: "A simple",
    processAccent: "process.",
    email: "Email",
    whatsapp: "WhatsApp",
    validity: (days, issued, expires) => `Quote valid for ${days} days · Issued ${issued} · Expires ${expires}`,
    perHour: "hour",
    perMonth: "month",
    perUnit: "unit",
    hoursEstimated: (q, cap) => cap ? `${q} h estimated · ${cap} h cap` : `${q} h estimated`,
    units: (q) => `${q} units`,
    ofBase: "of",
    minimum: "minimum",
    paidToProvider: "paid to the provider",
    oneTime: "one-time",
    estimatedCap: "estimate based on hours, capped",
    monthly: "per month",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    longDate: (d, m, y) => `${m} ${d}, ${y}`,
  },
};

export function t(lang, key, ...args) {
  const value = (STRINGS[lang] ?? STRINGS.es)[key];
  return typeof value === "function" ? value(...args) : value;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function longDate(lang, iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return t(lang, "longDate", d, t(lang, "months")[m - 1], y);
}

// COP y EUR sin decimales con punto de miles; USD con decimales solo si los hay.
export function money(amount, currency) {
  const n = Number(amount);
  if (currency === "COP") return `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP`;
  const opts = { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 };
  return `${n.toLocaleString("en-US", opts)} ${currency}`;
}
