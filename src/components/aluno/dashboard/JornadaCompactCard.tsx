"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Target,
} from "lucide-react";
import { ProgressoJornadaAluno } from "@/types";

interface JornadaCompactCardProps {
  progresso?: ProgressoJornadaAluno | null;
}

export function JornadaCompactCard({ progresso }: JornadaCompactCardProps) {
  if (!progresso) {
    return null;
  }

  const percentual = Math.round(progresso.percentualConclusaoModulo || 0);
  const cumpridosLimitados = (progresso.criteriosCumpridosDescricoes || []).slice(0, 2);
  const proximoPendente = (progresso.criteriosPendentesDescricoes || [])[0] || null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Esquerda: Informações do Módulo e Progresso */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0EEFF] text-[#5B4DFC]">
              <Compass className="w-3.5 h-3.5 text-[#5B4DFC]" />
              {progresso.programaNome || "Programa de Fluência MTD"}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {progresso.etapaAtualNome}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {progresso.moduloAtualNome}
          </h2>

          {/* Barra de Progresso Compacta */}
          <div className="mt-3.5 max-w-xl">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-600 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#5B4DFC]" />
                Progresso em direção à validação docente
              </span>
              <span className="text-[#5B4DFC] font-extrabold">{percentual}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-[#5B4DFC] to-[#7C71FF] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(percentual, 5)}%` }}
              />
            </div>
          </div>

          {/* Critérios: Até 2 concluídos + 1 próximo pendente */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Cumpridos recentes */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Critérios cumpridos ({progresso.criteriosCumpridos} de {progresso.totalCriteriosAplicaveis})
              </div>
              {cumpridosLimitados.length > 0 ? (
                cumpridosLimitados.map((desc, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-slate-700 bg-emerald-50/60 border border-emerald-100 px-2.5 py-1.5 rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span className="line-clamp-1 font-medium">{desc}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-500 italic py-1">
                  Iniciando os critérios do módulo
                </div>
              )}
            </div>

            {/* Próximo Pendente */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Próximo marco pendente
              </div>
              {proximoPendente ? (
                <div className="flex items-start gap-2 text-slate-800 bg-amber-50/70 border border-amber-200 px-2.5 py-1.5 rounded-xl">
                  <Target className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <span className="font-semibold line-clamp-1">{proximoPendente}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <span className="font-semibold line-clamp-1">
                    Todos os critérios cumpridos! Aguardando validação do professor.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direita: Ações de Navegação */}
        <div className="flex flex-row lg:flex-col items-center justify-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <Link
            href="/aluno/jornada"
            className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-3 rounded-2xl bg-[#5B4DFC] hover:bg-[#4a3ecc] text-white text-xs font-bold transition-all shadow-xs shadow-[#5B4DFC]/20 hover:shadow-md"
          >
            <span>Continuar minha jornada</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/aluno/jornada"
            className="inline-flex items-center justify-center w-full sm:w-auto gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
          >
            <span>Ver progresso completo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
