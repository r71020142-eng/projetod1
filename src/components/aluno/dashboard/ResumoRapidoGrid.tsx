"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#DDDDE5]/80">
      {/* Coluna 1: Progresso do módulo */}
      <Link
        href="/aluno/jornada"
        className="group flex flex-col justify-between py-3 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#60708F] uppercase tracking-[0.18em] font-sans">
            <span>Progresso do módulo</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:text-[#5B2FE8] transition-opacity shrink-0" />
          </div>
          <div className="font-serif text-3xl font-bold text-[#07132E] mt-1 group-hover:text-[#5B2FE8] transition-colors">
            {percentualModulo}%
          </div>
          <div className="text-xs text-[#60708F] truncate mt-0.5">
            {nomeModulo || "Módulo em andamento"}
          </div>
        </div>

        {/* Micrográfico: Barra de progresso com gradiente */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3 border border-slate-200/50">
          <div
            className="h-full bg-gradient-to-r from-[#5B2FE8] to-[#D79A24] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Math.max(percentualModulo, 5), 100)}%` }}
          />
        </div>
      </Link>

      {/* Coluna 2: Atividades pendentes */}
      <Link
        href="/aluno/atividades"
        className="group flex flex-col justify-between py-3 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#60708F] uppercase tracking-[0.18em] font-sans">
            <span>Atividades pendentes</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:text-[#5B2FE8] transition-opacity shrink-0" />
          </div>
          <div className="font-serif text-3xl font-bold text-[#07132E] mt-1 group-hover:text-[#D79A24] transition-colors">
            {totalAtividadesPendentes}
          </div>
          <div className="text-xs text-[#60708F] truncate mt-0.5">
            {totalAtividadesPendentes === 1
              ? "1 entrega a realizar"
              : `${totalAtividadesPendentes} entregas a realizar`}
          </div>
        </div>

        {/* Micrográfico: Barrinhas verticais douradas */}
        <div className="flex items-end gap-1 h-3 mt-3" aria-hidden="true">
          <div className="w-1.5 h-2 bg-[#EDB84E] rounded-xs" />
          <div className="w-1.5 h-3 bg-[#D79A24] rounded-xs" />
          <div className="w-1.5 h-1.5 bg-[#EDB84E]/50 rounded-xs" />
        </div>
      </Link>

      {/* Coluna 3: Flashcards para hoje */}
      <Link
        href="/aluno/flashcards"
        className="group flex flex-col justify-between py-3 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#60708F] uppercase tracking-[0.18em] font-sans">
            <span>Flashcards para hoje</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:text-[#5B2FE8] transition-opacity shrink-0" />
          </div>
          <div className="font-serif text-3xl font-bold text-[#07132E] mt-1 group-hover:text-[#5B2FE8] transition-colors">
            {totalFlashcardsParaRevisar}
          </div>
          <div className="text-xs text-[#60708F] truncate mt-0.5">
            {totalFlashcardsParaRevisar > 0
              ? "Revisão no sistema SRS"
              : "Tudo revisado hoje"}
          </div>
        </div>

        {/* Micrográfico: Barrinhas verticais violetas */}
        <div className="flex items-end gap-1 h-3 mt-3" aria-hidden="true">
          <div className="w-1.5 h-1.5 bg-[#7047F5]/50 rounded-xs" />
          <div className="w-1.5 h-2.5 bg-[#5B2FE8] rounded-xs" />
          <div className="w-1.5 h-3 bg-[#7047F5] rounded-xs" />
          <div className="w-1.5 h-2 bg-[#5B2FE8]/60 rounded-xs" />
        </div>
      </Link>

      {/* Coluna 4: Dedicação e pontos */}
      <Link
        href="/aluno/conquistas"
        className="group flex flex-col justify-between py-3 sm:py-0 sm:px-4 lg:px-5 first:sm:pl-0 last:sm:pr-0 hover:bg-[#FAF8F3]/60 sm:hover:bg-transparent rounded-lg transition-colors"
      >
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#60708F] uppercase tracking-[0.18em] font-sans">
            <span>Dedicação e pontos</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:text-[#5B2FE8] transition-opacity shrink-0" />
          </div>
          <div className="font-serif text-3xl font-bold text-[#07132E] mt-1 group-hover:text-[#16A879] transition-colors">
            {pontosTotais}{" "}
            <span className="text-base font-sans font-semibold text-[#60708F]">
              pts
            </span>
          </div>
          <div className="text-xs text-[#60708F] truncate mt-0.5">
            {streakWeeks} {streakWeeks === 1 ? "semana de sequência" : "semanas de sequência"}
          </div>
        </div>

        {/* Micrográfico: Sparkline ondulada esmeralda */}
        <div className="h-3 mt-3 flex items-center" aria-hidden="true">
          <svg className="w-20 h-3 text-[#16A879]" viewBox="0 0 80 14" fill="none">
            <path
              d="M0 12 L15 10 L30 13 L45 6 L60 8 L75 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="75" cy="2" r="2" fill="currentColor" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
