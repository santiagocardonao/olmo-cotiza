-- ============================================================
-- Casos reales que el modelo no cubría (propuesta de asesoría mensual):
-- 1. hourly sin horas estimadas = tarifa por hora a demanda.
-- 2. monthly con quantity = compromiso mínimo en meses.
-- ============================================================
alter table public.quote_lines drop constraint line_fields_match_model;
alter table public.quote_lines add constraint line_fields_match_model check (
  case pricing_model
    when 'fixed'        then unit_price is not null and percent is null
    when 'monthly'      then unit_price is not null and percent is null
    when 'pass_through' then unit_price is not null and percent is null
    when 'hourly'       then unit_price is not null and percent is null
                             and (cap_quantity is null or quantity is not null)  -- un techo exige estimado
    when 'per_unit'     then unit_price is not null and percent is null
    when 'percentage'   then percent is not null and percent_base is not null and unit_price is null
  end
);
comment on column public.quote_lines.quantity is
  'hourly: horas estimadas (null = a demanda). per_unit: unidades. monthly: compromiso mínimo en meses.';
