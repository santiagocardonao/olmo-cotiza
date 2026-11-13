// Business rules of generate-quote: what Claude returns must pass these
// checks before create_quote() stores it. No network, no secrets.
// Run: deno test --node-modules-dir=none supabase/functions/tests/
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { businessErrors, normalizeMilestones, PricingDraft, type QuoteDraft } from "../generate-quote/schema.ts";

type Line = QuoteDraft["options"][number]["lines"][number];

const line = (over: Partial<Line> = {}): Line => ({
  label: "Sitio web",
  detail: null,
  pricing_model: "fixed",
  currency: "COP",
  unit_price: 6_000_000,
  unit_price_max: null,
  alt_currency: null,
  alt_unit_price: null,
  quantity: null,
  cap_quantity: null,
  percent: null,
  percent_base: null,
  minimum_amount: null,
  is_optional: false,
  ...over,
});

const step = { title: "Paso", body: "Detalle" };

const draft = (over: Partial<QuoteDraft> = {}): QuoteDraft => ({
  title: "Sitio web en Framer",
  title_accent: "para Romero.",
  summary: "Un sitio nuevo.",
  options: [{ name: "Única", description: null, is_recommended: true, lines: [line()] }],
  milestones: [{ label: "Al firmar", percent: 50 }, { label: "Al entregar", percent: 50 }],
  copy: {
    intro: { heading: "h", accent: "a", body: "b" },
    highlights: [step, step, step],
    includes: [],
    excludes: [],
    notes: [],
    diagnosis: null,
    conditions: [],
    examples: null,
    process: [step, step, step, step],
    closing: { heading: "h", accent: "a", body: "b" },
  },
  ...over,
});

const withLine = (over: Partial<Line>) =>
  draft({ options: [{ name: "Única", description: null, is_recommended: true, lines: [line(over)] }] });

Deno.test("a well-formed quote has no business errors", () => {
  assertEquals(businessErrors(draft()), []);
});

Deno.test("rejects a quote without options, or with more than one recommended", () => {
  assertEquals(businessErrors(draft({ options: [] })), ["La cotización no tiene opciones."]);
  const o = { name: "A", description: null, is_recommended: true, lines: [line()] };
  assertEquals(businessErrors(draft({ options: [o, { ...o, name: "B" }] })), ["Hay más de una opción recomendada."]);
});

Deno.test("every option needs at least one price line", () => {
  const errors = businessErrors(draft({ options: [{ name: "Vacía", description: null, is_recommended: false, lines: [] }] }));
  assertEquals(errors.length, 1);
  assertStringIncludes(errors[0], "La opción 1 (Vacía) no tiene precios");
});

Deno.test("milestones must add up to 100 (on 2-decimal stored values)", () => {
  const errors = businessErrors(draft({ milestones: [{ label: "a", percent: 50 }, { label: "b", percent: 40 }] }));
  assertEquals(errors, ["Los hitos de pago suman 90%, no 100%."]);
  // No milestones (e.g. a monthly-only quote) is valid.
  assertEquals(businessErrors(draft({ milestones: [] })), []);
});

Deno.test("each milestone must be in (0, 100]", () => {
  const errors = businessErrors(draft({ milestones: [{ label: "a", percent: 0 }, { label: "b", percent: 100 }] }));
  assert(errors.includes("Cada hito de pago debe estar entre 0% y 100%."));
});

Deno.test("percentage lines need percent and base, and no unit price", () => {
  const errors = businessErrors(withLine({ pricing_model: "percentage", unit_price: 1000, percent: null, percent_base: null }));
  assertEquals(errors.length, 2);
  assertStringIncludes(errors[0], "porcentaje sin valor o sin base");
  assertStringIncludes(errors[1], "un porcentaje no lleva precio unitario");
  assertEquals(businessErrors(withLine({ pricing_model: "percentage", unit_price: null, percent: 10, percent_base: "ventas" })), []);
});

Deno.test("non-percentage lines need a price and no percent", () => {
  const errors = businessErrors(withLine({ unit_price: null, percent: 5 }));
  assertEquals(errors.map((e) => e.split(": ")[1]), ["falta el precio.", "solo los porcentajes llevan percent."]);
});

Deno.test("hourly pricing: a cap needs estimated hours and cannot be below them", () => {
  const hourly = { pricing_model: "hourly" as const, unit_price: 150_000 };
  assertStringIncludes(businessErrors(withLine({ ...hourly, quantity: null, cap_quantity: 20 }))[0], "techo de horas sin horas estimadas");
  assertStringIncludes(businessErrors(withLine({ ...hourly, quantity: 20, cap_quantity: 10 }))[0], "el techo es menor que lo estimado");
  // On demand (no hours, no cap) and estimate + higher cap are both valid.
  assertEquals(businessErrors(withLine({ ...hourly, quantity: null, cap_quantity: null })), []);
  assertEquals(businessErrors(withLine({ ...hourly, quantity: 20, cap_quantity: 25 })), []);
});

Deno.test("alternate currency needs both fields and must differ from the main one", () => {
  assertStringIncludes(businessErrors(withLine({ alt_currency: "USD" }))[0], "la moneda alterna necesita moneda y precio");
  assertStringIncludes(businessErrors(withLine({ alt_currency: "COP", alt_unit_price: 1 }))[0], "la moneda alterna es igual a la principal");
  assertEquals(businessErrors(withLine({ alt_currency: "USD", alt_unit_price: 1_500 })), []);
});

Deno.test("a price range must go from low to high", () => {
  assertStringIncludes(businessErrors(withLine({ unit_price: 5_000_000, unit_price_max: 4_000_000 }))[0], "el rango de precio está invertido");
  assertEquals(businessErrors(withLine({ unit_price: 4_000_000, unit_price_max: 5_000_000 })), []);
});

Deno.test("the process must have between 3 and 8 steps", () => {
  const d = draft();
  d.copy.process = [step, step];
  assertEquals(businessErrors(d), ["El proceso tiene 2 pasos; deben ser entre 3 y 8."]);
});

Deno.test("normalizeMilestones turns thirds into values that add up to exactly 100", () => {
  const d = draft({ milestones: [1, 2, 3].map((i) => ({ label: `m${i}`, percent: 100 / 3 })) });
  normalizeMilestones(d);
  assertEquals(d.milestones.map((m) => m.percent), [33.33, 33.33, 33.34]);
  assertEquals(businessErrors(d), []);
});

Deno.test("normalizeMilestones leaves a real mismatch for businessErrors to report", () => {
  const d = draft({ milestones: [{ label: "a", percent: 60 }, { label: "b", percent: 30 }] });
  normalizeMilestones(d);
  assertEquals(d.milestones.map((m) => m.percent), [60, 30]);
  assertEquals(businessErrors(d), ["Los hitos de pago suman 90%, no 100%."]);
});

Deno.test("PricingDraft schema rejects unknown pricing models and currencies", () => {
  const { copy: _copy, ...pricing } = draft();
  assert(PricingDraft.safeParse(pricing).success);
  const bad = structuredClone(pricing);
  bad.options[0].lines[0] = { ...bad.options[0].lines[0], pricing_model: "yearly" as never, currency: "GBP" as never };
  const result = PricingDraft.safeParse(bad);
  assert(!result.success);
  assertEquals(result.error.issues.map((i) => i.path.at(-1)).sort(), ["currency", "pricing_model"]);
});
