-- ============================================================
-- Audit fixes (11 Nov 2026)
-- 1. get_public_quote(): "viewed" events are no longer inflated.
--    Drafts never record an open, and repeated loads of the same
--    link within 30 minutes count once. Anyone holding a slug
--    (the demo slugs are public) could otherwise add rows to
--    quote_events without limit.
-- 2. Owner auto-membership only after the email is confirmed.
--    Before, the membership was granted as soon as a row for the
--    owner's email appeared in auth.users (an OTP request creates
--    an unconfirmed row).
-- 3. create_quote(): enforces the same business rules as the Edge
--    Function (at least one option, milestones summing to 100) for
--    members calling the RPC directly; the issued_on fallback uses
--    Bogotá's date instead of the UTC date; demo quotes no longer
--    store the visitor's free text (readable by anyone through
--    /rest/v1/quotes on the public demo org).
-- 4. demo_generation_allowed(): advisory lock so concurrent requests
--    cannot exceed the daily demo limits.
-- 5. anon loses write/TRUNCATE privileges it never needs (RLS
--    already blocked DML; this is defense in depth).
--
-- (20260923000004 was also edited to create the organization rows
-- before private.org_owners, so `supabase db reset` works.)
-- ============================================================

-- ── 1. Public link: no inflated opens ───────────────────────
-- `count_view` lets the internal detail page (demo visitors are not members)
-- read a quote without counting as a client open.
drop function if exists public.get_public_quote(text);
create function public.get_public_quote(slug text, count_view boolean default true)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  q public.quotes%rowtype;
  result jsonb;
