"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Lock,
  LogIn,
  ShieldCheck,
  Trophy,
  User,
  Users,
  Vote,
} from "lucide-react";
import { useFutStore } from "@/lib/store";
import { getEffectiveMatchPhase } from "@/lib/match-phase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { matches, isAdmin, currentPlayer } = useFutStore();

  const hasOpenVoting = matches.some(
    (m) => getEffectiveMatchPhase(m) === "voting_open"
  );

  const navItems = [
    { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
    {
      href: "/players",
      label: "Plantilla",
      icon: Users,
      match: (p: string) => p.startsWith("/players"),
    },
    {
      href: "/vote",
      label: "Votaciones",
      icon: Vote,
      badge: hasOpenVoting,
      match: (p: string) => p.startsWith("/vote"),
    },
    {
      href: "/stats",
      label: "Rankings",
      icon: Trophy,
      match: (p: string) => p.startsWith("/stats"),
    },
  ];

  const isInAdmin = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#090D16] text-gray-100 flex flex-col">
      {/* Compact Sticky Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1F2937]/80 bg-[#090D16]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 gap-2">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-fut font-extrabold text-lg shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
              FP
            </div>
            <div>
              <div className="font-fut text-lg font-extrabold tracking-wider uppercase leading-none text-white">
                FUT <span className="text-amber-400">Pachangas</span>
              </div>
              <div className="text-[10px] font-medium text-emerald-400/90 tracking-wide">
                CLUB AMATEUR
              </div>
            </div>
          </Link>

          {/* Desktop inline nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "text-gray-400 hover:text-white hover:bg-[#111827]"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-0.5 flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Player Session + Discrete Admin Access */}
          <div className="flex items-center gap-2">
            {currentPlayer ? (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                <User size={14} />
                <span className="max-w-[90px] truncate">
                  {currentPlayer.nickname}
                </span>
                <span className="font-fut text-sm text-amber-400">
                  {currentPlayer.overall}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                <LogIn size={14} />
                <span>Entrar</span>
              </Link>
            )}

            <Link
              href={isAdmin ? "/admin" : "/admin/login"}
              title="Panel de Administración"
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                isInAdmin
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                  : "border-[#1F2937] bg-[#111827] text-gray-400 hover:border-gray-600 hover:text-white"
              }`}
            >
              {isAdmin ? <ShieldCheck size={15} /> : <Lock size={14} />}
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile-First Fixed Bottom Tab Bar */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1F2937] bg-[#090D16]/95 backdrop-blur-lg md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
          {navItems.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition ${
                  active ? "text-amber-400" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090D16] animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-semibold">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
