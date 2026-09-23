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

-- ── Textos de las páginas internas (quotes.copy) ─────────────
update public.quotes set copy = $j${
  "intro": {"heading": "Hola Mariana. Esto es", "accent": "lo que proponemos.",
    "body": "Café Aurora ya vende bien en su tienda física. El siguiente paso es vender en línea sin depender de nadie para cada cambio. Proponemos Shopify: cinco páginas, catálogo ordenado y pagos integrados. El precio es cerrado y se paga en dos partes iguales."},
  "highlights": [
    {"title": "Precio cerrado", "body": "Sabes desde el inicio cuánto inviertes. Sin horas extra ni sorpresas."},
    {"title": "Autonomía total", "body": "Tu equipo actualiza productos y precios sin escribirnos."},
    {"title": "Comunicación directa", "body": "Hablas con quien diseña y desarrolla, por WhatsApp."}],
  "includes": ["Home, catálogo, producto, nosotros y contacto", "Integración de pasarela de pagos", "Borradores de textos legales", "Capacitación de una hora para tu equipo"],
  "excludes": ["Fotografía de producto", "Mensualidad de Shopify", "Dominio"],
  "notes": ["Shopify cobra una comisión del 2% por venta si no usas Shopify Payments.", "Las pasarelas de pago cobran cerca del 3% por transacción."],
  "process": [
    {"title": "Descubrimiento", "body": "Una reunión para entender el catálogo y cómo compran tus clientes."},
    {"title": "Diseño", "body": "Te mostramos la tienda completa antes de construirla."},
    {"title": "Desarrollo", "body": "Construimos, cargamos productos y conectamos pagos."},
    {"title": "Entrega", "body": "Publicamos, capacitamos a tu equipo y quedas en control."}],
  "closing": {"heading": "Gracias, Mariana.", "accent": "Cuando digas, arrancamos.",
    "body": "Si quieres ajustar el alcance o revisar la inversión, escríbenos y lo resolvemos en una conversación."}
}$j$::jsonb where public_slug = 'demo-cafe-aurora';

update public.quotes set copy = $j${
  "intro": {"heading": "Hola Andrés. Sus proyectos", "accent": "merecen una vitrina así.",
    "body": "Estudio Norte tiene obra que habla por sí sola. Proponemos un portafolio en Framer: seis páginas, rápido de cargar y fácil de actualizar cada vez que terminen un proyecto."},
  "highlights": [
    {"title": "Precio cerrado", "body": "Una inversión fija, en dos pagos iguales."},
    {"title": "Ustedes actualizan", "body": "Suben un proyecto nuevo en minutos, sin tocar código."},
    {"title": "Rápido de verdad", "body": "Imágenes grandes que cargan rápido en cualquier dispositivo."}],
  "includes": ["Seis páginas: inicio, proyectos, detalle, estudio, prensa y contacto", "Plantilla reutilizable para cada proyecto", "SEO básico y formulario de contacto"],
  "excludes": ["Fotografía y renders", "Mensualidad de Framer", "Dominio"],
  "notes": ["Si el alcance crece, cada página adicional cuesta 90 USD."],
  "process": [
    {"title": "Selección", "body": "Elegimos juntos los proyectos que abren el portafolio."},
    {"title": "Diseño", "body": "Diseñamos las seis páginas y las revisan antes de construir."},
    {"title": "Construcción", "body": "Montamos el sitio en Framer con su contenido real."},
    {"title": "Entrega", "body": "Publicamos y les mostramos cómo agregar proyectos."}],
  "closing": {"heading": "Gracias, Andrés.", "accent": "Empezamos cuando digan.",
    "body": "Cualquier ajuste al alcance lo resolvemos antes de arrancar."}
}$j$::jsonb where public_slug = 'demo-estudio-norte';

