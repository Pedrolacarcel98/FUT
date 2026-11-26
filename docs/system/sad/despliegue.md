# SAD — Modelo de Despliegue y Plataforma (FUT)

## Plataforma y topología

| Componente | Plataforma | Runtime / Recursos | Notas |
|---|---|---|---|
| Frontend + BFF API | **Vercel** (Next.js 15) | Node.js Serverless (`runtime = "nodejs"`, `dynamic = "force-dynamic"` en APIs) | Límite de payload HTTP de **4.5 MB** en funciones serverless; `images.unoptimized = true` en `next.config.ts`. |
| Base de datos | **Supabase Cloud** | PostgreSQL gestionado | Proyecto gratuito sujeto a pausa tras inactividad; mantenido activo con cron diario. |
| Almacenamiento de avatares | **Supabase Storage** | Bucket público `avatars` | Subida desde `/api/db` con `service_role`; fallback a Data URL inline si el bucket falla (evitar en producción). |
| Correo saliente | **Gmail SMTP** | `nodemailer` | Envío de bienvenida (con carta PNG), nueva convocatoria, premio MVP y correo de prueba. |
| Mantenimiento programado | **Vercel Cron** | `0 10 * * *` (`vercel.json`) | Invoca `GET /api/cron/keep-alive` una vez al día a las 10:00 UTC. |

## Variables de entorno

| Variable | Ámbito | Obligatoria | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente + Servidor | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente | Opcional (actualmente el cliente usa `/api/db`) | Clave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Sí | Cliente admin en `src/lib/supabase/server.ts` (`/api/db`, `/api/cron/keep-alive`) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` (ver `.env.example` / `src/lib/mailer.ts`) | Solo servidor | Opcional (para correos) | Autenticación SMTP en Nodemailer |
| `CRON_SECRET` | Solo servidor | Recomendada | Protege `GET /api/cron/keep-alive` (`Authorization: Bearer` o `?secret=`) |

## Restricciones de recursos y operación
- **Avatares:** El cliente reescala y comprime iterativamente en `src/lib/image-resize.ts` hasta `<= ~250 KB` (`<= 600 px`) antes de enviar a `/api/db`, protegiendo tanto el límite de payload de Vercel (4.5 MB) como el tamaño de respuestas y Storage.
- **Arranque en frío / caché local:** `FutStoreProvider` carga el snapshot desde `GET /api/db` (`cache: "no-store"`) y mantiene copia en `localStorage` (`fut-pachangas-prod-v1`) como respaldo si el servidor no está configurado o falla la red.
- **Esquema de BD:** Se despliega ejecutando `supabase/schema.sql` en el SQL Editor de Supabase y creando el bucket público `avatars`.
- **Despliegue continuo:** Push a rama conectada en Vercel dispara `next build` automáticamente.
