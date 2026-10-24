"use client";

import React from "react";
import Link from "next/link";
import { Users, GraduationCap, BookOpen, TrendingUp, ArrowUpRight } from "lucide-react";
import { AdminMetric } from "@/types";

interface AdminKpiGridProps {
  metricas: AdminMetric[];
  totalTurmas?: number;
}

export function AdminKpiGrid({ metricas, totalTurmas }: AdminKpiGridProps) {
  // Extrai com segurança as métricas
  const mAlunos = metricas.find((m) => m.tipo === "alunos");
  const mProfessores = metricas.find((m) => m.tipo === "professores");
  const mAulas = metricas.find((m) => m.tipo === "aulas");
  const mFrequencia = metricas.find((m) => m.tipo === "conclusao");

  const kpis = [
    {
      id: "alunos",
      label: "Alunos ativos",
      valor: mAlunos?.valor ?? "0",
      variacao: mAlunos?.variacao ?? "+0%",
      comparativo: "em relação ao mês anterior",
      icone: Users,
      corIcone: "text-[#5B4DFC] bg-[#F0EEFF] border-[#5B4DFC]/20",
      href: "/admin/alunos",
    },
    {
      id: "professores",
      label: "Professores ativos",
      valor: mProfessores?.valor ?? "0",
      variacao: mProfessores?.variacao ?? "+0%",
      comparativo: "corpo docente regular",
      icone: GraduationCap,
      corIcone: "text-blue-600 bg-blue-50 border-blue-200",
      href: "/admin/professores",
    },
    {
      id: "turmas",
      label: totalTurmas !== undefined ? "Turmas ativas" : (mAulas?.label || "Aulas agendadas"),
      valor: totalTurmas !== undefined ? `${totalTurmas} ${totalTurmas === 1 ? "turma" : "turmas"}` : (mAulas?.valor ?? "0"),
      variacao: mAulas?.variacao ?? "+0%",
      comparativo: "turmas e agendamentos",
      icone: BookOpen,
      corIcone: "text-indigo-600 bg-indigo-50 border-indigo-200",
      href: "/admin/turmas",
    },
    {
      id: "frequencia",
      label: mFrequencia?.label || "Frequência média",
      valor: mFrequencia?.valor ?? "Sem dados suficientes",
      variacao: mFrequencia?.variacao ?? "+0%",
      comparativo: "frequência auditada",
      icone: TrendingUp,
      corIcone: "text-emerald-600 bg-emerald-50 border-emerald-200",
      href: "/admin/agenda",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icone;

        return (
          <Link
            key={kpi.id}
            href={kpi.href}
            className="group flex flex-col justify-between h-full bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-[#5B4DFC]/40 hover:shadow-md transition-all relative"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${kpi.corIcone}`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-slate-400 group-hover:text-[#5B4DFC] transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {kpi.label}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                {kpi.valor}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1 truncate">
                <span className="text-emerald-600 font-bold">{kpi.variacao}</span>
                <span className="truncate">{kpi.comparativo}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
