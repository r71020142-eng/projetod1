import React from "react";
import { getAlunoDashboardData } from "@/data/api";
import { StreakBanner } from "@/components/aluno/StreakBanner";
import { HeroClassCard } from "@/components/aluno/HeroClassCard";
import { PendingActivitiesCard } from "@/components/aluno/PendingActivitiesCard";
import { WeeklyEvolutionCard } from "@/components/aluno/WeeklyEvolutionCard";
import { JourneyRingCard } from "@/components/aluno/JourneyRingCard";
import { TeacherCard } from "@/components/aluno/TeacherCard";
import { MotivationalBanner } from "@/components/aluno/MotivationalBanner";
import { DailyPracticeBanner } from "@/components/aluno/DailyPracticeBanner";
import { SelfPresentationStatusCard } from "@/components/aluno/SelfPresentationStatusCard";
import { FlashcardsSummaryCard } from "@/components/aluno/FlashcardsSummaryCard";
import { ProgressoJornadaCard } from "@/components/aluno/ProgressoJornadaCard";
import { AlunoConquistasSummaryCard } from "@/components/aluno/AlunoConquistasSummaryCard";

export default async function AlunoDashboardPage() {
  const data = await getAlunoDashboardData();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Greeting & Streak Banner matching Image 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Olá, {data.aluno.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Continue avançando no Método Paulo
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <StreakBanner weeks={data.aluno.streakWeeks} />
        </div>
      </div>

      {/* Hero Class Card matching Image 1 */}
      <HeroClassCard aula={data.proximaAula} />

      {/* Jornada Pedagógica do Método Paulo (Etapa 7) */}
      <ProgressoJornadaCard progresso={data.progressoJornada} />

      {/* Daily Practice Stimulus (Etapa 4) */}
      {data.praticaDeHoje && (
        <DailyPracticeBanner pratica={data.praticaDeHoje} />
      )}

      {/* Self Presentation Status Card (Etapa 5) */}
      <SelfPresentationStatusCard
        initialSp={data.selfPresentationAtiva}
        alunoId="alu-001"
      />

      {/* Flashcards & Repetição Espaçada (Etapa 6) */}
      <FlashcardsSummaryCard metricas={data.flashcardsMetricas} />

      {/* Conquistas, Pontos & Placas (Etapa 8) */}
      <AlunoConquistasSummaryCard alunoId="alu-001" />

      {/* Main 3-Column Grid matching Image 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Atividades pendentes */}
        <div className="h-full">
          <PendingActivitiesCard initialAtividades={data.atividadesPendentes} />
        </div>

        {/* Column 2: Evolução semanal */}
        <div className="h-full">
          <WeeklyEvolutionCard
            dias={data.evolucaoSemanal}
            tempoEstudoTexto={data.aluno.studyHoursThisWeek}
            atividadesConcluidasCount={data.aluno.completedActivitiesCount}
          />
        </div>

        {/* Column 3: Stacked: Sua jornada + Seu professor */}
        <div className="space-y-6">
          <JourneyRingCard
            progressPercentage={data.aluno.journeyProgress}
            currentModuleName={data.aluno.currentModule}
          />
          <TeacherCard teacher={data.aluno.teacher} />
        </div>
      </div>

      {/* Bottom Motivational Banner matching Image 1 */}
      <MotivationalBanner />
    </div>
  );
}
