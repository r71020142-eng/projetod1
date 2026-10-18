"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { ProgressoJornadaAluno } from "@/types";

interface JornadaCompactCardProps {
  progresso?: ProgressoJornadaAluno | null;
}

export function JornadaCompactCard({ progresso }: JornadaCompactCardProps) {
  const programaTitulo =
    progresso?.programaNome || "Programa de Fluência & Imersão MTD (Método Paulo)";
  const moduloSubtitulo =
    progresso?.moduloAtualNome || "Fundamentos (Demonstrativo)";
  const proximoMarco =
    (progresso?.criteriosPendentesDescricoes && progresso.criteriosPendentesDescricoes[0]) ||
    "3. Comunicação em Contextos Reais";

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 lg:px-6 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#D79A24] before:z-20">
      {/* Camada decorativa oficial com mtd-journey-background.webp */}
      <div
        className="absolute inset-0 bg-[url('/assets/mtd/mtd-journey-background.webp')] bg-cover bg-right-bottom pointer-events-none select-none z-0 opacity-75"
        aria-hidden="true"
      />

      {/* 1. Lado Esquerdo: Eyebrow + Título do Programa / Módulo (relative z-10) */}
      <div className="relative z-10 shrink-0 pl-1 sm:pl-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.22em] text-[#D79A24] uppercase">
            SUA JORNADA MTD
          </span>
        </div>

        <h2 className="font-serif text-base sm:text-lg font-bold text-[#07132E] mt-0.5 leading-snug">
          {programaTitulo}
        </h2>
        <div className="text-[11px] text-[#60708F] font-medium">
          {moduloSubtitulo}
        </div>
      </div>

      {/* 2. Centro: Stepper Horizontal com rótulos acima (Desktop) */}
      <div className="hidden lg:flex items-center flex-1 max-w-sm xl:max-w-md mx-6 relative pt-4 z-10">
        {/* Linha de conexão contínua atrás dos círculos */}
        <div className="absolute left-3 right-3 top-[25px] h-0.5 bg-slate-200">
          <div className="h-full bg-[#D79A24] w-1/3" />
        </div>

        <div className="w-full flex items-center justify-between relative z-10">
          {/* Node 1: Concluído */}
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-[#D79A24] text-white flex items-center justify-center shadow-xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          {/* Node 2: Atual com rótulos acima */}
          <div className="flex flex-col items-center relative">
            <div className="absolute -top-7 text-center whitespace-nowrap">
              <div className="text-[9px] uppercase tracking-wider text-[#60708F] font-bold leading-none">
                Módulo atual
              </div>
              <div className="text-[10.5px] font-bold text-[#5B2FE8] leading-tight mt-0.5">
                2. Estratégias de Fala
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-[#5B2FE8] text-white flex items-center justify-center ring-4 ring-[#5B2FE8]/25 shadow-xs animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Node 3: Próximo com rótulos acima */}
          <div className="flex flex-col items-center relative">
            <div className="absolute -top-7 text-center whitespace-nowrap">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold leading-none">
                Próximo marco
              </div>
              <div className="text-[10.5px] font-semibold text-slate-700 leading-tight mt-0.5 truncate max-w-[140px]">
                {proximoMarco}
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-white border-2 border-slate-300 text-slate-400 flex items-center justify-center text-[9px] font-bold">
              3
            </div>
          </div>

          {/* Node 4: Futuro (pontilhado) */}
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-white border border-dashed border-slate-300 text-slate-300 flex items-center justify-center text-[9px] font-semibold">
              4
            </div>
          </div>
        </div>
      </div>

      {/* Versão Mobile/Tablet do Stepper */}
      <div className="flex lg:hidden items-center gap-2 mt-2 relative z-10">
        <div className="w-5 h-5 rounded-full bg-[#D79A24] text-white flex items-center justify-center">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
        <div className="w-6 h-0.5 bg-[#D79A24]" />
        <div className="w-5 h-5 rounded-full bg-[#5B2FE8] text-white flex items-center justify-center ring-2 ring-[#5B2FE8]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
        <div className="w-6 h-0.5 bg-slate-200" />
        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center text-[9px] font-bold">
          3
        </div>
        <span className="text-xs text-[#5B2FE8] font-bold ml-2">Módulo 2 (Atual)</span>
      </div>

      {/* 3. Lado Direito: Botão + Slogan com Linha Dourada Vertical */}
      <div className="relative z-10 flex items-center gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#DDDDE5]/80">
        <Link
          href="/aluno/jornada"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#06142C] hover:bg-[#0A1A38] text-white text-xs font-bold transition-all shadow-xs shadow-[#06142C]/20 hover:shadow-md whitespace-nowrap"
        >
          <span>Ver minha jornada</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Linha dourada vertical + Frase de 4 linhas */}
        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l-2 border-[#D79A24]">
          <div className="text-[9px] font-bold tracking-[0.18em] text-[#60708F] uppercase font-sans leading-tight text-left">
            <div>DISCIPLINA</div>
            <div className="text-[#07132E]">HOJE.</div>
            <div>LIBERDADE</div>
            <div className="text-[#07132E]">SEMPRE.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

