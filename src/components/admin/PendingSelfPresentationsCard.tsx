"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { SelfPresentation, SelfPresentationsMetricasAdmin } from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import { StatusSelfPresentationBadge } from "@/components/common/SelfPresentationBadges";

interface PendingSelfPresentationsCardProps {
  initialItems?: SelfPresentation[];
  initialMetricas?: SelfPresentationsMetricasAdmin;
}

export function PendingSelfPresentationsCard({
  initialItems,
  initialMetricas,
}: PendingSelfPresentationsCardProps) {
  const [items, setItems] = useState<SelfPresentation[]>(initialItems || []);
  const [metricas, setMetricas] = useState<SelfPresentationsMetricasAdmin>(
    initialMetricas || {
      aguardando: 0,
      emAvaliacao: 0,
      reenviosPendentes: 0,
      avaliadas: 0,
      tempoMedioHorasTexto: "—",
    }
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [spList, spMetricas] = await Promise.all([
          selfPresentationRepository.listar({ ordenacao: "antigas_primeiro" }),
          selfPresentationRepository.contadoresDashboard(),
        ]);
        // Filtra as pendentes (aguardando, em_avaliacao ou reenvio)
        const pendentes = spList.filter(
          (sp) =>
            sp.status === "enviada" ||
            sp.status === "em_avaliacao" ||
            sp.status === "reenvio_solicitado"
        );
        setItems(pendentes.slice(0, 4));
        setMetricas(spMetricas);
      } catch (err) {
        console.error("Erro ao carregar fila de self presentations:", err);
      }
    }

    loadData();

    const handleStorageUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (!custom.detail || custom.detail.entity === "self_presentations") {
        loadData();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
    };
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Video className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Self Presentations na Fila
              </h3>
              <p className="text-[11px] text-slate-400">
                Avaliação qualitativa e diagnósticos orais do Método Paulo
              </p>
            </div>
          </div>
          <Link
            href="/admin/self-presentation"
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
          >
            <span>Ver fila ({metricas.aguardando + metricas.emAvaliacao})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Aguardando
            </span>
            <span className="text-xl font-black text-amber-900">{metricas.aguardando}</span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/60">
            <span className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
              Em Avaliação
            </span>
            <span className="text-xl font-black text-indigo-900">{metricas.emAvaliacao}</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/60">
            <span className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider">
              Reenvios
            </span>
            <span className="text-xl font-black text-purple-900">
              {metricas.reenviosPendentes}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Tempo Médio
            </span>
            <span className="text-xl font-black text-slate-800">
              {metricas.tempoMedioHorasTexto}
            </span>
          </div>
        </div>

        {/* Pending Items List */}
        {items.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 text-slate-500">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-700">Fila zerada!</p>
            <p className="text-[11px] text-slate-400">Todas as apresentações foram avaliadas.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/admin/self-presentation/${item.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.alunoNome}
                    </p>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/50">
                      v{item.versao}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.tipo === "nivelamento_inicial" ? "Nivelamento Inicial" : "Reavaliação"} •{" "}
                    {item.professorAvaliadorNome ? `Prof. ${item.professorAvaliadorNome}` : "Sem professor"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusSelfPresentationBadge status={item.status} />
                  <span className="text-[10px] text-slate-400">
                    {item.dataEnvio
                      ? new Date(item.dataEnvio).toLocaleDateString("pt-BR")
                      : "Recente"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1 text-purple-700 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          Rubricas Pedagógicas MTD (6 Critérios)
        </span>
        <Link
          href="/admin/self-presentation"
          className="font-bold text-purple-700 hover:underline flex items-center gap-1"
        >
          <span>Abrir Fila de Avaliação</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
