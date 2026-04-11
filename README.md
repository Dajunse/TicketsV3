# TianMake Client Portal (MVP)

Portal SaaS multi-tenant para gestionar actividades, tickets, documentos y notas seguras por cliente en una sola plataforma.

## 1) Arquitectura General

- **Frontend + Backend:** Next.js (App Router, Server Actions)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Sistema de sesión propio (cookie HttpOnly + hash de token en DB + bcrypt para passwords)
- **Deploy objetivo:** Railway

### Capas

- `src/app`: rutas UI y vistas
- `src/actions`: acciones de servidor para CRUD/control
- `src/lib`: utilidades de auth, tenant, cifrado y seguridad
- `prisma`: schema y seed

## 2) Modelo de Datos (resumen)

Entidades clave:

- `User` (ADMIN / CLIENT)
- `Client`
- `ClientUser` (relación multi-tenant usuario-cliente)
- `ServiceCatalog`
- `ClientService`
- `Activity`
- `Ticket`
- `TicketMessage`
- `Document`
- `SecureNote` (cifrada con AES-256-GCM)
- `PublicTicketSubmissionLog` (rate limiting)
- `Session` (sesiones seguras)

Ver detalle en `prisma/schema.prisma`.

## 3) Estrategia Multi-tenant

- Toda entidad operativa (`Activity`, `Ticket`, `Document`, `SecureNote`, etc.) guarda `clientId`.
- Usuarios cliente acceden solo a clientes asociados en `ClientUser`.
- Admin global puede ver y operar todos los clientes.
- Validaciones de tenant en server actions para evitar cruces entre clientes.

## 4) URL Pública de Tickets sin Login

Ruta:

- `/support/[slug]/[token]`

Seguridad aplicada:

- `slug` legible por cliente (`publicTicketSlug`)
- `token` privado y largo (no legible)
- En DB se guarda **hash SHA-256** del token (`publicTicketTokenHash`)
- Honeypot oculto anti-bot
- Rate limiting por IP + ventana de tiempo (`PublicTicketSubmissionLog`)
- La vista pública solo permite crear ticket, no consultar historial ni datos privados

## 5) Propuesta Tipográfica y UI

- **Títulos:** `Lexend` (`--font-title`)
- **Texto general:** `IBM Plex Sans` (`--font-sans`)
- **Tablas/Formularios técnicos:** `IBM Plex Mono` (`--font-mono`)

Dirección visual:

- Fondo negro, texto blanco, grises neutros
- Tarjetas simples, espaciamiento amplio
- Navegación limpia, enfoque ejecutivo
- Sin saturación visual

## 6) Funcionalidad MVP incluida

- Login por correo/contraseña
- Sesiones seguras
- Dashboard con resumen
- Módulo de actividades (listar + crear/admin + cambio de estado/admin)
- Módulo de tickets (portal autenticado + respuestas + estado/admin)
- Ruta pública por cliente para crear tickets sin login
- Módulo de documentos (listar + alta metadata/admin)
- Panel admin base:
  - crear clientes
  - crear usuarios cliente
  - catálogo de servicios
  - asignar servicios
  - notas/credenciales cifradas

## 7) Estructura de Carpetas

```txt
src/
  app/
    (auth)/login
    (portal)/dashboard
    (portal)/activities
    (portal)/tickets
    (portal)/documents
    (portal)/admin
    support/[slug]/[token]
  actions/
    auth-actions.ts
    activity-actions.ts
    ticket-actions.ts
    admin-actions.ts
  components/
    app-shell.tsx
    login-form.tsx
    public-ticket-form.tsx
    page-title.tsx
    status-badge.tsx
  lib/
    auth.ts
    tenant.ts
    crypto.ts
    public-ticket.ts
    prisma.ts
prisma/
  schema.prisma
  seed.ts
```

## 8) Instalación Local

1. Instalar dependencias:

```bash
npm install
```

2. Configurar `.env` (usa `.env.example` como base).

3. Ejecutar migraciones:

```bash
npm run prisma:migrate
```

4. Generar cliente Prisma (si hace falta):

```bash
npm run prisma:generate
```

5. Poblar datos demo:

```bash
npm run prisma:seed
```

6. Levantar app:

```bash
npm run dev
```

Credenciales demo del seed:

- Admin: `admin@tianmake.studio` / `Admin12345!`
- Cliente Blair: `equipo@blair.com` / `Cliente12345!`
- Cliente Newell: `soporte@newell.com` / `Cliente12345!`
- URL pública Blair: `/support/blair/blair-support-link-2026`
- URL pública Newell: `/support/newell/newell-support-link-2026`

## 9) Deploy en Railway

1. Crear proyecto en Railway y conectar el repo.
2. Crear servicio PostgreSQL en Railway.
3. Configurar variables en Railway:
   - `DATABASE_URL`
   - `CREDENTIALS_ENCRYPTION_KEY` (base64 de 32 bytes)
   - `APP_URL` (dominio final)
   - `BOOTSTRAP_ADMIN_EMAIL` (recomendado)
   - `BOOTSTRAP_ADMIN_PASSWORD` (recomendado, contrasena fuerte)
   - `BOOTSTRAP_ADMIN_NAME` (opcional)
   - `BOOTSTRAP_ADMIN_FORCE_RESET` (opcional: `true` para forzar reset de password al iniciar)
4. Build command:

```bash
npm run build
```

5. Start command:

```bash
npm run railway:start
```

6. Si quieres cargar datos demo (clientes + tickets de ejemplo), ejecuta manualmente:

```bash
npm run prisma:seed
```

### Recuperar acceso admin en Railway

Si no puedes entrar con el admin:

1. En Railway, define `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` (sin comillas y sin espacios al inicio/final).
2. Redeploy del servicio.
3. Revisa logs del arranque y valida que aparezca `[bootstrap-admin] Admin ready: ...`.
4. Si necesitas reset inmediato aun sin password nuevo, usa temporalmente `BOOTSTRAP_ADMIN_FORCE_RESET=true`, redeploy, entra con `Admin12345!` y luego cambia la password.

## 10) Roadmap por Fases

- **Fase 1 (MVP actual):** Auth, multi-tenant, actividades, tickets, documentos, panel admin base.
- **Fase 2:** reset de contraseña, carga real de archivos a S3/R2, filtros avanzados y reportes.
- **Fase 3:** notificaciones por email, SLA por ticket, auditoría y rotación de tokens públicos.
- **Fase 4:** métricas ejecutivas, automatizaciones, portal blanco por marca.

## 11) Seguridad recomendada

- Passwords siempre con hash `bcrypt`.
- Sesiones con token aleatorio + hash en DB + cookie HttpOnly.
- Aislamiento tenant en consultas y server actions.
- URL pública con token no adivinable y hash en DB.
- Rate limit + honeypot + validación Zod en servidor.
- Credenciales externas en `SecureNote` cifradas (AES-GCM), no texto plano.
- En producción: activar HTTPS, backups y rotación periódica de tokens públicos.

## 12) Contexto Historico Vivo

- Archivo de referencia: `CONTEXTO_PROYECTO.md`
- Actualizacion automatica de historial tecnico:

```bash
npm run context:update
```

