-- Demo events must be visible to the public dashboard.
-- Olmo's events remain members-only.
drop policy "events: read" on public.quote_events;
create policy "events: read" on public.quote_events
  for select to anon, authenticated using (private.can_read(private.quote_org(quote_id)));
