# Olmo Cotiza

Generador de cotizaciones de Olmo sobre Supabase. El usuario escribe el alcance y los precios en texto libre; Claude los convierte en datos estructurados; la propuesta se arma con plantillas fijas del sistema de diseño de Olmo y queda guardada y consultable en Postgres.

## Estado

- [x] Esquema de datos: cotizaciones, opciones, líneas con 6 modelos de cobro, hitos de pago, eventos y versiones
- [x] RLS: organización privada (Olmo) y organización demo pública con datos ficticios
- [ ] Plantillas de la propuesta (portada, páginas internas, contraportada)
- [ ] Edge Function: texto libre → datos estructurados (API de Claude)
- [ ] App web y despliegue

## Estructura

```
supabase/
  migrations/   esquema y políticas RLS
  seed.sql      datos de la demo (todos ficticios)
```

## Modelos de cobro

`fixed` precio cerrado · `hourly` por hora con techo · `monthly` fijo mensual · `per_unit` por unidad · `percentage` porcentaje sobre una base · `pass_through` costo de terceros pagado directo al proveedor.
