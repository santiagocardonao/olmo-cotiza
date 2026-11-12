-- ============================================================
-- Public demo (11 Nov 2026)
-- 1. Generating in the demo requires an email. Limits per day:
--    3 per email, 3 per browser (IP + user agent), 40 in total.
--    The email is kept only here (private schema), with the
--    visitor's opt-in for news from Olmo.
-- 2. Quotes created by visitors are deleted after 7 days. The five
--    sample quotes (slug 'demo-…') stay.
-- 3. The sample quotes get dates relative to today every night, so
--    the demo dashboard always has quotes in progress, about to
--    expire, unopened and accepted.
-- ============================================================

-- ── 1. Email on demo generations ────────────────────────────
alter table private.demo_generations
  add column if not exists email text,
  add column if not exists marketing_consent boolean not null default false;
create index if not exists demo_generations_email_idx
  on private.demo_generations (email, created_at desc);

create or replace function public.demo_generation_allowed(p_client_hash text, p_email text, p_consent boolean default false)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email    text := lower(trim(p_email));
  per_client int;
  per_email  int;
  global_day int;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('demo_generations'));
  select count(*) into per_client from private.demo_generations
    where client_hash = p_client_hash and created_at > now() - interval '1 day';
  select count(*) into per_email from private.demo_generations
    where email = v_email and created_at > now() - interval '1 day';
  select count(*) into global_day from private.demo_generations
    where created_at > now() - interval '1 day';
  if per_client >= 3 or per_email >= 3 or global_day >= 40 then
    return false;
  end if;
  insert into private.demo_generations (client_hash, email, marketing_consent)
  values (p_client_hash, v_email, coalesce(p_consent, false));
  return true;
end $$;
revoke execute on function public.demo_generation_allowed(text, text, boolean) from public, anon, authenticated;
grant execute on function public.demo_generation_allowed(text, text, boolean) to service_role;

-- ── 2. Visitor quotes last 7 days ───────────────────────────
create or replace function private.prune_demo_quotes(max_age interval default interval '7 days')
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  with gone as (
    delete from public.quotes q
    using public.organizations o
    where o.id = q.org_id and o.is_demo
      and q.public_slug not like 'demo-%'
      and q.created_at < now() - max_age
    returning 1
  ) select count(*) into n from gone;

  -- Clients left without quotes (the five sample clients always have one).
  delete from public.clients c
  using public.organizations o
  where o.id = c.org_id and o.is_demo
    and not exists (select 1 from public.quotes q where q.client_id = c.id);
  return n;
end $$;
revoke execute on function private.prune_demo_quotes(interval) from public, anon, authenticated;

-- ── 3. Sample quotes with dates relative to today ──────────
create or replace function private.refresh_demo_samples()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'America/Bogota')::date;
  -- slug, status, days ago issued, validity
  s record;
begin
  for s in select * from (values
    ('demo-cafe-aurora',    'sent'::public.quote_status,     12, 15),  -- expires in 3 days, opened
    ('demo-estudio-norte',  'accepted'::public.quote_status, 20, 15),
    ('demo-veranda-dental', 'sent'::public.quote_status,      2,  8),  -- not opened yet
    ('demo-tallo',          'accepted'::public.quote_status, 35, 30),
    ('demo-nodo-legal',     'expired'::public.quote_status,  45, 15)
  ) v(slug, status, ago, valid) loop
    update public.quotes
       set status = s.status, issued_on = d - s.ago, valid_days = s.valid,
           created_at = ((d - s.ago)::timestamp + time '09:00') at time zone 'America/Bogota'
     where public_slug = s.slug;
  end loop;

  delete from public.quote_events e
   using public.quotes q
   where q.id = e.quote_id and q.public_slug like 'demo-%';

  insert into public.quote_events (quote_id, type, occurred_at)
  select q.id, ev.type::public.quote_event_type,
         ((d - ev.ago)::timestamp + ev.at) at time zone 'America/Bogota'
  from (values
    ('demo-cafe-aurora',    'sent',     12, time '15:10'),
    ('demo-cafe-aurora',    'viewed',   11, time '09:42'),
    ('demo-cafe-aurora',    'viewed',    4, time '18:05'),
    ('demo-estudio-norte',  'sent',     20, time '11:00'),
    ('demo-estudio-norte',  'viewed',   20, time '18:25'),
    ('demo-estudio-norte',  'accepted', 17, time '10:03'),
    ('demo-veranda-dental', 'sent',      2, time '16:40'),
    ('demo-tallo',          'sent',     35, time '16:30'),
    ('demo-tallo',          'viewed',   34, time '08:12'),
    ('demo-tallo',          'accepted', 33, time '12:15'),
    ('demo-nodo-legal',     'sent',     45, time '10:00'),
    ('demo-nodo-legal',     'viewed',   43, time '20:31')
  ) ev(slug, type, ago, at)
  join public.quotes q on q.public_slug = ev.slug;
end $$;
revoke execute on function private.refresh_demo_samples() from public, anon, authenticated;

-- Nightly, after expire-quotes (05:05 UTC): 05:15 UTC = 00:15 Bogotá.
select cron.unschedule(jobid) from cron.job where jobname = 'demo-maintenance';
select cron.schedule('demo-maintenance', '15 5 * * *',
  'select private.prune_demo_quotes(); select private.refresh_demo_samples();');

-- First run now. Visitor quotes made before today are removed at once
-- (approved by the owner on 11 Nov 2026; a JSON backup was taken).
select private.prune_demo_quotes(interval '0 seconds');
select private.refresh_demo_samples();
