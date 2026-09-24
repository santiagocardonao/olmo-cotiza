-- ============================================================
-- Olmo Cotiza — initial schema
-- A quote has options; each option has lines with their own
-- pricing model, unit and currency. Organizations keep the real
-- data (Olmo, private) apart from the demo (public, fictional).
-- ============================================================

-- ── Types ────────────────────────────────────────────────────
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type public.quote_language as enum ('es', 'en');
create type public.currency_code as enum ('COP', 'USD', 'EUR');
create type public.pricing_model as enum (
  'fixed',        -- fixed price
  'hourly',       -- per hour, with an optional cap
  'monthly',      -- fixed monthly fee
  'per_unit',     -- per unit (page, module, quiz)
  'percentage',   -- percentage of a base (e.g. processed payments)
  'pass_through'  -- third-party cost, paid directly to the vendor
);
create type public.member_role as enum ('owner', 'editor');
create type public.quote_event_type as enum ('created', 'sent', 'viewed', 'accepted', 'rejected');

-- ── Organizations and memberships ──────────────────────────────
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.memberships (
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.member_role not null default 'editor',
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- ── Clients ─────────────────────────────────────────────────
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  sector      text,
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);
create index clients_org_idx on public.clients(org_id);

-- ── Quotes ─────────────────────────────────────────────
create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete restrict,
  -- unguessable public link: /p/<public_slug>
  public_slug   text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  prepared_for  text not null,                 -- "Sofía", "Laura y Tomás"
  title         text not null,                 -- cover line 1
  title_accent  text,                          -- cover line 2, italic serif
  summary       text,                          -- cover subtitle
  language      public.quote_language not null default 'es',
  currency      public.currency_code not null default 'COP',  -- main currency
  status        public.quote_status not null default 'draft',
  issued_on     date not null default current_date,
  valid_days    smallint not null default 15 check (valid_days in (8, 15, 30)),
  expires_on    date generated always as (issued_on + valid_days) stored,
  source_text   text,                          -- the original free text the user wrote
  copy          jsonb not null default '{}'::jsonb,  -- drafted copy: intro, closing, method
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index quotes_org_idx on public.quotes(org_id);
create index quotes_client_idx on public.quotes(client_id);
create index quotes_status_expires_idx on public.quotes(status, expires_on);

-- ── Options (side by side; one may be the recommended one) ─────
create table public.quote_options (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  position        smallint not null default 0,
  name            text not null,               -- "Sitio en español"
  description     text,
  is_recommended  boolean not null default false,
  unique (quote_id, position)
);
create index quote_options_quote_idx on public.quote_options(quote_id);
-- at most one recommended option per quote
create unique index quote_options_one_recommended
  on public.quote_options(quote_id) where is_recommended;

-- ── Lines: each with its own pricing model ──────────────────
create table public.quote_lines (
  id              uuid primary key default gen_random_uuid(),
  option_id       uuid not null references public.quote_options(id) on delete cascade,
  position        smallint not null default 0,
  label           text not null,               -- "Diseño y desarrollo en Framer"
  detail          text,
  pricing_model   public.pricing_model not null,
  currency        public.currency_code not null,
  unit_price      numeric(14,2),               -- price, hourly rate, monthly fee, unit price
  quantity        numeric(10,2),               -- estimated hours, units
  cap_quantity    numeric(10,2),               -- cap on hours/units
  percent         numeric(5,2),                -- 'percentage' only
  percent_base    text,                        -- "pagos procesados"
  minimum_amount  numeric(14,2),               -- minimum for 'percentage'
  is_optional     boolean not null default false,
  unique (option_id, position),
  constraint line_fields_match_model check (
    case pricing_model
      when 'fixed'        then unit_price is not null and percent is null
      when 'monthly'      then unit_price is not null and percent is null
      when 'pass_through' then unit_price is not null and percent is null
      when 'hourly'       then unit_price is not null and quantity is not null and percent is null
      when 'per_unit'     then unit_price is not null and percent is null
      when 'percentage'   then percent is not null and percent_base is not null and unit_price is null
    end
  ),
  constraint cap_not_below_quantity check (cap_quantity is null or quantity is null or cap_quantity >= quantity)
);
create index quote_lines_option_idx on public.quote_lines(option_id);

-- ── Payment milestones ────────────────────────────────────────────
create table public.payment_milestones (
  id        uuid primary key default gen_random_uuid(),
  quote_id  uuid not null references public.quotes(id) on delete cascade,
  position  smallint not null default 0,
  label     text not null,                     -- "Al aprobar la propuesta"
  percent   numeric(5,2) not null check (percent > 0 and percent <= 100),
  unique (quote_id, position)
);
create index payment_milestones_quote_idx on public.payment_milestones(quote_id);

-- ── Events (sent, link opened, accepted) ────────
create table public.quote_events (
  id          bigint generated always as identity primary key,
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  type        public.quote_event_type not null,
  occurred_at timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb
);
create index quote_events_quote_idx on public.quote_events(quote_id, occurred_at desc);

