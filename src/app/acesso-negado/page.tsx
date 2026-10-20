"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldX, ArrowLeft, LogOut, Loader2 } from "lucide-react";

function AcessoNegadoContent() {
  const searchParams = useSearchParams();
  const motivo = searchParams.get("motivo");

  let titulo = "Acesso Negado";
  let descricao =
    "Você não possui autorização pedagógica ou administrativa para acessar esta área da plataforma.";

  if (motivo === "bloqueado" || motivo === "inativo") {
    titulo = "Conta Temporariamente Indisponível";
    descricao =
      "Sua conta institucional está classificada como inativa ou bloqueada. Por favor, entre em contato diretamente com a coordenação da Escola Paulo.";
  } else if (motivo === "perfil_inexistente") {
    titulo = "Perfil Não Localizado";
    descricao =
      "Não foi possível localizar os dados do seu perfil cadastrado. Solicite à administração a validação do seu cadastro.";
  }

  return (
    <main className="min-h-screen bg-[#0C0A17] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-40 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/assets/mtd/mtd-main-background.svg')` }}
        aria-hidden="true"
      />

      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-[#161426]/90 border border-rose-500/20 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldX className="w-8 h-8 text-rose-400" aria-hidden="true" />
          </div>

          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2 block">
            Segurança & Controle de Acesso
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight mb-3">
            {titulo}
          </h1>

          <p className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto mb-8 font-sans">
            {descricao}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-[#1F1B38] hover:bg-[#2A244D] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Página Inicial</span>
            </Link>

            <form action="/api/auth/logout" method="POST" className="w-full sm:w-auto">
              <button
                type="submit"
                className="w-full px-6 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/30 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Encerrar Sessão</span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2">
            <div className="w-4 h-4 relative opacity-60">
              <Image
                src="/assets/mtd/mtd-logo-mark.svg"
                alt="Logo MTD"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xs text-gray-400">Escola Paulo • Método MTD</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AcessoNegadoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0C0A17] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
        </main>
      }
    >
      <AcessoNegadoContent />
    </Suspense>
  );
}
