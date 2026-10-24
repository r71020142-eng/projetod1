import React from "react";
import { getAlunoDashboardData, gamificacaoRepository } from "@/data/api";
import { StudentDashboardGreeting } from "@/components/aluno/dashboard/StudentDashboardGreeting";
import { CompactNextClassCard } from "@/components/aluno/dashboard/CompactNextClassCard";
import { TodayPlanCard } from "@/components/aluno/dashboard/TodayPlanCard";
import { MobileNextActionCard } from "@/components/aluno/dashboard/MobileNextActionCard";
import { CompactProgressCard } from "@/components/aluno/dashboard/CompactProgressCard";
import {
  DashboardContextNotification,
  ContextNotificationData,
} from "@/components/aluno/dashboard/DashboardContextNotification";
import { calcularPlanoDiario, ContextoPlanoDiario } from "@/data/planoDiarioMotor";
import { getServerIdentity } from "@/lib/auth/session";

export default async function AlunoDashboardPage() {
  const identity = await getServerIdentity("aluno");
  const targetAlunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || "alu-001");

  const [data, conquistasAluno] = await Promise.all([
    getAlunoDashboardData(targetAlunoId),
    gamificacaoRepository
      .listarConquistasAluno(targetAlunoId)
      .catch(() => []),
  ]);

  const conquistaDestaque = conquistasAluno[0];

  // Self presentation pendente (apenas se realmente pendente de envio ou reenvio)
  const selfPendente =
    data.selfPresentationAtiva &&
    (data.selfPresentationAtiva.status === "rascunho" ||
      data.selfPresentationAtiva.status === "reenvio_solicitado")
      ? {
          id: data.selfPresentationAtiva.id,
          titulo: "Gravar Self Presentation",
          reenvioSolicitado: data.selfPresentationAtiva.status === "reenvio_solicitado",
          linkDestino: "/aluno/self-presentation",
        }
      : null;

  // Notificação contextual compacta (no máximo 1, priorizando a mais recente)
  let notificacaoContextual: ContextNotificationData | null = null;
  if (data.selfPresentationAtiva && data.selfPresentationAtiva.status === "avaliada") {
    notificacaoContextual = {
      tipo: "parecer",
      titulo: "Seu parecer de nivelamento está disponível",
      linkDestino: `/aluno/self-presentation/${data.selfPresentationAtiva.id}`,
      ctaTexto: "Ver parecer",
    };
  } else if (conquistaDestaque) {
    notificacaoContextual = {
      tipo: "conquista",
      titulo: `Nova conquista desbloqueada: ${conquistaDestaque.modeloNome}`,
      linkDestino: "/aluno/conquistas",
      ctaTexto: "Ver conquista",
    };
  }

  // Monta contexto para o motor determinístico do plano diário (máximo 3 ações reais pendentes)
  const contextoPlano: ContextoPlanoDiario = {
    alunoId: targetAlunoId,
    proximaAula: data.proximaAula
      ? {
          id: data.proximaAula.id,
          titulo: data.proximaAula.titulo,
          data: "2026-10-22",
          horario: data.proximaAula.horario,
          meetingUrl: data.proximaAula.meetingUrl,
          turmaNome: data.proximaAula.modulo,
        }
      : null,
    atividades: data.atividadesPendentes.map((atv) => ({
      id: atv.id,
      titulo: atv.titulo,
      prazoEntrega: atv.duracaoTexto.includes("Prazo:")
        ? atv.duracaoTexto.replace("Prazo: ", "").split("/").reverse().join("-")
        : null,
      concluida: atv.concluida,
      atrasada: false,
    })),
    avaliacoesPendentes: data.progressoJornada?.proximaAvaliacaoPendente
      ? [
          {
            id: data.progressoJornada.proximaAvaliacaoPendente.id,
            titulo: data.progressoJornada.proximaAvaliacaoPendente.titulo,
            tipo: data.progressoJornada.proximaAvaliacaoPendente.tipo,
            prazo: data.progressoJornada.proximaAvaliacaoPendente.prazo,
          },
        ]
      : [],
    selfPresentationPendente: selfPendente,
    flashcards: data.flashcardsResumo
      ? {
          revisoesHoje: data.flashcardsResumo.totalParaRevisarHoje,
          sequenciaDias: data.flashcardsResumo.sequenciaDias,
        }
      : null,
    praticaDiaria: data.praticaDeHoje
      ? {
          id: data.praticaDeHoje.id,
          titulo: data.praticaDeHoje.titulo,
          duracaoMinutos: 5,
        }
      : null,
  };

  const acoesPlano = calcularPlanoDiario(contextoPlano);

  // Calcula total de pendências reais
  const totalPendencias =
    (data.progressoJornada?.criteriosPendentesDescricoes?.length ?? 0) ||
    acoesPlano.length;

  return (
    <div className="w-full max-w-[1360px] mx-auto min-w-0 animate-in fade-in duration-200 space-y-4 sm:space-y-5">
      {/* 1. Notificação Contextual Compacta (se houver) */}
      {notificacaoContextual && (
        <DashboardContextNotification notificacao={notificacaoContextual} />
      )}

      {/* 2. Saudação Compacta */}
      <StudentDashboardGreeting
        nomeAluno={identity ? identity.nomeCompleto : data.aluno.name}
        totalAcoesHoje={acoesPlano.length}
      />

      {/* 3. Linha Principal: Próxima Aula (~65%) e Para Hoje (~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        <div className="lg:col-span-8">
          <CompactNextClassCard aula={data.proximaAula} />
        </div>

        {/* Desktop: card completo "Para hoje" com até 3 ações */}
        <div className="hidden lg:block lg:col-span-4">
          <TodayPlanCard acoes={acoesPlano} />
        </div>

        {/* Mobile: card compacto "Seu próximo passo" */}
        <div className="block lg:hidden">
          <MobileNextActionCard acoes={acoesPlano} />
        </div>
      </div>

      {/* 4. Progresso Compacto: Cartão único com módulo, barra de progresso e CTA */}
      <CompactProgressCard
        nomeModulo={data.progressoJornada?.moduloAtualNome ?? data.aluno.currentModule}
        percentual={
          data.progressoJornada?.percentualConclusaoModulo ?? data.aluno.journeyProgress
        }
        streakWeeks={data.aluno.streakWeeks}
        totalPendencias={totalPendencias}
      />
    </div>
  );
}