update public.quotes set copy = $j${
  "intro": {"heading": "Hola Laura y Tomás. Una página", "accent": "que llena la agenda.",
    "body": "Veranda Dental recibe visitas pero pocas citas en línea. Proponemos una landing enfocada en una sola acción: agendar. Cobramos por horas, con un techo claro de 24 horas."},
  "highlights": [
    {"title": "Techo claro", "body": "Nunca pagan más de 24 horas, aunque tardemos más."},
    {"title": "Una sola meta", "body": "Cada sección empuja al paciente a agendar."},
    {"title": "Integración real", "body": "Conectada al calendario que ya usa la clínica."}],
  "includes": ["Landing de una página", "Integración con el calendario de la clínica", "Formulario de agendamiento", "Medición de citas agendadas"],
  "excludes": ["Fotografía", "Pauta publicitaria"],
  "notes": ["Se facturan las horas trabajadas, con un máximo de 24."],
  "process": [
    {"title": "Diagnóstico", "body": "Revisamos cómo llegan hoy los pacientes."},
    {"title": "Diseño", "body": "Una propuesta de la página completa en tres días."},
    {"title": "Integración", "body": "Conectamos agenda, formulario y medición."},
    {"title": "Entrega", "body": "Publicamos y revisamos los primeros resultados con ustedes."}],
  "closing": {"heading": "Gracias, Laura y Tomás.", "accent": "Hablemos cuando quieran.",
    "body": "Si quieren ajustar el alcance, lo resolvemos en una llamada corta."}
}$j$::jsonb where public_slug = 'demo-veranda-dental';

update public.quotes set copy = $j${
  "intro": {"heading": "Hola Valentina. Contenido", "accent": "con criterio, cada mes.",
    "body": "Tallo tiene una marca clara y un público que la sigue. Proponemos acompañarte mes a mes para que cada publicación sume. Sin permanencia: te quedas porque funciona."},
  "highlights": [
    {"title": "Precio fijo mensual", "body": "Una tarifa predecible, sin contratos largos."},
    {"title": "Salida libre", "body": "Puedes pausar o terminar con un mes de aviso."},
    {"title": "Entregables reales", "body": "Un contenido listo para publicar cada semana."}],
  "includes": ["Cuatro sesiones de asesoría al mes", "Un entregable de contenido por semana", "Revisión de métricas mensual"],
  "excludes": ["Pauta publicitaria", "Producción de video"],
  "notes": ["Las horas fuera del plan se cobran a $150.000 COP cada una, solo si las pides."],
  "process": [
    {"title": "Diagnóstico", "body": "Revisamos qué publica Tallo hoy y qué funciona."},
    {"title": "Plan del mes", "body": "Definimos temas y formatos en la primera sesión."},
    {"title": "Producción", "body": "Entregamos un contenido cada semana."},
    {"title": "Revisión", "body": "Cerramos el mes con métricas y ajustes."}],
  "closing": {"heading": "Gracias, Valentina.", "accent": "Empezamos el próximo mes.",
    "body": "Escríbenos y agendamos la primera sesión."}
}$j$::jsonb where public_slug = 'demo-tallo';

update public.quotes set copy = $j${
  "intro": {"heading": "Hola Camilo. Sus clientes,", "accent": "siempre al día.",
    "body": "Nodo Legal responde muchas veces la misma pregunta: cómo va mi caso. Proponemos un portal privado donde cada cliente lo consulta solo. Un precio base y módulos a la medida."},
  "highlights": [
    {"title": "Menos llamadas", "body": "El cliente consulta el estado de su caso cuando quiera."},
    {"title": "Datos protegidos", "body": "Cada cliente ve solo su información."},
    {"title": "Crece por módulos", "body": "Agregan funciones cuando las necesiten."}],
  "includes": ["Acceso privado por cliente", "Estado de casos y documentos", "Panel para el equipo de la firma"],
  "excludes": ["Migración de datos históricos", "Soporte fuera de horario"],
  "notes": ["La infraestructura cuesta cerca de 40 USD al mes y se paga directo a los proveedores."],
  "process": [
    {"title": "Mapeo", "body": "Entendemos cómo avanza un caso dentro de la firma."},
    {"title": "Diseño", "body": "Prototipo navegable del portal para validar."},
    {"title": "Desarrollo", "body": "Construimos el portal y los módulos elegidos."},
    {"title": "Entrega", "body": "Capacitamos al equipo y activamos los primeros clientes."}],
  "closing": {"heading": "Gracias, Camilo.", "accent": "Lo construimos juntos.",
    "body": "Si quieren revisar los módulos, lo hablamos antes de arrancar."}
}$j$::jsonb where public_slug = 'demo-nodo-legal';
