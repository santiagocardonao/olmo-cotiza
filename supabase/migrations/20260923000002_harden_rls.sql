-- ============================================================
-- Hardening after the Supabase advisors (23 Sep 2026)
-- 1. RLS helper functions move from `public` (exposed by the API)
--    to `private` (not exposed). They stay executable by
--    anon/authenticated because the policies evaluate them as those roles.
-- 2. A single SELECT policy per table and role: write policies
--    are split into insert/update/delete.
-- 3. rls_auto_enable() pre-existed in the project and was callable
--    by anon through /rest/v1/rpc; execution is revoked.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create function private.is_member(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = (select auth.uid())
  );
$$;

create function private.is_demo_org(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select o.is_demo from public.organizations o where o.id = target_org), false);
$$;

create function private.quote_org(target_quote uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select q.org_id from public.quotes q where q.id = target_quote;
$$;

create function private.option_org(target_option uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select q.org_id from public.quote_options o join public.quotes q on q.id = o.quote_id
  where o.id = target_option;
$$;

create function private.can_read(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_demo_org(target_org) or private.is_member(target_org);
$$;

revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated;

-- ── Replace policies ─────────────────────────────────────
drop policy "orgs: read own or demo" on public.organizations;
drop policy "clients: read" on public.clients;
drop policy "clients: write members" on public.clients;
drop policy "quotes: read" on public.quotes;
drop policy "quotes: write members" on public.quotes;
drop policy "options: read" on public.quote_options;
drop policy "options: write members" on public.quote_options;
drop policy "lines: read" on public.quote_lines;
drop policy "lines: write members" on public.quote_lines;
drop policy "milestones: read" on public.payment_milestones;
drop policy "milestones: write members" on public.payment_milestones;
drop policy "events: read members" on public.quote_events;
drop policy "versions: read" on public.quote_versions;
drop policy "versions: write members" on public.quote_versions;

drop function public.is_member(uuid);
drop function public.is_demo_org(uuid);
drop function public.quote_org(uuid);
drop function public.option_org(uuid);

-- organizations
create policy "orgs: read" on public.organizations
  for select to anon, authenticated using (is_demo or private.is_member(id));

-- clients
create policy "clients: read"   on public.clients for select to anon, authenticated using (private.can_read(org_id));
create policy "clients: insert" on public.clients for insert to authenticated with check (private.is_member(org_id));
create policy "clients: update" on public.clients for update to authenticated using (private.is_member(org_id)) with check (private.is_member(org_id));
create policy "clients: delete" on public.clients for delete to authenticated using (private.is_member(org_id));

-- quotes
create policy "quotes: read"   on public.quotes for select to anon, authenticated using (private.can_read(org_id));
create policy "quotes: insert" on public.quotes for insert to authenticated with check (private.is_member(org_id));
create policy "quotes: update" on public.quotes for update to authenticated using (private.is_member(org_id)) with check (private.is_member(org_id));
create policy "quotes: delete" on public.quotes for delete to authenticated using (private.is_member(org_id));

-- quote_options
create policy "options: read"   on public.quote_options for select to anon, authenticated using (private.can_read(private.quote_org(quote_id)));
create policy "options: insert" on public.quote_options for insert to authenticated with check (private.is_member(private.quote_org(quote_id)));
create policy "options: update" on public.quote_options for update to authenticated using (private.is_member(private.quote_org(quote_id))) with check (private.is_member(private.quote_org(quote_id)));
create policy "options: delete" on public.quote_options for delete to authenticated using (private.is_member(private.quote_org(quote_id)));

-- quote_lines
create policy "lines: read"   on public.quote_lines for select to anon, authenticated using (private.can_read(private.option_org(option_id)));
create policy "lines: insert" on public.quote_lines for insert to authenticated with check (private.is_member(private.option_org(option_id)));
create policy "lines: update" on public.quote_lines for update to authenticated using (private.is_member(private.option_org(option_id))) with check (private.is_member(private.option_org(option_id)));
create policy "lines: delete" on public.quote_lines for delete to authenticated using (private.is_member(private.option_org(option_id)));

-- payment_milestones
create policy "milestones: read"   on public.payment_milestones for select to anon, authenticated using (private.can_read(private.quote_org(quote_id)));
create policy "milestones: insert" on public.payment_milestones for insert to authenticated with check (private.is_member(private.quote_org(quote_id)));
create policy "milestones: update" on public.payment_milestones for update to authenticated using (private.is_member(private.quote_org(quote_id))) with check (private.is_member(private.quote_org(quote_id)));
create policy "milestones: delete" on public.payment_milestones for delete to authenticated using (private.is_member(private.quote_org(quote_id)));

-- quote_events: members only read
create policy "events: read" on public.quote_events
  for select to authenticated using (private.is_member(private.quote_org(quote_id)));

-- quote_versions
create policy "versions: read"   on public.quote_versions for select to anon, authenticated using (private.can_read(private.quote_org(quote_id)));
create policy "versions: insert" on public.quote_versions for insert to authenticated with check (private.is_member(private.quote_org(quote_id)));
create policy "versions: update" on public.quote_versions for update to authenticated using (private.is_member(private.quote_org(quote_id))) with check (private.is_member(private.quote_org(quote_id)));
create policy "versions: delete" on public.quote_versions for delete to authenticated using (private.is_member(private.quote_org(quote_id)));

-- ── Missing index ──────────────────────────────────────────
create index quotes_created_by_idx on public.quotes(created_by);

-- ── Pre-existing project function ────────────────────────
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
