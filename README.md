# Olmo Cotiza

Generador de cotizaciones de Olmo sobre Supabase. Escribes el alcance y los precios en texto libre; Claude los convierte en datos estructurados; la propuesta se arma con plantillas fijas del sistema de diseño de Olmo y queda guardada y consultable en Postgres: cuánto se cotizó, a quién, qué se abrió y qué se cerró.

**En vivo:** [cotiza.olmo.agency](https://cotiza.olmo.agency) · [demo pública](https://cotiza.olmo.agency/demo) (datos ficticios)

## Cómo funciona

```
Texto libre + precios
  → Edge Function generate-quote → Claude (salida estructurada, validada con Zod)
  → reglas de negocio (hitos que suman 100, horas en cobros por hora, …)
  → create_quote(): una sola transacción en Postgres, bajo RLS
  → plantillas HTML (templates/) → vista previa, enlace público y PDF con texto real
```

El modelo redacta y estructura; **el diseño lo ponen las plantillas**, así que cada propuesta sale consistente con el sistema de Olmo.

## Estructura

```
supabase/
  migrations/          esquema, RLS, enlace público, vencimiento (pg_cron), create_quote()
  functions/generate-quote/   Edge Function: texto libre → cotización guardada
  seed.sql             demo: 5 cotizaciones ficticias, una por modelo de cobro
templates/             propuesta A4 sin dependencias (portada, intro, alcance, inversión,
                       proceso, contraportada) + tokens y fuentes de Olmo
app/                   Vite + React: panel, nueva cotización, detalle, vista del cliente
```

## Modelo de datos

- `organizations` separa **Olmo** (privada) de **Demo** (pública, solo lectura para visitantes).
- `quotes` → `quote_options` → `quote_lines`. Cada línea tiene su **modelo de cobro**:
  `fixed` precio cerrado · `hourly` por hora con techo · `monthly` fijo mensual · `per_unit` por unidad · `percentage` sobre una base · `pass_through` costo de terceros pagado directo al proveedor.
- `payment_milestones`, `quote_events` (creada, enviada, abierta, aceptada) y `quote_versions`.

## Seguridad

- RLS en todas las tablas. Las funciones auxiliares de RLS viven en el esquema `private`, fuera de la API.
- La demo es de solo lectura para visitantes; sus escrituras pasan por la Edge Function con límite diario (3 por visitante, 40 en total).
- `get_public_quote(slug)` es público a propósito: el slug de cada cotización real es aleatorio (72 bits) y los borradores de Olmo no se exponen.
- El dueño queda como `owner` de Olmo automáticamente al registrarse con su correo.

## Desarrollo

```bash
cd app
npm install
npm run dev      # sincroniza templates/ en public/proposal y abre Vite
npm run deploy   # build + rsync a SiteGround por SSH
```

La Edge Function necesita el secret `ANTHROPIC_API_KEY` en Supabase.
