"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { processAvatarImage } from "@/lib/image-resize";
import { FutCard } from "@/components/fut/FutCard";
import {
  CARD_TIER_LABELS,
  computeOverall,
  isSpecialTier,
  PLAYSTYLES,
  standardTierFromOverall,
  type CardTier,
  type Player,
  type PlayStyleId,
  type Position,
} from "@/types/fut";

const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];
const PLAYSTYLE_LIST = Object.values(PLAYSTYLES);

type SpecialCardOption = "auto" | "tots" | "icon" | "totw";

interface PlayerFormState {
  id?: string;
  name: string;
  nickname: string;
  avatar_url: string | null;
  position: Position;
  special_tier: SpecialCardOption;
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
  special_tier: "auto",
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

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlayerFormState>(EMPTY_FORM);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [hydrated, isAdmin, router]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, saving]);

  if (!hydrated || !isAdmin) return null;

  const editingPlayer = form.id
    ? players.find((p) => p.id === form.id)
    : undefined;
  const activeBonus = editingPlayer?.performance_bonus ?? 0;
  const previewBaseOverall = computeOverall(form, 0);
  const previewFinalOverall = computeOverall(form, activeBonus);
  const autoStandardTier = standardTierFromOverall(previewFinalOverall);
  const effectivePreviewTier: CardTier =
    form.special_tier === "auto" ? autoStandardTier : form.special_tier;

  const previewPlayer: Player = {
    id: form.id ?? "preview",
    name: form.name || "Nombre Jugador",
    nickname: form.nickname || "MOTE FUT",
    avatar_url: form.avatar_url,
    position: form.position,
    card_tier: effectivePreviewTier,
    playstyles: form.playstyles,
    pace: form.pace,
    shooting: form.shooting,
    passing: form.passing,
    dribbling: form.dribbling,
    defending: form.defending,
    physical: form.physical,
    base_overall: previewBaseOverall,
    performance_bonus: activeBonus,
    overall: previewFinalOverall,
    created_at: new Date().toISOString(),
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setPhotoError(null);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Player) => {
    setForm({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      position: p.position,
      special_tier: isSpecialTier(p.card_tier)
        ? (p.card_tier as SpecialCardOption)
        : "auto",
      playstyles: p.playstyles,
      pace: p.pace,
      shooting: p.shooting,
      passing: p.passing,
      dribbling: p.dribbling,
      defending: p.defending,
      physical: p.physical,
    });
    setPhotoError(null);
    setSaveError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setProcessingPhoto(true);
    try {
      const processed = await processAvatarImage(file);
      setForm((prev) => ({ ...prev, avatar_url: processed }));
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : "No se pudo procesar esta foto. Prueba con otra imagen JPG o PNG."
      );
    } finally {
      setProcessingPhoto(false);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.nickname.trim()) return;
    setSaveError(null);
    setSaving(true);
    const res = await upsertPlayer({
      id: form.id,
      name: form.name.trim(),
      nickname: form.nickname.trim().toUpperCase(),
      avatar_url: form.avatar_url,
      position: form.position,
      card_tier: effectivePreviewTier,
      playstyles: form.playstyles,
      pace: form.pace,
      shooting: form.shooting,
      passing: form.passing,
      dribbling: form.dribbling,
      defending: form.defending,
      physical: form.physical,
      performance_bonus: activeBonus,
    });
    setSaving(false);

    if (!res.ok) {
      setSaveError(res.error ?? "No se pudo guardar el jugador.");
      return;
    }

    const msg = form.id
      ? `Jugador ${form.nickname.trim().toUpperCase()} actualizado.`
      : `Jugador ${form.nickname.trim().toUpperCase()} creado.`;
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleDelete = (p: Player) => {
    if (
      window.confirm(
        `¿Seguro que quieres eliminar a "${p.nickname}" (${p.name})? Se borrarán también sus apariciones e historial.`
      )
    ) {
      deletePlayer(p.id);
      setToast(`Jugador ${p.nickname} eliminado.`);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const statSliders: {
    key: keyof Pick<
      PlayerFormState,
      "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical"
    >;
    label: string;
  }[] = [
    { key: "pace", label: "PAC (Ritmo)" },
    { key: "shooting", label: "SHO (Tiro)" },
    { key: "passing", label: "PAS (Pase)" },
    { key: "dribbling", label: "DRI (Regate)" },
    { key: "defending", label: "DEF (Defensa)" },
    { key: "physical", label: "PHY (Físico)" },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-amber-400 mb-1"
          >
            <ArrowLeft size={14} /> Volver al Panel
          </Link>
          <h1 className="font-fut text-3xl font-extrabold uppercase text-white">
            Plantilla de Jugadores ({players.length})
          </h1>
          <p className="text-xs text-gray-400">
            Edita medias, fotos o rarezas directamente, o pulsa el botón{" "}
            <strong className="text-amber-400">+</strong> para crear una nueva carta.
          </p>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Existing Players List (Direct View) */}
      {players.length === 0 ? (
        <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-10 text-center space-y-3">
          <p className="text-sm text-gray-400">
            Aún no hay jugadores registrados en el club.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition"
          >
            <Plus size={16} /> Crear primer jugador
          </button>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3 hover:border-amber-500/35 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#090D16] border border-amber-500/30">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={p.nickname}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-fut text-2xl font-extrabold text-amber-400">
                      {p.overall}
                    </span>
                  )}
                  {p.avatar_url && (
                    <span className="absolute bottom-0 right-0 rounded-tl-md bg-slate-950/90 px-1 font-fut text-xs font-extrabold text-amber-400 leading-tight">
                      {p.overall}
                    </span>
                  )}
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
                  type="button"
                  onClick={() => openEditModal(p)}
                  title="Editar jugador"
                  className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2 text-gray-300 hover:border-amber-500/40 hover:text-amber-400 transition"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  title="Eliminar jugador"
                  className="rounded-xl bg-[#090D16] border border-[#1F2937] p-2 text-gray-400 hover:border-red-500/40 hover:text-red-400 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Floating Yellow Round "+" Button */}
      <button
        type="button"
        onClick={openCreateModal}
        aria-label="Añadir nuevo jugador"
        title="Añadir nuevo jugador"
        className="fixed bottom-24 right-5 sm:bottom-8 sm:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/35 hover:bg-amber-300 active:scale-95 transition"
      >
        <Plus size={28} strokeWidth={2.75} />
      </button>

      {/* Create / Edit Player Modal */}
      {modalOpen && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[#1F2937] bg-[#0B1120] p-4 sm:p-6 shadow-2xl my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1F2937]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  {form.id ? "Editar Carta FUT" : "Nueva Carta FUT"}
                </p>
                <h2 className="font-fut text-2xl font-extrabold uppercase text-white">
                  {form.id ? form.nickname || "Editar Jugador" : "Crear Jugador"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Cerrar modal"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1F2937] text-gray-300 hover:bg-gray-700 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Editor + Live FutCard Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_270px] gap-6 items-start">
              <form onSubmit={handleSubmit} className="space-y-5">
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
                        setForm((prev) => ({
                          ...prev,
                          nickname: e.target.value,
                        }))
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
                          onClick={() =>
                            setForm((prev) => ({ ...prev, position: pos }))
                          }
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
                      Tipo de Carta (Bronce/Plata/Oro automático por media)
                    </label>
                    <select
                      value={form.special_tier}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          special_tier: e.target.value as SpecialCardOption,
                        }))
                      }
                      className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="auto">
                        Estándar — Automática ({CARD_TIER_LABELS[autoStandardTier]})
                      </option>
                      <option value="tots">TOTY / TOTS (Azul Especial)</option>
                      <option value="icon">Leyenda / ICON (Blanco Especial)</option>
                      <option value="totw">TOTW (Negro / Dorado MVP)</option>
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
                      {processingPhoto ? (
                        <Loader2 size={14} className="animate-spin text-amber-400" />
                      ) : (
                        <Upload size={14} className="text-amber-400" />
                      )}
                      {processingPhoto ? "Procesando foto..." : "Subir foto local"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={processingPhoto}
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
                  {photoError && (
                    <p className="text-xs text-red-400">{photoError}</p>
                  )}
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
                          <span className="text-gray-400 font-medium">
                            {label}
                          </span>
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

                {saveError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/15 px-3.5 py-2.5 text-xs text-red-300">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || processingPhoto}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.99] transition disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Guardando...
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
                </div>
              </form>

              {/* Live Card Preview */}
              <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col items-center gap-3 lg:sticky lg:top-2">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Vista Previa en Vivo
                </span>
                <FutCard player={previewPlayer} size="md" />
                <p className="text-[11px] text-gray-400 text-center">
                  Media base:{" "}
                  <strong className="text-white">{previewBaseOverall}</strong>
                  {activeBonus !== 0 && (
                    <>
                      {" "}
                      {activeBonus > 0 ? "+ Forma: " : "· Forma: "}
                      <strong
                        className={
                          activeBonus > 0 ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {activeBonus > 0 ? `+${activeBonus}` : activeBonus}
                      </strong>
                    </>
                  )}{" "}
                  = <strong className="text-amber-400">{previewPlayer.overall}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
