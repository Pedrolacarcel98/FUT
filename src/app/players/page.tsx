"use client";

import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useFutStore } from "@/lib/store";
import { FutCard } from "@/components/fut/FutCard";
import { PlayerCardModal } from "@/components/fut/PlayerCardModal";
import {
  CARD_TIER_LABELS,
  CARD_TIER_ORDER,
  type CardTier,
  type Player,
} from "@/types/fut";

export default function PlayersPage() {
  const { players, getPlayerCareerStats } = useFutStore();
  const [query, setQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<CardTier | "all">("all");
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => {
        const matchesTier =
          selectedTier === "all" || p.card_tier === selectedTier;
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.nickname.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q);
        return matchesTier && matchesQuery;
      })
      .sort((a, b) => b.overall - a.overall);
  }, [players, query, selectedTier]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Álbum Coleccionable
          </p>
          <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
            Plantilla del Club ({filteredPlayers.length})
          </h1>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, mote o pos..."
            className="w-full rounded-2xl border border-[#1F2937] bg-[#111827] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Horizontal Swipeable Tier Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <SlidersHorizontal size={15} className="text-gray-500 shrink-0 mr-1" />
        <button
          onClick={() => setSelectedTier("all")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            selectedTier === "all"
              ? "bg-amber-500 text-slate-950"
              : "bg-[#111827] border border-[#1F2937] text-gray-300 hover:border-gray-600"
          }`}
        >
          Todos ({players.length})
        </button>
        {CARD_TIER_ORDER.map((tier) => {
          const count = players.filter((p) => p.card_tier === tier).length;
          const active = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-amber-500 text-slate-950"
                  : "bg-[#111827] border border-[#1F2937] text-gray-300 hover:border-gray-600"
              }`}
            >
              {CARD_TIER_LABELS[tier]} ({count})
            </button>
          );
        })}
      </div>

      {/* Responsive FUT Cards Grid (2 cols mobile, 3-4 tablet/desktop) */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-3 justify-items-center pt-2">
          {filteredPlayers.map((player) => (
            <div
              key={player.id}
              className="flex flex-col items-center gap-1.5"
            >
              <FutCard
                player={player}
                size="sm"
                onClick={() => setActivePlayer(player)}
              />
              <span className="text-[11px] text-gray-400 font-medium">
                {player.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-10 text-center text-sm text-gray-400">
          No hay jugadores que coincidan con tu búsqueda o filtro.
        </div>
      )}

      {/* Interactive 3D Modal */}
      <PlayerCardModal
        player={activePlayer}
        stats={activePlayer ? getPlayerCareerStats(activePlayer.id) : null}
        onClose={() => setActivePlayer(null)}
      />
    </div>
  );
}
