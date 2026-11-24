Aquí tienes el documento maestro consolidado, completo y listo para que lo copies y pegues directamente en tu agente de desarrollo. Incluye toda la arquitectura, el sistema visual de cartas Ultimate Team, el esquema SQL, los flujos de usuario/admin y la configuración de despliegue a coste 0 € sin dominio propio.

---

# MASTER PLAN DE DESARROLLO: App Web de Gestión de Pachangas de Fútbol ("FUT Pachangas")

## 1. Visión General y Stack Tecnológico

Desarrollar una Progressive Web App (**PWA**) diseñada estrictamente bajo filosofía **Mobile-First** para gestionar un grupo amateur de fútbol. La aplicación permite crear jugadores con cartas coleccionables estilo EA FC / Ultimate Team, generar equipos balanceados, registrar partidos, realizar votaciones post-partido (MVP y goleadores), consultar rankings históricos y enviar notificaciones automáticas por correo electrónico, todo desplegable a coste 0 € y sin dominio personalizado.

* **Framework Frontend y Backend:** Next.js (App Router), React, TypeScript.
* **Estilos y Animaciones:** Tailwind CSS, Lucide React (iconos), Framer Motion (efectos 3D y transiciones).
* **Exportación de Cartas:** CSS avanzado (máscaras SVG / clip-path y degradados metálicos) + `html2canvas` para descargar cartas en PNG.
* **Base de Datos, Auth y Storage:** Supabase (PostgreSQL + Supabase Auth para el panel Admin + Supabase Storage para avatares).
* **Notificaciones por Correo:** `Nodemailer` usando cuenta de Gmail gratuita (SMTP con App Password, sin necesidad de dominio propio).
* **Alojamiento y Cron Jobs:** Vercel (Plan Hobby gratuito).

---

## 2. Sistema de Cartas Estilo Ultimate Team (`<FutCard/>`)

El componente `<FutCard player="{player}"/>` es el núcleo visual de la aplicación y debe replicar la anatomía exacta del diseño de referencia de EA FC Ultimate Team:

### Anatomía Visual de la Carta

1. **Silueta / Marco Exterior:** Contorno tipo escudo ornamentado con bordes metálicos dobles, remate superior en pico y base en punta invertida.


2. **Esquina Superior Izquierda:**
* **Media Global (`overall`):** Número grande en negrita (ej. `96`, `84`).


* **Posición (`position`):** Siglas justo debajo (`POR`, `DEF`, `MED`, `DEL` o nomenclatura internacional `GK`, `CB`, `CAM`, `ST`).




3. **Borde Lateral Izquierdo (PlayStyles / Rasgos):** Columna vertical de hasta 3 insignias hexagonales/romboidales con iconos que representen rasgos del jugador (ej. *Velocista*, *Francotirador*, *Muro*, *MVP Vigente*).


4. **Zona Central (Retrato del Jugador):** Fotografía (`avatar_url`) integrada sobre el fondo texturizado de la carta con desvanecimiento suave en la parte inferior. Si el jugador no tiene foto subida, mostrar una silueta futbolística estilizada.


5. **Nombre / Mote:** Tipografía limpia, centrada y de alto contraste justo debajo del torso del jugador.


6. **Fila Inferior de Estadísticas (6 columnas horizontales):**
* Etiquetas superiores: `PAC` (Ritmo), `SHO` (Tiro), `PAS` (Pase), `DRI` (Regate), `DEF` (Defensa), `PHY` (Físico).


* Valores numéricos (`1-99`) alineados directamente debajo de cada etiqueta.




7. **Base de la Carta:** Tres mini-insignias centradas en el vértice inferior (ej. bandera, escudo del grupo/liga de amigos e insignia de estado).



### Niveles / Rarezas de Carta (`card_tier`)

El esquema cromático, brillo y textura de fondo cambian dinámicamente según el campo `card_tier`:

* **`bronze` (Bronce):** Tonos cobrizos/marrones metálicos, bordes bronce, texto crema/oscuro (Media < 65).
* **`silver` (Plata):** Tonos plateados/gris acero brillante, bordes plata, texto oscuro (Media 65 - 74).
* **`gold` (Oro):** Tonos dorados clásicos cálidos, texto marrón oscuro/negro (Media 75 - 84).
* **`totw` (En Forma / MVP):** Fondo negro carbón con vetas doradas brillantes y tipografía dorada (Asignable automáticamente o manualmente al MVP de la última jornada).
* **`icon` (Leyenda):** Fondo blanco perlado con ondas doradas y tipografía dorada/negra (Para veteranos o jugadores históricos del grupo).
* **`tots` (Élite / TOTS):** Fondo azul profundo con ondas doradas dinámicas y doble borde dorado brillante, replicando exactamente el estilo de la carta de referencia (Media 85+ o Campeón de temporada).



---

## 3. Esquema de Base de Datos (Supabase PostgreSQL)

Ejecutar este esquema SQL en Supabase, incluyendo políticas de seguridad RLS (lectura pública para las tablas principales, escritura restringida a usuarios autenticados / `service_role`):

