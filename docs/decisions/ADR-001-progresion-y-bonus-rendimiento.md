# ADR-001 — Progresión post-partido y fórmula de bonus de rendimiento

- **Estado:** aceptada
- **Fecha:** 2026-11-26
- **Nivel:** SAD / SWDD
- **Afecta a:** `MOD-CORE-DOMAIN` (`src/lib/progression.ts`, `src/lib/rating-bonus.ts`, `src/lib/store.tsx`), `MOD-WEB-ADMIN` (`src/app/admin/matches/[id]/page.tsx`)
- **Tipo:** funcional

## Contexto
Al cerrar un partido desde el panel de administración (`Cerrar Votación, Recalcular Medias y Finalizar`), el sistema presentaba tres problemas detectados en uso real:
1. `applyMatchProgression` aplicaba `clampStat` (`MIN_STAT = 50`, `MAX_STAT = 95`) a las 6 estadísticas base de cada jugador incluso cuando no había delta, sobrescribiendo a `50` cualquier estadística inferior a 50 configurada manualmente por el administrador (y recortando a `95` las superiores a 95).
2. Existía una penalización permanente de `-1` en todas las estadísticas base para jugadores que no votaban al MVP, alterando las medias configuradas por el administrador.
3. Los coeficientes de `BONUS_CONFIG` sobre la ventana móvil de 5 partidos eran demasiado agresivos (`+1` por gol, `+2` hat-trick, `+2` pichichi, `+1` por victoria, `+2` racha, tope `+15`), permitiendo subidas desproporcionadas (+7 o más en un solo partido bueno).
4. Además, `handleFinishMatch` llamaba a `updateMatchScoreAndGoals` y acto seguido a `closeMatchVotingAndFinish` leyendo estado React aún sin actualizar (*stale closure*).

## Alternativas evaluadas

### Alternativa A — Preservar stats base intactas + bonus de forma moderado + cierre atómico   ✅ ELEGIDA
- **Descripción:** Eliminar cualquier mutación o *clamping* sobre las 6 estadísticas base al cerrar un partido (incluyendo la penalización `-1` por no votar). Toda evolución automática de media se expresa exclusivamente mediante `performance_bonus` (ventana móvil de los últimos 5 partidos) con coeficientes moderados (`+1` cada 2 goles, `+1` hat-trick, `+1` pichichi, `+1` cada 3 asistencias, `+1` cada 2 victorias, `+1` racha de 3 victorias, `-1` derrota abultada ≥4 goles, `-1` racha de 3 derrotas; rango `-4..+8`) y ascensos de rareza (`TOTW`, `TOTS`, `ICON`). El cierre pasa los goles y marcador vigentes directamente a `closeMatchVotingAndFinish` y persiste de forma secuencial (`await`).
- **Impacto:** ↑ coherencia con la gestión manual del administrador; ↓ simplifica `progression.ts` y elimina corrupción silenciosa de stats en BD.
- **Pros / Contras:**
  - *Pros:* Total previsibilidad para el admin; progresión motivante pero difícil de inflar; reversible sin migración de esquema (`players.performance_bonus` ya admite `-15..25`).
  - *Contras:* Quien no vote al MVP ya no recibe penalización automática en su carta.
- **Coste · Riesgo · Reversibilidad:** Coste bajo · Riesgo bajo · Reversibilidad alta (constantes en `BONUS_CONFIG`).
- **Perspectivas:** arquitectura (separa claramente responsabilidad: admin dueño de stats base, partidos dueños de `performance_bonus`), datos (no requiere alterar `schema.sql`), UX (el resumen post-partido refleja exactamente los goles recién introducidos).

### Alternativa B — Mantener mutación de stats base ampliando el rango a `1..99`   ❌ descartada
- **Descripción:** Cambiar `MIN_STAT = 1` y `MAX_STAT = 99` manteniendo el `-1` por no votar sobre las 6 stats base.
- **Impacto:** Sigue modificando permanentemente las stats configuradas por el admin tras cada jornada.
- **Pros / Contras:** Evita el salto a 50, pero degrada progresivamente las medias base que el admin ajustó a mano.
- **Coste · Riesgo · Reversibilidad:** Coste bajo · Riesgo medio (deriva irreversible de medias base) · Reversibilidad media.
- **Razón del descarte:** El propietario del club requiere que las medias base editadas desde el admin se respeten intactas y que las variaciones post-partido respondan solo al desempeño definido.

### Alternativa C — Penalización por no votar aplicada al `performance_bonus`   ❌ descartada
- **Descripción:** Conservar las stats base intactas pero restar `-1` al `performance_bonus` si el jugador no vota.
- **Impacto:** Requiere cruzar `match_votes` dentro de `computePlayerPerformanceBonus` en cada render de `enrichedPlayers`.
- **Pros / Contras:** Incentiva la votación, pero añade acoplamiento y fricción para jugadores casuales.
- **Coste · Riesgo · Reversibilidad:** Coste medio · Riesgo bajo · Reversibilidad alta.
- **Razón del descarte:** Decisión explícita del propietario de eliminar el `-1` por no votar.

## Decisión
Se adopta la **Alternativa A**: las 6 estadísticas base (`pace`, `shooting`, `passing`, `dribbling`, `defending`, `physical`) son de exclusiva gestión administrativa y nunca se modifican ni se acotan al cerrar partidos. El rendimiento reciente se refleja exclusivamente en `performance_bonus` con los coeficientes reducidos (`-4..+8`) en `src/lib/rating-bonus.ts` y se elimina la penalización por no votar.

## Consecuencias
- `src/lib/progression.ts` deja de exportar `MIN_STAT`, `MAX_STAT`, `NON_VOTER_PENALTY` y `clampStat`, y preserva los 6 atributos base tal cual.
- `src/lib/rating-bonus.ts` actualiza `BONUS_CONFIG` (`goalsPerPoint: 2`, `hatTrickBonus: 1`, `topScorerBonus: 1`, `assistsPerPoint: 3`, `winsPerPoint: 2`, `winStreakBonus: 1`, `lossStreakPenalty: -1`, `minTotalBonus: -4`, `maxTotalBonus: 8`).
- `src/lib/store.tsx` y `src/app/admin/matches/[id]/page.tsx` persisten marcador/goles y cierre de partido de forma síncrona respecto al estado más reciente (`scoresAndGoals` pasado explícitamente).
- Los jugadores con partidos previos verán su `performance_bonus` recalculado automáticamente en vivo con la nueva escala más equilibrada.
