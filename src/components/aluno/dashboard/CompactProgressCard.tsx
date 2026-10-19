"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

interface CompactProgressCardProps {
  nomeModulo: string;
  percentual: number;
  streakWeeks: number;
  totalPendencias: number;
}

export function CompactProgressCard({
  nomeModulo,
  percentual,
  streakWeeks,
  totalPendencias,
}: CompactProgressCardProps) {
  const percentualLimpo = Math.min(Math.max(Math.round(percentual), 0), 100);

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-5 sm:p-6 shadow-xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#60708F] font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#5B2FE8]" aria-hidden="true" />
            <span>Seu progresso</span>
          </div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-[#07132E]">
            {nomeModulo}
          </h2>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-base sm:text-lg font-bold text-[#5B2FE8] font-sans">
            {percentualLimpo}% concluído
          </span>
        </div>
      </div>

      {/* Uma única barra de progresso */}
      <div
        className="w-full bg-[#E5E2DA] h-2.5 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentualLimpo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso do ${nomeModulo}: ${percentualLimpo}%`}
      >
        <div
          className="bg-[#5B2FE8] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentualLimpo}%` }}
        />
      </div>

      {/* Informações complementares & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-[#DDDDE5]/60 text-xs text-[#60708F]">
        <div className="flex items-center gap-2">
          <span>{streakWeeks} {streakWeeks === 1 ? "semana" : "semanas"} de sequência</span>
          <span>•</span>
          <span>{totalPendencias} {totalPendencias === 1 ? "pendência" : "pendências"}</span>
        </div>

        <Link
          href="/aluno/jornada"
          className="inline-flex items-center gap-1 font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
        >
          <span>Ver minha jornada</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
