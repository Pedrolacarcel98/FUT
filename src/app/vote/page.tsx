"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  MapPin,
  Vote,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import {
  getEffectiveMatchPhase,
  getVotingRemainingLabel,
} from "@/lib/match-phase";

export default function VotesHubPage() {
  const {
    matches,
    currentPlayer,
    getMatchPlayers,
    getMatchVotes,
    getPlayerById,
    hasCurrentPlayerVotedInMatch,
  } = useFutStore();

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const openVotingMatches = useMemo(() => {
    if (now === null) return [];
    return matches
      .filter((m) => getEffectiveMatchPhase(m, now) === "voting_open")
      .sort(
        (a, b) =>
          new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      );
  }, [matches, now]);

  const recentClosedMatches = useMemo(() => {
    if (now === null) return [];
    return matches
      .filter((m) => {
        const phase = getEffectiveMatchPhase(m, now);
        return phase === "finished" || phase === "voting_expired";
      })
      .sort(
        (a, b) =>
          new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      )
      .slice(0, 5);
  }, [matches, now]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Premios Post-Partido
        </p>
        <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
          Votaciones MVP
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Las votaciones se abren automáticamente a la hora del partido y
          permanecen activas durante 7 días.
        </p>
      </div>

      {/* Open Voting Matches */}
      <section className="space-y-3">
        <h2 className="font-fut text-xl font-extrabold uppercase text-white flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          Abiertas ahora ({openVotingMatches.length})
        </h2>

        {openVotingMatches.length > 0 ? (
          <div className="space-y-3">
            {openVotingMatches.map((match) => {
              const roster = getMatchPlayers(match.id);
              const votes = getMatchVotes(match.id);
              const isParticipant = Boolean(
                currentPlayer &&
                  roster.some((r) => r.player_id === currentPlayer.id)
              );
              const hasVoted = hasCurrentPlayerVotedInMatch(match.id);
              const remaining = getVotingRemainingLabel(
                match,
                now ?? undefined
              );

              return (
                <Link
                  key={match.id}
                  href={`/vote/${match.id}`}
                  className="block rounded-3xl border border-emerald-500/35 bg-gradient-to-r from-[#111827] via-[#111827] to-emerald-950/30 p-5 hover:border-emerald-400/70 transition shadow-lg space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        <Clock size={12} /> {remaining}
                      </span>

                      {isParticipant && !hasVoted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/40 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
                          Pendiente de votación
                        </span>
                      )}

                      {isParticipant && hasVoted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                          <CheckCircle2 size={12} /> Voto enviado
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-gray-400">
                      {votes.length}/{roster.length} votos
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-fut text-2xl sm:text-3xl font-extrabold uppercase text-white">
                        {match.team_a_name}{" "}
                        <span className="text-amber-400">
                          {match.score_a} - {match.score_b}
                        </span>{" "}
                        {match.team_b_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-amber-400" />
                          {new Date(match.match_date).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-400" />
                          {match.location}
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shrink-0">
                      <Vote size={15} />
                      {hasVoted ? "Ver resultados" : "Votar MVP"}
                      <ChevronRight size={15} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-8 text-center text-sm text-gray-400">
            No hay ninguna votación abierta en este momento. En cuanto empiece
            el próximo partido, aparecerá aquí durante 7 días.
          </div>
        )}
      </section>

      {/* Recently Closed Votings */}
      {recentClosedMatches.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="font-fut text-xl font-extrabold uppercase text-gray-300">
            Votaciones Recientes
          </h2>
          <div className="space-y-2.5">
            {recentClosedMatches.map((match) => {
              const mvp = getPlayerById(match.mvp_player_id);
              const votes = getMatchVotes(match.id);
              return (
                <Link
                  key={match.id}
                  href={`/vote/${match.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3 hover:border-gray-600 transition"
                >
                  <div>
                    <div className="font-fut text-lg font-extrabold uppercase text-white">
                      {match.team_a_name} {match.score_a} - {match.score_b}{" "}
                      {match.team_b_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(match.match_date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {votes.length} votos
                    </div>
                  </div>
                  {mvp && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 px-3 py-1 text-xs font-bold text-amber-300">
                      <Crown size={13} /> MVP: {mvp.nickname}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
