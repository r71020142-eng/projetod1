"use client";

import React, { useState, useEffect } from "react";
import { Users, GraduationCap, Calendar, BarChart2 } from "lucide-react";
import { AdminMetric } from "@/types";
import { cn } from "@/lib/utils";
import { alunoRepository } from "@/data/alunoRepository";
import { professorRepository } from "@/data/professorRepository";
import { aulaRepository } from "@/data/aulaRepository";

interface AdminMetricCardsProps {
  metricas: AdminMetric[];
}

export function AdminMetricCards({ metricas: initialMetricas }: AdminMetricCardsProps) {
  const [metricas, setMetricas] = useState<AdminMetric[]>(initialMetricas);

  useEffect(() => {
    const syncCounts = async () => {
      try {
        const [alunosAtivos, profsAtivos, aulasAgendadas, freqGeral] = await Promise.all([
          alunoRepository.contarAtivos(),
          professorRepository.contarAtivos(),
          aulaRepository.contarAgendadas(),
          aulaRepository.calcularFrequenciaGeral(),
        ]);

        setMetricas((prev) =>
          prev.map((m) => {
            if (m.tipo === "alunos") {
              return { ...m, valor: alunosAtivos.toString() };
            }
            if (m.tipo === "professores") {
              return { ...m, valor: profsAtivos.toString() };
            }
            if (m.tipo === "aulas") {
              return { ...m, valor: aulasAgendadas.toString() };
            }
            if (m.tipo === "conclusao") {
              return {
                ...m,
                valor: freqGeral.porcentagem !== null ? `${freqGeral.porcentagem}%` : "98.2%",
              };
            }
            return m;
          })
        );
      } catch (err) {
        console.warn("Aviso ao sincronizar contadores das métricas:", err);
      }
    };

    syncCounts();

    const handleUpdate = () => {
      syncCounts();
    };

    window.addEventListener("mtd_storage_updated", handleUpdate);
    window.addEventListener("mtd_core_users_updated", handleUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleUpdate);
      window.removeEventListener("mtd_core_users_updated", handleUpdate);
    };
  }, []);

  const getIconAndColors = (tipo: AdminMetric["tipo"]) => {
    switch (tipo) {
      case "alunos":
        return {
          icon: Users,
          bg: "bg-[#F0EEFF]",
          text: "text-[#5B4DFC]",
        };
      case "professores":
        return {
          icon: GraduationCap,
          bg: "bg-[#E6FBF5]",
          text: "text-[#10B981]",
        };
      case "aulas":
        return {
          icon: Calendar,
          bg: "bg-[#FFF0F2]",
          text: "text-[#F43F5E]",
        };
      case "conclusao":
      default:
        return {
          icon: BarChart2,
          bg: "bg-[#ECFDF5]",
          text: "text-[#22C55E]",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metricas.map((m) => {
        const style = getIconAndColors(m.tipo);
        const Icon = style.icon;

        return (
          <div
            key={m.id}
            className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          >
            {/* Icon Bubble matching Image 2 */}
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                style.bg,
                style.text
              )}
            >
              <Icon className="h-6 w-6 stroke-[2]" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">
                {m.label}
              </p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">
                {m.valor}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#16A34A]">
                <span>↑ {m.variacao}</span>
                <span className="text-slate-400 font-normal truncate">
                  {m.comparativo}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
