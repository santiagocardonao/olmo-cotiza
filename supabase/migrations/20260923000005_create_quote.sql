-- ============================================================
-- create_quote(payload): guarda una cotización completa en una
-- sola transacción. SECURITY INVOKER: las políticas RLS del que
-- llama deciden si puede escribir en esa organización.
-- ============================================================

create function public.create_quote(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org     uuid := (payload->>'org_id')::uuid;
  v_client  uuid;
  v_quote   public.quotes%rowtype;
  v_option  uuid;
  o         jsonb;
  l         jsonb;
  m         jsonb;
  oi        int := 0;
  li        int;
  mi        int := 0;
begin
  insert into public.clients (org_id, name)
  values (v_org, payload->>'client_name')
  on conflict (org_id, name) do update set name = excluded.name
  returning id into v_client;

  insert into public.quotes (
    org_id, client_id, prepared_for, title, title_accent, summary,
    language, currency, issued_on, valid_days, source_text, copy, created_by
  ) values (
    v_org, v_client, payload->>'prepared_for', payload->>'title', payload->>'title_accent', payload->>'summary',
    coalesce(payload->>'language', 'es')::public.quote_language,
    coalesce(payload->>'currency', 'COP')::public.currency_code,
    coalesce((payload->>'issued_on')::date, current_date),
    coalesce((payload->>'valid_days')::smallint, 15),
    payload->>'source_text',
    coalesce(payload->'copy', '{}'::jsonb),
    (select auth.uid())
  ) returning * into v_quote;

  for o in select * from jsonb_array_elements(coalesce(payload->'options', '[]'::jsonb)) loop
    oi := oi + 1;
    insert into public.quote_options (quote_id, position, name, description, is_recommended)
    values (v_quote.id, oi, o->>'name', o->>'description', coalesce((o->>'is_recommended')::boolean, false))
    returning id into v_option;

    li := 0;
    for l in select * from jsonb_array_elements(coalesce(o->'lines', '[]'::jsonb)) loop
      li := li + 1;
      insert into public.quote_lines (
        option_id, position, label, detail, pricing_model, currency,
        unit_price, quantity, cap_quantity, percent, percent_base, minimum_amount, is_optional
      ) values (
        v_option, li, l->>'label', l->>'detail',
        (l->>'pricing_model')::public.pricing_model,
        (l->>'currency')::public.currency_code,
        (l->>'unit_price')::numeric, (l->>'quantity')::numeric, (l->>'cap_quantity')::numeric,
        (l->>'percent')::numeric, l->>'percent_base', (l->>'minimum_amount')::numeric,
        coalesce((l->>'is_optional')::boolean, false)
      );
    end loop;
  end loop;

  for m in select * from jsonb_array_elements(coalesce(payload->'milestones', '[]'::jsonb)) loop
    mi := mi + 1;
    insert into public.payment_milestones (quote_id, position, label, percent)
    values (v_quote.id, mi, m->>'label', (m->>'percent')::numeric);
  end loop;

  insert into public.quote_events (quote_id, type) values (v_quote.id, 'created');

  return jsonb_build_object('id', v_quote.id, 'public_slug', v_quote.public_slug);
end $$;

revoke execute on function public.create_quote(jsonb) from public, anon;
grant execute on function public.create_quote(jsonb) to authenticated, service_role;

-- La Edge Function registra el evento 'created' como el usuario; los
-- miembros necesitan poder insertar eventos de su organización.
create policy "events: insert members" on public.quote_events
  for insert to authenticated with check (private.is_member(private.quote_org(quote_id)));