-- ── Rendered versions (HTML/PDF in Storage) ────────────
create table public.quote_versions (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  version     integer not null,
  html_path   text,
  pdf_path    text,
  created_at  timestamptz not null default now(),
  unique (quote_id, version)
);

-- ── updated_at ───────────────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

-- ── Totals per option (only what can be added up) ─────────
-- 'fixed' + 'hourly' (rate × hours) + 'per_unit' with quantity = one-off total.
-- 'monthly' and 'pass_through' are reported separately; 'percentage' is not added.
create view public.quote_option_totals
with (security_invoker = true) as
select
  o.id as option_id,
  o.quote_id,
  l.currency,
  sum(case
        when l.pricing_model = 'fixed' then l.unit_price
        when l.pricing_model in ('hourly', 'per_unit') and l.quantity is not null then l.unit_price * l.quantity
        else 0 end) filter (where not l.is_optional) as one_time_total,
  sum(l.unit_price) filter (where l.pricing_model = 'monthly' and not l.is_optional) as monthly_total,
  sum(l.unit_price) filter (where l.pricing_model = 'pass_through') as third_party_monthly
from public.quote_options o
join public.quote_lines l on l.option_id = o.id
group by o.id, o.quote_id, l.currency;

-- ============================================================
-- Security (RLS)
-- Members see and edit their own organization. Anyone, even without
-- a session, can READ the demo organization. Writes to the demo
-- only happen through the Edge Function (service role, rate-limited).
-- ============================================================
create function public.is_member(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = (select auth.uid())
  );
$$;

create function public.is_demo_org(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select o.is_demo from public.organizations o where o.id = target_org), false);
$$;

create function public.quote_org(target_quote uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select q.org_id from public.quotes q where q.id = target_quote;
$$;

create function public.option_org(target_option uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select q.org_id from public.quote_options o join public.quotes q on q.id = o.quote_id
  where o.id = target_option;
$$;

revoke execute on function public.is_member(uuid), public.is_demo_org(uuid),
  public.quote_org(uuid), public.option_org(uuid) from public;
grant execute on function public.is_member(uuid), public.is_demo_org(uuid),
  public.quote_org(uuid), public.option_org(uuid) to anon, authenticated;

alter table public.organizations      enable row level security;
alter table public.memberships        enable row level security;
alter table public.clients            enable row level security;
alter table public.quotes             enable row level security;
alter table public.quote_options      enable row level security;
alter table public.quote_lines        enable row level security;
alter table public.payment_milestones enable row level security;
alter table public.quote_events       enable row level security;
alter table public.quote_versions     enable row level security;

-- organizations
create policy "orgs: read own or demo" on public.organizations
  for select to anon, authenticated
  using (is_demo or public.is_member(id));

-- memberships: each user sees their own
create policy "memberships: read own" on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

-- clients
create policy "clients: read" on public.clients
  for select to anon, authenticated
  using (public.is_demo_org(org_id) or public.is_member(org_id));
create policy "clients: write members" on public.clients
  for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));

-- quotes
create policy "quotes: read" on public.quotes
  for select to anon, authenticated
  using (public.is_demo_org(org_id) or public.is_member(org_id));
create policy "quotes: write members" on public.quotes
  for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));

-- quote_options
create policy "options: read" on public.quote_options
  for select to anon, authenticated
  using (public.is_demo_org(public.quote_org(quote_id)) or public.is_member(public.quote_org(quote_id)));
create policy "options: write members" on public.quote_options
  for all to authenticated
  using (public.is_member(public.quote_org(quote_id)))
  with check (public.is_member(public.quote_org(quote_id)));

-- quote_lines
create policy "lines: read" on public.quote_lines
  for select to anon, authenticated
  using (public.is_demo_org(public.option_org(option_id)) or public.is_member(public.option_org(option_id)));
create policy "lines: write members" on public.quote_lines
  for all to authenticated
  using (public.is_member(public.option_org(option_id)))
  with check (public.is_member(public.option_org(option_id)));

-- payment_milestones
create policy "milestones: read" on public.payment_milestones
  for select to anon, authenticated
  using (public.is_demo_org(public.quote_org(quote_id)) or public.is_member(public.quote_org(quote_id)));
create policy "milestones: write members" on public.payment_milestones
  for all to authenticated
  using (public.is_member(public.quote_org(quote_id)))
  with check (public.is_member(public.quote_org(quote_id)));

-- quote_events: only members read them; link opens are
-- recorded by the public-link Edge Function.
create policy "events: read members" on public.quote_events
  for select to authenticated
  using (public.is_member(public.quote_org(quote_id)));

-- quote_versions
create policy "versions: read" on public.quote_versions
  for select to anon, authenticated
  using (public.is_demo_org(public.quote_org(quote_id)) or public.is_member(public.quote_org(quote_id)));
create policy "versions: write members" on public.quote_versions
  for all to authenticated
  using (public.is_member(public.quote_org(quote_id)))
  with check (public.is_member(public.quote_org(quote_id)));
