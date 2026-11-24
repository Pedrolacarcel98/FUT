"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  LogIn,
  MapPin,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { getEffectiveMatchPhase } from "@/lib/match-phase";
import { FutCard } from "@/components/fut/FutCard";
import { PlayerCardModal } from "@/components/fut/PlayerCardModal";
import { TEAM_COLORS, type Player } from "@/types/fut";

function useNowTick() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getCountdown(targetIso: string, now: number | null) {
  if (now === null) {
    return { days: null, hours: null, minutes: null, seconds: null, passed: false };
  }
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    passed: false,
  };
}

export default function HomePage() {
  const {
    matches,
    isAdmin,
    currentPlayer,
    joinOrSwitchTeam,
    leaveMatch,
    deleteMatch,
    getMatchPlayers,
    getPlayerCareerStats,
  } = useFutStore();

  const now = useNowTick();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [matchFeedback, setMatchFeedback] = useState<{
    matchId: string;
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // Home ONLY displays matches with open call-ups (before kickoff time)
  const openMatches = useMemo(() => {
    if (now === null) return [];
    return matches
      .filter((m) => getEffectiveMatchPhase(m, now) === "signup_open")
      .sort(
        (a, b) =>
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
  }, [matches, now]);

  const showMatchToast = (
    matchId: string,
    type: "ok" | "error",
    text: string
  ) => {
    setMatchFeedback({ matchId, type, text });
    setTimeout(() => {
      setMatchFeedback((prev) => (prev?.matchId === matchId ? null : prev));
    }, 3500);
  };

  const handleJoinOrSwitch = (
    matchId: string,
    team: "A" | "B",
    teamName: string
  ) => {
    const res = joinOrSwitchTeam(matchId, team);
    if (!res.ok) {
      showMatchToast(
        matchId,
        "error",
        res.error ?? "No se pudo completar el cambio."
      );
    } else {
      showMatchToast(
        matchId,
        "ok",
        res.action === "switched"
          ? `Te has cambiado a ${teamName}.`
          : `¡Apuntado en ${teamName}!`
      );
    }
  };

  const handleLeave = (matchId: string) => {
    const res = leaveMatch(matchId);
    if (!res.ok) {
      showMatchToast(matchId, "error", res.error ?? "No se pudo desapuntar.");
    } else {
      showMatchToast(matchId, "ok", "Te has desapuntado de la convocatoria.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Convocatorias Abiertas
          </p>
          <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
            Próximos Partidos
          </h1>
        </div>
        <Link
          href="/players"
          className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          Ver álbum FUT <ChevronRight size={14} />
        </Link>
      </div>

      {/* Open Call-Up Matches */}
      {openMatches.length > 0 ? (
        openMatches.map((match) => {
          const roster = getMatchPlayers(match.id);
          const teamA = roster.filter((mp) => mp.team === "A");
          const teamB = roster.filter((mp) => mp.team === "B");
          const maxPlayers = match.max_players ?? 14;
          const maxPerTeam = Math.ceil(maxPlayers / 2);

          const avgA = teamA.length
            ? Math.round(
                (teamA.reduce((acc, p) => acc + p.player.overall, 0) /
                  teamA.length) *
                  10
              ) / 10
            : 0;
          const avgB = teamB.length
            ? Math.round(
                (teamB.reduce((acc, p) => acc + p.player.overall, 0) /
                  teamB.length) *
                  10
              ) / 10
            : 0;

          const countdown = getCountdown(match.match_date, now);
          const myEntry = currentPlayer
            ? roster.find((mp) => mp.player_id === currentPlayer.id)
            : undefined;

          const feedback =
            matchFeedback?.matchId === match.id ? matchFeedback : null;

          return (
            <section
              key={match.id}
              className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 sm:p-6 shadow-xl space-y-5"
            >
              {/* Header + Countdown */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-sky-500/15 border-sky-400/35 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                    <Sparkles size={12} /> Convocatoria Abierta ({roster.length}
                    /{maxPlayers})
                  </span>
                  <h2 className="mt-2 font-fut text-2xl sm:text-3xl font-extrabold uppercase text-white">
                    {match.team_a_name}{" "}
                    <span className="text-amber-400">VS</span>{" "}
                    {match.team_b_name}
                  </h2>
                </div>

                <div className="flex items-start gap-2">
                  {!countdown.passed && (
                    <div className="flex items-center gap-1.5 rounded-2xl bg-[#090D16] border border-[#1F2937] px-3 py-2">
                      {[
                        { label: "D", value: countdown.days },
                        { label: "H", value: countdown.hours },
                        { label: "M", value: countdown.minutes },
                        { label: "S", value: countdown.seconds },
                      ].map((unit) => (
                        <div key={unit.label} className="text-center min-w-[34px]">
                          <div className="font-fut text-xl font-extrabold text-amber-400 leading-none">
                            {unit.value === null
                              ? "--"
                              : String(unit.value).padStart(2, "0")}
                          </div>
                          <div className="text-[9px] font-semibold text-gray-500 mt-0.5">
                            {unit.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Opciones de administrador del partido"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === match.id ? null : match.id
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1F2937] bg-[#090D16] text-gray-300 hover:border-amber-500/40 hover:text-amber-400 transition"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === match.id && (
                        <div className="absolute right-0 mt-1.5 z-20 w-48 rounded-2xl border border-[#1F2937] bg-[#090D16] p-1.5 shadow-2xl space-y-1">
                          <Link
                            href={`/admin/matches/${match.id}`}
                            onClick={() => setOpenMenuId(null)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-[#111827] hover:text-amber-400"
                          >
                            <Pencil size={13} />
                            Gestionar / Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              if (
                                window.confirm(
                                  `¿Seguro que quieres borrar el partido "${match.team_a_name} vs ${match.team_b_name}"?`
                                )
                              ) {
                                deleteMatch(match.id);
                              }
                            }}
                            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15"
                          >
                            <Trash2 size={13} />
                            Borrar partido
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date, Time & Maps */}
              <div className="flex flex-wrap gap-2.5 text-xs sm:text-sm text-gray-300">
                <div className="flex items-center gap-2 rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2">
                  <Calendar size={15} className="text-amber-400" />
                  <span>
                    {new Date(match.match_date).toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2">
                  <Clock size={15} className="text-amber-400" />
                  <span>
                    {new Date(match.match_date).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    h
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    match.location
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2 hover:border-emerald-500/40 hover:text-emerald-300 transition"
                >
                  <MapPin size={15} className="text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[240px] sm:max-w-none">
                    {match.location}
                  </span>
                  <ExternalLink size={13} className="text-gray-500 shrink-0" />
                </a>
              </div>

              {/* Prompt if not signed in */}
              {!currentPlayer && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <span className="text-xs text-amber-200">
                    Inicia sesión con tu cuenta de jugador para apuntarte a un
                    equipo o cambiarte antes del partido.
                  </span>
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shrink-0"
                  >
                    <LogIn size={14} /> Entrar / Registrarme
                  </Link>
                </div>
              )}

              {/* Toast Feedback */}
              {feedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                    feedback.type === "ok"
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/35 bg-red-500/10 text-red-300"
                  }`}
                >
                  {feedback.type === "ok" ? (
                    <CheckCircle2 size={15} className="shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="shrink-0" />
                  )}
                  {feedback.text}
                </div>
              )}

              {/* Live Team A vs Team B */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {[
                  {
                    side: "A" as const,
                    name: match.team_a_name,
                    color: TEAM_COLORS[match.team_a_color ?? "white"],
                    avg: avgA,
                    members: teamA,
                    badge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
                    joinBtn: "bg-sky-500 text-slate-950 hover:bg-sky-400",
                  },
                  {
                    side: "B" as const,
                    name: match.team_b_name,
                    color: TEAM_COLORS[match.team_b_color ?? "black"],
                    avg: avgB,
                    members: teamB,
                    badge: "bg-amber-500/20 text-amber-300 border-amber-400/30",
                    joinBtn: "bg-amber-500 text-slate-950 hover:bg-amber-400",
                  },
                ].map((col) => {
                  const isInThisTeam = myEntry?.team === col.side;
                  const isInOtherTeam = Boolean(myEntry && !isInThisTeam);
                  const isTeamFull = col.members.length >= maxPerTeam;

                  return (
                    <div
                      key={col.side}
                      style={{
                        borderColor: col.color.border,
                        backgroundColor: col.color.bgSoft,
                      }}
                      className="rounded-2xl border p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            title={`Color: ${col.color.label}`}
                            style={{ backgroundColor: col.color.hex }}
                            className="h-4 w-4 rounded-full border border-white/50 shrink-0 shadow-sm"
                          />
                          <h3 className="font-fut text-xl font-extrabold uppercase text-white truncate">
                            {col.name}
                          </h3>
                          <span className="text-xs font-bold text-gray-400">
                            ({col.members.length}/{maxPerTeam})
                          </span>
                        </div>
                        <span
                          className={`rounded-xl border px-2.5 py-0.5 font-fut text-sm font-extrabold shrink-0 ${col.badge}`}
                        >
                          MEDIA {col.avg}
                        </span>
                      </div>

                      {/* Mini FUT Cards */}
                      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar min-h-[164px] items-center">
                        {col.members.length > 0 ? (
                          col.members.map(({ player }) => {
                            const isMe = currentPlayer?.id === player.id;
                            return (
                              <div
                                key={player.id}
                                className={`rounded-2xl p-0.5 transition ${
                                  isMe ? "ring-2 ring-emerald-400" : ""
                                }`}
                              >
                                <FutCard
                                  player={player}
                                  size="xs"
                                  onClick={() => setSelectedPlayer(player)}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-500 px-1">
                            Sin jugadores aún en {col.name}.
                          </p>
                        )}
                      </div>

                      {/* Self-Service Join / Switch / Leave */}
                      {currentPlayer && (
                        <div className="pt-1 mt-auto">
                          {isInThisTeam ? (
                            <button
                              type="button"
                              onClick={() => handleLeave(match.id)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/25 transition"
                            >
                              <UserMinus size={14} /> Desapuntarme
                            </button>
                          ) : isInOtherTeam ? (
                            <button
                              type="button"
                              disabled={isTeamFull}
                              onClick={() =>
                                handleJoinOrSwitch(match.id, col.side, col.name)
                              }
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#1F2937] bg-[#090D16] px-3 py-2 text-xs font-bold text-white hover:border-amber-400 hover:text-amber-300 transition disabled:opacity-40"
                            >
                              <ArrowLeftRight size={14} />
                              {isTeamFull
                                ? "Equipo completo"
                                : `Cambiarme a ${col.name}`}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isTeamFull}
                              onClick={() =>
                                handleJoinOrSwitch(match.id, col.side, col.name)
                              }
                              className={`w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-[0.98] disabled:opacity-40 ${col.joinBtn}`}
                            >
                              <UserPlus size={14} />
                              {isTeamFull
                                ? "Equipo completo"
                                : `Apuntarme a ${col.name}`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      ) : (
        <section className="rounded-3xl border border-[#1F2937] bg-[#111827] p-8 text-center space-y-3">
          <p className="text-gray-400">
            No hay ninguna convocatoria abierta ahora mismo.
          </p>
          <Link
            href="/vote"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
          >
            Ir a Votaciones MVP
          </Link>
        </section>
      )}

      <PlayerCardModal
        player={selectedPlayer}
        stats={selectedPlayer ? getPlayerCareerStats(selectedPlayer.id) : null}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
