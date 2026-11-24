"use client";

import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Award,
  Check,
  Download,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { FutCard } from "./FutCard";
import { useFutStore } from "@/lib/store";
import {
  CARD_TIER_LABELS,
  PLAYSTYLES,
  type Player,
  type PlayerCareerStats,
} from "@/types/fut";

interface PlayerCardModalProps {
  player: Player | null;
  stats: PlayerCareerStats | null;
  onClose: () => void;
}

export function PlayerCardModal({
  player,
  stats,
  onClose,
}: PlayerCardModalProps) {
  const { getPlayerRatingHistory, getPlayerBonusBreakdown } = useFutStore();
  const exportCardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [14, -14]), {
    stiffness: 220,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-14, 14]), {
    stiffness: 220,
    damping: 20,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleDownloadPng = async () => {
    if (!exportCardRef.current || !player) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "transparent",
      });
      const link = document.createElement("a");
      link.download = `FUT-${player.nickname.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch (err) {
      console.error("Error al exportar carta:", err);
    } finally {
      setDownloading(false);
    }
  };

  const history = player ? getPlayerRatingHistory(player.id).slice(0, 3) : [];
  const bonus = player ? getPlayerBonusBreakdown(player.id) : null;
  const baseOverall = player?.base_overall ?? player?.overall ?? 0;
  const delta = player?.last_delta ?? 0;

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-[#111827] border border-[#1F2937] p-5 sm:p-6 shadow-2xl my-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Cerrar detalle de jugador"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1F2937] text-gray-300 hover:bg-gray-700 hover:text-white transition"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-3 pr-10">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  {CARD_TIER_LABELS[player.card_tier]}
                </span>
                {delta !== 0 && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      delta > 0
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/15 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {delta > 0 ? (
                      <TrendingUp size={11} />
                    ) : (
                      <TrendingDown size={11} />
                    )}
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-xl font-bold text-white">
                {player.name}
              </h2>
              <p className="text-xs text-gray-400">
                Mueve el cursor o desliza sobre la carta para ver el efecto 3D
              </p>
            </div>

            {/* Interactive 3D Card Showcase */}
            <div
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              style={{ perspective: 900 }}
              className="flex justify-center py-3 touch-none"
            >
              <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              >
                <FutCard player={player} size="lg" />
              </motion.div>
            </div>

            {/* Hidden flat copy for crisp html2canvas PNG export */}
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                left: -9999,
                top: 0,
                pointerEvents: "none",
              }}
            >
              <FutCard
                ref={exportCardRef}
                player={player}
                size="lg"
                disableShimmer
              />
            </div>

            {/* PlayStyles Badges */}
            {player.playstyles.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {player.playstyles.map((ps) => (
                  <span
                    key={ps}
                    className="rounded-full bg-[#090D16] border border-[#1F2937] px-2.5 py-1 text-xs font-medium text-amber-300"
                  >
                    ★ {PLAYSTYLES[ps]?.label ?? ps}
                  </span>
                ))}
              </div>
            )}

            {/* Career Stats Grid */}
            {stats && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="rounded-2xl bg-[#090D16] border border-[#1F2937] p-2.5 text-center">
                  <Users size={14} className="mx-auto text-sky-400 mb-1" />
                  <div className="font-fut text-xl font-bold text-white leading-none">
                    {stats.matchesPlayed}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Partidos</div>
                </div>
                <div className="rounded-2xl bg-[#090D16] border border-[#1F2937] p-2.5 text-center">
                  <Target size={14} className="mx-auto text-emerald-400 mb-1" />
                  <div className="font-fut text-xl font-bold text-white leading-none">
                    {stats.goals}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Goles</div>
                </div>
                <div className="rounded-2xl bg-[#090D16] border border-[#1F2937] p-2.5 text-center">
                  <Award size={14} className="mx-auto text-amber-400 mb-1" />
                  <div className="font-fut text-xl font-bold text-white leading-none">
                    {stats.mvpAwards}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">MVPs</div>
                </div>
                <div className="rounded-2xl bg-[#090D16] border border-[#1F2937] p-2.5 text-center">
                  <Trophy size={14} className="mx-auto text-purple-400 mb-1" />
                  <div className="font-fut text-xl font-bold text-white leading-none">
                    {stats.winRate}%
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">Victorias</div>
                </div>
              </div>
            )}

            {/* Performance Bonus Breakdown */}
            {bonus && (
              <div className="mt-3 rounded-2xl bg-[#090D16] border border-amber-500/25 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Desglose de Media</span>
                  <span className="font-fut text-base font-extrabold text-white">
                    Base {baseOverall}{" "}
                    <span className="text-emerald-400">
                      +{bonus.totalBonus}
                    </span>{" "}
                    = <span className="text-amber-400">{player.overall}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-lg bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-emerald-300 font-semibold">
                    ⚽ Goles +{bonus.goalsBonus}
                  </span>
                  <span className="rounded-lg bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-amber-300 font-semibold">
                    👑 MVPs +{bonus.mvpBonus}
                  </span>
                  <span className="rounded-lg bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-sky-300 font-semibold">
                    🏆 Victorias +{bonus.winsBonus}
                  </span>
                </div>
              </div>
            )}

            {/* Recent Progression History */}
            {history.length > 0 && (
              <div className="mt-3 rounded-2xl bg-[#090D16] border border-[#1F2937] p-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Últimas valoraciones
                </div>
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="text-gray-400 truncate">
                      {h.reason ?? `Nota ${h.avg_match_score}/10`}
                    </span>
                    <span className="font-semibold text-white shrink-0">
                      {h.previous_overall} → {h.new_overall}{" "}
                      <span
                        className={
                          h.delta > 0
                            ? "text-emerald-400"
                            : h.delta < 0
                            ? "text-red-400"
                            : "text-gray-500"
                        }
                      >
                        ({h.delta > 0 ? `+${h.delta}` : h.delta})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Download PNG CTA */}
            <button
              onClick={handleDownloadPng}
              disabled={downloading}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generando PNG...
                </>
              ) : downloaded ? (
                <>
                  <Check size={18} />
                  ¡Carta descargada!
                </>
              ) : (
                <>
                  <Download size={18} />
                  Descargar Carta (PNG)
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
