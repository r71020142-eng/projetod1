import React from "react";
import {
  getAdminDashboardData,
  comunidadeRepository,
  gamificacaoRepository,
  turmaRepository,
  aulaRepository,
} from "@/data/api";
import { AdminDashboardHeader } from "@/components/admin/dashboard/AdminDashboardHeader";
import { AdminKpiGrid } from "@/components/admin/dashboard/AdminKpiGrid";
import { AdminFilaPendenciasCard } from "@/components/admin/dashboard/AdminFilaPendenciasCard";
import { AdminProximasAulasCard } from "@/components/admin/dashboard/AdminProximasAulasCard";
import { EsteiraPedagogicaGrid } from "@/components/admin/dashboard/EsteiraPedagogicaGrid";
import { AdminAlunosAtencaoCard } from "@/components/admin/dashboard/AdminAlunosAtencaoCard";
import { AdminEvolucaoChartCard } from "@/components/admin/dashboard/AdminEvolucaoChartCard";
import { calcularPendenciasAdmin, ContextoPendenciasAdmin } from "@/data/adminPendenciasMotor";
import { getServerIdentity } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const [data, identity] = await Promise.all([
    getAdminDashboardData(),
    getServerIdentity("admin"),
  ]);

  // Busca dados complementares da esteira operacional
  const [denuncias, placas, turmas, proximasAulas] = await Promise.all([
    comunidadeRepository.listarDenuncias().catch(() => []),
    gamificacaoRepository.listarSolicitacoesPlacas().catch(() => []),
    turmaRepository.listar().catch(() => []),
    aulaRepository.listarProximas(8).catch(() => []),
  ]);

  const denunciasPendentesCount = denuncias.filter((d) => d.status === "pendente").length;
  const placasPendentesCount = placas.filter(
    (p) => p.status === "interesse_registrado" || p.status === "solicitada"
  ).length;
  const turmasAtivasCount = turmas.filter((t) => t.status === "ativa").length;

  const aulasProximasSemZoom = proximasAulas
    .filter((a) => !a.meetingUrl && !a.linkZoom)
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      data: a.data,
      horario: a.horario,
      turmaNome: turmas.find((t) => t.id === a.turmaId)?.nome,
    }));

  // Contexto para o motor de pendências da coordenação
  const contextoPendencias: ContextoPendenciasAdmin = {
    denunciasPendentesCount,
    selfPresentationsAguardandoCount: data.selfPresentationsMetricas?.emAvaliacao || 0,
    aulasProximasSemZoom,
    modulosAguardandoValidacaoCount: data.metricasAvaliacoes?.alunosAguardandoValidacao || 0,
    avaliacoesAguardandoCorrecaoCount: data.metricasAvaliacoes?.tentativasAguardandoCorrecao || 0,
    entregasAguardandoCorrecaoCount: data.indicadoresPedagogicos?.entregasAguardando || 0,
    placasAguardandoAnaliseCount: placasPendentesCount || 0,
  };

  const pendenciasPrioritarias = calcularPendenciasAdmin(contextoPendencias);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Primeira Seção: Cabeçalho Executivo */}
      <AdminDashboardHeader
        userName={identity?.nomeCompleto || "Coordenação MTD"}
        totalPendencias={pendenciasPrioritarias.length}
        mesReferencia={data.mesReferencia}
      />

      {/* 2. Segunda Seção: 4 KPIs Operacionais Essenciais */}
      <AdminKpiGrid
        metricas={data.metricas}
        totalTurmas={turmasAtivasCount}
      />

      {/* 3. Terceira Seção: Fila de Ação (7 colunas) e Próximas Aulas (5 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 h-full">
          <AdminFilaPendenciasCard pendencias={pendenciasPrioritarias} />
        </div>
        <div className="lg:col-span-5 h-full">
          <AdminProximasAulasCard aulas={data.proximasAulas} />
        </div>
      </div>

      {/* 4. Quarta Seção: Esteira Pedagógica Integrada (4 Eixos do Método Paulo) */}
      <EsteiraPedagogicaGrid
        selfPresentationsMetricas={data.selfPresentationsMetricas}
        metricasAvaliacoes={data.metricasAvaliacoes}
        flashcardsMetricas={data.flashcardsMetricas}
        denunciasPendentesCount={denunciasPendentesCount}
        placasPendentesCount={placasPendentesCount}
      />

      {/* 5. Quinta Seção: Evolução de Alunos (6 colunas) e Alunos em Acompanhamento (6 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 h-full">
          <AdminEvolucaoChartCard pontos={data.evolucaoAlunos} />
        </div>
        <div className="lg:col-span-6 h-full">
          <AdminAlunosAtencaoCard alunos={data.alunosAtencao} />
        </div>
      </div>
    </div>
  );
}
