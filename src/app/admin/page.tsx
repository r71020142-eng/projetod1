import React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { getAdminDashboardData } from "@/data/api";
import { AdminMetricCards } from "@/components/admin/AdminMetricCards";
import { PedagogicalIndicatorsCard } from "@/components/admin/PedagogicalIndicatorsCard";
import { StudentGrowthChart } from "@/components/admin/StudentGrowthChart";
import { UpcomingClassesCard } from "@/components/admin/UpcomingClassesCard";
import { AttentionStudentsTable } from "@/components/admin/AttentionStudentsTable";
import { PendingSelfPresentationsCard } from "@/components/admin/PendingSelfPresentationsCard";
import { FlashcardsAdminCard } from "@/components/admin/FlashcardsAdminCard";
import { AdminAvaliacoesCard } from "@/components/admin/AdminAvaliacoesCard";
import { AdminComunidadeCard } from "@/components/admin/AdminComunidadeCard";
import { AdminGamificacaoCard } from "@/components/admin/AdminGamificacaoCard";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Title, Subtitle, and Date Selector matching Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Painel administrativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Acompanhe a escola e a aplicação do Método Paulo.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>{data.mesReferencia}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Row 1: 4 Metric Cards matching Image 2 */}
      <AdminMetricCards metricas={data.metricas} />

      {/* Pedagogical Indicators (Etapa 4) */}
      <PedagogicalIndicatorsCard initialData={data.indicadoresPedagogicos} />

      {/* Row 2: Growth Chart & Upcoming Classes matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <StudentGrowthChart pontos={data.evolucaoAlunos} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingClassesCard aulas={data.proximasAulas} />
        </div>
      </div>

      {/* Row 3: Self Presentations Queue (Etapa 5) */}
      <PendingSelfPresentationsCard initialMetricas={data.selfPresentationsMetricas} />

      {/* Row 4: Flashcards & Repetição Espaçada (Etapa 6) */}
      <FlashcardsAdminCard metricas={data.flashcardsMetricas} />

      {/* Row 5: Avaliações & Progresso do Método Paulo (Etapa 7) */}
      <AdminAvaliacoesCard metricas={data.metricasAvaliacoes} />

      {/* Row 6: Comunidade & Gamificação/Placas (Etapa 8) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminComunidadeCard />
        <AdminGamificacaoCard />
      </div>

      {/* Row 7: Full Width Attention Students Table matching Image 2 */}
      <div>
        <AttentionStudentsTable alunos={data.alunosAtencao} />
      </div>
    </div>
  );
}
