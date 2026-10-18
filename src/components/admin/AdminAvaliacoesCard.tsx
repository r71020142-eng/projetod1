"use client";

import React from "react";
import Link from "next/link";
import { MetricasAvaliacoesAdmin } from "@/types";
import {
  Award,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface AdminAvaliacoesCardProps {
  metricas?: MetricasAvaliacoesAdmin;
}

export function AdminAvaliacoesCard({ metricas }: AdminAvaliacoesCardProps) {
  if (!metricas) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Avaliações & Progresso do Método Paulo
            </h3>
            <p className="text-xs text-slate-500">
              Desempenho acadêmico, fila de correção e validação de módulos
            </p>
          </div>
        </div>

        <Link
          href="/admin/avaliacoes"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
        >
          <span>Painel de Avaliações</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Avaliações Publicadas */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Publicadas
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {metricas.avaliacoesPublicadas}
            </span>
            <span className="text-xs text-slate-500">testes ativos</span>
          </div>
        </div>

        {/* Aguardando Correção Humana */}
        <div
          className={`p-3.5 rounded-xl border ${
            metricas.tentativasAguardandoCorrecao > 0
              ? "bg-amber-50/70 border-amber-200 text-amber-950"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Fila de Correção
            </span>
            {metricas.tentativasAguardandoCorrecao > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                metricas.tentativasAguardandoCorrecao > 0
                  ? "text-amber-800"
                  : "text-slate-800"
              }`}
            >
              {metricas.tentativasAguardandoCorrecao}
            </span>
            <span className="text-xs text-slate-500">práticas pendentes</span>
          </div>
        </div>

        {/* Alunos Aguardando Validação */}
        <div
          className={`p-3.5 rounded-xl border ${
            metricas.alunosAguardandoValidacao > 0
              ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Validação de Módulo
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                metricas.alunosAguardandoValidacao > 0
                  ? "text-indigo-800"
                  : "text-slate-800"
              }`}
            >
              {metricas.alunosAguardandoValidacao}
            </span>
            <span className="text-xs text-slate-500">alunos aptos</span>
          </div>
        </div>

        {/* Média das Objetivas */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Média Objetivas
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {metricas.mediaAvaliacoesObjetivas !== null
                ? metricas.mediaAvaliacoesObjetivas.toFixed(1)
                : "—"}
            </span>
            <span className="text-xs text-slate-500">/ 10.0</span>
          </div>
        </div>
      </div>

      {metricas.totalAlunosPrecisandoReforco > 0 && (
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Atenção pedagógica:</strong> {metricas.totalAlunosPrecisandoReforco} tentativa(s) indicaram necessidade de reforço ou refação.
            </span>
          </div>
          <Link
            href="/admin/avaliacoes"
            className="text-amber-800 font-semibold hover:underline shrink-0 text-xs"
          >
            Ver fila
          </Link>
        </div>
      )}
    </div>
  );
}
