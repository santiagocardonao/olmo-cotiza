# Olmo Cotiza

A quote generator built on Supabase. You write the scope and the prices in free text; Claude turns them into structured data; the proposal is assembled from fixed templates of the Olmo design system and stored in Postgres, where it stays queryable: how much was quoted, to whom, what was opened and what was closed.

**Live:** [cotiza.olmo.agency](https://cotiza.olmo.agency) · [public demo](https://cotiza.olmo.agency/demo) (fictional data)

The interface is in Spanish because its users and clients are in Colombia. Proposals are generated in Spanish or English.

## How it works

```
Free text + prices
  → Edge Function generate-quote → Claude (structured output, validated with Zod)
  → business rules (milestones that add up to 100, hours on hourly pricing, …)
  → create_quote(): a single Postgres transaction, under RLS
  → HTML templates (templates/) → preview, public link and PDF with real text
```

The model drafts and structures; **the templates own the design**, so every proposal comes out consistent with the Olmo system.

## Structure

```
supabase/
  migrations/          schema, RLS, public link, expiry (pg_cron), create_quote()
  functions/generate-quote/   Edge Function: free text → stored quote
  seed.sql             demo: 5 fictional quotes, one per pricing model
templates/             dependency-free A4 proposal (cover, intro, scope, investment,
                       process, back cover) + Olmo tokens and fonts
app/                   Vite + React: dashboard, new quote, detail, client view
```

## Data model

- `organizations` separates **Olmo** (private) from **Demo** (public, read-only for visitors).
- `quotes` → `quote_options` → `quote_lines`. Each line has its own **pricing model**:
  `fixed` fixed price · `hourly` per hour with a cap · `monthly` monthly fee · `per_unit` per unit · `percentage` of a base · `pass_through` third-party cost paid directly to the vendor.
- A line can carry a price range and an equivalent price in a second currency, as real proposals do.
- `payment_milestones`, `quote_events` (created, sent, opened, accepted) and `quote_versions`.

## Security

- RLS on every table. RLS helper functions live in the `private` schema, outside the API.
- The demo is read-only for visitors; its writes go through the Edge Function with a daily limit (3 per visitor, 40 in total).
- `get_public_quote(slug)` is public on purpose: each real quote's slug is random (72 bits), and Olmo drafts are never exposed.
- The owner becomes `owner` of the Olmo organization automatically on signing up with their email.

## Development

```bash
cd app
npm install
npm run dev      # syncs templates/ into public/proposal and starts Vite
npm run deploy   # build + rsync to SiteGround over SSH
```

The Edge Function needs the `ANTHROPIC_API_KEY` secret in Supabase.
