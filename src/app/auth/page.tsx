"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogIn,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { isValidEmail } from "@/lib/validation";
import { sendNotification } from "@/lib/notify-client";
import { processAvatarImage } from "@/lib/image-resize";
import { FutCard } from "@/components/fut/FutCard";
import type { Player, Position } from "@/types/fut";

const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];

export default function AuthPage() {
  const router = useRouter();
  const { registerPlayer, loginPlayer } = useFutStore();

  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState<Position>("MED");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [acceptEmails, setAcceptEmails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const exportCardRef = useRef<HTMLDivElement>(null);

  const previewCard: Player = {
    id: "register-preview",
    name: name || "Tu Nombre",
    nickname: nickname || "TU MOTE",
    email: email || null,
    avatar_url: avatarUrl,
    position,
    card_tier: "silver",
    playstyles: [],
    pace: 70,
    shooting: 70,
    passing: 70,
    dribbling: 70,
    defending: 70,
    physical: 70,
    overall: 70,
    created_at: new Date().toISOString(),
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const processed = await processAvatarImage(file);
      setAvatarUrl(processed);
      setError(null);
    } catch {
      setError("No se pudo procesar la foto. Prueba con otra imagen JPG o PNG.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError(
        "El formato del correo electrónico no es válido (ej. nombre@dominio.com)."
      );
      return;
    }

    if (mode === "register") {
      if (!acceptEmails) {
        setError(
          "Debes aceptar recibir correos de convocatorias y votaciones para registrarte."
        );
        return;
      }
      setSubmitting(true);
      let cardPngDataUrl: string | null = null;
      if (exportCardRef.current) {
        try {
          const { toPng } = await import("html-to-image");
          cardPngDataUrl = await toPng(exportCardRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "transparent",
          });
        } catch (err) {
          console.error("No se pudo generar la carta PNG para el correo:", err);
        }
      }

      const res = await registerPlayer({
        email,
        password,
        name,
        nickname,
        position,
        avatar_url: avatarUrl,
        notify_emails: acceptEmails,
      });
      setSubmitting(false);

      if (!res.ok) {
        setError(res.error ?? "Error al registrarte.");
        return;
      }
      if (res.player && acceptEmails) {
        void sendNotification({
          type: "welcome",
          to: res.player.email,
          name: res.player.name,
          nickname: res.player.nickname,
          position: res.player.position,
          cardPngDataUrl,
        });
      }
      router.push("/profile");
    } else {
      setSubmitting(true);
      const res = await loginPlayer(email, password);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? "Credenciales incorrectas.");
        return;
      }
      router.push("/profile");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Acceso de Jugadores
        </p>
        <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase text-white">
          {mode === "register"
            ? "Crea tu Carta FUT (Plata 70)"
            : "Inicia Sesión en el Club"}
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
          {mode === "register"
            ? "Todos los jugadores empiezan con carta Plata (70 en todo) y suben o bajan según las valoraciones de cada partido."
            : "Entra con tu correo para ver tu perfil y valorar a tus compañeros tras cada pachanga."}
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div className="mx-auto flex max-w-xs rounded-2xl border border-[#1F2937] bg-[#111827] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            mode === "register"
              ? "bg-amber-500 text-slate-950"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <UserPlus size={14} /> Registrarme
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            mode === "login"
              ? "bg-amber-500 text-slate-950"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <LogIn size={14} /> Entrar
        </button>
      </div>

      {/* Main Content */}
      <div
        className={`grid gap-6 items-start ${
          mode === "register"
            ? "grid-cols-1 lg:grid-cols-[1fr_290px]"
            : "grid-cols-1 max-w-md mx-auto"
        }`}
      >
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 sm:p-6 space-y-4 shadow-xl"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Correo electrónico (clave única)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@gmail.com"
              className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {mode === "register" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Mario López"
                    className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Mote en tu carta
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ej. EL BÚFALO"
                    className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white uppercase focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Posición principal
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Foto de perfil (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2 text-xs font-semibold text-gray-200 hover:border-amber-500/40 transition">
                    <Upload size={14} className="text-amber-400" />
                    Subir foto
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
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-2xl border border-[#1F2937] bg-[#090D16] p-3 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={acceptEmails}
                  onChange={(e) => setAcceptEmails(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-amber-500 shrink-0"
                />
                <span className="leading-relaxed">
                  <Bell
                    size={13}
                    className="inline mr-1 text-amber-400 -mt-0.5"
                  />
                  Acepto recibir correos automáticos con las convocatorias de
                  partidos y aperturas de votación MVP.
                </span>
              </label>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/35 bg-red-500/15 px-3.5 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.99] transition disabled:opacity-60"
          >
            {mode === "register" ? (
              <>
                <Sparkles size={16} />{" "}
                {submitting ? "Creando carta..." : "Crear mi Carta Plata (70)"}
              </>
            ) : (
              <>
                <LogIn size={16} /> Iniciar Sesión
              </>
            )}
          </button>
        </form>

        {/* Live Silver 70 Preview on Register */}
        {mode === "register" && (
          <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col items-center gap-3">
            <span className="rounded-full bg-slate-300/15 border border-slate-400/30 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Tu Carta Inicial
            </span>
            <FutCard player={previewCard} size="md" />
            {/* Hidden full-res copy for crisp PNG capture in the welcome email */}
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
                player={{
                  ...previewCard,
                  nickname: (nickname || "TU MOTE").trim().toUpperCase(),
                }}
                size="lg"
                disableShimmer
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              Empiezas en <strong className="text-white">Plata (70)</strong>.
              Juega partidos y recibe buenas valoraciones para ascender a Oro o
              Élite.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
