"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  MoreVertical,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { getEffectiveMatchPhase } from "@/lib/match-phase";
import { sendNotification } from "@/lib/notify-client";
import { isValidEmail } from "@/lib/validation";

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    hydrated,
    isAdmin,
    logoutAdmin,
    players,
    matches,
    subscribers,
    deleteMatch,
  } = useFutStore();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(testEmail)) {
      setTestStatus({
        type: "error",
        text: "Introduce un correo válido (ej. tu@gmail.com).",
      });
      return;
    }
    setSendingTest(true);
    setTestStatus(null);
    const res = await sendNotification({ type: "test", to: testEmail.trim() });
    setSendingTest(false);
    if (res.ok) {
      setTestStatus({
        type: "ok",
        text: `¡Correo de prueba enviado a ${testEmail.trim()}!`,
      });
      setTestEmail("");
    } else {
      setTestStatus({
        type: "error",
        text: res.error ?? "No se pudo enviar el correo de prueba.",
      });
    }
  };

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [hydrated, isAdmin, router]);

  if (!hydrated || !isAdmin) return null;

  const sortedMatches = [...matches].sort(
    (a, b) =>
      new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  const statusBadge = (status: "scheduled" | "voting_open" | "finished", matchDate: string) => {
    const phase = getEffectiveMatchPhase({ status, match_date: matchDate });
    if (phase === "signup_open") {
      return "bg-sky-500/15 text-sky-300 border-sky-500/35";
    }
    if (phase === "voting_open") {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/35";
    }
    if (phase === "voting_expired") {
      return "bg-amber-500/15 text-amber-300 border-amber-500/35";
    }
    return "bg-gray-500/15 text-gray-300 border-gray-500/30";
  };

  const statusLabel = (status: "scheduled" | "voting_open" | "finished", matchDate: string) => {
    const phase = getEffectiveMatchPhase({ status, match_date: matchDate });
    if (phase === "signup_open") return "Convocatoria Abierta";
    if (phase === "voting_open") return "Votación Abierta (7d)";
    if (phase === "voting_expired") return "Plazo Expirado";
    return "Finalizado";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Gestión del Club
          </p>
          <h1 className="font-fut text-3xl sm:text-4xl font-extrabold uppercase text-white">
            Panel de Administración
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              logoutAdmin();
              router.push("/");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/players"
          className="group rounded-3xl border border-[#1F2937] bg-[#111827] p-5 hover:border-amber-500/50 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Users size={20} />
            </div>
            <ChevronRight
              size={18}
              className="text-gray-500 group-hover:text-amber-400 transition"
            />
          </div>
          <div className="font-fut text-2xl font-extrabold uppercase text-white">
            Jugadores ({players.length})
          </div>
          <p className="text-xs text-gray-400">
            Crea o edita cartas FUT con vista previa en vivo y sliders 1–99.
          </p>
        </Link>

        <Link
          href="/admin/matches/new"
          className="group rounded-3xl border border-[#1F2937] bg-[#111827] p-5 hover:border-emerald-500/50 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <CalendarPlus size={20} />
            </div>
            <ChevronRight
              size={18}
              className="text-gray-500 group-hover:text-emerald-400 transition"
            />
          </div>
          <div className="font-fut text-2xl font-extrabold uppercase text-white">
            Nueva Pachanga
          </div>
          <p className="text-xs text-gray-400">
            Convoca jugadores y usa el autobalanceo automático de equipos.
          </p>
        </Link>

        <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
              <Mail size={20} />
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
              Gmail Activo
            </span>
          </div>
          <div className="font-fut text-2xl font-extrabold uppercase text-white">
            Notificaciones ({subscribers.length})
          </div>
          <form onSubmit={handleSendTest} className="flex gap-1.5 pt-1">
            <input
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Probar correo..."
              className="flex-1 min-w-0 rounded-xl border border-[#1F2937] bg-[#090D16] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sendingTest}
              className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50 shrink-0"
            >
              {sendingTest ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              Probar
            </button>
          </form>
          {testStatus && (
            <p
              className={`text-[11px] font-medium ${
                testStatus.type === "ok" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {testStatus.text}
            </p>
          )}
        </div>
      </div>

      {/* Matches List for Control */}
      <section className="space-y-3">
        <h2 className="font-fut text-2xl font-extrabold uppercase text-white">
          Control de Jornadas y Votaciones
        </h2>
        {sortedMatches.length === 0 ? (
          <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-6 text-center text-xs text-gray-400">
            Aún no hay partidos creados. Pulsa en{" "}
            <strong className="text-emerald-400">Nueva Pachanga</strong> para
            abrir la primera convocatoria.
          </div>
        ) : null}
        <div className="space-y-2.5">
          {sortedMatches.map((m) => {
            const menuOpen = openMenuId === m.id;
            return (
              <div
                key={m.id}
                className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1F2937] bg-[#111827] px-4 py-3.5 hover:border-amber-500/40 transition"
              >
                <Link
                  href={`/admin/matches/${m.id}`}
                  className="flex-1 min-w-[200px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(
                        m.status,
                        m.match_date
                      )}`}
                    >
                      {statusLabel(m.status, m.match_date)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(m.match_date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 font-fut text-xl font-extrabold uppercase text-white">
                    {m.team_a_name} {m.score_a} - {m.score_b} {m.team_b_name}
                  </div>
                  <div className="text-xs text-gray-500">{m.location}</div>
                </Link>

                {/* 3-Dots Admin Menu */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Opciones del partido"
                    onClick={() => setOpenMenuId(menuOpen ? null : m.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1F2937] bg-[#090D16] text-gray-300 hover:border-amber-500/40 hover:text-amber-400 transition"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-1.5 z-20 w-48 rounded-2xl border border-[#1F2937] bg-[#090D16] p-1.5 shadow-2xl space-y-1">
                      <Link
                        href={`/admin/matches/${m.id}`}
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-[#111827] hover:text-amber-400"
                      >
                        <Pencil size={13} />
                        Gestionar / Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          if (
                            window.confirm(
                              `¿Seguro que quieres borrar el partido "${m.team_a_name} vs ${m.team_b_name}"?`
                            )
                          ) {
                            deleteMatch(m.id);
                          }
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15"
                      >
                        <Trash2 size={13} />
                        Borrar partido
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
