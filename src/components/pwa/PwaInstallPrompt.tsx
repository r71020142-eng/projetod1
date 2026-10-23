"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Download,
  X,
  CheckCircle2,
  Copy,
  Smartphone,
  Info,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Começa true até hidratação
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // 1. Verificar se está em modo PWA standalone (instalado)
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (standaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Verificar se o usuário já dispensou nesta sessão
    const dismissed = sessionStorage.getItem("mtd_pwa_prompt_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    // 3. Detecção de ambiente móvel e navegadores
    const ua = window.navigator.userAgent || "";
    const isIosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    // Navegadores embutidos comuns (In-App Browsers)
    const inApp = /Instagram|FBAN|FBAV|WhatsApp|Line|Twitter|Snapchat|LinkedIn|MicroMessenger/i.test(
      ua
    );

    // Safari nativo no iOS (não Chrome, Firefox ou in-app)
    const isIosSafari =
      isIosDevice &&
      !inApp &&
      /Safari/i.test(ua) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

    setIsIOS(isIosDevice);
    setIsInAppBrowser(inApp);
    setIsSafari(isIosSafari);

    // 4. Capturar evento beforeinstallprompt (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Detectar instalação concluída
    const handleAppInstalled = () => {
      setIsInstalledSuccess(true);
      setDeferredPrompt(null);
      setShowModal(false);
      setTimeout(() => {
        setIsStandalone(true);
      }, 4000);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Fechar modal ao pressionar ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    },
    [showModal]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("mtd_pwa_prompt_dismissed", "true");
    } catch {
      // Ignora erro de storage
    }
  };

  const handleActionClick = async () => {
    if (deferredPrompt) {
      // Android / Chrome compatível: dispara o prompt nativo
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalledSuccess(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Erro ao solicitar instalação nativa PWA:", err);
        setShowModal(true);
      }
    } else {
      // iOS ou navegador sem prompt automático: abre o assistente visual
      setShowModal(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.origin + "/login";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  };

  // Se já estiver em standalone (instalado), não renderiza nada
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* ============================================================== */}
      {/* 1. BANNER FLUTUANTE DISCRETO (inferior direito / mobile bottom) */}
      {/* ============================================================== */}
      {!isDismissed && (
        <aside
          aria-label="Assistente de Instalação do Aplicativo Método Paulo"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,16px))] left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#0B0826]/95 border border-purple-500/30 p-4 shadow-2xl text-white backdrop-blur-xl">
            {/* Efeito sutil de iluminação */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#5B2FE8]/20 rounded-full blur-2xl pointer-events-none" />

            {isInstalledSuccess ? (
              <div className="flex items-center gap-3 py-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Aplicativo instalado!</p>
                  <p className="text-xs text-slate-300">
                    O Método Paulo já está disponível na sua tela de início.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl bg-[#0B0826] border border-[#EDB84E]/40 flex items-center justify-center p-1.5 shrink-0 shadow-md">
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
                        Método Paulo
                        <span className="text-[10px] font-semibold text-[#EDB84E] bg-[#D79A24]/20 border border-[#EDB84E]/30 px-1.5 py-0.2 rounded-full">
                          App PWA
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 line-clamp-1">
                        {isIOS
                          ? "Instale no seu iPhone para tela cheia e acesso rápido."
                          : "Instale no celular para ter o app direto na tela inicial."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dispensar aviso de instalação"
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#5B2FE8] to-[#7047F5] text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-[#5B2FE8]/25"
                  >
                    {deferredPrompt ? (
                      <>
                        <Download className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>Instalar no celular</span>
                      </>
                    ) : isIOS ? (
                      <>
                        <Smartphone className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>Instalar no iPhone</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>Como instalar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 2. MODAL / ASSISTENTE VISUAL PASSO A PASSO (iOS & Fallback)   */}
      {/* ============================================================== */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[#0B0826] border border-slate-700 rounded-t-3xl sm:rounded-2xl p-6 text-white shadow-2xl space-y-5 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-300 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B0826] border border-[#EDB84E]/40 flex items-center justify-center p-1.5 shadow-md shrink-0">
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
                  <h3 id="pwa-install-modal-title" className="text-base font-bold text-white">
                    Instalar Método Paulo
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isIOS ? "Instalação oficial no iPhone / iPad" : "Instalação no seu dispositivo"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Fechar guia de instalação"
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CASO A: Navegador embutido (Instagram, WhatsApp, Facebook, etc.) */}
            {isIOS && isInAppBrowser ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/90 space-y-1">
                    <p className="font-semibold text-amber-300">
                      Você está em um navegador integrado
                    </p>
                    <p>
                      Aplicativos como Instagram ou WhatsApp bloqueiam a instalação direta de PWAs.
                      Para instalar, você precisa abrir esta página no <strong>Safari</strong>.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <p className="text-xs text-slate-200">
                      Toque no menu de opções (ícone de <strong>três pontos &bull;&bull;&bull;</strong> ou compartilhar) do aplicativo.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <p className="text-xs text-slate-200">
                      Selecione <strong>&quot;Abrir no navegador externo&quot;</strong> ou <strong>&quot;Abrir no Safari&quot;</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <p className="text-xs text-slate-200">
                      No Safari, siga o passo a passo de adicionar à tela de início.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Link copiado! Cole no Safari</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-300" />
                        <span>Copiar link para colar no Safari</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : isIOS ? (
              /* CASO B: iOS Safari - 3 Passos Visuais Elegantes */
              <div className="space-y-3.5">
                {!isSafari && (
                  <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
                    <p>
                      Recomendamos utilizar o <strong>Safari</strong> no iPhone para a melhor experiência de instalação PWA.
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-300">
                  Siga estes 3 passos simples na barra de navegação do <strong>Safari</strong>:
                </p>

                {/* Passo 1 */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#5B2FE8]/20 border border-[#5B2FE8]/40 flex items-center justify-center shrink-0 text-[#EDB84E]">
                    {/* Ícone de Compartilhar do Safari (caixa com seta para cima) */}
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Passo 1
                    </span>
                    <p className="text-xs font-semibold text-white">Toque no botão Compartilhar</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Localizado na barra inferior do Safari (o ícone de quadrado com seta para cima).
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#5B2FE8]/20 border border-[#5B2FE8]/40 flex items-center justify-center shrink-0 text-white">
                    {/* Ícone Adicionar à Tela de Início (quadrado com mais) */}
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Passo 2
                    </span>
                    <p className="text-xs font-semibold text-white">
                      Adicionar à Tela de Início
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Role o menu de opções para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Passo 3
                    </span>
                    <p className="text-xs font-semibold text-white">Confirmar em &quot;Adicionar&quot;</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Toque em <strong>Adicionar</strong> no canto superior direito da janela. O ícone do app aparecerá na sua tela inicial!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* CASO C: Android / Chrome / Outros navegadores sem prompt automático */
              <div className="space-y-3.5">
                <p className="text-xs text-slate-300">
                  Para instalar o Método Paulo no seu celular:
                </p>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Abra o menu do navegador</p>
                    <p className="text-[11px] text-slate-400">
                      Toque nos <strong>três pontos verticais (&vellip;)</strong> no canto superior direito do Chrome ou navegador.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Selecione &quot;Instalar aplicativo&quot;</p>
                    <p className="text-[11px] text-slate-400">
                      Ou escolha <strong>&quot;Adicionar à tela inicial&quot;</strong> e confirme a instalação.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé do Modal */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5B2FE8] to-[#7047F5] text-white text-xs font-semibold hover:brightness-110 active:scale-[0.99] transition-all shadow-md shadow-[#5B2FE8]/25"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
