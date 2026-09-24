-- ============================================================
-- Public link, automatic expiry, owner access and
-- demo usage limit.
-- ============================================================

-- ── Public link /p/<slug> ─────────────────────────────────
-- Any quote (demo or real) can be opened with its slug,
-- which is unguessable. Returns the full quote as JSON
-- and records the open. Drafts are never exposed.
create function public.get_public_quote(slug text)
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

  -- Only counts as an open if the viewer is not a member of the organization.
  if not private.is_member(q.org_id) then
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

revoke execute on function public.get_public_quote(text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;

-- ── Automatic expiry ──────────────────────────────────
create function private.expire_quotes() returns integer
language sql security definer set search_path = '' as $$
  with done as (
    update public.quotes set status = 'expired'
    where status = 'sent' and expires_on < current_date
    returning 1
  ) select count(*)::int from done;
$$;
revoke execute on function private.expire_quotes() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('expire-quotes', '5 5 * * *', 'select private.expire_quotes()');  -- 00:05 Colombia time

-- ── Olmo owner ───────────────────────────────────────────
-- Signing up with the owner's email makes that account owner of the
-- private organization. Any other sign-up only sees the demo.
create table private.org_owners (
  email   text primary key,
  org_id  uuid not null references public.organizations(id) on delete cascade
);
insert into private.org_owners values
  ('santiagocardonaortiz@gmail.com', '00000000-0000-4000-8000-00000000a000');

create function private.grant_owner_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.memberships (org_id, user_id, role)
  select o.org_id, new.id, 'owner' from private.org_owners o
  where lower(o.email) = lower(new.email)
  on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created_grant_owner
  after insert on auth.users
  for each row execute function private.grant_owner_membership();

-- ── Demo usage limit ────────────────────────────────
-- The Edge Function records every demo generation and rejects
-- requests past the limit. Only the service role writes here.
create table private.demo_generations (
  id          bigint generated always as identity primary key,
  client_hash text not null,
  created_at  timestamptz not null default now()
);
create index demo_generations_hash_idx on private.demo_generations(client_hash, created_at desc);

create function public.demo_generation_allowed(p_client_hash text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  per_client int;
  global_day int;
begin
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
