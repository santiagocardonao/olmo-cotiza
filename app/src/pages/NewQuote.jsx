import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EXAMPLES } from "../lib/examples.js";
import { generateQuote } from "../lib/quotes.js";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

// The demo email is remembered on this device only, as a convenience.
const EMAIL_KEY = "olmo-cotiza:demo-email";
const savedEmail = () => { try { return localStorage.getItem(EMAIL_KEY) ?? ""; } catch { return ""; } };

export function NewQuote({ mode }) {
  const navigate = useNavigate();
  const demo = mode === "demo";
  const [form, setForm] = useState({
    client_name: "", prepared_for: "", source_text: "",
    valid_days: 15, issued_on: today(), language: "es", currency: "COP",
    email: demo ? savedEmail() : "", consent: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target?.value ?? e });

  function fillExample() {
    const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
    setForm({ ...form, language: "es", ...ex });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (demo) { try { localStorage.setItem(EMAIL_KEY, form.email.trim()); } catch { /* storage blocked */ } }
    try {
      const { email, consent, ...rest } = form;
      const created = await generateQuote({
        ...rest, mode, valid_days: Number(form.valid_days),
        ...(demo ? { email: email.trim(), consent } : {}),
      });
      navigate(`${demo ? "/demo" : "/app"}/c/${created.public_slug}`);
    } catch (err) {
      setError({ message: err.message, details: err.details });
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <span className="pill">Nueva cotización</span>
        <h1 className="h1">Escribe el alcance. <em>Olmo Cotiza arma el resto.</em></h1>
        <p className="lead">Precios, opciones y condiciones en texto libre. Olmo Cotiza los ordena y redacta la propuesta con el diseño de Olmo. No inventa precios: lo que no escribas queda como "por definir".</p>
      </div>

      <form className="card form" onSubmit={submit} aria-busy={busy}>
        {demo && (
          <div className="demo-note">
            La demo es pública: lo que generes aquí lo puede ver cualquiera y se borra a los 7 días. Usa datos ficticios.
          </div>
        )}
        <div className="form__row">
          <Field label="Cliente o proyecto"><input required maxLength={200} value={form.client_name} onChange={set("client_name")} placeholder="Ej. Café Aurora" /></Field>
          <Field label="Preparado para"><input required maxLength={200} value={form.prepared_for} onChange={set("prepared_for")} placeholder="Ej. Mariana" /></Field>
        </div>
        <div className="form__row form__row--4">
          <Field label="Fecha"><input type="date" required value={form.issued_on} onChange={set("issued_on")} /></Field>
          <div className="field" role="group" aria-labelledby="vigencia-label">
            <span className="label" id="vigencia-label">Vigencia</span>
            <div className="segmented">
              {[8, 15, 30].map((d) => (
                <button type="button" key={d} aria-pressed={Number(form.valid_days) === d} className={Number(form.valid_days) === d ? "on" : ""} onClick={() => setForm({ ...form, valid_days: d })}>{d} días</button>
              ))}
            </div>
          </div>
          <Field label="Idioma">
            <select value={form.language} onChange={set("language")}><option value="es">Español</option><option value="en">English</option></select>
          </Field>
          <Field label="Moneda principal">
            <select value={form.currency} onChange={set("currency")}><option>COP</option><option>USD</option><option>EUR</option></select>
          </Field>
        </div>
        <Field label="Describe la cotización" hint={`${form.source_text.length.toLocaleString("es-CO")} / 8.000`}>
          <textarea required minLength={20} maxLength={8000} rows={10} value={form.source_text} onChange={set("source_text")}
            placeholder="Servicios, opciones, precios, forma de pago, costos de terceros, qué no incluye…" />
        </Field>

        {demo && (
          <div className="form__row form__row--email">
            <Field label="Tu correo" hint="Para limitar el uso de la demo: 3 propuestas al día.">
              <input type="email" required autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} placeholder="tu@correo.com" />
            </Field>
            <label className="check">
              <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span>Quiero recibir novedades de Olmo en este correo (opcional).</span>
            </label>
          </div>
        )}

        {error && (
          <div className="error-box" role="alert">
            <strong>{error.message}</strong>
            {Array.isArray(error.details) && <ul>{error.details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </div>
        )}

        <div className="form__actions">
          {demo && <button type="button" className="btn btn--ghost" onClick={fillExample} disabled={busy}>Llenar con ejemplo</button>}
          <button className="btn btn--primary" disabled={busy}>
            {busy ? <><span className="spinner" aria-hidden="true" />Generando… (30–60 s)</> : "Generar propuesta"}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__top"><span className="label">{label}</span>{hint && <span className="field__hint">{hint}</span>}</span>
      {children}
    </label>
  );
}
