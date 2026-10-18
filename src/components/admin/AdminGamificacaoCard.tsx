"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MetricasGamificacaoAdmin } from "@/types";
import { gamificacaoRepository } from "@/data/api";
import { Trophy, Award, Sparkles, ArrowRight } from "lucide-react";

export function AdminGamificacaoCard() {
  const [metricas, setMetricas] = useState<MetricasGamificacaoAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const m = await gamificacaoRepository.obterMetricasAdmin();
        setMetricas(m);
      } catch (err) {
        console.error("Erro ao carregar métricas de gamificação:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Gamificação & Placas</h3>
            <p className="text-[11px] text-slate-500">Marcos pedagógicos e reconhecimento</p>
          </div>
        </div>

        <Link
          href="/admin/conquistas"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
        >
          <span>Gerenciar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Carregando métricas...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Award className="w-3 h-3 text-purple-600" />
              Conquistas Desbloqueadas
            </span>
            <span className="text-lg font-bold text-slate-900">
              {metricas?.totalConquistasDesbloqueadas || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Pontos Distribuídos
            </span>
            <span className="text-lg font-bold text-slate-900">
              {metricas?.totalPontosDistribuidos || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              Modelos Ativos
            </span>
            <span className="text-lg font-bold text-slate-900">
              {metricas?.totalModelosAtivos || 0}
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-0.5">
            <span className="text-[11px] text-amber-800 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-600" />
              Placas em Produção
            </span>
            <span className="text-lg font-bold text-amber-900">
              {metricas?.placasEmProducao || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
