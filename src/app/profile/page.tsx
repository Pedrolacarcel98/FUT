"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  LogOut,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { processAvatarImage } from "@/lib/image-resize";
import { FutCard } from "@/components/fut/FutCard";
import { CARD_TIER_LABELS, type Position } from "@/types/fut";

const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];

export default function ProfilePage() {
  const router = useRouter();
  const {
    hydrated,
    currentPlayer,
    logoutPlayer,
    updateOwnProfile,
    getPlayerCareerStats,
    getPlayerRatingHistory,
    getPlayerBonusBreakdown,
  } = useFutStore();

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState<Position>("MED");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notifyEmails, setNotifyEmails] = useState(true);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadedPlayerId, setLoadedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !currentPlayer) {
      router.replace("/auth");
    }
  }, [hydrated, currentPlayer, router]);

  // Only initialize form fields when the logged-in player ID changes,
  // preventing background refreshFromServer() on window focus from wiping unsaved photo/edits.
  useEffect(() => {
    if (currentPlayer && currentPlayer.id !== loadedPlayerId) {
      setName(currentPlayer.name);
      setNickname(currentPlayer.nickname);
      setPosition(currentPlayer.position);
      setAvatarUrl(currentPlayer.avatar_url);
      setNotifyEmails(currentPlayer.notify_emails ?? true);
      setLoadedPlayerId(currentPlayer.id);
    }
  }, [currentPlayer, loadedPlayerId]);

  if (!hydrated || !currentPlayer) return null;

  const stats = getPlayerCareerStats(currentPlayer.id);
  const history = getPlayerRatingHistory(currentPlayer.id);
  const bonus = getPlayerBonusBreakdown(currentPlayer.id);
  const baseOverall = currentPlayer.base_overall ?? currentPlayer.overall;
  const delta = currentPlayer.last_delta ?? 0;

  const previewPlayer = {
    ...currentPlayer,
    name: name || currentPlayer.name,
    nickname: (nickname || currentPlayer.nickname).toUpperCase(),
    position,
    avatar_url: avatarUrl,
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFormError(null);
    setProcessingPhoto(true);
    try {
      const processed = await processAvatarImage(file);
      setAvatarUrl(processed);
    } catch {
      setFormError(
        "No se pudo procesar esta imagen. Prueba con otra foto JPG o PNG."
      );
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const res = await updateOwnProfile({
      name,
      nickname,
      position,
      avatar_url: avatarUrl,
      notify_emails: notifyEmails,
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setFormError(res.error ?? "No se pudieron guardar los cambios.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Mi Perfil de Jugador
          </p>
          <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase text-white">
            {currentPlayer.nickname}
          </h1>
          <p className="text-xs text-gray-400">{currentPlayer.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth"
            className="rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
          >
            Cambiar cuenta
          </Link>
          <button
            onClick={() => {
              logoutPlayer();
              router.push("/");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 items-start">
        {/* Player Card & Career Summary */}
        <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold uppercase text-amber-400">
              {CARD_TIER_LABELS[currentPlayer.card_tier]}
            </span>
            {delta !== 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  delta > 0
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/15 text-red-300 border border-red-500/30"
                }`}
              >
                {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>

          <FutCard player={previewPlayer} size="md" />

          {/* Overall Breakdown Card */}
          <div className="w-full rounded-2xl bg-[#090D16] border border-amber-500/25 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Media Base + Plus</span>
              <span className="font-fut text-base font-extrabold text-white">
                {baseOverall}{" "}
                <span className="text-emerald-400">+{bonus.totalBonus}</span> ={" "}
                <span className="text-amber-400">{currentPlayer.overall}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded-lg bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-emerald-300 font-semibold">
                ⚽ +{bonus.goalsBonus}
              </span>
              <span className="rounded-lg bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-amber-300 font-semibold">
                👑 +{bonus.mvpBonus}
              </span>
              <span className="rounded-lg bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-sky-300 font-semibold">
                🏆 +{bonus.winsBonus}
              </span>
            </div>
            {(bonus.goalsToNextPoint !== null ||
              bonus.winsToNextPoint !== null) && (
              <p className="text-[10px] text-gray-500">
                Siguiente plus:{" "}
                {bonus.goalsToNextPoint !== null
                  ? `${bonus.goalsToNextPoint} gol${
                      bonus.goalsToNextPoint > 1 ? "es" : ""
                    }`
                  : ""}
                {bonus.goalsToNextPoint !== null &&
                bonus.winsToNextPoint !== null
                  ? " · "
                  : ""}
                {bonus.winsToNextPoint !== null
                  ? `${bonus.winsToNextPoint} victoria${
                      bonus.winsToNextPoint > 1 ? "s" : ""
                    }`
                  : ""}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full text-center">
            <div className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2">
              <div className="font-fut text-xl font-bold text-white">
                {stats.matchesPlayed}
              </div>
              <div className="text-[10px] text-gray-400">Partidos</div>
            </div>
            <div className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2">
              <div className="font-fut text-xl font-bold text-emerald-400">
                {stats.goals}
              </div>
              <div className="text-[10px] text-gray-400">Goles</div>
            </div>
            <div className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2">
              <div className="font-fut text-xl font-bold text-amber-400">
                {stats.mvpAwards}
              </div>
              <div className="text-[10px] text-gray-400">MVPs</div>
            </div>
          </div>
        </div>

        {/* Editable Personal Info + Progression History */}
        <div className="space-y-6">
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 sm:p-6 space-y-4"
          >
            <h2 className="font-fut text-xl font-extrabold uppercase text-white">
              Datos de tu Carta
            </h2>
            <p className="text-xs text-gray-400">
              Puedes actualizar tu mote, posición y foto. Tus estadísticas y
              rareza evolucionan automáticamente con las valoraciones de cada
              partido.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Mote FUT
                </label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white uppercase focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Posición
              </label>
              <div className="grid grid-cols-4 gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    type="button"
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={`rounded-xl py-2 font-fut text-sm font-bold transition ${
                      position === pos
                        ? "bg-amber-500 text-slate-950"
                        : "bg-[#090D16] border border-[#1F2937] text-gray-300"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2 text-xs font-semibold text-gray-200 hover:border-amber-500/40">
                  <Upload size={14} className="text-amber-400" />
                  {processingPhoto ? "Procesando foto..." : "Cambiar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Quitar foto
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmails}
                  onChange={(e) => setNotifyEmails(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                <Bell size={13} className="text-amber-400" />
                Recibir avisos por correo
              </label>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-xs text-red-300">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || processingPhoto}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60"
            >
              <Check size={16} />
              {saving
                ? "Guardando..."
                : saved
                ? "¡Perfil actualizado!"
                : "Guardar Cambios"}
            </button>
          </form>

          {/* Rating Progression History */}
          <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-3">
            <h2 className="font-fut text-xl font-extrabold uppercase text-white">
              Historial de Evolución
            </h2>
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-2xl bg-[#090D16] border border-[#1F2937] px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {h.reason ?? `Nota media: ${h.avg_match_score}/10`}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(h.created_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {CARD_TIER_LABELS[h.previous_tier]} →{" "}
                        {CARD_TIER_LABELS[h.new_tier]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-fut text-lg font-extrabold text-white">
                        {h.previous_overall} → {h.new_overall}
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          h.delta > 0
                            ? "text-emerald-400"
                            : h.delta < 0
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {h.delta > 0 ? `+${h.delta}` : h.delta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Aún no tienes cambios de media registrados. Juega un partido y
                espera al cierre de las valoraciones.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
