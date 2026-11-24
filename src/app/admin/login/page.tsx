"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";
import { useFutStore } from "@/lib/store";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAdmin, loginAdmin } = useFutStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = loginAdmin(username, password);
    if (ok) {
      router.push("/admin");
    } else {
      setError("Usuario o contraseña de administrador incorrectos.");
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Lock size={22} />
          </div>
          <h1 className="font-fut text-3xl font-extrabold uppercase text-white">
            Panel de Administrador
          </h1>
          <p className="text-xs text-gray-400">
            Inicia sesión con tus credenciales de administración del club.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Usuario
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario administrador"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-xl border border-[#1F2937] bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.99] transition"
          >
            <LogIn size={16} />
            Entrar al Panel Admin
          </button>
        </form>
      </div>
    </div>
  );
}
