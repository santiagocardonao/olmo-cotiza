import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// quotes.js imports the Supabase client; the pure helpers tested here never touch it.
vi.mock("./supabase.js", () => ({ supabase: {}, ORG_ID: {} }));
const { formatMoney, metrics, proposalTitle, quoteValue } = await import("./quotes.js");

const line = (over) => ({ pricing_model: "fixed", currency: "COP", unit_price: 1_000_000, quantity: null, is_optional: false, ...over });

describe("quoteValue", () => {
  it("adds fixed, hourly (rate × hours) and per-unit lines of the recommended option, skipping optional ones", () => {
    const q = {
      quote_options: [
        { position: 1, is_recommended: false, quote_lines: [line({ unit_price: 99 })] },
        {
          position: 2,
          is_recommended: true,
          quote_lines: [
            line({ unit_price: 4_000_000 }),
            line({ pricing_model: "hourly", unit_price: 150_000, quantity: 10 }),
            line({ pricing_model: "per_unit", unit_price: 200_000, quantity: 3 }),
            line({ pricing_model: "hourly", unit_price: 150_000, quantity: null }), // on demand: not added
            line({ unit_price: 9_000_000, is_optional: true }),
          ],
        },
      ],
    };
    expect(quoteValue(q)).toEqual({ amount: 6_100_000, currency: "COP", recurring: false });
  });

  it("falls back to the monthly fee of the first option when there is no one-off total", () => {
    const q = {
      quote_options: [
        { position: 2, is_recommended: false, quote_lines: [line({ unit_price: 1 })] },
        { position: 1, is_recommended: false, quote_lines: [line({ pricing_model: "monthly", currency: "USD", unit_price: 800 })] },
      ],
    };
    expect(quoteValue(q)).toEqual({ amount: 800, currency: "USD", recurring: true });
  });

  it("returns null without options or without a priced line", () => {
    expect(quoteValue({ quote_options: [] })).toBeNull();
    expect(quoteValue({ quote_options: [{ position: 1, quote_lines: [line({ pricing_model: "percentage", unit_price: null })] }] })).toBeNull();
  });
});

describe("metrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 13, 12)); // 13 Nov 2026, local noon
  });
  afterEach(() => vi.useRealTimers());

  const cop = (amount) => ({ amount, currency: "COP", recurring: false });

  it("computes close rate, average COP ticket, open pipeline, expiring and unopened quotes", () => {
    const quotes = [
      { status: "accepted", value: cop(10_000_000), views: 2 },
      { status: "accepted", value: { amount: 500, currency: "USD", recurring: false }, views: 1 },
      { status: "rejected", value: cop(1), views: 1 },
      { status: "expired", value: cop(1), views: 0 },
      { status: "sent", value: cop(3_000_000), views: 0, expires_on: "2026-11-15" },
      { status: "sent", value: { amount: 900, currency: "COP", recurring: true }, views: 1, expires_on: "2026-12-30" },
      { status: "draft", value: cop(7_000_000), views: 0 },
    ];
    const m = metrics(quotes);
    expect(m.total).toBe(7);
    expect(m.closeRate).toBe(2 / 4);
    expect(m.avgTicket).toBe(10_000_000); // only accepted, one-off COP quotes
    expect(m.openPipeline).toBe(3_000_000); // sent, one-off COP only
    expect(m.expiringSoon).toHaveLength(1);
    expect(m.unopened).toBe(1);
  });

  it("returns null rates when nothing has been decided yet", () => {
    const m = metrics([{ status: "draft", value: null, views: 0 }]);
    expect(m.closeRate).toBeNull();
    expect(m.avgTicket).toBeNull();
    expect(m.openPipeline).toBe(0);
  });
});

describe("formatting", () => {
  it("formats COP without decimals and other currencies with them", () => {
    expect(formatMoney(6_000_000.4, "COP")).toBe("$6.000.000");
    expect(formatMoney(1860.5, "USD")).toBe("1,860.5 USD");
    expect(formatMoney(null, "COP")).toBe("—");
  });

  it("titles the proposal in the quote's language", () => {
    expect(proposalTitle({ client: { name: "Romero" }, quote: { language: "en" } })).toBe("Olmo proposal · Romero");
    expect(proposalTitle({ client: { name: "Romero" }, quote: { language: "es" } })).toBe("Propuesta Olmo · Romero");
  });
});
