"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MetricasComunidadeAdmin } from "@/types";
import { comunidadeRepository } from "@/data/api";
import { MessageSquare, AlertTriangle, Globe, Pin, ArrowRight } from "lucide-react";

export function AdminComunidadeCard() {
  const [metricas, setMetricas] = useState<MetricasComunidadeAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const m = await comunidadeRepository.obterMetricasAdmin();
        setMetricas(m);
      } catch (err) {
        console.error("Erro ao carregar métricas da comunidade:", err);
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
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Comunidade MTD</h3>
            <p className="text-[11px] text-slate-500">Engajamento e moderação ativa</p>
          </div>
        </div>

        <Link
          href="/admin/comunidade"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
        >
          <span>Acessar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Carregando métricas...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-500" />
              Espaços Ativos
            </span>
            <span className="text-lg font-bold text-slate-900">
              {metricas?.totalEspacosAtivos || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-indigo-500" />
              Publicações
            </span>
            <span className="text-lg font-bold text-slate-900">
              {metricas?.totalPublicacoes || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Pin className="w-3 h-3 text-amber-500" />
              Fixadas
            </span>
            <span className="text-lg font-bold text-slate-900">
              {metricas?.publicacoesFixadas || 0}
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border space-y-0.5 ${
              (metricas?.denunciasPendentes || 0) > 0
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-slate-50 border-slate-100 text-slate-500"
            }`}
          >
            <span className="text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Denúncias Pendentes
            </span>
            <span className="text-lg font-bold text-rose-700">
              {metricas?.denunciasPendentes || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
