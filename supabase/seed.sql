-- ============================================================
-- Olmo Cotiza — datos de la organización DEMO
-- Todo es ficticio: clientes, contactos, alcances y precios.
-- Los precios caen dentro de rangos reales de Olmo, pero ninguno
-- replica una cotización real.
-- ============================================================

insert into public.organizations (id, slug, name, is_demo) values
  ('00000000-0000-4000-8000-00000000d000', 'demo', 'Olmo · Demo', true),
  ('00000000-0000-4000-8000-00000000a000', 'olmo', 'Olmo', false)
on conflict (id) do nothing;

insert into public.clients (id, org_id, name, sector) values
  ('00000000-0000-4000-8000-0000000c0001', '00000000-0000-4000-8000-00000000d000', 'Café Aurora',    'Café de especialidad'),
  ('00000000-0000-4000-8000-0000000c0002', '00000000-0000-4000-8000-00000000d000', 'Estudio Norte',  'Arquitectura'),
  ('00000000-0000-4000-8000-0000000c0003', '00000000-0000-4000-8000-00000000d000', 'Veranda Dental', 'Odontología'),
  ('00000000-0000-4000-8000-0000000c0004', '00000000-0000-4000-8000-00000000d000', 'Tallo',          'Moda sostenible'),
  ('00000000-0000-4000-8000-0000000c0005', '00000000-0000-4000-8000-00000000d000', 'Nodo Legal',     'Firma de abogados');

-- ── Cotizaciones ─────────────────────────────────────────────
insert into public.quotes
  (id, org_id, client_id, public_slug, prepared_for, title, title_accent, summary, status, issued_on, valid_days)
values
  ('00000000-0000-4000-8000-0000000e0001', '00000000-0000-4000-8000-00000000d000', '00000000-0000-4000-8000-0000000c0001',
   'demo-cafe-aurora', 'Mariana', 'Tienda en Shopify', 'para Café Aurora.',
   'Cinco páginas y una tienda lista para vender café en línea. Precio cerrado, con opción bilingüe.',
   'sent', '2026-09-18', 15),
  ('00000000-0000-4000-8000-0000000e0002', '00000000-0000-4000-8000-00000000d000', '00000000-0000-4000-8000-0000000c0002',
   'demo-estudio-norte', 'Andrés', 'Portafolio en Framer', 'para Estudio Norte.',
   'Seis páginas para mostrar proyectos con la calidad que merecen. Precio cerrado.',
   'accepted', '2026-09-02', 15),
  ('00000000-0000-4000-8000-0000000e0003', '00000000-0000-4000-8000-00000000d000', '00000000-0000-4000-8000-0000000c0003',
   'demo-veranda-dental', 'Laura y Tomás', 'Landing y agendamiento', 'para Veranda Dental.',
   'Una página que convierte visitas en citas. Se cobran horas, con techo claro.',
   'draft', '2026-09-22', 8),
  ('00000000-0000-4000-8000-0000000e0004', '00000000-0000-4000-8000-00000000d000', '00000000-0000-4000-8000-0000000c0004',
   'demo-tallo', 'Valentina', 'Asesoría de contenido', 'para Tallo.',
   'Acompañamiento mensual para que la marca publique con criterio. Sin permanencia.',
   'accepted', '2026-08-25', 30),
  ('00000000-0000-4000-8000-0000000e0005', '00000000-0000-4000-8000-00000000d000', '00000000-0000-4000-8000-0000000c0005',
   'demo-nodo-legal', 'Camilo', 'Portal de clientes', 'para Nodo Legal.',
   'Un espacio privado donde cada cliente consulta el estado de su caso. Módulos a la medida.',
   'expired', '2026-08-10', 15);

-- ── Opciones ─────────────────────────────────────────────────
insert into public.quote_options (id, quote_id, position, name, description, is_recommended) values
  -- Café Aurora: dos opciones lado a lado
  ('00000000-0000-4000-8000-00000000f101', '00000000-0000-4000-8000-0000000e0001', 1, 'Tienda en español', null, true),
  ('00000000-0000-4000-8000-00000000f102', '00000000-0000-4000-8000-0000000e0001', 2, 'Español + inglés', 'Todo lo de la opción 1, en dos idiomas.', false),
  -- Estudio Norte
  ('00000000-0000-4000-8000-00000000f201', '00000000-0000-4000-8000-0000000e0002', 1, 'Portafolio en Framer', null, false),
  -- Veranda Dental
  ('00000000-0000-4000-8000-00000000f301', '00000000-0000-4000-8000-0000000e0003', 1, 'Landing + agendamiento', null, false),
  -- Tallo
  ('00000000-0000-4000-8000-00000000f401', '00000000-0000-4000-8000-0000000e0004', 1, 'Asesoría mensual', null, false),
  -- Nodo Legal
  ('00000000-0000-4000-8000-00000000f501', '00000000-0000-4000-8000-0000000e0005', 1, 'Portal base', null, false),
  ('00000000-0000-4000-8000-00000000f502', '00000000-0000-4000-8000-0000000e0005', 2, 'Portal + 3 módulos', 'Todo lo del portal base, con tres módulos a elección.', true);

-- ── Líneas ───────────────────────────────────────────────────
insert into public.quote_lines
  (option_id, position, label, detail, pricing_model, currency, unit_price, quantity, cap_quantity, is_optional)
