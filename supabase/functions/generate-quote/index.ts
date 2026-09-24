// ============================================================
// generate-quote
// POST { mode: "olmo" | "demo", client_name, prepared_for, source_text,
//        language?, currency?, issued_on?, valid_days? }
// → Claude structures the free text → create_quote() stores it.
//
// mode "olmo": requires a session; RLS decides whether the user may write.
// mode "demo": no session; writes to the demo organization with the
//              service role and a daily limit per visitor.
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.128.0/helpers/zod";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { businessErrors, CopyDraft, PricingDraft, type QuoteDraft } from "./schema.ts";
import { SYSTEM_PROMPT, userMessage } from "./prompt.ts";

const ORG = {
  olmo: "00000000-0000-4000-8000-00000000a000",
  demo: "00000000-0000-4000-8000-00000000d000",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Reads ANTHROPIC_API_KEY from the secrets. The key is not tied to a
// workspace, so the API requires the anthropic-workspace-id header.
// The ID is not secret: defaults to the "Default" workspace; the
// ANTHROPIC_WORKSPACE_ID secret overrides it.
const workspaceId = Deno.env.get("ANTHROPIC_WORKSPACE_ID") ?? "wrkspc_019ULFQphQs4KMRPeUB6NRLu";
const anthropic = new Anthropic({ defaultHeaders: { "anthropic-workspace-id": workspaceId } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Método no permitido." });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "El cuerpo no es JSON válido." });
  }

  const mode = input.mode === "olmo" ? "olmo" : "demo";
  const client_name = String(input.client_name ?? "").trim();
  const prepared_for = String(input.prepared_for ?? "").trim();
  const source_text = String(input.source_text ?? "").trim();
  const language = input.language === "en" ? "en" : "es";
  const currency = ["COP", "USD", "EUR"].includes(String(input.currency)) ? String(input.currency) as "COP" | "USD" | "EUR" : "COP";
  const valid_days = [8, 15, 30].includes(Number(input.valid_days)) ? Number(input.valid_days) : 15;
  const issued_on = /^\d{4}-\d{2}-\d{2}$/.test(String(input.issued_on ?? "")) ? String(input.issued_on) : undefined;

  if (!client_name || !prepared_for || source_text.length < 20) {
    return json(400, { error: "Faltan datos: cliente, destinatario y una descripción de al menos 20 caracteres." });
  }
  if (source_text.length > 8000) return json(400, { error: "La descripción es demasiado larga (máx. 8.000 caracteres)." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client used for writes: the user's own (RLS) or the service role (demo).
  let db;
  if (mode === "olmo") {
    const authHeader = req.headers.get("Authorization") ?? "";
    db = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) return json(401, { error: "Inicia sesión para crear cotizaciones de Olmo." });
  } else {
    db = createClient(url, serviceKey);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "sin-ip";
    const ua = req.headers.get("user-agent") ?? "";
    const hash = await sha256(`${ip}|${ua}`);
    const { data: allowed, error } = await db.rpc("demo_generation_allowed", { p_client_hash: hash });
    if (error) return json(500, { error: "No se pudo verificar el límite de la demo." });
    if (!allowed) return json(429, { error: "La demo permite 3 cotizaciones por día. Explora las cotizaciones de ejemplo mientras tanto." });
  }

  // ── Claude: free text → validated structure ─────────────
  // Pricing and copy go in two parallel calls (see schema.ts).
  const ask = <T,>(part: "pricing" | "copy", schema: Parameters<typeof zodOutputFormat>[0]) =>
    anthropic.messages.parse(
      {
        model: "claude-opus-5",
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage({ client_name, prepared_for, language, currency, source_text, part }) }],
        output_config: { format: zodOutputFormat(schema) },
        // If a safety classifier declines, the API retries on the recommended model.
        // @ts-expect-error: `fallbacks: "default"` is not in the SDK types yet
        fallbacks: "default",
      },
      { headers: { "anthropic-beta": "server-side-fallback-2026-07-01" } },
    ) as Promise<{ stop_reason: string | null; parsed_output: T | null }>;

  let draft: QuoteDraft;
  try {
    const [pricing, copy] = await Promise.all([
      ask<PricingDraft>("pricing", PricingDraft),
      ask<CopyDraft>("copy", CopyDraft),
    ]);

    if (pricing.stop_reason === "refusal" || copy.stop_reason === "refusal") {
      return json(422, { error: "El modelo no pudo procesar esta descripción. Reformúlala e intenta de nuevo." });
    }
    if (!pricing.parsed_output || !copy.parsed_output) {
      return json(502, { error: "La respuesta del modelo quedó incompleta. Intenta de nuevo." });
    }
    draft = { ...pricing.parsed_output, copy: copy.parsed_output };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json(429, { error: "Demasiadas solicitudes al modelo. Espera un minuto." });
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("anthropic auth", err.status, err.message);
      return json(500, { error: "La API key de Anthropic no es válida para este workspace.", details: err.message });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("anthropic", err.status, err.message);
      return json(502, { error: `Error del modelo (${err.status}).`, details: err.message });
    }
    console.error("generate-quote", err);
    return json(500, { error: "Error inesperado al generar la cotización.", details: String(err) });
  }

  const problems = businessErrors(draft);
  if (problems.length) return json(422, { error: "La cotización generada no es consistente.", details: problems, draft });

  // ── Save in a single transaction ──────────────────────
  const { data: created, error: saveError } = await db.rpc("create_quote", {
    payload: {
      org_id: ORG[mode],
      client_name,
      prepared_for,
      language,
      currency,
      issued_on,
      valid_days,
      source_text,
      title: draft.title,
      title_accent: draft.title_accent,
      summary: draft.summary,
      copy: draft.copy,
      options: draft.options,
      milestones: draft.milestones,
    },
  });
  if (saveError) return json(mode === "olmo" ? 403 : 500, { error: "No se pudo guardar la cotización.", details: saveError.message });

  return json(200, created);
});

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
