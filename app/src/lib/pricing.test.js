// The proposal templates (../templates) are shared with the app; these are
// the rules that turn stored lines into the figures the client reads.
import { describe, expect, it } from "vitest";
import { linePrice, optionHeadline, passThroughCosts } from "../../../templates/pricing.js";
import { escapeHtml, money } from "../../../templates/i18n.js";

const line = (over) => ({
  label: "Sitio web", pricing_model: "fixed", currency: "COP", unit_price: 6_000_000, unit_price_max: null,
  alt_currency: null, alt_unit_price: null, quantity: null, cap_quantity: null, is_optional: false, ...over,
});

describe("money", () => {
  it("prints COP without decimals and USD/EUR with decimals only when present, without float noise", () => {
    expect(money(6_000_000, "COP")).toBe("$6.000.000 COP");
    expect(money(1860, "USD")).toBe("1,860 USD");
    expect(money(19.99, "EUR")).toBe("19.99 EUR");
    expect(money(0.1 + 0.2, "USD")).toBe("0.30 USD");
  });
});

describe("linePrice", () => {
  it("shows a range and the equivalent in a second currency", () => {
    const l = line({ unit_price: 5_000_000, unit_price_max: 7_000_000, alt_currency: "USD", alt_unit_price: 1_500 });
    expect(linePrice("es", l)).toEqual({ price: "$5.000.000 – $7.000.000 COP ó 1,500 USD", detail: null });
  });

  it("describes hourly lines: estimate with cap, or on demand", () => {
    const hourly = line({ pricing_model: "hourly", unit_price: 150_000, quantity: 12.5, cap_quantity: 15 });
    expect(linePrice("es", hourly)).toEqual({ price: "$150.000 COP / hora", detail: "12,5 h estimadas · máximo 15 h" });
    expect(linePrice("en", { ...hourly, quantity: null, cap_quantity: null }).price).toBe("$150.000 COP / hour");
    expect(linePrice("es", { ...hourly, quantity: null, cap_quantity: null }).detail).toBe("según lo que pidas, se factura al ejecutarse");
  });

  it("describes percentage lines with their base and minimum", () => {
    const l = line({ pricing_model: "percentage", unit_price: null, percent: 7.5, percent_base: "las ventas", minimum_amount: 500_000 });
    expect(linePrice("es", l)).toEqual({ price: "7,5% de las ventas", detail: "mínimo $500.000 COP" });
  });
});

describe("optionHeadline", () => {
  it("adds the one-off lines and marks a capped hourly estimate", () => {
    const option = {
      lines: [
        line({ unit_price: 4_000_000 }),
        line({ pricing_model: "hourly", unit_price: 100_000, quantity: 10, cap_quantity: 12 }),
        line({ pricing_model: "monthly", unit_price: 300_000 }), // monthly is not part of the one-off total
        line({ unit_price: 9_000_000, is_optional: true }),
      ],
    };
    expect(optionHeadline("es", option)).toEqual({
      amounts: ["$5.000.000 COP"], alt: null, hasRange: false, suffix: "estimado según horas, con techo",
    });
  });

  it("shows a min–max range and the alternate-currency total when every line has it", () => {
    const option = {
      lines: [
        line({ unit_price: 4_000_000, unit_price_max: 5_000_000, alt_currency: "USD", alt_unit_price: 1_000 }),
        line({ unit_price: 2_000_000, alt_currency: "USD", alt_unit_price: 500 }),
      ],
    };
    const h = optionHeadline("en", option);
    expect(h.amounts).toEqual(["$6.000.000 – $7.000.000 COP"]);
    expect(h.alt).toBe("1,500 USD");
    expect(h.hasRange).toBe(true);
  });

  it("falls back to the monthly fee when there is no one-off price", () => {
    const option = { lines: [line({ pricing_model: "monthly", currency: "USD", unit_price: 800 })] };
    expect(optionHeadline("en", option)).toMatchObject({ amounts: ["800 USD"], suffix: "per month" });
  });
});

describe("passThroughCosts", () => {
  it("lists third-party costs once across options", () => {
    const hosting = line({ label: "Hosting", pricing_model: "pass_through", currency: "USD", unit_price: 20 });
    const options = [{ lines: [hosting, line()] }, { lines: [{ ...hosting }, line({ label: "Dominio", pricing_model: "pass_through", unit_price: 80_000 })] }];
    expect(passThroughCosts(options).map((l) => l.label)).toEqual(["Hosting", "Dominio"]);
  });
});

describe("escapeHtml", () => {
  it("escapes client text before it reaches the template", () => {
    expect(escapeHtml(`<b>"Romero" & 'Co'</b>`)).toBe("&lt;b&gt;&quot;Romero&quot; &amp; &#39;Co&#39;&lt;/b&gt;");
    expect(escapeHtml(null)).toBe("");
  });
});
