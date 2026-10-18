"use client";

import React from "react";
import Link from "next/link";
import { ProgressoJornadaAluno } from "@/types";
import { StatusProgressoModuloBadge } from "@/components/admin/AvaliacaoBadges";
import {
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Award,
} from "lucide-react";

interface ProgressoJornadaCardProps {
  progresso?: ProgressoJornadaAluno;
}

export function ProgressoJornadaCard({ progresso }: ProgressoJornadaCardProps) {
  if (!progresso) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 text-slate-400">
          <Compass className="w-5 h-5" />
          <p className="text-sm">Jornada pedagógica em carregamento...</p>
        </div>
      </div>
    );
  }

  const {
    programaNome,
    etapaAtualNome,
    moduloAtualNome,
    statusModuloAtual,
    percentualConclusaoModulo,
    totalCriteriosAplicaveis,
    criteriosCumpridos,
    criteriosCumpridosDescricoes,
    criteriosPendentesDescricoes,
  } = progresso;

  const percentualFormatado =
    totalCriteriosAplicaveis > 0 ? percentualConclusaoModulo.toFixed(0) : 0;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase">
              {programaNome} • {etapaAtualNome}
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {moduloAtualNome}
            </h2>
          </div>
        </div>

        <StatusProgressoModuloBadge status={statusModuloAtual} />
      </div>

      {/* Barra de Progresso Real */}
      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Progresso do Módulo Atual
          </span>
          <span className="font-bold text-indigo-600 text-sm">
            {totalCriteriosAplicaveis > 0
              ? `${percentualFormatado}% concluído`
              : "Sem critérios definidos"}
          </span>
        </div>

        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${percentualConclusaoModulo}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>
            {criteriosCumpridos} de {totalCriteriosAplicaveis} critérios pedagógicos atingidos
          </span>
          {statusModuloAtual === "aguardando_validacao" && (
            <span className="text-amber-700 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Aguardando validação do professor
            </span>
          )}
        </div>
      </div>

      {/* Alerta de Validação */}
      {statusModuloAtual === "aguardando_validacao" && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Award className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Parabéns! Você cumpriu todos os critérios do módulo.</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              Seu professor está revisando sua evolução pedagógica para validar formalmente sua conclusão e liberar o próximo módulo da sua jornada.
            </p>
          </div>
        </div>
      )}

      {/* Critérios cumpridos e pendentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Cumpridos */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Critérios Cumpridos ({criteriosCumpridosDescricoes.length})
          </span>
          {criteriosCumpridosDescricoes.length > 0 ? (
            <ul className="space-y-1">
              {criteriosCumpridosDescricoes.map((desc, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhum critério concluído ainda.</p>
          )}
        </div>

        {/* Pendentes */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Próximos Passos ({criteriosPendentesDescricoes.length})
          </span>
          {criteriosPendentesDescricoes.length > 0 ? (
            <ul className="space-y-1">
              {criteriosPendentesDescricoes.map((desc, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-600"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-600 font-medium">
              Todos os critérios deste módulo foram atingidos!
            </p>
          )}
        </div>
      </div>

      {/* Rodapé / Link rápido */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Avanço baseado em critérios pedagógicos reais do Método Paulo.
        </span>
        <Link
          href="/aluno/avaliacoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          <span>Ver Minhas Avaliações</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