```sql
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Jugadores
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  position TEXT NOT NULL DEFAULT 'MED', -- POR, DEF, MED, DEL
  card_tier TEXT NOT NULL DEFAULT 'gold', -- bronze, silver, gold, totw, icon, tots
  playstyles TEXT[] DEFAULT '{}', -- Hasta 3 rasgos ej: ['speedster', 'finisher', 'wall']
  -- Estadísticas base (opcionales al crear, por defecto 70)
  pace INT NOT NULL DEFAULT 70 CHECK (pace BETWEEN 1 AND 99),
  shooting INT NOT NULL DEFAULT 70 CHECK (shooting BETWEEN 1 AND 99),
  passing INT NOT NULL DEFAULT 70 CHECK (passing BETWEEN 1 AND 99),
  dribbling INT NOT NULL DEFAULT 70 CHECK (dribbling BETWEEN 1 AND 99),
  defending INT NOT NULL DEFAULT 70 CHECK (defending BETWEEN 1 AND 99),
  physical INT NOT NULL DEFAULT 70 CHECK (physical BETWEEN 1 AND 99),
  overall INT GENERATED ALWAYS AS ((pace + shooting + passing + dribbling + defending + physical) / 6) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Partidos
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, voting_open, finished
  team_a_name TEXT DEFAULT 'Equipo Claro',
  team_b_name TEXT DEFAULT 'Equipo Oscuro',
  score_a INT DEFAULT 0,
  score_b INT DEFAULT 0,
  mvp_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Alineaciones y Goles por Partido
CREATE TABLE match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  UNIQUE(match_id, player_id)
);

-- 4. Votaciones Post-Partido
CREATE TABLE match_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL, -- Hash de navegador/dispositivo para evitar votos duplicados
  mvp_vote_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, voter_fingerprint)
);

-- 5. Suscriptores de Notificaciones por Correo
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

```

*Nota para Supabase Storage:* Crear un bucket público llamado `avatars` para almacenar las fotografías de los jugadores.

---

## 4. Arquitectura de Vistas y Funcionalidades

### A. Navegación Pública (Mobile-First con Bottom Tab Bar fija)

La interfaz debe tener una barra de navegación inferior fija con 4 secciones principales y un acceso discreto (icono de candado/engranaje) al panel de administrador:

1. **Inicio (`/`) - Centro de Jornada:**
* **Alerta de Votación Activa:** Si existe un partido con `status = 'voting_open'`, mostrar una tarjeta superior animada con botón directo a `/vote/[matchId]`.
* **Próximo Partido:** Tarjeta con fecha, hora, ubicación (con enlace a Google Maps), contador regresivo y comparativa visual de **Equipo A vs Equipo B** (mostrando media media de cada equipo y lista de convocados con mini-cartas).
* **Widget de Suscripción Rápida:** Caja sencilla donde cualquier miembro introduce su correo electrónico para recibir avisos de convocatorias y votaciones.


2. **Plantilla (`/players`) - Álbum de Cartas FUT:**
* Buscador por nombre/mote y filtros horizontales deslizables por nivel (`Todos`, `Élite/TOTS`, `Leyenda`, `TOTW`, `Oro`, `Plata`, `Bronce`).


* Cuadrícula responsive (2 columnas en móvil, 3-4 en tablet/escritorio) renderizando `<FutCard/>`.
* **Modal Interactivo de Jugador:** Al pulsar una carta, se abre en primer plano con efecto *tilt* 3D interactivo al mover el dedo/ratón, muestra su historial real acumulado (Partidos jugados, Goles marcados, Premios MVP ganados, % de victorias) y un botón **"Descargar Carta (PNG)"** para compartirla por WhatsApp.


3. **Votación Post-Partido (`/vote/[matchId]`):**
* Accesible cuando el partido está en `voting_open`.
* Muestra el resultado del partido y las cartas de los jugadores que participaron.
* Permite votar al **MVP del partido** con un solo toque. Implementa control anti-duplicados mediante `localStorage` + huella única (`voter_fingerprint`) en base de datos. Muestra barras de progreso en tiempo real tras emitir el voto.


4. **Rankings e Historial (`/stats`):**
* **Salón de la Fama (Podios):**
* *Pichichi (Máximo Goleador histórico).*
* *Rey del MVP (Más veces elegido mejor jugador).*
* *Talismán (Mayor porcentaje de victorias).*


* **Historial de Partidos:** Listado cronológico de partidos `finished` con marcador, desglose de goleadores de cada equipo y mención destacada al MVP de esa jornada.



---

### B. Panel de Administración (`/admin` - Protegido por Supabase Auth)

1. **Login (`/admin/login`):** Inicio de sesión sencillo con email y contraseña de administrador.
2. **Gestión de Jugadores (`/admin/players`):**
* Formulario de creación/edición con **vista previa en vivo** de la `<FutCard/>`.
* Campos: Nombre, Mote, Posición, Subida de imagen (con opción de recorte cuadrado), Selector de Nivel (`bronze` a `tots`), Selector de hasta 3 PlayStyles.


