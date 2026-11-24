"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { FutCard } from "@/components/fut/FutCard";
import {
  CARD_TIER_LABELS,
  CARD_TIER_ORDER,
  computeOverall,
  PLAYSTYLES,
  type CardTier,
  type Player,
  type PlayStyleId,
  type Position,
} from "@/types/fut";

const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];
const PLAYSTYLE_LIST = Object.values(PLAYSTYLES);

interface PlayerFormState {
  id?: string;
  name: string;
  nickname: string;
  avatar_url: string | null;
  position: Position;
  card_tier: CardTier;
  playstyles: PlayStyleId[];
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

const EMPTY_FORM: PlayerFormState = {
  name: "",
  nickname: "",
  avatar_url: null,
  position: "MED",
  card_tier: "gold",
  playstyles: [],
  pace: 70,
  shooting: 70,
  passing: 70,
  dribbling: 70,
  defending: 70,
  physical: 70,
};

export default function AdminPlayersPage() {
  const router = useRouter();
  const { hydrated, isAdmin, players, upsertPlayer, deletePlayer } =
    useFutStore();

  const [form, setForm] = useState<PlayerFormState>(EMPTY_FORM);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [hydrated, isAdmin, router]);

  if (!hydrated || !isAdmin) return null;

  const editingPlayer = form.id
    ? players.find((p) => p.id === form.id)
    : undefined;
  const activeBonus = editingPlayer?.performance_bonus ?? 0;
  const previewBaseOverall = computeOverall(form, 0);

  const previewPlayer: Player = {
    id: form.id ?? "preview",
    name: form.name || "Nombre Jugador",
    nickname: form.nickname || "MOTE FUT",
    avatar_url: form.avatar_url,
    position: form.position,
    card_tier: form.card_tier,
    playstyles: form.playstyles,
    pace: form.pace,
    shooting: form.shooting,
    passing: form.passing,
    dribbling: form.dribbling,
    defending: form.defending,
    physical: form.physical,
    base_overall: previewBaseOverall,
    performance_bonus: activeBonus,
    overall: computeOverall(form, activeBonus),
    created_at: new Date().toISOString(),
  };

