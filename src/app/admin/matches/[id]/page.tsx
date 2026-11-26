"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Crown,
  Minus,
  Pencil,
  Plus,
  Save,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Vote,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { sendNotification } from "@/lib/notify-client";
import {
  getEffectiveMatchPhase,
  getVotingRemainingLabel,
} from "@/lib/match-phase";
import type { ProgressionChange } from "@/lib/progression";
import {
  CARD_TIER_LABELS,
  TEAM_COLOR_LIST,
  TEAM_COLORS,
  type TeamColorId,
} from "@/types/fut";

export default function AdminMatchControlPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    hydrated,
    isAdmin,
    players,
    matches,
    getMatchPlayers,
    getMatchVotes,
    getPlayerById,
    adminAddPlayerToMatch,
    adminRemovePlayerFromMatch,
    autoBalanceMatchTeams,
    swapMatchPlayerTeam,
    updateMatchDetails,
    deleteMatch,
    updateMatchScoreAndGoals,
    closeMatchVotingAndFinish,
  } = useFutStore();

  const match = matches.find((m) => m.id === params.id);
  const roster = useMemo(
    () => (match ? getMatchPlayers(match.id) : []),
    [match, getMatchPlayers]
  );
  const votes = useMemo(
    () => (match ? getMatchVotes(match.id) : []),
    [match, getMatchVotes]
  );

  const [goalsMap, setGoalsMap] = useState<Record<string, number>>({});
  const [assistsMap, setAssistsMap] = useState<Record<string, number>>({});
  const [promoteTotw, setPromoteTotw] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<
    ProgressionChange[]
  >([]);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState(14);
  const [editTeamAName, setEditTeamAName] = useState("");
  const [editTeamBName, setEditTeamBName] = useState("");
  const [editTeamAColor, setEditTeamAColor] = useState<TeamColorId>("white");
  const [editTeamBColor, setEditTeamBColor] = useState<TeamColorId>("black");

  const toLocalDateTimeInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (match) {
      setEditDate(toLocalDateTimeInput(match.match_date));
      setEditLocation(match.location);
      setEditMaxPlayers(match.max_players ?? 14);
      setEditTeamAName(match.team_a_name);
      setEditTeamBName(match.team_b_name);
      setEditTeamAColor(match.team_a_color ?? "white");
      setEditTeamBColor(match.team_b_color ?? "black");
    }
  }, [match]);

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [hydrated, isAdmin, router]);

  useEffect(() => {
    const initialGoals: Record<string, number> = {};
    const initialAssists: Record<string, number> = {};
    for (const r of roster) {
      initialGoals[r.player_id] = r.goals;
      initialAssists[r.player_id] = r.assists;
    }
    setGoalsMap(initialGoals);
    setAssistsMap(initialAssists);
  }, [roster]);

  if (!hydrated || !isAdmin) return null;

  if (!match) {
    return (
      <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-8 text-center">
        <p className="text-gray-400">Partido no encontrado.</p>
      </div>
    );
  }

  const teamA = roster.filter((r) => r.team === "A");
  const teamB = roster.filter((r) => r.team === "B");
  const enrolledIds = new Set(roster.map((r) => r.player_id));
  const availablePlayers = players.filter((p) => !enrolledIds.has(p.id));

  const avgA = teamA.length
    ? Math.round(
        (teamA.reduce((acc, r) => acc + r.player.overall, 0) / teamA.length) *
          10
      ) / 10
    : 0;
  const avgB = teamB.length
    ? Math.round(
        (teamB.reduce((acc, r) => acc + r.player.overall, 0) / teamB.length) *
          10
      ) / 10
    : 0;

  const scoreA = teamA.reduce(
    (sum, r) => sum + (goalsMap[r.player_id] ?? r.goals),
    0
  );
  const scoreB = teamB.reduce(
    (sum, r) => sum + (goalsMap[r.player_id] ?? r.goals),
    0
  );

  const adjustGoal = (playerId: string, delta: number) => {
    setGoalsMap((prev) => ({
      ...prev,
      [playerId]: Math.max(0, (prev[playerId] ?? 0) + delta),
    }));
  };

  const adjustAssist = (playerId: string, delta: number) => {
    setAssistsMap((prev) => ({
      ...prev,
      [playerId]: Math.max(0, (prev[playerId] ?? 0) + delta),
    }));
  };

  const handleAutoBalance = () => {
    const res = autoBalanceMatchTeams(match.id);
    if (!res.ok) {
      setNotice(res.error ?? "No se pudieron balancear los equipos.");
    } else {
      setNotice(
        "Equipos autobalanceados según la media actual (la convocatoria sigue abierta hasta la hora del partido)."
      );
    }
  };

  const handleSaveScores = () => {
    updateMatchScoreAndGoals(match.id, scoreA, scoreB, goalsMap, assistsMap);
    setNotice("Marcador, goles y asistencias guardados correctamente.");
    setTimeout(() => setNotice(null), 2500);
  };

  const handleFinishMatch = async () => {
    if (finishing) return;
    setFinishing(true);
    const res = await closeMatchVotingAndFinish(match.id, {
      promoteMvpToTotw: promoteTotw,
      scoresAndGoals: {
        scoreA,
        scoreB,
        playerGoals: goalsMap,
        playerAssists: assistsMap,
      },
    });
    setFinishing(false);

    if (!res.ok) {
      setNotice(res.error ?? "No se pudo finalizar el partido.");
      return;
    }

    const { winnerId, changes } = res;
    setProgressionSummary(changes);
    const winner = getPlayerById(winnerId);
    const winnerChange = changes.find((c) => c.playerId === winnerId);

    if (winner && winner.email && winner.notify_emails !== false) {
      void sendNotification({
        type: "mvp_award",
        to: winner.email,
        nickname: winner.nickname,
        teamAName: match.team_a_name,
        teamBName: match.team_b_name,
        scoreA,
        scoreB,
        newOverall: winnerChange?.newOverall ?? winner.overall,
        promotedToTotw: promoteTotw,
      });
    }

    setNotice(
      winner
        ? `Partido finalizado. MVP oficial: ${winner.nickname}${
            promoteTotw ? " (ascendido a TOTW)" : ""
          }. Medias recalculadas según el desempeño.`
        : "Partido finalizado. Medias recalculadas según el desempeño."
    );
  };

  const officialMvp = getPlayerById(match.mvp_player_id);
  const phase = getEffectiveMatchPhase(match);
  const remaining = getVotingRemainingLabel(match);

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateMatchDetails(match.id, {
      match_date: new Date(editDate).toISOString(),
      location: editLocation,
      max_players: editMaxPlayers,
      team_a_name: editTeamAName,
      team_b_name: editTeamBName,
      team_a_color: editTeamAColor,
      team_b_color: editTeamBColor,
    });
    setEditingDetails(false);
    setNotice("Detalles del partido actualizados.");
    setTimeout(() => setNotice(null), 2500);
  };

  const handleDeleteMatch = () => {
    if (
      window.confirm(
        `¿Seguro que quieres borrar el partido "${match.team_a_name} vs ${match.team_b_name}"?`
      )
    ) {
      deleteMatch(match.id);
      router.push("/admin");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-amber-400 mb-1"
          >
            <ArrowLeft size={14} /> Volver al Panel
          </Link>
          <h1 className="font-fut text-3xl font-extrabold uppercase text-white">
            Control de Partido y Equipos
          </h1>
          <p className="text-xs text-gray-400">
            {match.location} · {roster.length}/{match.max_players ?? 14} apuntados
            · {votes.length}/{roster.length} votos MVP
            {phase === "voting_open" ? ` · ${remaining}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2 text-xs font-semibold text-gray-200 hover:border-amber-500/40 hover:text-amber-400 transition"
          >
            <Pencil size={13} />
            {editingDetails ? "Cerrar edición" : "Editar partido"}
          </button>
          <button
            type="button"
            onClick={handleDeleteMatch}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 size={13} />
            Borrar
          </button>
        </div>
      </div>

      {/* Collapsible Edit Match Details Form */}
      {editingDetails && (
        <form
          onSubmit={handleSaveDetails}
          className="rounded-3xl border border-amber-500/35 bg-[#111827] p-5 space-y-4"
        >
          <h2 className="font-fut text-xl font-extrabold uppercase text-amber-400">
            Editar Datos del Partido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Ubicación / Campo
              </label>
              <input
                type="text"
                required
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                Equipo A (nombre y color)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={editTeamAName}
                  onChange={(e) => setEditTeamAName(e.target.value)}
                  className="flex-1 rounded-xl border border-[#1F2937] bg-[#090D16] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 rounded-xl border border-[#1F2937] bg-[#090D16] px-2.5 py-2">
                  {TEAM_COLOR_LIST.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => setEditTeamAColor(c.id)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-4 w-4 rounded-full border transition ${
                        editTeamAColor === c.id
                          ? "ring-2 ring-amber-400 scale-110 border-white"
                          : "border-white/30 opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                Equipo B (nombre y color)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={editTeamBName}
                  onChange={(e) => setEditTeamBName(e.target.value)}
                  className="flex-1 rounded-xl border border-[#1F2937] bg-[#090D16] px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 rounded-xl border border-[#1F2937] bg-[#090D16] px-2.5 py-2">
                  {TEAM_COLOR_LIST.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => setEditTeamBColor(c.id)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-4 w-4 rounded-full border transition ${
                        editTeamBColor === c.id
                          ? "ring-2 ring-amber-400 scale-110 border-white"
                          : "border-white/30 opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-300">Plazas:</span>
              {[10, 12, 14, 16, 22].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setEditMaxPlayers(cap)}
                  className={`rounded-lg px-2.5 py-1 font-fut text-xs font-bold ${
                    editMaxPlayers === cap
                      ? "bg-amber-500 text-slate-950"
                      : "bg-[#090D16] border border-[#1F2937] text-gray-300"
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Save size={14} /> Guardar cambios
            </button>
          </div>
        </form>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Progression Summary after closing match */}
      {progressionSummary.length > 0 && (
        <section className="rounded-3xl border border-amber-500/35 bg-[#111827] p-5 space-y-3">
          <h2 className="font-fut text-xl font-extrabold uppercase text-amber-400">
            Resumen de Subidas y Bajadas Aplicadas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {progressionSummary.map((ch) => (
              <div
                key={ch.playerId}
                className="flex items-center justify-between rounded-2xl bg-[#090D16] border border-[#1F2937] px-3.5 py-2.5 text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {ch.isMvp && <Crown size={13} className="text-amber-400" />}
                    {ch.nickname}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {ch.newBonus !== ch.previousBonus ? (
                      <span
                        className={`font-semibold ${
                          ch.newBonus > ch.previousBonus
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        Forma {ch.previousBonus >= 0 ? `+${ch.previousBonus}` : ch.previousBonus} →{" "}
                        {ch.newBonus >= 0 ? `+${ch.newBonus}` : ch.newBonus}
                      </span>
                    ) : (
                      <span className="text-gray-400">Forma sin cambios</span>
                    )}
                    {ch.previousTier !== ch.newTier && (
                      <span className="ml-1.5 text-amber-300 font-semibold">
                        · {CARD_TIER_LABELS[ch.previousTier]} →{" "}
                        {CARD_TIER_LABELS[ch.newTier]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-fut text-lg font-extrabold text-white">
                    {ch.previousOverall} → {ch.newOverall}
                  </div>
                  <div
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                      ch.delta > 0
                        ? "text-emerald-400"
                        : ch.delta < 0
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {ch.delta > 0 && <TrendingUp size={11} />}
                    {ch.delta < 0 && <TrendingDown size={11} />}
                    {ch.delta > 0 ? `+${ch.delta}` : ch.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Scoreboard */}
      <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 text-center space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
          {phase === "signup_open"
            ? "Convocatoria abierta hasta la hora del partido"
            : phase === "voting_open"
            ? `Votación MVP abierta automáticamente (${remaining})`
            : phase === "voting_expired"
            ? "Plazo de 7 días finalizado — listo para cerrar"
            : "Partido Finalizado"}
        </span>
        <div className="flex items-center justify-center gap-6">
          <span className="font-fut text-xl sm:text-2xl font-extrabold uppercase text-white">
            {match.team_a_name}
          </span>
          <span className="rounded-2xl bg-[#090D16] border border-amber-500/30 px-5 py-2 font-fut text-4xl font-extrabold text-amber-400">
            {scoreA} - {scoreB}
          </span>
          <span className="font-fut text-xl sm:text-2xl font-extrabold uppercase text-white">
            {match.team_b_name}
          </span>
        </div>
        {officialMvp && (
          <div className="pt-1 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Crown size={14} /> MVP Oficial: {officialMvp.nickname}
          </div>
        )}
      </div>

      {/* Teams Roster + Admin Move/Remove + Goal Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            side: "A" as const,
            name: match.team_a_name,
            color: TEAM_COLORS[match.team_a_color ?? "white"],
            avg: avgA,
            list: teamA,
          },
          {
            side: "B" as const,
            name: match.team_b_name,
            color: TEAM_COLORS[match.team_b_color ?? "black"],
            avg: avgB,
            list: teamB,
          },
        ].map((team) => (
          <div
            key={team.side}
            style={{ borderColor: team.color.border }}
            className="rounded-3xl border bg-[#111827] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-fut text-xl font-extrabold uppercase text-white flex items-center gap-2">
                <span
                  title={team.color.label}
                  style={{ backgroundColor: team.color.hex }}
                  className="h-4 w-4 rounded-full border border-white/50 shrink-0"
                />
                {team.name} ({team.list.length})
              </h2>
              <span className="font-fut text-sm font-bold text-amber-400">
                MEDIA {team.avg}
              </span>
            </div>

            <div className="space-y-2">
              {team.list.length > 0 ? (
                team.list.map(({ player }) => {
                  const g = goalsMap[player.id] ?? 0;
                  const a = assistsMap[player.id] ?? 0;
                  return (
                    <div
                      key={player.id}
                      className="flex flex-wrap items-center justify-between rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2 gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {player.nickname}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {player.position} · Media {player.overall}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {match.status !== "finished" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                swapMatchPlayerTeam(match.id, player.id)
                              }
                              title="Mover al otro equipo"
                              className="rounded-lg border border-[#1F2937] p-1.5 text-gray-300 hover:border-amber-400 hover:text-amber-300"
                            >
                              <ArrowLeftRight size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                adminRemovePlayerFromMatch(match.id, player.id)
                              }
                              title="Quitar del partido"
                              className="rounded-lg border border-[#1F2937] p-1.5 text-gray-400 hover:border-red-500/40 hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        {/* Goals */}
                        <div
                          title="Goles"
                          className="flex items-center gap-1 rounded-lg bg-[#111827] border border-[#1F2937] px-1.5 py-0.5"
                        >
                          <span className="text-[10px]">⚽</span>
                          <button
                            type="button"
                            onClick={() => adjustGoal(player.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:text-amber-400"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-fut text-lg font-extrabold text-emerald-400 w-4 text-center">
                            {g}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustGoal(player.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:text-emerald-400"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        {/* Assists */}
                        <div
                          title="Asistencias"
                          className="flex items-center gap-1 rounded-lg bg-[#111827] border border-[#1F2937] px-1.5 py-0.5"
                        >
                          <span className="text-[10px]">🎯</span>
                          <button
                            type="button"
                            onClick={() => adjustAssist(player.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:text-amber-400"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-fut text-lg font-extrabold text-sky-400 w-4 text-center">
                            {a}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustAssist(player.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded text-gray-300 hover:text-sky-400"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-500 py-2">
                  Sin jugadores en {team.name}.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Admin Quick-Add Players to Team A or Team B */}
      {match.status !== "finished" && availablePlayers.length > 0 && (
        <section className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-3">
          <h2 className="font-fut text-xl font-extrabold uppercase text-white flex items-center gap-2">
            <UserPlus size={18} className="text-sky-400" />
            Añadir jugadores manualmente al partido ({availablePlayers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availablePlayers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2 gap-2"
              >
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">
                    {p.nickname}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {p.position} · {p.overall}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => adminAddPlayerToMatch(match.id, p.id, "A")}
                    className="rounded-lg bg-sky-500/15 border border-sky-500/35 px-2 py-1 text-[10px] font-bold text-sky-300 hover:bg-sky-500/25"
                  >
                    + A
                  </button>
                  <button
                    type="button"
                    onClick={() => adminAddPlayerToMatch(match.id, p.id, "B")}
                    className="rounded-lg bg-amber-500/15 border border-amber-500/35 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25"
                  >
                    + B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions Panel */}
      <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          {phase === "signup_open" && (
            <button
              onClick={handleAutoBalance}
              disabled={roster.length < 2}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20 transition disabled:opacity-40"
            >
              <Scale size={15} />
              Autobalancear Equipos (Opcional)
            </button>
          )}

          <button
            onClick={handleSaveScores}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1F2937] bg-[#090D16] px-4 py-2.5 text-xs font-bold text-white hover:border-amber-500/40 transition"
          >
            <Save size={15} className="text-amber-400" />
            Guardar Goles y Asistencias
          </button>

          {phase === "voting_open" && (
            <Link
              href={`/vote/${match.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              <Vote size={15} />
              Ver página de votación ({votes.length}/{roster.length} votos)
            </Link>
          )}
        </div>

        {match.status !== "finished" && (
          <div className="pt-3 border-t border-[#1F2937] space-y-3">
            <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={promoteTotw}
                onChange={(e) => setPromoteTotw(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
              />
              Ascender automáticamente la carta del MVP ganador a nivel{" "}
              <strong className="text-amber-400">TOTW</strong> (y devolver el
              anterior TOTW a su rareza por media)
            </label>

            <button
              onClick={handleFinishMatch}
              disabled={finishing}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60"
            >
              <Crown size={15} />
              {finishing
                ? "Cerrando y recalculando..."
                : "Cerrar Votación, Recalcular Medias y Finalizar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
