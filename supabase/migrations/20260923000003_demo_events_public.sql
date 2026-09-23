-- Los eventos de la demo deben ser visibles para el panel público.
-- Los de Olmo siguen siendo solo para miembros.
drop policy "events: read" on public.quote_events;
create policy "events: read" on public.quote_events
  for select to anon, authenticated using (private.can_read(private.quote_org(quote_id)));
