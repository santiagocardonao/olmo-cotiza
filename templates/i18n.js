// Textos fijos de las plantillas, por idioma de la cotización.

const STRINGS = {
  es: {
    proposal: "Propuesta",
    project: "Proyecto",
    preparedFor: "Preparado para",
    tagline: "Filtramos el ruido.",
  },
  en: {
    proposal: "Proposal",
    project: "Project",
    preparedFor: "Prepared for",
    tagline: "We filter the noise.",
  },
};

export function t(lang, key) {
  return (STRINGS[lang] ?? STRINGS.es)[key];
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
