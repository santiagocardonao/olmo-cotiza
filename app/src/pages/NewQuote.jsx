import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EXAMPLES } from "../lib/examples.js";
import { generateQuote } from "../lib/quotes.js";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

export function NewQuote({ mode }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    client_name: "", prepared_for: "", source_text: "",
    valid_days: 15, issued_on: today(), language: "es", currency: "COP",
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
    try {
      const created = await generateQuote({ ...form, mode, valid_days: Number(form.valid_days) });
      navigate(`${mode === "demo" ? "/demo" : "/app"}/c/${created.public_slug}`);
    } catch (err) {
      setError({ message: err.message, details: err.details });
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <span className="pill">Nueva cotización</span>
        <h1 className="h1">Escribe el alcance. <em>Nosotros armamos el resto.</em></h1>
        <p className="lead">Precios, opciones y condiciones en texto libre. Olmo Cotiza los ordena y redacta la propuesta con el diseño de Olmo. No inventa precios: lo que no escribas queda como "por definir".</p>
      </div>

      <form className="card form" onSubmit={submit}>
        <div className="form__row">
          <Field label="Cliente o proyecto"><input required value={form.client_name} onChange={set("client_name")} placeholder="Ej. Café Aurora" /></Field>
          <Field label="Preparado para"><input required value={form.prepared_for} onChange={set("prepared_for")} placeholder="Ej. Mariana" /></Field>
        </div>
        <div className="form__row form__row--4">
          <Field label="Fecha"><input type="date" value={form.issued_on} onChange={set("issued_on")} /></Field>
          <Field label="Vigencia">
            <div className="segmented">
              {[8, 15, 30].map((d) => (
                <button type="button" key={d} className={Number(form.valid_days) === d ? "on" : ""} onClick={() => setForm({ ...form, valid_days: d })}>{d} días</button>
              ))}
            </div>
          </Field>
          <Field label="Idioma">
            <select value={form.language} onChange={set("language")}><option value="es">Español</option><option value="en">English</option></select>
          </Field>
          <Field label="Moneda principal">
            <select value={form.currency} onChange={set("currency")}><option>COP</option><option>USD</option><option>EUR</option></select>
          </Field>
        </div>
        <Field label="Describe la cotización">
          <textarea required minLength={20} rows={10} value={form.source_text} onChange={set("source_text")}
            placeholder="Servicios, opciones, precios, forma de pago, costos de terceros, qué no incluye…" />
        </Field>

        {error && (
          <div className="error-box">
            <strong>{error.message}</strong>
            {Array.isArray(error.details) && <ul>{error.details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </div>
        )}

        <div className="form__actions">
          {mode === "demo" && <button type="button" className="btn btn--ghost" onClick={fillExample} disabled={busy}>Llenar con ejemplo</button>}
          <button className="btn btn--primary" disabled={busy}>{busy ? "Generando… (30–60 s)" : "Generar propuesta"}</button>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }) {
  return <label className="field"><span className="label">{label}</span>{children}</label>;
}
