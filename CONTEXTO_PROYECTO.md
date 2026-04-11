# Contexto Historico del Proyecto

## Identidad

- Proyecto: `portal-saas` (TianMake Client Portal)
- Tipo: Portal SaaS multi-tenant (B2B servicio a clientes)
- Stack principal: Next.js + TypeScript + Tailwind + Prisma + PostgreSQL

## Objetivo General

Construir un portal central reutilizable para operar varios clientes desde una sola plataforma, con separacion estricta por tenant y una experiencia simple, sobria y profesional.

## Objetivos Funcionales (Resumen)

- Portal privado por cliente con login.
- Vista de actividades y seguimiento.
- Tickets desde portal autenticado.
- Tickets desde URL publica por cliente sin login.
- Repositorio de documentos por cliente.
- Panel administrativo para operacion multi-cliente.

## Enfoque de UX / UI

- Estetica minimalista y ejecutiva.
- Jerarquia visual clara y baja saturacion.
- Home/Login en tono oscuro.
- Portal interno en tonos claros con sidebar negro.
- Tipografia principal: Lexend + IBM Plex Sans.

## Reglas de Operacion y Seguridad

- Multi-tenant por `clientId` en modelos operativos.
- Aislamiento por rol y membresias.
- URL publica de tickets con token hasheado.
- Validaciones de servidor (Zod), honeypot y rate limiting para endpoint publico.
- Passwords con `bcrypt`, sesiones seguras con cookie HttpOnly y hash en DB.
- Notas/credenciales sensibles cifradas (AES-GCM en `SecureNote`).

## Estado Actual (Referencia)

- MVP funcional de portal y admin.
- Calendario mensual con resumen interactivo por hover.
- Actividades con materiales de aprobacion y adjuntos.
- Documentos con descarga y eliminacion (admin).
- Bootstrap de admin para despliegues en Railway con BD vacia.

## Forma de Trabajo del Proyecto

- Cambios iterativos primero en local.
- Ajustes UX con validacion visual rapida.
- Validacion tecnica minima por cambio:
  - `npm run lint`
  - `npm run build` antes de push/deploy importante
- Deploy en Railway usando:
  - `npm run railway:start`

## Convenciones de Mantenimiento

- Evitar sobreingenieria.
- Priorizar simplicidad, seguridad y mantenibilidad.
- Mantener textos y UI en espanol.
- Registrar decisiones importantes en este archivo.

## Historial de Decisiones (manual)

- 2026-04-08: Se separa calendario de actividades propuestas para mejorar UX.
- 2026-04-08: Se introduce aprobacion de materiales por actividad.
- 2026-04-08: Se agrega bootstrap de admin para Railway.

## Historial Tecnico (autogenerado)

Ultima actualizacion automatica: 2026-04-08T21:24:48.937Z

<!-- HISTORIAL_AUTO:START -->
- 2026-04-08 `86c4f48`: feat: polish portal UX and add Railway admin bootstrap
- 2026-04-08 `31b9d09`: chore: add production prisma migrate script for Railway
- 2026-04-08 `919b61a`: feat: initial multi-tenant portal MVP
- 2026-04-05 `1659d01`: Initial commit from Create Next App
<!-- HISTORIAL_AUTO:END -->

## Como mantener este contexto actualizado

1. Ejecutar `npm run context:update` despues de cambios relevantes.
2. Si quieres automatizarlo por commit, configurar hook local:
   - `git config core.hooksPath .githooks`
   - Crear `post-commit` que ejecute `npm run context:update`
3. Confirmar el archivo en cada push cuando haya cambios de alcance, UX o arquitectura.
