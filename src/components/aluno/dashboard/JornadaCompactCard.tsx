"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { ProgressoJornadaAluno } from "@/types";

interface JornadaCompactCardProps {
  progresso?: ProgressoJornadaAluno | null;
}

export function JornadaCompactCard({ progresso }: JornadaCompactCardProps) {
  const moduloNome = progresso?.moduloAtualNome || "Comunicação Prática & Connected Speech";
  const programaNome = progresso?.programaNome || "Programa de Fluência MTD";
  const proximoPendente =
    (progresso?.criteriosPendentesDescricoes && progresso.criteriosPendentesDescricoes[0]) ||
    "Checkpoints pedagógicos do Módulo 2";

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
      {/* Camada decorativa oficial com mtd-journey-background.svg */}
      <div
        className="absolute inset-0 bg-[url('/assets/mtd/mtd-journey-background.svg')] bg-cover bg-center pointer-events-none select-none z-0 opacity-95"
        aria-hidden="true"
      />

      {/* Conteúdo Principal e Stepper (relative z-10) */}
      <div className="relative z-10 flex-1 min-w-0 pl-1">
        {/* Eyebrow & Programa */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.25em] text-[#D79A24] uppercase">
            SUA JORNADA MTD
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold text-[#60708F]">
            {programaNome}
          </span>
        </div>

        {/* Título do Módulo */}
        <h2 className="font-serif text-lg sm:text-xl font-bold text-[#07132E] mt-1 leading-snug">
          {moduloNome}
        </h2>

        {/* Stepper Horizontal com Ponto Violeta Iluminado e Dourado Concluído */}
        <div className="flex items-center gap-2 sm:gap-3 mt-4 pt-1 max-w-xl">
          {/* Etapa 1: Concluído (Dourado com Check) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-full bg-[#FAF8F3] border-2 border-[#D79A24] text-[#D79A24] flex items-center justify-center shadow-2xs">
              <Check className="w-3.5 h-3.5 stroke-[2.8]" />
            </div>
            <span className="text-[11px] font-bold text-[#07132E] hidden sm:inline">
              Módulo 1
            </span>
          </div>

          {/* Conector Dourado */}
          <div className="flex-1 h-0.5 bg-[#D79A24] min-w-[24px]" />

          {/* Etapa 2: Módulo Atual (Iluminado em Violeta) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#5B2FE8] text-white shadow-xs shadow-[#5B2FE8]/40 ring-4 ring-[#5B2FE8]/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
            </div>
            <span className="text-[11px] font-bold text-[#5B2FE8] hidden sm:inline">
              Módulo 2 (Atual)
            </span>
          </div>

          {/* Conector Cinza */}
          <div className="flex-1 h-0.5 bg-slate-200 min-w-[24px]" />

          {/* Etapa 3: Próximo Módulo (Neutro) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-bold">
              3
            </div>
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
              Módulo 3
            </span>
          </div>

          {/* Conector Cinza */}
          <div className="flex-1 h-0.5 bg-slate-200 min-w-[24px]" />

          {/* Etapa 4: Validação Docente / Conclusão */}
          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            4
          </div>
        </div>

        {/* Próximo marco descritivo */}
        <div className="text-xs text-[#60708F] mt-3 flex items-center gap-1.5">
          <span className="font-semibold text-[#07132E]">Próximo marco:</span>
          <span className="truncate">{proximoPendente}</span>
        </div>
      </div>

      {/* Lado Direito: Botão + Slogan Institucional (relative z-10) */}
      <div className="relative z-10 flex flex-col items-start lg:items-end justify-center shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#DDDDE5]/80">
        <Link
          href="/aluno/jornada"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#06142C] hover:bg-[#0A1A38] text-white text-xs font-bold transition-all shadow-xs shadow-[#06142C]/20 hover:shadow-md"
        >
          <span>Ver minha jornada</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Frase Institucional Inferior */}
        <div className="hidden sm:block text-[9.5px] font-bold tracking-[0.2em] text-[#60708F] uppercase font-sans mt-2.5 text-right">
          DISCIPLINA HOJE, LIBERDADE SEMPRE.
        </div>
      </div>
    </div>
  );
}
