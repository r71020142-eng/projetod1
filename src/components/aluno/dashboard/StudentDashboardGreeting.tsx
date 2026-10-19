"use client";

import React, { useMemo } from "react";
import { Calendar } from "lucide-react";

interface StudentDashboardGreetingProps {
  nomeAluno: string;
  totalAcoesHoje: number;
}

export function StudentDashboardGreeting({
  nomeAluno,
  totalAcoesHoje,
}: StudentDashboardGreetingProps) {
  const { saudacao, dataFormatada, primeiroNome, subtitulo } = useMemo(() => {
    const agora = new Date();
    const hora = agora.getHours();

    let s = "Bom dia";
    if (hora >= 12 && hora < 18) {
      s = "Boa tarde";
    } else if (hora >= 18 || hora < 5) {
      s = "Boa noite";
    }

    const dataFmt = agora.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const pNome = nomeAluno ? nomeAluno.split(" ")[0] : "Aluno";

    let sub = "";
    if (totalAcoesHoje === 0) {
      sub = "Tudo concluído por hoje! Você está em dia com seu plano de estudos.";
    } else if (totalAcoesHoje === 1) {
      sub = "Você tem 1 ação para avançar hoje.";
    } else {
      sub = `Você tem ${totalAcoesHoje} ações para avançar hoje.`;
    }

    return {
      saudacao: s,
      dataFormatada: dataFmt,
      primeiroNome: pNome,
      subtitulo: sub,
    };
  }, [nomeAluno, totalAcoesHoje]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-serif font-bold tracking-tight text-[#07132E] leading-tight">
          {saudacao}, <span className="text-[#5B2FE8]">{primeiroNome}</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#60708F] font-sans font-normal mt-0.5">
          {subtitulo}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#60708F] font-sans">
        <Calendar className="w-3.5 h-3.5 text-[#60708F]/80" aria-hidden="true" />
        <span className="capitalize">{dataFormatada}</span>
      </div>
    </div>
  );
}
