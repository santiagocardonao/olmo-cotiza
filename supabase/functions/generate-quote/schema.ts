// Esquema de lo que Claude debe devolver. Es el mismo contrato que
// create_quote() espera y que las plantillas renderizan.
import { z } from "npm:zod@4";

const PricingModel = z.enum(["fixed", "hourly", "monthly", "per_unit", "percentage", "pass_through"]);
const Currency = z.enum(["COP", "USD", "EUR"]);

const Line = z.object({
  label: z.string().describe("Nombre corto del concepto cobrado"),
  detail: z.string().nullable().describe("Una línea de detalle, o null"),
  pricing_model: PricingModel,
  currency: Currency,
  unit_price: z.number().nullable().describe("Precio, tarifa por hora, mensualidad o precio por unidad. null solo si pricing_model es percentage. En un rango, el mínimo"),
  unit_price_max: z.number().nullable().describe("Solo si la descripción da un rango: el máximo. null si el precio es exacto"),
  alt_currency: Currency.nullable().describe("Solo si la descripción da el mismo precio en otra moneda (\"ó 1.860 USD\"). null si no"),
  alt_unit_price: z.number().nullable().describe("El precio en alt_currency. null si no hay"),
  quantity: z.number().nullable().describe("hourly: horas estimadas (null si la tarifa es a demanda). per_unit: unidades. monthly: compromiso mínimo en meses. null si no aplica"),
  cap_quantity: z.number().nullable().describe("Techo de horas o unidades; null si no hay"),
  percent: z.number().nullable().describe("Solo en percentage"),
  percent_base: z.string().nullable().describe("Solo en percentage: sobre qué se calcula"),
  minimum_amount: z.number().nullable().describe("Solo en percentage: mínimo a cobrar"),
  is_optional: z.boolean(),
});

const Card = z.object({ title: z.string(), body: z.string() });
const ExampleRow = z.object({ label: z.string(), detail: z.string().nullable(), amount: z.string() });

export const QuoteDraft = z.object({
  title: z.string().describe("Línea 1 de la portada, máx. ~22 caracteres. Ej: 'Sitio web en Framer'"),
  title_accent: z.string().describe("Línea 2 de la portada, en itálica. Ej: 'para Romero.'"),
  summary: z.string().describe("Bajada de portada: 1–2 frases"),
  options: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    is_recommended: z.boolean(),
    lines: z.array(Line),
  })),
  milestones: z.array(z.object({ label: z.string(), percent: z.number() }))
    .describe("Hitos de pago del pago único; los porcentajes suman 100. Vacío si no hay pago único"),
  copy: z.object({
    intro: z.object({ heading: z.string(), accent: z.string(), body: z.string() }),
    highlights: z.array(Card).describe("Exactamente 3"),
    includes: z.array(z.string()),
    excludes: z.array(z.string()),
    notes: z.array(z.string()).describe("Aclaraciones cortas del alcance; puede ir vacío"),
    diagnosis: z.object({ heading: z.string(), accent: z.string(), body: z.string(), points: z.array(Card) }).nullable()
      .describe("Solo si la descripción explica un problema del cliente que vale la pena diagnosticar; null si no"),
    conditions: z.array(Card).describe("Condiciones comerciales de la descripción (comisiones, cuándo arranca el plazo, qué paga el cliente aparte); vacío si no hay"),
    examples: z.object({ intro: z.string(), rows: z.array(ExampleRow) }).nullable()
      .describe("Solo si la descripción da ejemplos de cálculo (\"5 quizzes = ...\", \"ejemplo de un mes\"); montos copiados de la descripción; null si no"),
    process: z.array(Card).describe("Entre 3 y 8 pasos o fases, según la descripción; 4 si no dice nada"),
    closing: z.object({ heading: z.string(), accent: z.string(), body: z.string() }),
  }),
});

export type QuoteDraft = z.infer<typeof QuoteDraft>;

// Reglas que el esquema JSON no puede expresar. Devuelve errores legibles.
export function businessErrors(d: QuoteDraft): string[] {
  const errors: string[] = [];
  if (!d.options.length) errors.push("La cotización no tiene opciones.");
  if (d.options.filter((o) => o.is_recommended).length > 1) errors.push("Hay más de una opción recomendada.");
  d.options.forEach((o, i) => {
    o.lines.forEach((l, j) => {
      const where = `Opción ${i + 1}, línea ${j + 1} (${l.label})`;
      if (l.pricing_model === "percentage") {
        if (l.percent == null || !l.percent_base) errors.push(`${where}: porcentaje sin valor o sin base.`);
        if (l.unit_price != null) errors.push(`${where}: un porcentaje no lleva precio unitario.`);
      } else {
        if (l.unit_price == null) errors.push(`${where}: falta el precio.`);
        if (l.percent != null) errors.push(`${where}: solo los porcentajes llevan percent.`);
      }
      if (l.pricing_model === "hourly" && l.quantity == null && l.cap_quantity != null) errors.push(`${where}: techo de horas sin horas estimadas.`);
      if ((l.alt_currency == null) !== (l.alt_unit_price == null)) errors.push(`${where}: la moneda alterna necesita moneda y precio.`);
      if (l.alt_currency != null && l.alt_currency === l.currency) errors.push(`${where}: la moneda alterna es igual a la principal.`);
      if (l.unit_price_max != null && (l.unit_price == null || l.unit_price_max <= l.unit_price)) errors.push(`${where}: el rango de precio está invertido.`);
      if (l.cap_quantity != null && l.quantity != null && l.cap_quantity < l.quantity) errors.push(`${where}: el techo es menor que lo estimado.`);
    });
  });
  if (d.copy.process.length < 3 || d.copy.process.length > 8) errors.push(`El proceso tiene ${d.copy.process.length} pasos; deben ser entre 3 y 8.`);
  const sum = d.milestones.reduce((s, m) => s + m.percent, 0);
  if (d.milestones.length && Math.abs(sum - 100) > 0.01) errors.push(`Los hitos de pago suman ${sum}%, no 100%.`);
  return errors;
}
