"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Crown,
  Lock,
  LogIn,
  Trophy,
  Vote,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import {
  getEffectiveMatchPhase,
  getVotingRemainingLabel,
} from "@/lib/match-phase";
import { FutCard } from "@/components/fut/FutCard";

export default function MatchVoteDetailPage() {
  const params = useParams<{ matchId: string }>();
  const {
    matches,
    currentPlayer,
    getMatchPlayers,
    getMatchVotes,
    castMvpVote,
    hasCurrentPlayerVotedInMatch,
  } = useFutStore();

  const [selectedMvp, setSelectedMvp] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const match = useMemo(() => {
    if (params.matchId === "latest") {
      return (
        matches.find((m) => getEffectiveMatchPhase(m) === "voting_open") ??
        matches.find((m) => m.status === "finished") ??
        matches[0]
      );
    }
    return matches.find((m) => m.id === params.matchId);
  }, [matches, params.matchId]);

  const participants = useMemo(
    () => (match ? getMatchPlayers(match.id) : []),
    [match, getMatchPlayers]
  );

  const votes = useMemo(
    () => (match ? getMatchVotes(match.id) : []),
    [match, getMatchVotes]
  );

  const alreadyVoted = match ? hasCurrentPlayerVotedInMatch(match.id) : false;

  const voteCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of votes) {
      map.set(v.mvp_vote_player_id, (map.get(v.mvp_vote_player_id) ?? 0) + 1);
    }
    return map;
  }, [votes]);

  if (!match) {
    return (
      <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-8 text-center space-y-3">
        <p className="text-gray-300 font-semibold">
          No se ha encontrado este partido.
        </p>
        <Link
          href="/vote"
          className="inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950"
        >
          Volver a Votaciones
        </Link>
      </div>
    );
  }

  const phase = getEffectiveMatchPhase(match);
  const isVotingOpen = phase === "voting_open";
  const remaining = getVotingRemainingLabel(match);
  const totalVotes = votes.length;

  const isParticipant = Boolean(
    currentPlayer &&
      participants.some((p) => p.player_id === currentPlayer.id)
  );

  const canVote = isVotingOpen && isParticipant && !alreadyVoted;

  const handleConfirmVote = () => {
    if (!selectedMvp) return;
    const res = castMvpVote(match.id, selectedMvp);
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: res.error ?? "No se pudo registrar tu voto.",
      });
    } else {
      setFeedback({
        type: "ok",
        text: "¡Voto MVP registrado! Gracias por participar.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vote"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-amber-400"
        >
          <ArrowLeft size={14} /> Volver a Votaciones
        </Link>
      </div>

      {/* Match Scoreboard Header */}
      <div className="rounded-3xl border border-[#1F2937] bg-gradient-to-b from-[#111827] to-[#0c1220] p-5 sm:p-6 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border bg-[#090D16] border-[#1F2937]">
            {isVotingOpen ? (
              <>
                <Clock size={12} className="text-emerald-400" />
                <span className="text-emerald-400">
                  Votación MVP Abierta · {remaining}
                </span>
              </>
            ) : (
              <>
                <Lock size={12} className="text-gray-400" />
                <span className="text-gray-400">
                  {phase === "finished"
                    ? "Votación Cerrada"
                    : phase === "voting_expired"
                    ? "Plazo de 7 días expirado"
                    : "Se abrirá a la hora del partido"}
                </span>
              </>
            )}
          </div>
          {canVote && (
            <span className="rounded-full bg-red-500/15 border border-red-500/40 px-3 py-1 text-xs font-bold text-red-400">
              Pendiente de votación
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <div className="text-right flex-1">
            <div className="font-fut text-xl sm:text-2xl font-extrabold uppercase text-white">
              {match.team_a_name}
            </div>
          </div>
          <div className="rounded-2xl bg-[#090D16] border border-amber-500/30 px-5 py-2 font-fut text-4xl font-extrabold text-amber-400">
            {match.score_a} - {match.score_b}
          </div>
          <div className="text-left flex-1">
            <div className="font-fut text-xl sm:text-2xl font-extrabold uppercase text-white">
              {match.team_b_name}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          {match.location} · {totalVotes}/{participants.length} votos emitidos
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs sm:text-sm ${
            feedback.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Login Gate if not signed in */}
      {isVotingOpen && !currentPlayer && (
        <section className="rounded-3xl border border-amber-500/35 bg-[#111827] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-fut text-2xl font-extrabold uppercase text-white">
                Inicia sesión para votar al MVP
              </h2>
              <p className="text-xs text-gray-400">
                Cada jugador del partido elige a su MVP (sin autovotos).
              </p>
            </div>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 shrink-0"
            >
              <LogIn size={16} /> Entrar / Registrarme
            </Link>
          </div>
        </section>
      )}

      {/* Not in roster notice */}
      {isVotingOpen && currentPlayer && !isParticipant && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-200">
          Estás conectado como <strong>{currentPlayer.nickname}</strong>, pero no
          disputaste este partido. Solo los participantes pueden votar al MVP.
        </div>
      )}

      {/* MVP Selection Grid (All match players + goal icon for context) */}
      {canVote && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-fut text-2xl font-extrabold uppercase text-white flex items-center gap-2">
              <Crown size={20} className="text-amber-400" />
              Selecciona al MVP del Partido
            </h2>
            <span className="text-xs text-gray-400">
              Votando como{" "}
              <strong className="text-emerald-400">
                {currentPlayer?.nickname}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 justify-items-center">
            {participants.map(({ player, team, goals }) => {
              const isSelf = currentPlayer?.id === player.id;
              const isSelected = selectedMvp === player.id;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (!isSelf) setSelectedMvp(player.id);
                  }}
                  className={`relative flex flex-col items-center gap-2 rounded-3xl p-2.5 transition w-full max-w-[190px] ${
                    isSelf
                      ? "opacity-50 cursor-not-allowed bg-[#111827]/40"
                      : isSelected
                      ? "bg-amber-500/15 ring-2 ring-amber-400 cursor-pointer"
                      : "hover:bg-[#111827]/70 cursor-pointer"
                  }`}
                >
                  {/* Goal badge in top-right corner for quick context */}
                  <div
                    title={`${goals} ${goals === 1 ? "gol" : "goles"} en este partido`}
                    className={`absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-md border ${
                      goals > 0
                        ? "bg-emerald-500/90 text-slate-950 border-emerald-300"
                        : "bg-[#090D16]/90 text-gray-400 border-[#1F2937]"
                    }`}
                  >
                    <span>⚽</span>
                    <span>{goals}</span>
                  </div>

                  <FutCard player={player} size="sm" />

                  <div className="text-center space-y-1 w-full">
                    <div className="text-[11px] text-gray-400 truncate">
                      {team === "A" ? match.team_a_name : match.team_b_name}
                    </div>
                    {isSelf ? (
                      <span className="inline-block text-[10px] font-semibold text-gray-500">
                        (Tú — no votable)
                      </span>
                    ) : isSelected ? (
                      <div className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-3 py-1 text-xs font-extrabold text-slate-950">
                        <Crown size={13} /> MVP
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!selectedMvp}
            onClick={handleConfirmVote}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.99] transition disabled:opacity-40"
          >
            <Vote size={17} />
            Confirmar mi voto MVP
          </button>
        </section>
      )}

      {/* Results Progress Bars (shown after voting or when closed) */}
      {(alreadyVoted || !isVotingOpen) && (
        <section className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy size={18} />
            <h2 className="font-fut text-xl font-extrabold uppercase text-white">
              Recuento de Votos MVP
            </h2>
          </div>

          <div className="space-y-3">
            {[...participants]
              .sort(
                (a, b) =>
                  (voteCounts.get(b.player_id) ?? 0) -
                    (voteCounts.get(a.player_id) ?? 0) || b.goals - a.goals
              )
              .map(({ player, goals }) => {
                const count = voteCounts.get(player.id) ?? 0;
                const pct =
                  totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isOfficialMvp = match.mvp_player_id === player.id;

                return (
                  <div key={player.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 font-semibold text-white min-w-0">
                        {isOfficialMvp && (
                          <Crown size={14} className="text-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{player.nickname}</span>
                        <span className="rounded-md bg-[#090D16] border border-[#1F2937] px-1.5 py-0.5 text-[10px] text-emerald-300 shrink-0">
                          ⚽ {goals}
                        </span>
                      </div>
                      <span className="font-fut text-sm font-bold text-amber-400 shrink-0">
                        {pct}% ({count})
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#090D16]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                        className={`h-full rounded-full ${
                          isOfficialMvp
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : "bg-emerald-500/75"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
