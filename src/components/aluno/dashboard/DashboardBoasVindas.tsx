"use client";

import React, { useMemo } from "react";
import { Flame } from "lucide-react";

interface DashboardBoasVindasProps {
  nomeAluno: string;
  totalAcoesHoje: number;
  streakWeeks: number;
  streakDays?: number;
}

// Constante institucional configurável conforme especificação
const FRASE_INSTITUCIONAL = {
  tagline: "A LÍNGUA CONECTA VOCÊ AO MUNDO",
  subtag: "MÉTODO PAULO • LANGUAGE ACADEMY",
};

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
    // Formato uppercase com tracking
    const dataCapitalizada = dataFmt.toUpperCase();

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#DDDDE5]/70">
      <div>
        {/* Data em uppercase com tracking aumentado */}
        <div className="text-[11px] font-semibold text-[#60708F] uppercase tracking-[0.2em] font-sans mb-1">
          {dataFormatada}
        </div>

        {/* Título editorial em Playfair serif */}
        <h1 className="text-3xl sm:text-[34px] font-serif font-bold tracking-tight text-[#07132E] leading-tight">
          {saudacao},{" "}
          <span className="text-[#5B2FE8] italic">{nomeAluno}</span>
        </h1>

        {/* Frase personalizada curta */}
        <p className="text-xs sm:text-sm text-[#60708F] font-sans font-normal mt-1">
          {frasePersonalizada}
        </p>
      </div>

      {/* Canto direito: Frase institucional discreta & Sequência */}
      <div className="flex items-center gap-4 self-start sm:self-auto shrink-0">
        {/* Sequência de estudos compacta */}
        <div className="flex items-center gap-2.5 bg-white/70 border border-[#DDDDE5] px-3.5 py-2 rounded-[10px] shadow-2xs">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FAF8F3] border border-[#D79A24]/40 text-[#D79A24]">
            <Flame className="w-3.5 h-3.5 fill-[#D79A24]" />
          </div>
          <div className="text-left">
            <div className="text-[9.5px] font-bold text-[#60708F] uppercase tracking-wider leading-none">
              Sequência
            </div>
            <div className="text-xs font-bold text-[#07132E] mt-0.5">
              {streakWeeks} {streakWeeks === 1 ? "sem" : "sems"}
              {streakDays ? ` • ${streakDays}d` : ""}
            </div>
          </div>
        </div>

        {/* Frase institucional discreta com linha lateral dourada */}
        <div className="hidden md:flex flex-col text-right pl-3.5 border-l-2 border-[#D79A24]">
          <span className="text-[10px] font-bold tracking-[0.22em] text-[#07132E] uppercase font-sans">
            {FRASE_INSTITUCIONAL.tagline}
          </span>
          <span className="text-[8.5px] font-semibold tracking-[0.18em] text-[#D79A24] uppercase font-sans mt-0.5">
            {FRASE_INSTITUCIONAL.subtag}
          </span>
        </div>
      </div>
    </div>
  );
}