begin
  select * into q from public.quotes where public_slug = slug;
  if not found or (q.status = 'draft' and not private.can_read(q.org_id)) then
    return null;
  end if;

  -- An open counts only when the quote was sent (not a draft), the viewer
  -- is not a member, and the same link was not already opened in the
  -- last 30 minutes (reloads, several tabs, scripted calls).
  if count_view
     and q.status <> 'draft'
     and not private.is_member(q.org_id)
     and not exists (
       select 1 from public.quote_events e
       where e.quote_id = q.id and e.type = 'viewed'
         and e.occurred_at > now() - interval '30 minutes'
     ) then
    insert into public.quote_events (quote_id, type) values (q.id, 'viewed');
  end if;

  select jsonb_build_object(
    'quote', to_jsonb(q) - 'source_text' - 'created_by',
    'client', (select jsonb_build_object('name', c.name, 'sector', c.sector) from public.clients c where c.id = q.client_id),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'position', o.position, 'name', o.name, 'description', o.description,
        'is_recommended', o.is_recommended,
        'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.position)
                           from public.quote_lines l where l.option_id = o.id), '[]'::jsonb)
      ) order by o.position)
      from public.quote_options o where o.quote_id = q.id), '[]'::jsonb),
    'milestones', coalesce((
      select jsonb_agg(jsonb_build_object('label', m.label, 'percent', m.percent) order by m.position)
      from public.payment_milestones m where m.quote_id = q.id), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke execute on function public.get_public_quote(text, boolean) from public;
grant execute on function public.get_public_quote(text, boolean) to anon, authenticated;

-- ── 2. Owner membership only for a confirmed email ──────────
create or replace function private.grant_owner_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;
  insert into public.memberships (org_id, user_id, role)
  select o.org_id, new.id, 'owner' from private.org_owners o
  where lower(o.email) = lower(new.email)
  on conflict do nothing;
  return new;
end $$;

-- Trigger functions do not need EXECUTE at fire time.
revoke execute on function private.grant_owner_membership() from public, anon, authenticated;

-- The existing AFTER INSERT trigger covers auto-confirmed sign-ups;
-- this one covers the normal path (OTP / confirmation link).
drop trigger if exists on_auth_user_confirmed_grant_owner on auth.users;
create trigger on_auth_user_confirmed_grant_owner
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.grant_owner_membership();

-- ── 3. create_quote(): server-side rules ─────────────────────
alter table public.quotes
  alter column issued_on set default ((now() at time zone 'America/Bogota')::date);

create or replace function public.create_quote(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org     uuid := (payload->>'org_id')::uuid;
  v_is_demo boolean;
  v_client  uuid;
  v_quote   public.quotes%rowtype;
  v_option  uuid;
  v_ms_sum  numeric;
  v_ms_n    int;
  o         jsonb;
  l         jsonb;
  m         jsonb;
  oi        int := 0;
  li        int;
  mi        int := 0;
begin
  -- Same rules as businessErrors() in the Edge Function, so a direct
  -- RPC call cannot store an inconsistent quote.
  if jsonb_array_length(coalesce(payload->'options', '[]'::jsonb)) = 0 then
    raise exception 'create_quote: the quote has no options' using errcode = '22023';
  end if;

  -- Validated on the values as stored: percent is numeric(5,2), so
  -- 33.333 × 3 would pass a tolerant check on the raw input but be
  -- saved (and shown to the client) as 99.99. The cast to numeric(5,2)
  -- rounds half away from zero, like round(x, 2).
  select coalesce(sum(round((x->>'percent')::numeric, 2)), 0), count(*)
    into v_ms_sum, v_ms_n
    from jsonb_array_elements(coalesce(payload->'milestones', '[]'::jsonb)) x;
  if v_ms_n > 0 and v_ms_sum <> 100 then
    raise exception 'create_quote: payment milestones add up to %, not 100', v_ms_sum using errcode = '22023';
  end if;

  -- Inline lookup (not private.is_demo_org): the demo path runs as
  -- service_role, which has no EXECUTE on the private helpers.
  select coalesce((select org.is_demo from public.organizations org where org.id = v_org), false)
    into v_is_demo;

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
    coalesce((payload->>'issued_on')::date, (now() at time zone 'America/Bogota')::date),
    coalesce((payload->>'valid_days')::smallint, 15),
    -- Demo rows are world-readable; the visitor's raw text is not kept.
    case when v_is_demo then null else payload->>'source_text' end,
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
        unit_price, unit_price_max, quantity, cap_quantity, percent, percent_base, minimum_amount,
        alt_currency, alt_unit_price, is_optional
      ) values (
        v_option, li, l->>'label', l->>'detail',
        (l->>'pricing_model')::public.pricing_model,
        (l->>'currency')::public.currency_code,
        (l->>'unit_price')::numeric, (l->>'unit_price_max')::numeric,
        (l->>'quantity')::numeric, (l->>'cap_quantity')::numeric,
        (l->>'percent')::numeric, l->>'percent_base', (l->>'minimum_amount')::numeric,
        (l->>'alt_currency')::public.currency_code, (l->>'alt_unit_price')::numeric,
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

-- Optional, one-off (left commented on purpose): clear the visitor
-- free text already stored on demo quotes.
-- update public.quotes set source_text = null
--  where org_id in (select id from public.organizations where is_demo) and source_text is not null;

-- ── 4. Demo limit without a race ────────────────────────────
-- Count-then-insert ran without a lock: concurrent requests could all
-- read the same count and exceed 3/visitor and 40/day. A transaction
-- advisory lock serializes the check (released at commit; each RPC
-- call is its own transaction). Signature, security and grants as live.
create or replace function public.demo_generation_allowed(p_client_hash text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  per_client int;
  global_day int;
begin
  perform pg_advisory_xact_lock(hashtext('demo_generations'));
  select count(*) into per_client from private.demo_generations
    where client_hash = p_client_hash and created_at > now() - interval '1 day';
  select count(*) into global_day from private.demo_generations
    where created_at > now() - interval '1 day';
  if per_client >= 3 or global_day >= 40 then
    return false;
  end if;
  insert into private.demo_generations (client_hash) values (p_client_hash);
  return true;
end $$;
revoke execute on function public.demo_generation_allowed(text) from public, anon, authenticated;
grant execute on function public.demo_generation_allowed(text) to service_role;

-- ── 5. anon never writes; nobody needs TRUNCATE ────────────
-- Writes from the public side go through SECURITY DEFINER functions
-- (get_public_quote) or the service role (demo generation).
revoke insert, update, delete, truncate, references, trigger
  on public.organizations, public.memberships, public.clients, public.quotes,
     public.quote_options, public.quote_lines, public.payment_milestones,
     public.quote_events, public.quote_versions, public.quote_option_totals
  from anon;
revoke truncate
  on public.organizations, public.memberships, public.clients, public.quotes,
     public.quote_options, public.quote_lines, public.payment_milestones,
     public.quote_events, public.quote_versions, public.quote_option_totals
  from authenticated;