* **Estadísticas:** 6 sliders (`1-99`) para `PAC`, `SHO`, `PAS`, `DRI`, `DEF`, `PHY` con un botón *"Valores por defecto (70)"* para altas rápidas sin configurar stats.




3. **Creador de Partidos y Equipos (`/admin/matches/new`):**
* Selección de fecha, hora, campo y nombres de equipos (por defecto "Equipo Claro" vs "Equipo Oscuro").
* Lista de selección rápida (checkboxes) de jugadores disponibles para la pachanga.
* **Botón "Autobalancear Equipos":** Algoritmo que distribuye automáticamente a los jugadores seleccionados en Equipo A y Equipo B minimizando la diferencia de media (`overall`) entre ambos equipos. Permite intercambio manual posterior.
* **Publicar y Notificar:** Guarda el partido (`status = 'scheduled'`) y envía automáticamente un correo electrónico a todos los `subscribers` activos con los equipos y detalles del encuentro.


4. **Control de Jornada y Cierre (`/admin/matches/[id]`):**
* Introducir goles de cada equipo y asignar goles individuales a cada jugador (`+` / `-`).
* **Botón "Abrir Votación MVP":** Cambia el estado a `voting_open` y dispara automáticamente un correo electrónico a los suscriptores con el enlace directo a `/vote/[matchId]`.
* **Botón "Cerrar Votación y Finalizar":** Recuenta los votos de `match_votes`, asigna el `mvp_player_id` ganador al partido, cambia el estado a `finished` y ofrece un checkbox opcional para ascender automáticamente la carta del MVP ganado a nivel `totw` hasta el próximo partido.



---

## 5. Diseño UI/UX y Estética

* **Paleta de Colores (Dark Mode Deportivo):**
* Fondo principal: `#090D16` (Azul noche profundo).
* Superficies / Contenedores: `#111827` con bordes sutiles `#1F2937`.
* Acento primario: `#F59E0B` (Dorado FUT) y `#10B981` (Verde césped eléctrico).


* **Tipografía (Google Fonts):**
* `Barlow Condensed` o `Oswald` (bold/extrabold, mayúsculas) para medias, posiciones, nombres y estadísticas dentro de las cartas estilo FUT.


* `Inter` para textos de interfaz, tablas e historial.


* **Microinteracciones:** Brillo holográfico animado (efecto *shimmer*) en las cartas de rareza `tots`, `icon` y `totw`.

---

## 6. Configuración de Despliegue y Producción (Coste 0 € y Sin Dominio)

### Variables de Entorno (`.env.local` y Vercel)

Configurar el proyecto para utilizar exclusivamente estas variables:

* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* `GMAIL_USER` (Cuenta de Gmail del grupo, ej. `pachangas.futbol@gmail.com`)
* `GMAIL_APP_PASSWORD` (Contraseña de aplicación de 16 caracteres generada en Google Account)
* `NEXT_PUBLIC_APP_URL` (URL gratuita asignada por Vercel, ej. `[https://pachangas-fc.vercel.app](https://pachangas-fc.vercel.app)`)
* `CRON_SECRET` (Cadena aleatoria para asegurar el endpoint de mantenimiento)

### Implementación de Servicios sin Coste

1. **Mailer sin Dominio (`/lib/mailer.ts`):**
* Utilizar `nodemailer` configurado con `service: 'gmail'`, `auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }`.
* Crear plantillas HTML limpias y responsive para los dos correos: **Convocatoria de Partido** y **Apertura de Votación MVP**.


2. **Prevención de Pausa en Supabase (`/app/api/cron/keep-alive/route.ts` y `vercel.json`):**
* Crear un endpoint GET que ejecute una consulta ligera (`SELECT id FROM players LIMIT 1`) en Supabase para evitar que el plan gratuito pause la base de datos tras 7 días de inactividad.
* Configurar `vercel.json` con un Cron Job gratuito diario (`"schedule": "0 10 * * *"`) apuntando a `/api/cron/keep-alive`.


3. **Configuración PWA (`/app/manifest.ts`):**
* Configurar `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color: "#090D16"`, `theme_color: "#090D16"` e iconos para que los jugadores puedan instalarla en la pantalla de inicio de iOS y Android con un toque.



---

## 7. Orden de Ejecución Sugerido para el Agente

1. Inicializar proyecto Next.js (TypeScript + Tailwind CSS) y configurar estructura de carpetas y cliente de Supabase.
2. Implementar el componente `<FutCard/>` con todos sus niveles visuales (`bronze`, `silver`, `gold`, `totw`, `icon`, `tots`) y la función de descarga en PNG.


3. Construir las vistas públicas (`/`, `/players`, `/vote/[matchId]`, `/stats`) con navegación móvil inferior y datos conectados a Supabase.
4. Construir el panel `/admin` (Login, CRUD de jugadores con vista previa de carta, creador de partidos con autobalanceo de equipos y control de votaciones).
5. Integrar `Nodemailer` con Gmail, el endpoint `keep-alive` con `vercel.json` y el `manifest.ts` PWA.