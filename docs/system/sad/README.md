# SAD — instancia de FUT (FUT Pachangas)

Las **convenciones del método** para este nivel están en `_convenciones.md` (no se edita a mano).

## Instancia del proyecto

- **Fuente de verdad de la taxonomía:** [`vision-general.md`](vision-general.md).
- **Categorías de componentes:**
  1. **Web Pública (`web-public`)** — Páginas orientadas a jugadores (convocatorias, perfil, álbum, votaciones, estadísticas).
  2. **Web Admin (`web-admin`)** — Panel de administración del club (plantilla, partidos, cierre y recálculo).
  3. **UI Compartida (`ui-fut`)** — Cartas FUT, modal 3D/PNG y navegación PWA.
  4. **Dominio y Estado (`core-domain`)** — Store React, reglas de progresión/forma, balanceo y procesado de imágenes.
  5. **Backend BFF (`api-backend`)** — Route Handlers de Next.js (`/api/db`, `/api/notifications/send`, `/api/cron/keep-alive`) e integraciones (Supabase, Gmail SMTP).
  6. **Persistencia (`db-supabase`)** — PostgreSQL y Storage (`avatars`) en Supabase.
- **Actores externos:** Jugador, Administrador, Supabase Cloud, Gmail SMTP, Vercel Cron.
- **Desvíos deliberados actuales:** La seguridad de sesión/API (Bloque 2: cookie admin `HttpOnly`, hash de contraseñas, endurecimiento de RLS) está aparcada temporalmente por decisión del propietario y registrada como deuda técnica en `vision-general.md` y `project-status.json`.
