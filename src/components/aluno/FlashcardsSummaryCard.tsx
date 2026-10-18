"use client";

import React from "react";
import Link from "next/link";
import { FlashcardsMetricasAluno } from "@/types";
import { Layers, Flame, ArrowRight, Clock } from "lucide-react";

interface FlashcardsSummaryCardProps {
  metricas?: FlashcardsMetricasAluno;
}

export function FlashcardsSummaryCard({ metricas }: FlashcardsSummaryCardProps) {
  const revisoesHoje = metricas?.revisoesHoje ?? 0;
  const sequenciaDias = metricas?.sequenciaDias ?? 0;
  const emAprendizado = metricas?.emAprendizado ?? 0;
  const novos = metricas?.novosDisponiveis ?? 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Flashcards & SRS</h3>
            <p className="text-xs text-gray-500">Repetição espaçada com Método Paulo</p>
          </div>
        </div>

        {sequenciaDias > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{sequenciaDias} dias seguidos</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
          <span className="text-xl font-extrabold text-indigo-700">{revisoesHoje}</span>
          <p className="text-[11px] font-medium text-indigo-900/70 mt-0.5">Para Hoje</p>
        </div>
        <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 text-center">
          <span className="text-xl font-extrabold text-amber-700">{emAprendizado}</span>
          <p className="text-[11px] font-medium text-amber-900/70 mt-0.5">Aprendendo</p>
        </div>
        <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
          <span className="text-xl font-extrabold text-emerald-700">{novos}</span>
          <p className="text-[11px] font-medium text-emerald-900/70 mt-0.5">Novos</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {revisoesHoje > 0
              ? `${revisoesHoje} cartão(ões) aguardando sua revisão`
              : "Revisões em dia!"}
          </span>
        </div>

        <Link
          href="/aluno/flashcards"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>Abrir baralhos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
