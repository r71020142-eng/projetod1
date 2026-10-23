"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Share, X, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Começa true até verificar montagem
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está em modo PWA standalone
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Verifica se o usuário já dispensou nesta sessão
    const dismissed = sessionStorage.getItem("mtd_pwa_prompt_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
      return;
    }

    setIsDismissed(false);

    // 3. Detecta iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;
    setIsIOS(isIosDevice);

    // 4. Captura evento beforeinstallprompt (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Detecta se foi instalado com sucesso
    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsStandalone(true);
      }, 3000);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalledSuccess(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosGuide(!showIosGuide);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("mtd_pwa_prompt_dismissed", "true");
    } catch {
      // Ignora erro de sessionStorage se restrito
    }
  };

  // Se já estiver rodando como standalone ou dispensado pelo usuário, não renderiza
  if (isStandalone || isDismissed) {
    return null;
  }

  // Apenas exibe se houver suporte a instalação direta (Android/Chrome) OU for iOS elegível
  if (!deferredPrompt && !isIOS && !installedSuccess) {
    return null;
  }

  return (
    <aside
      aria-label="Instalação do Aplicativo Método Paulo"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] border border-slate-700/80 p-4 shadow-2xl text-white backdrop-blur-xl">
        {/* Efeito sutil de brilho de fundo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#5B2FE8]/25 rounded-full blur-2xl pointer-events-none" />

        {installedSuccess ? (
          <div className="flex items-center gap-3 py-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Aplicativo instalado!</p>
              <p className="text-xs text-slate-300">Você já pode acessá-lo na tela inicial.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-[#0B0826] border border-[#D79A24]/30 flex items-center justify-center p-1.5 shrink-0 shadow-md">
                  <Image
                    src="/assets/mtd/mtd-logo-mark.svg"
                    alt="Logo Método Paulo"
                    width={28}
                    height={28}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                    Método Paulo App
                    <span className="text-[10px] font-semibold text-[#EDB84E] bg-[#D79A24]/20 px-1.5 py-0.5 rounded-full">
                      PWA
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    Instale no seu celular para acesso rápido e tela cheia.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dispensar aviso de instalação"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guia interativo para iOS Safari */}
            {isIOS && showIosGuide && (
              <div className="rounded-xl bg-slate-800/70 border border-slate-700 p-2.5 text-xs text-slate-300 space-y-1.5 animate-in fade-in duration-200">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-[#EDB84E]" />
                  Como instalar no iPhone/iPad:
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-1 text-slate-300">
                  <li>Toque no botão <strong>Compartilhar</strong> na barra do Safari.</li>
                  <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                  <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
                </ol>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#5B2FE8] to-[#7047F5] text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-[#5B2FE8]/25"
              >
                {isIOS ? (
                  <>
                    <Share className="w-3.5 h-3.5 text-white" />
                    <span>{showIosGuide ? "Fechar instruções" : "Ver como instalar no iPhone"}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Instalar no celular</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