  const togglePlaystyle = (id: PlayStyleId) => {
    setForm((prev) => {
      if (prev.playstyles.includes(id)) {
        return {
          ...prev,
          playstyles: prev.playstyles.filter((p) => p !== id),
        };
      }
      if (prev.playstyles.length >= 3) return prev;
      return { ...prev, playstyles: [...prev.playstyles, id] };
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, avatar_url: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDefaultStats = () => {
    setForm((prev) => ({
      ...prev,
      pace: 70,
      shooting: 70,
      passing: 70,
      dribbling: 70,
      defending: 70,
      physical: 70,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.nickname.trim()) return;
    upsertPlayer({
      id: form.id,
      name: form.name.trim(),
      nickname: form.nickname.trim().toUpperCase(),
      avatar_url: form.avatar_url,
      position: form.position,
      card_tier: form.card_tier,
      playstyles: form.playstyles,
      pace: form.pace,
      shooting: form.shooting,
      passing: form.passing,
      dribbling: form.dribbling,
      defending: form.defending,
      physical: form.physical,
    });
    setForm(EMPTY_FORM);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const startEdit = (p: Player) => {
    setForm({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      position: p.position,
      card_tier: p.card_tier,
      playstyles: p.playstyles,
      pace: p.pace,
      shooting: p.shooting,
      passing: p.passing,
      dribbling: p.dribbling,
      defending: p.defending,
      physical: p.physical,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const statSliders: { key: keyof Pick<PlayerFormState, "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical">; label: string }[] = [
    { key: "pace", label: "PAC (Ritmo)" },
    { key: "shooting", label: "SHO (Tiro)" },
    { key: "passing", label: "PAS (Pase)" },
    { key: "dribbling", label: "DRI (Regate)" },
    { key: "defending", label: "DEF (Defensa)" },
    { key: "physical", label: "PHY (Físico)" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-amber-400 mb-1"
          >
            <ArrowLeft size={14} /> Volver al Panel
          </Link>
          <h1 className="font-fut text-3xl font-extrabold uppercase text-white">
            Gestión de Jugadores
          </h1>
        </div>
        {form.id && (
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
          >
            + Nuevo Jugador
          </button>
        )}
      </div>

      {/* Editor + Live FutCard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 sm:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej. Álvaro Torres"
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Mote en la carta
              </label>
              <input
                type="text"
                required
                value={form.nickname}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, nickname: e.target.value }))
                }
                placeholder="Ej. EL TIBURÓN"
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Position & Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Posición
              </label>
              <div className="grid grid-cols-4 gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    type="button"
                    key={pos}
                    onClick={() => setForm((prev) => ({ ...prev, position: pos }))}
                    className={`rounded-xl py-2 font-fut text-sm font-bold transition ${
                      form.position === pos
                        ? "bg-amber-500 text-slate-950"
                        : "bg-[#090D16] border border-[#1F2937] text-gray-300"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Nivel / Rareza de Carta
              </label>
              <select
                value={form.card_tier}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    card_tier: e.target.value as CardTier,
                  }))
                }
                className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                {CARD_TIER_ORDER.map((tier) => (
                  <option key={tier} value={tier}>
                    {CARD_TIER_LABELS[tier]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Foto del jugador (opcional)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2 text-xs font-semibold text-gray-200 hover:border-amber-500/40 transition">
                <Upload size={14} className="text-amber-400" />
                Subir foto local
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              {form.avatar_url && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, avatar_url: null }))
                  }
                  className="text-xs text-red-400 hover:underline"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          {/* PlayStyles (max 3) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300">
              PlayStyles / Rasgos ({form.playstyles.length}/3)
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYSTYLE_LIST.map((ps) => {
                const selected = form.playstyles.includes(ps.id);
                return (
                  <button
                    type="button"
                    key={ps.id}
                    onClick={() => togglePlaystyle(ps.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? "bg-amber-500/20 border border-amber-400 text-amber-300"
                        : "bg-[#090D16] border border-[#1F2937] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {ps.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6 Stat Sliders + Default 70 button */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">
                Estadísticas (1 - 99) · Media:{" "}
                <span className="text-amber-400 font-bold">
                  {previewPlayer.overall}
                </span>
              </label>
              <button
                type="button"
                onClick={handleDefaultStats}
                className="inline-flex items-center gap-1 rounded-lg border border-[#1F2937] bg-[#090D16] px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-amber-500/40"
              >
                <RotateCcw size={12} /> Valores por defecto (70)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {statSliders.map(({ key, label }) => (
                <div
                  key={key}
                  className="rounded-xl bg-[#090D16] border border-[#1F2937] px-3 py-2"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 font-medium">{label}</span>
                    <span className="font-fut text-base font-extrabold text-amber-400">
                      {form[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.99] transition"
          >
            {savedNotice ? (
              <>
                <Check size={16} /> ¡Jugador guardado!
              </>
            ) : form.id ? (
              <>
                <Check size={16} /> Guardar Cambios
              </>
            ) : (
              <>
                <Plus size={16} /> Crear Jugador
              </>
            )}
          </button>
        </form>

        {/* Live Card Preview */}
        <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col items-center gap-3 lg:sticky lg:top-20">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Vista Previa en Vivo
          </span>
          <FutCard player={previewPlayer} size="md" />
          <p className="text-[11px] text-gray-400 text-center">
            Media base: <strong className="text-white">{previewBaseOverall}</strong>
            {activeBonus > 0 && (
              <>
                {" "}
                + Plus rendimiento:{" "}
                <strong className="text-emerald-400">+{activeBonus}</strong>
              </>
            )}{" "}
            = <strong className="text-amber-400">{previewPlayer.overall}</strong>
          </p>
        </div>
      </div>

      {/* Existing Players List */}
      <section className="space-y-3">
        <h2 className="font-fut text-2xl font-extrabold uppercase text-white">
          Plantilla Actual ({players.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#090D16] border border-amber-500/30 font-fut text-2xl font-extrabold text-amber-400">
                  {p.overall}
                </div>
                <div className="truncate">
                  <div className="font-bold text-sm text-white truncate">
                    {p.nickname}{" "}
                    <span className="text-xs font-normal text-gray-400">
                      ({p.position})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {p.name} · {CARD_TIER_LABELS[p.card_tier]}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => startEdit(p)}
                  title="Editar"
                  className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2 text-gray-300 hover:border-amber-500/40 hover:text-amber-400 transition"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => deletePlayer(p.id)}
                  title="Eliminar"
                  className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2 text-gray-400 hover:border-red-500/40 hover:text-red-400 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
