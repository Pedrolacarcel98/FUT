"use client";

import React, { useMemo, useState } from "react";
import { Award, Calendar, Crown, Shield, Target, Trophy } from "lucide-react";
import { useFutStore } from "@/lib/store";
import { PlayerCardModal } from "@/components/fut/PlayerCardModal";
import type { Player } from "@/types/fut";

export default function StatsPage() {
  const {
    players,
    matches,
    getMatchPlayers,
    getPlayerById,
    getPlayerCareerStats,
  } = useFutStore();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const enrichedPlayers = useMemo(
    () =>
      players.map((p) => ({
        player: p,
        stats: getPlayerCareerStats(p.id),
      })),
    [players, getPlayerCareerStats]
  );

  const pichichi = useMemo(
    () =>
      [...enrichedPlayers]
        .sort((a, b) => b.stats.goals - a.stats.goals)
        .slice(0, 3),
    [enrichedPlayers]
  );

  const mvpKings = useMemo(
    () =>
      [...enrichedPlayers]
        .sort(
          (a, b) =>
            b.stats.mvpAwards - a.stats.mvpAwards ||
            b.player.overall - a.player.overall
        )
        .slice(0, 3),
    [enrichedPlayers]
  );

  const talismans = useMemo(
    () =>
      [...enrichedPlayers]
        .filter((x) => x.stats.matchesPlayed > 0)
        .sort(
          (a, b) =>
            b.stats.winRate - a.stats.winRate ||
            b.stats.matchesPlayed - a.stats.matchesPlayed
        )
        .slice(0, 3),
    [enrichedPlayers]
  );

  const finishedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "finished")
        .sort(
          (a, b) =>
            new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        ),
    [matches]
  );

  const podiums = [
    {
      title: "Pichichi",
      subtitle: "Máximo goleador histórico",
      icon: Target,
      accent: "text-emerald-400",
      rows: pichichi.map((x) => ({
        player: x.player,
        metric: `${x.stats.goals} goles`,
      })),
    },
    {
      title: "Rey del MVP",
      subtitle: "Más veces mejor jugador",
      icon: Award,
      accent: "text-amber-400",
      rows: mvpKings.map((x) => ({
        player: x.player,
        metric: `${x.stats.mvpAwards} MVP`,
      })),
    },
    {
      title: "Talismán",
      subtitle: "Mayor % de victorias",
      icon: Shield,
      accent: "text-sky-400",
      rows: talismans.map((x) => ({
        player: x.player,
        metric: `${x.stats.winRate}%`,
      })),
    },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Salón de la Fama
        </p>
        <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
          Rankings e Historial
        </h1>
      </div>

      {/* Podium Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {podiums.map((pod) => {
          const Icon = pod.icon;
          return (
            <div
              key={pod.title}
              className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#090D16] border border-[#1F2937]">
                  <Icon size={20} className={pod.accent} />
                </div>
                <div>
                  <h2 className="font-fut text-xl font-extrabold uppercase text-white leading-none">
                    {pod.title}
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {pod.subtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {pod.rows.length > 0 ? (
                  pod.rows.map((row, idx) => (
                    <button
                      key={row.player.id}
                      onClick={() => setSelectedPlayer(row.player)}
                      className={`w-full flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition ${
                        idx === 0
                          ? "bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15"
                          : "bg-[#090D16] border border-[#1F2937] hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-fut text-lg font-extrabold w-5 text-center ${
                            idx === 0
                              ? "text-amber-400"
                              : idx === 1
                              ? "text-gray-300"
                              : "text-amber-700"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="text-sm font-bold text-white truncate">
                            {row.player.nickname}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {row.player.name}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-fut text-base font-extrabold shrink-0 ml-2 ${pod.accent}`}
                      >
                        {row.metric}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">
                    Sin datos todavía
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Finished Matches Chronological History */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          <h2 className="font-fut text-2xl font-extrabold uppercase text-white">
            Historial de Partidos ({finishedMatches.length})
          </h2>
        </div>

        <div className="space-y-3">
          {finishedMatches.length === 0 ? (
            <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-8 text-center text-sm text-gray-400">
              Todavía no hay partidos finalizados en el historial.
            </div>
          ) : null}
          {finishedMatches.map((match) => {
            const roster = getMatchPlayers(match.id);
            const scorersA = roster.filter((r) => r.team === "A" && r.goals > 0);
            const scorersB = roster.filter((r) => r.team === "B" && r.goals > 0);
            const mvp = getPlayerById(match.mvp_player_id);

            return (
              <div
                key={match.id}
                className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-400" />
                    {new Date(match.match_date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {match.location}
                  </span>
                  {mvp && (
                    <button
                      onClick={() => setSelectedPlayer(mvp)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition"
                    >
                      <Crown size={13} /> MVP: {mvp.nickname}
                    </button>
                  )}
                </div>

                {/* Scoreline */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="text-right">
                    <div className="font-fut text-xl font-extrabold uppercase text-white">
                      {match.team_a_name}
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-gray-400">
                      {scorersA.map((s) => (
                        <div key={s.id}>
                          {s.player.nickname} ⚽{" "}
                          {s.goals > 1 ? `x${s.goals}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#090D16] border border-[#1F2937] px-4 py-2 font-fut text-3xl font-extrabold text-amber-400">
                    {match.score_a} - {match.score_b}
                  </div>

                  <div className="text-left">
                    <div className="font-fut text-xl font-extrabold uppercase text-white">
                      {match.team_b_name}
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-gray-400">
                      {scorersB.map((s) => (
                        <div key={s.id}>
                          ⚽ {s.goals > 1 ? `x${s.goals} ` : ""}
                          {s.player.nickname}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PlayerCardModal
        player={selectedPlayer}
        stats={selectedPlayer ? getPlayerCareerStats(selectedPlayer.id) : null}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
