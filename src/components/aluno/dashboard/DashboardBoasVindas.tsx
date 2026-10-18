"use client";

import React, { useMemo } from "react";
import { Flame, Calendar as CalendarIcon } from "lucide-react";

interface DashboardBoasVindasProps {
  nomeAluno: string;
  totalAcoesHoje: number;
  streakWeeks: number;
  streakDays?: number;
}

export function DashboardBoasVindas({
  nomeAluno,
  totalAcoesHoje,
  streakWeeks,
  streakDays,
}: DashboardBoasVindasProps) {
  // Saudação baseada no horário atual
  const { saudacao, dataFormatada, frasePersonalizada } = useMemo(() => {
    const agora = new Date();
    const hora = agora.getHours();

    let s = "Bom dia";
    if (hora >= 12 && hora < 18) {
      s = "Boa tarde";
    } else if (hora >= 18 || hora < 5) {
      s = "Boa noite";
    }

    const dataFmt = agora.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Capitaliza primeira letra do dia da semana
    const dataCapitalizada = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);

    let frase = "";
    if (totalAcoesHoje > 1) {
      frase = `Você tem ${totalAcoesHoje} ações prioritárias para avançar hoje.`;
    } else if (totalAcoesHoje === 1) {
      frase = "Você tem 1 ação prioritária para avançar hoje.";
    } else {
      frase = "Você está em dia com seus estudos hoje! Continue no ritmo.";
    }

    return { saudacao: s, dataFormatada: dataCapitalizada, frasePersonalizada: frase };
  }, [totalAcoesHoje]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>{dataFormatada}</span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
          {saudacao}, <span className="text-[#5B4DFC]">{nomeAluno}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
          {frasePersonalizada}
        </p>
      </div>

      {/* Sequência de estudos em formato compacto */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 px-4 py-2 rounded-2xl shadow-xs">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500 text-white shadow-xs">
            <Flame className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider leading-none">
              Sequência de estudos
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              {streakWeeks} {streakWeeks === 1 ? "semana" : "semanas"} ativa
              {streakDays ? ` • ${streakDays}d` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
