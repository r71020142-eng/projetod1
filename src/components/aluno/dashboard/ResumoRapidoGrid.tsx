"use client";

import React from "react";
import Link from "next/link";
import { BarChart2, CheckSquare, Layers, Award, ChevronRight } from "lucide-react";

interface ResumoRapidoGridProps {
  percentualModulo: number;
  nomeModulo: string;
  totalAtividadesPendentes: number;
  totalFlashcardsParaRevisar: number;
  pontosTotais: number;
  streakWeeks: number;
}

export function ResumoRapidoGrid({
  percentualModulo,
  nomeModulo,
  totalAtividadesPendentes,
  totalFlashcardsParaRevisar,
  pontosTotais,
  streakWeeks,
}: ResumoRapidoGridProps) {
  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#DDDDE5]/80">
      {/* Coluna 1: Progresso do módulo */}
      <Link
        href="/aluno/jornada"
        className="group flex flex-col justify-between py-2 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          {/* Linha superior: Ícone pastel + Título + Seta circular */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#5B2FE8]/10 text-[#5B2FE8] flex items-center justify-center shrink-0">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-[#60708F] uppercase tracking-[0.16em] truncate">
                Progresso do módulo
              </span>
            </div>
            <span className="w-5 h-5 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:border-slate-400 transition-colors shrink-0">
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Valor grande */}
          <div className="font-serif text-3xl font-bold text-[#07132E] mt-2 group-hover:text-[#5B2FE8] transition-colors leading-none">
            {percentualModulo}%
          </div>
        </div>

        <div>
          {/* Micrográfico: Barra de progresso com gradiente */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2 border border-slate-200/50">
            <div
              className="h-full bg-gradient-to-r from-[#5B2FE8] to-[#D79A24] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(percentualModulo, 5), 100)}%` }}
            />
          </div>

          <div className="text-[11px] text-[#60708F] truncate mt-1.5">
            {nomeModulo || "Módulo em andamento"}
          </div>
        </div>
      </Link>

      {/* Coluna 2: Atividades pendentes */}
      <Link
        href="/aluno/atividades"
        className="group flex flex-col justify-between py-2 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          {/* Linha superior: Ícone pastel + Título + Seta circular */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#D79A24]/10 text-[#D79A24] flex items-center justify-center shrink-0">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-[#60708F] uppercase tracking-[0.16em] truncate">
                Atividades pendentes
              </span>
            </div>
            <span className="w-5 h-5 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:border-slate-400 transition-colors shrink-0">
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Valor grande + Micrográfico alinhados */}
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-serif text-3xl font-bold text-[#07132E] group-hover:text-[#D79A24] transition-colors leading-none">
              {totalAtividadesPendentes}
            </span>

            {/* Micrográfico: Barrinhas verticais douradas */}
            <div className="flex items-end gap-1 h-4 pb-0.5" aria-hidden="true">
              <div className="w-1.5 h-2 bg-[#EDB84E] rounded-xs" />
              <div className="w-1.5 h-3.5 bg-[#D79A24] rounded-xs" />
              <div className="w-1.5 h-1.5 bg-[#EDB84E]/50 rounded-xs" />
              <div className="w-1.5 h-2.5 bg-[#D79A24]/70 rounded-xs" />
              <div className="w-1.5 h-3 bg-[#EDB84E] rounded-xs" />
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#60708F] truncate mt-1.5">
          {totalAtividadesPendentes === 1
            ? "1 entrega a realizar"
            : `${totalAtividadesPendentes} entregas a realizar`}
        </div>
      </Link>

      {/* Coluna 3: Flashcards para hoje */}
      <Link
        href="/aluno/flashcards"
        className="group flex flex-col justify-between py-2 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          {/* Linha superior: Ícone pastel + Título + Seta circular */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#7047F5]/10 text-[#7047F5] flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-[#60708F] uppercase tracking-[0.16em] truncate">
                Flashcards para hoje
              </span>
            </div>
            <span className="w-5 h-5 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:border-slate-400 transition-colors shrink-0">
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Valor grande + Micrográfico alinhados */}
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-serif text-3xl font-bold text-[#07132E] group-hover:text-[#5B2FE8] transition-colors leading-none">
              {totalFlashcardsParaRevisar}
            </span>

            {/* Micrográfico: Barrinhas verticais violetas */}
            <div className="flex items-end gap-1 h-4 pb-0.5" aria-hidden="true">
              <div className="w-1.5 h-1.5 bg-[#7047F5]/50 rounded-xs" />
              <div className="w-1.5 h-2.5 bg-[#5B2FE8] rounded-xs" />
              <div className="w-1.5 h-3.5 bg-[#7047F5] rounded-xs" />
              <div className="w-1.5 h-2 bg-[#5B2FE8]/60 rounded-xs" />
              <div className="w-1.5 h-3 bg-[#7047F5]/80 rounded-xs" />
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#60708F] truncate mt-1.5">
          {totalFlashcardsParaRevisar > 0
            ? "Revisão SRS disponível"
            : "Tudo revisado hoje"}
        </div>
      </Link>

      {/* Coluna 4: Dedicação e pontos */}
      <Link
        href="/aluno/conquistas"
        className="group flex flex-col justify-between py-2 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          {/* Linha superior: Ícone pastel + Título + Seta circular */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#16A879]/10 text-[#16A879] flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-[#60708F] uppercase tracking-[0.16em] truncate">
                Dedicação e pontos
              </span>
            </div>
            <span className="w-5 h-5 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:border-slate-400 transition-colors shrink-0">
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Valor grande + Micrográfico sparkline alinhados */}
          <div className="flex items-baseline justify-between mt-2">
            <div className="font-serif text-3xl font-bold text-[#07132E] group-hover:text-[#16A879] transition-colors leading-none">
              {pontosTotais}{" "}
              <span className="text-sm font-sans font-semibold text-[#60708F]">
                pts
              </span>
            </div>

            {/* Micrográfico: Sparkline ondulada esmeralda */}
            <div className="h-4 pb-0.5 flex items-center" aria-hidden="true">
              <svg className="w-16 h-3 text-[#16A879]" viewBox="0 0 64 12" fill="none">
                <path
                  d="M0 10 L12 8 L24 11 L36 4 L48 6 L60 2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="60" cy="2" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#60708F] truncate mt-1.5">
          {streakWeeks} {streakWeeks === 1 ? "semana de sequência" : "semanas de sequência"}
        </div>
      </Link>
    </div>
  );
}

