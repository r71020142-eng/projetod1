"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, CheckSquare, Layers, Award, ArrowUpRight } from "lucide-react";

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
  const cards = [
    {
      id: "modulo",
      valor: `${percentualModulo}%`,
      label: "Progresso do módulo",
      descricao: nomeModulo || "Módulo em andamento",
      icone: TrendingUp,
      corIcone: "text-[#5B4DFC] bg-[#F0EEFF] border-[#5B4DFC]/20",
      href: "/aluno/jornada",
      detalhe: "Ver critérios",
    },
    {
      id: "atividades",
      valor: String(totalAtividadesPendentes),
      label: "Atividades pendentes",
      descricao:
        totalAtividadesPendentes === 1
          ? "1 entrega a realizar"
          : `${totalAtividadesPendentes} entregas a realizar`,
      icone: CheckSquare,
      corIcone: "text-amber-600 bg-amber-50 border-amber-200",
      href: "/aluno/atividades",
      detalhe: "Ver lista",
    },
    {
      id: "flashcards",
      valor: String(totalFlashcardsParaRevisar),
      label: "Flashcards para hoje",
      descricao:
        totalFlashcardsParaRevisar > 0
          ? "Revisão SRS disponível"
          : "Tudo revisado hoje",
      icone: Layers,
      corIcone: "text-indigo-600 bg-indigo-50 border-indigo-200",
      href: "/aluno/flashcards",
      detalhe: "Praticar",
    },
    {
      id: "dedicacao",
      valor: `${pontosTotais} pts`,
      label: "Dedicação e pontos",
      descricao: `${streakWeeks} ${streakWeeks === 1 ? "semana" : "semanas"} de sequência`,
      icone: Award,
      corIcone: "text-emerald-600 bg-emerald-50 border-emerald-200",
      href: "/aluno/conquistas",
      detalhe: "Conquistas",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icone;

        return (
          <Link
            key={card.id}
            href={card.href}
            className="group flex flex-col justify-between h-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-[#5B4DFC]/40 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${card.corIcone}`}
              >
                <Icon className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-slate-400 group-hover:text-[#5B4DFC] transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {card.valor}
              </div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">
                {card.label}
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {card.descricao}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
