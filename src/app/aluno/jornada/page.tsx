"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  PlaySquare,
  BarChart3,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { ProgressoJornadaAluno, Aluno, AlunoDashboardData } from "@/types";
import { alunoRepository, getAlunoDashboardData } from "@/data/api";
import { ProgressoJornadaCard } from "@/components/aluno/ProgressoJornadaCard";
import { MinhaSemanaCard } from "@/components/aluno/dashboard/MinhaSemanaCard";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoJornadaPage() {
  const [progressoJornada, setProgressoJornada] = useState<ProgressoJornadaAluno | undefined>();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [dashData, setDashData] = useState<AlunoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = React.useCallback(async (mounted = true) => {
    setLoading(true);
    setError(null);
    try {
      const [alunoData, dashData] = await Promise.all([
        alunoRepository.obterPorId(DEMO_ALUNO_ID),
        getAlunoDashboardData(),
      ]);
      if (!mounted) return;
      setAluno(alunoData || null);
      setDashData(dashData);
      setProgressoJornada(dashData.progressoJornada);
    } catch (err: unknown) {
      if (mounted) {
        console.error("Erro ao carregar dados da jornada:", err);
        setError((err as Error)?.message || "Não foi possível carregar o progresso da jornada.");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    carregar(isMounted);

    const handleStorage = () => {
      if (isMounted) carregar(isMounted);
    };
    window.addEventListener("mtd_storage_updated", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorage);
    };
  }, [carregar]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8 max-w-5xl">
        <div className="h-8 bg-slate-200 rounded w-64"></div>
        <div className="h-48 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
          Minha Jornada de Fluência
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Acompanhamento estruturado do Método Paulo • {aluno ? aluno.nomeCompleto : "Mariana Silva"}
        </p>
      </div>

      {/* Alerta de Erro com Retry */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => carregar()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Card Principal da Jornada do Método Paulo */}
      <ProgressoJornadaCard progresso={progressoJornada} />

      {/* Dedicação Semanal e Gráfico de Estudos */}
      {dashData && (
        <MinhaSemanaCard
          tempoEstudoTexto={dashData.aluno.studyHoursThisWeek}
          atividadesConcluidasCount={dashData.aluno.completedActivitiesCount}
          dias={dashData.evolucaoSemanal}
        />
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          href="/aluno/avaliacoes"
          className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-card-hover transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
              Avaliações & Checkpoints
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consulte seus testes de módulo, prazos e notas proporcionais calculadas pelo sistema.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 group-hover:translate-x-0.5 transition-transform">
            <span>Acessar Avaliações</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        <Link
          href="/aluno/self-presentation"
          className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-card-hover transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Video className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
              Self Presentation
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              O rito central de fluência oral do Método Paulo, avaliado manualmente pelo seu professor.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            <span>Ver Apresentação</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        <Link
          href="/aluno/aulas"
          className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-card-hover transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <PlaySquare className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Minhas Aulas & Agenda
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consulte seu calendário semanal, links manuais seguros do Zoom e seu índice de presença.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
            <span>Ver Aulas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
