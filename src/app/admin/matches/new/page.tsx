"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Scale,
  Send,
  Users,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { balanceTeams } from "@/lib/team-balancer";
import { sendNotification } from "@/lib/notify-client";
import { TEAM_COLOR_LIST, TEAM_COLORS, type TeamColorId } from "@/types/fut";

export default function NewMatchPage() {
  const router = useRouter();
  const { hydrated, isAdmin, players, createMatch } = useFutStore();

  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    d.setHours(20, 30, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }, []);

  const [maxPlayers, setMaxPlayers] = useState(14);
  const [matchDate, setMatchDate] = useState(defaultDate);
  const [location, setLocation] = useState(
    "Polideportivo Municipal Canal — Campo 2"
  );
  const [teamAName, setTeamAName] = useState("Equipo Claro");
  const [teamBName, setTeamBName] = useState("Equipo Oscuro");
  const [teamAColor, setTeamAColor] = useState<TeamColorId>("white");
  const [teamBColor, setTeamBColor] = useState<TeamColorId>("black");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [hydrated, isAdmin, router]);

  if (!hydrated || !isAdmin) return null;

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setTeamAIds((prev) => prev.filter((x) => x !== id));
    setTeamBIds((prev) => prev.filter((x) => x !== id));
  };

  const handleAutoBalance = () => {
    const chosen = players.filter((p) => selectedIds.includes(p.id));
    const result = balanceTeams(chosen);
    setTeamAIds(result.teamA.map((p) => p.id));
    setTeamBIds(result.teamB.map((p) => p.id));
  };

  const movePlayer = (playerId: string, from: "A" | "B") => {
    if (from === "A") {
      setTeamAIds((prev) => prev.filter((id) => id !== playerId));
      setTeamBIds((prev) => [...prev, playerId]);
    } else {
      setTeamBIds((prev) => prev.filter((id) => id !== playerId));
      setTeamAIds((prev) => [...prev, playerId]);
    }
  };

  const teamAPlayers = teamAIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const teamBPlayers = teamBIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const avgA = teamAPlayers.length
    ? Math.round(
        (teamAPlayers.reduce((acc, p) => acc + p.overall, 0) /
          teamAPlayers.length) *
          10
      ) / 10
    : 0;
  const avgB = teamBPlayers.length
    ? Math.round(
        (teamBPlayers.reduce((acc, p) => acc + p.overall, 0) /
          teamBPlayers.length) *
          10
      ) / 10
    : 0;

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();

    let finalA = teamAIds;
    let finalB = teamBIds;

    // If admin pre-selected players without clicking auto-balance, balance them cleanly
    if (finalA.length === 0 && finalB.length === 0 && selectedIds.length > 0) {
      const balanced = balanceTeams(
        players.filter((p) => selectedIds.includes(p.id))
      );
      finalA = balanced.teamA.map((p) => p.id);
      finalB = balanced.teamB.map((p) => p.id);
    }

    const created = createMatch({
      max_players: Math.max(maxPlayers, finalA.length + finalB.length),
      match_date: new Date(matchDate).toISOString(),
      location,
      team_a_name: teamAName,
      team_b_name: teamBName,
      team_a_color: teamAColor,
      team_b_color: teamBColor,
      teamAPlayerIds: finalA,
      teamBPlayerIds: finalB,
    });

    const recipients = players
      .filter((p) => p.notify_emails !== false && Boolean(p.email))
      .map((p) => p.email as string);

    if (recipients.length > 0) {
      void sendNotification({
        type: "new_match",
        recipients,
        matchDate: created.match_date,
        location: created.location,
        teamAName: created.team_a_name,
        teamBName: created.team_b_name,
        maxPlayers: created.max_players ?? 14,
      });
    }

    router.push(`/admin/matches/${created.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-amber-400 mb-1"
        >
          <ArrowLeft size={14} /> Volver al Panel
        </Link>
        <h1 className="font-fut text-3xl font-extrabold uppercase text-white">
          Nueva Convocatoria
        </h1>
        <p className="text-xs text-gray-400">
          Al publicar, el partido quedará abierto en Inicio hasta la hora de
          comienzo para que cada jugador elija su equipo o se cambie.
        </p>
      </div>

      <form onSubmit={handlePublish} className="space-y-6">
        {/* Match Details */}
        <section className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Fecha y hora (cierre automático de inscripciones)
              </label>
              <input
                type="datetime-local"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Ubicación / Campo
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                <span>Nombre y color — Equipo A</span>
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full border border-white/40"
                  style={{ backgroundColor: TEAM_COLORS[teamAColor].hex }}
                />
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="flex-1 rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 rounded-xl border border-[#1F2937] bg-[#090D16] px-2.5 py-2">
                  {TEAM_COLOR_LIST.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => setTeamAColor(c.id)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-5 w-5 rounded-full border transition ${
                        teamAColor === c.id
                          ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#090D16] scale-110 border-white"
                          : "border-white/30 opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                <span>Nombre y color — Equipo B</span>
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full border border-white/40"
                  style={{ backgroundColor: TEAM_COLORS[teamBColor].hex }}
                />
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="flex-1 rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 rounded-xl border border-[#1F2937] bg-[#090D16] px-2.5 py-2">
                  {TEAM_COLOR_LIST.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      onClick={() => setTeamBColor(c.id)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-5 w-5 rounded-full border transition ${
                        teamBColor === c.id
                          ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#090D16] scale-110 border-white"
                          : "border-white/30 opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-gray-300">
              Plazas orientativas (no bloquea inscripciones)
            </label>
            <div className="flex flex-wrap gap-2">
              {[10, 12, 14, 16, 22].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setMaxPlayers(cap)}
                  className={`rounded-xl px-4 py-2 font-fut text-sm font-bold transition ${
                    maxPlayers === cap
                      ? "bg-amber-500 text-slate-950"
                      : "bg-[#090D16] border border-[#1F2937] text-gray-300"
                  }`}
                >
                  {cap} jugadores ({cap / 2}v{cap / 2})
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Optional Pre-Enrolled Players */}
        <section className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-fut text-xl font-extrabold uppercase text-white flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                Pre-añadir jugadores (opcional · {selectedIds.length})
              </h2>
              <p className="text-xs text-gray-400">
                Déjalo vacío si quieres que se apunten todos solos, o selecciona
                a los fijos y autobalancéalos.
              </p>
            </div>

            {selectedIds.length >= 2 && (
              <button
                type="button"
                onClick={handleAutoBalance}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 active:scale-95 transition"
              >
                <Scale size={15} />
                Autobalancear
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {players.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                    checked
                      ? "border-amber-500/50 bg-amber-500/15 text-white"
                      : "border-[#1F2937] bg-[#090D16] text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">
                      {p.nickname}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {p.position} · {p.overall}
                    </div>
                  </div>
                  {checked && (
                    <Check size={14} className="text-amber-400 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Preview if pre-balanced */}
        {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                side: "A" as const,
                name: teamAName,
                avg: avgA,
                list: teamAPlayers,
                accent: "border-sky-500/35",
                badge: "bg-sky-500/20 text-sky-300",
              },
              {
                side: "B" as const,
                name: teamBName,
                avg: avgB,
                list: teamBPlayers,
                accent: "border-amber-500/35",
                badge: "bg-amber-500/20 text-amber-300",
              },
            ].map((col) => (
              <div
                key={col.side}
                className={`rounded-3xl border bg-[#111827] p-4 space-y-3 ${col.accent}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-fut text-xl font-extrabold uppercase text-white">
                    {col.name} ({col.list.length})
                  </h3>
                  <span
                    className={`rounded-xl px-2.5 py-0.5 font-fut text-sm font-extrabold ${col.badge}`}
                  >
                    MEDIA {col.avg}
                  </span>
                </div>

                <div className="space-y-2">
                  {col.list.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-fut text-lg font-extrabold text-amber-400 w-6">
                          {p.overall}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {p.nickname}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {p.position} · {p.name}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => movePlayer(p.id, col.side)}
                        className="rounded-lg border border-[#1F2937] px-2 py-1 text-[10px] font-semibold text-gray-300 hover:border-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <ArrowLeftRight size={12} /> Mover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.99] transition"
        >
          <Send size={16} />
          Publicar Convocatoria
        </button>
      </form>
    </div>
  );
}