values
  -- Café Aurora · opción 1
  ('00000000-0000-4000-8000-00000000f101', 1, 'Diseño y desarrollo en Shopify', 'Home, catálogo, producto, nosotros y contacto. Pasarela de pagos integrada.', 'fixed', 'COP', 6800000, null, null, false),
  ('00000000-0000-4000-8000-00000000f101', 2, 'Plan de Shopify', 'Se paga directo a Shopify.', 'pass_through', 'USD', 25, null, null, false),
  -- Café Aurora · opción 2
  ('00000000-0000-4000-8000-00000000f102', 1, 'Diseño y desarrollo en Shopify', 'Todo lo de la opción 1.', 'fixed', 'COP', 6800000, null, null, false),
  ('00000000-0000-4000-8000-00000000f102', 2, 'Segundo idioma (inglés)', 'Traducción y configuración del sitio en inglés.', 'fixed', 'COP', 1000000, null, null, false),
  ('00000000-0000-4000-8000-00000000f102', 3, 'Plan de Shopify', 'Se paga directo a Shopify.', 'pass_through', 'USD', 25, null, null, false),
  -- Estudio Norte
  ('00000000-0000-4000-8000-00000000f201', 1, 'Diseño y desarrollo en Framer', 'Seis páginas: inicio, proyectos, detalle de proyecto, estudio, prensa y contacto.', 'fixed', 'COP', 3400000, null, null, false),
  ('00000000-0000-4000-8000-00000000f201', 2, 'Página adicional', 'Si el alcance crece durante el proyecto.', 'per_unit', 'USD', 90, null, null, true),
  ('00000000-0000-4000-8000-00000000f201', 3, 'Plan de Framer', 'Se paga directo a Framer.', 'pass_through', 'USD', 15, null, null, false),
  -- Veranda Dental
  ('00000000-0000-4000-8000-00000000f301', 1, 'Landing y agendamiento en línea', 'Diseño, desarrollo e integración con el calendario de la clínica.', 'hourly', 'COP', 150000, 24, 24, false),
  -- Tallo
  ('00000000-0000-4000-8000-00000000f401', 1, 'Asesoría de contenido', 'Cuatro sesiones al mes y un entregable de contenido por semana.', 'monthly', 'COP', 1500000, null, null, false),
  ('00000000-0000-4000-8000-00000000f401', 2, 'Horas adicionales', 'Solo si se piden entregables fuera del plan.', 'per_unit', 'COP', 150000, null, null, true),
  -- Nodo Legal · base
  ('00000000-0000-4000-8000-00000000f501', 1, 'Portal de clientes', 'Acceso privado, estado de casos y documentos por cliente.', 'fixed', 'COP', 4500000, null, null, false),
  ('00000000-0000-4000-8000-00000000f501', 2, 'Infraestructura', 'Base de datos y hosting. Se paga directo a los proveedores.', 'pass_through', 'USD', 40, null, null, false),
  -- Nodo Legal · con módulos
  ('00000000-0000-4000-8000-00000000f502', 1, 'Portal de clientes', 'Todo lo del portal base.', 'fixed', 'COP', 4500000, null, null, false),
  ('00000000-0000-4000-8000-00000000f502', 2, 'Módulos a la medida', 'Ejemplos: firma de documentos, agenda, facturación.', 'per_unit', 'COP', 280000, 3, null, false),
  ('00000000-0000-4000-8000-00000000f502', 3, 'Infraestructura', 'Base de datos y hosting. Se paga directo a los proveedores.', 'pass_through', 'USD', 40, null, null, false);

-- ── Hitos de pago ────────────────────────────────────────────
insert into public.payment_milestones (quote_id, position, label, percent) values
  ('00000000-0000-4000-8000-0000000e0001', 1, 'Al aprobar la propuesta', 50),
  ('00000000-0000-4000-8000-0000000e0001', 2, 'A la entrega del sitio', 50),
  ('00000000-0000-4000-8000-0000000e0002', 1, 'Al aprobar la propuesta', 50),
  ('00000000-0000-4000-8000-0000000e0002', 2, 'A la entrega del sitio', 50),
  ('00000000-0000-4000-8000-0000000e0003', 1, 'Al iniciar', 50),
  ('00000000-0000-4000-8000-0000000e0003', 2, 'Según horas trabajadas, al entregar', 50),
  ('00000000-0000-4000-8000-0000000e0005', 1, 'Al aprobar la propuesta', 50),
  ('00000000-0000-4000-8000-0000000e0005', 2, 'A la entrega del portal', 50);

-- ── Eventos, para que el panel tenga historia ───────────────
insert into public.quote_events (quote_id, type, occurred_at) values
  ('00000000-0000-4000-8000-0000000e0001', 'sent',     '2026-09-18 15:10-05'),
  ('00000000-0000-4000-8000-0000000e0001', 'viewed',   '2026-09-19 09:42-05'),
  ('00000000-0000-4000-8000-0000000e0002', 'sent',     '2026-09-02 11:00-05'),
  ('00000000-0000-4000-8000-0000000e0002', 'viewed',   '2026-09-02 18:25-05'),
  ('00000000-0000-4000-8000-0000000e0002', 'accepted', '2026-09-05 10:03-05'),
  ('00000000-0000-4000-8000-0000000e0004', 'sent',     '2026-08-25 16:30-05'),
  ('00000000-0000-4000-8000-0000000e0004', 'accepted', '2026-08-27 12:15-05'),
  ('00000000-0000-4000-8000-0000000e0005', 'sent',     '2026-08-10 10:00-05');
