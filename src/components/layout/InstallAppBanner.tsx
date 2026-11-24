"use client";

import React, { useEffect, useState } from "react";
import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  useEffect(() => {
    // Check if already running as an installed PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent;
    const iosDetected =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);
    setIsIos(iosDetected);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstalledNotice(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Do not show button if already installed as an app
  if (isStandalone && !installedNotice) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setInstalledNotice(true);
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <div className="mt-10 pt-6 border-t border-[#1F2937]/70 flex flex-col items-center gap-2 text-center">
        {installedNotice ? (
          <p className="text-xs font-semibold text-emerald-400">
            ✓ ¡FUT Pachangas instalada en tu dispositivo!
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/35 bg-[#111827] px-5 py-2.5 text-xs sm:text-sm font-bold text-amber-400 hover:bg-amber-500/15 hover:border-amber-400 active:scale-[0.98] transition shadow-lg"
            >
              <Smartphone size={16} />
              <span>Instalar App (Android / iPhone)</span>
              <Download size={14} />
            </button>
            <p className="text-[11px] text-gray-500">
              Añade un acceso directo a tu pantalla de inicio para entrar en 1
              toque.
            </p>
          </>
        )}
      </div>

      {/* Step-by-step Install Modal for iPhone (Safari) and Android */}
      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-[#1F2937] bg-[#111827] p-6 shadow-2xl space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              aria-label="Cerrar instrucciones"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1F2937] text-gray-300 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="space-y-1 pr-8">
              <span className="inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Acceso Directo PWA
              </span>
              <h3 className="font-fut text-2xl font-extrabold uppercase text-white">
                Instalar FUT Pachangas
              </h3>
            </div>

            {isIos ? (
              <ol className="space-y-3 text-xs text-gray-300">
                <li className="flex items-start gap-2.5 rounded-xl bg-[#090D16] border border-[#1F2937] p-3">
                  <span className="font-fut text-base font-extrabold text-amber-400">
                    1.
                  </span>
                  <span>
                    Asegúrate de abrir esta web en{" "}
                    <strong className="text-white">Safari</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl bg-[#090D16] border border-[#1F2937] p-3">
                  <span className="font-fut text-base font-extrabold text-amber-400">
                    2.
                  </span>
                  <span className="flex items-center gap-1 flex-wrap">
                    Pulsa el botón{" "}
                    <strong className="text-white inline-flex items-center gap-1">
                      <Share size={13} className="text-sky-400" /> Compartir
                    </strong>{" "}
                    en la barra inferior.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl bg-[#090D16] border border-[#1F2937] p-3">
                  <span className="font-fut text-base font-extrabold text-amber-400">
                    3.
                  </span>
                  <span className="flex items-center gap-1 flex-wrap">
                    Baja y toca{" "}
                    <strong className="text-white inline-flex items-center gap-1">
                      <PlusSquare size={13} className="text-emerald-400" />{" "}
                      Añadir a pantalla de inicio
                    </strong>{" "}
                    y pulsa <strong className="text-white">Añadir</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-xs text-gray-300">
                <li className="flex items-start gap-2.5 rounded-xl bg-[#090D16] border border-[#1F2937] p-3">
                  <span className="font-fut text-base font-extrabold text-amber-400">
                    1.
                  </span>
                  <span>
                    Abre esta web en <strong className="text-white">Chrome</strong>{" "}
                    (Android) o <strong className="text-white">Safari</strong>{" "}
                    (iPhone).
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl bg-[#090D16] border border-[#1F2937] p-3">
                  <span className="font-fut text-base font-extrabold text-amber-400">
                    2.
                  </span>
                  <span>
                    En <strong className="text-white">Android</strong>: pulsa el
                    menú <strong className="text-white">⋮</strong> arriba a la
                    derecha →{" "}
                    <strong className="text-emerald-400">
                      Instalar aplicación
                    </strong>{" "}
                    o{" "}
                    <strong className="text-emerald-400">
                      Añadir a pantalla de inicio
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2.5 rounded-xl bg-[#090D16] border border-[#1F2937] p-3">
                  <span className="font-fut text-base font-extrabold text-amber-400">
                    3.
                  </span>
                  <span>
                    En <strong className="text-white">iPhone</strong>: pulsa{" "}
                    <strong className="text-sky-400">Compartir</strong> →{" "}
                    <strong className="text-emerald-400">
                      Añadir a pantalla de inicio
                    </strong>
                    .
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full rounded-2xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
