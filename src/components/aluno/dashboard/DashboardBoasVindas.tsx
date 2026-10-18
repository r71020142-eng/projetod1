"use client";

import React, { useMemo } from "react";
import { Calendar } from "lucide-react";

interface DashboardBoasVindasProps {
  nomeAluno: string;
  totalAcoesHoje: number;
  streakWeeks: number;
  streakDays?: number;
}

export function DashboardBoasVindas({
  nomeAluno,
  totalAcoesHoje,
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-[#E5E2DA]/80">
      <div>
        {/* Data em uppercase com tracking aumentado e ícone de calendário */}
        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#60708F] uppercase tracking-[0.2em] font-sans mb-1">
          <Calendar className="w-3.5 h-3.5 text-[#60708F]" />
          <span>{dataFormatada}</span>
        </div>

        {/* Título editorial em Playfair serif */}
        <h1 className="text-3xl sm:text-[34px] font-serif font-bold tracking-tight text-[#07132E] leading-tight">
          {saudacao},{" "}
          <span className="text-[#5B2FE8]">{nomeAluno}</span>
        </h1>

        {/* Frase personalizada curta */}
        <p className="text-xs sm:text-sm text-[#60708F] font-sans font-normal mt-1">
          {frasePersonalizada}
        </p>
      </div>

      {/* Canto direito: Frase institucional discreta com linha lateral dourada */}
      <div className="hidden md:flex flex-col text-right pl-3.5 border-l-2 border-[#D79A24] self-center">
        <span className="text-[9.5px] font-bold tracking-[0.22em] text-[#60708F] uppercase font-sans leading-tight">
          A LÍNGUA
        </span>
        <span className="text-[9.5px] font-bold tracking-[0.22em] text-[#60708F] uppercase font-sans leading-tight">
          CONECTA
        </span>
        <span className="text-[9.5px] font-bold tracking-[0.22em] text-[#60708F] uppercase font-sans leading-tight">
          VOCÊ
        </span>
        <span className="text-[9.5px] font-bold tracking-[0.22em] text-[#60708F] uppercase font-sans leading-tight">
          AO MUNDO
        </span>
      </div>
    </div>
  );
}
