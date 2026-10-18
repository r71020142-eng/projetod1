import React from "react";
import { getAlunoDashboardData, gamificacaoRepository } from "@/data/api";
import { DashboardBoasVindas } from "@/components/aluno/dashboard/DashboardBoasVindas";
import { ProximaAulaCard } from "@/components/aluno/dashboard/ProximaAulaCard";
import { MeuPlanoHojeCard } from "@/components/aluno/dashboard/MeuPlanoHojeCard";
import { ResumoRapidoGrid } from "@/components/aluno/dashboard/ResumoRapidoGrid";
import { JornadaCompactCard } from "@/components/aluno/dashboard/JornadaCompactCard";
import { AtualizacoesRecentesGrid } from "@/components/aluno/dashboard/AtualizacoesRecentesGrid";
import { MinhaSemanaCard } from "@/components/aluno/dashboard/MinhaSemanaCard";
import { calcularPlanoDiario, ContextoPlanoDiario } from "@/data/planoDiarioMotor";

export default async function AlunoDashboardPage() {
  const data = await getAlunoDashboardData();

  const [pontosData, conquistasAluno] = await Promise.all([
    gamificacaoRepository
      .obterPontosAluno("alu-001")
      .catch(() => ({ pontosTotais: 350, historicoEventos: [] })),
    gamificacaoRepository.listarConquistasAluno("alu-001").catch(() => []),
  ]);

  const conquistaDestaque = conquistasAluno[0]
    ? {
        id: conquistasAluno[0].id,
        nome: conquistasAluno[0].modeloNome,
        descricao:
          conquistasAluno[0].justificativaDocente ||
          "Alcançou o marco pedagógico de proficiência e dedicação no Método Paulo.",
        dataTexto: new Date(conquistasAluno[0].dataConcessao || Date.now()).toLocaleDateString(
          "pt-BR"
        ),
        pontos: Number(conquistasAluno[0].pontosAtribuidos) || 50,
        tipoPremio: conquistasAluno[0].tipoPremio || "badge",
      }
    : null;

  // Monta contexto para o motor determinístico do plano diário (máximo 3 ações)
  const contextoPlano: ContextoPlanoDiario = {
    alunoId: "alu-001",
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
    feedbackRecente:
      data.selfPresentationAtiva && data.selfPresentationAtiva.status === "avaliada"
        ? {
            id: data.selfPresentationAtiva.id,
            tipo: "self_presentation",
            titulo: "Nivelamento oral concluído",
            professorNome:
              data.selfPresentationAtiva.avaliacao?.professorNome || "Prof. Lucas Ferreira",
            linkDestino: `/aluno/self-presentation/${data.selfPresentationAtiva.id}`,
          }
        : null,
    conquistaRecente: conquistaDestaque
      ? {
          id: conquistaDestaque.id,
          nome: conquistaDestaque.nome,
          pontos: conquistaDestaque.pontos,
          linkDestino: "/aluno/conquistas",
        }
      : null,
  };

  const acoesPlano = calcularPlanoDiario(contextoPlano);

  return (
    <div className="max-w-[1360px] mx-auto animate-in fade-in duration-200">
      {/* 4 Seções Principais da Primeira Dobra */}
      <div className="space-y-4">
        {/* 1. Primeira Seção: Boas-vindas compacta e institucional */}
        <DashboardBoasVindas
          nomeAluno={data.aluno.name}
          totalAcoesHoje={acoesPlano.length}
          streakWeeks={data.aluno.streakWeeks}
          streakDays={data.flashcardsResumo?.sequenciaDias}
        />

        {/* 2. Segunda Seção: Próxima Aula (~62%) e Meu Plano de Hoje (~38%) */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="w-full lg:w-[62%] h-full">
            <ProximaAulaCard aula={data.proximaAula} />
          </div>
          <div className="w-full lg:w-[38%] h-full">
            <MeuPlanoHojeCard acoes={acoesPlano} />
          </div>
        </div>

        {/* 3. Terceira Seção: Faixa Única de Indicadores (4 colunas com divisores) */}
        <ResumoRapidoGrid
          percentualModulo={
            data.progressoJornada?.percentualConclusaoModulo ?? data.aluno.journeyProgress
          }
          nomeModulo={data.progressoJornada?.moduloAtualNome ?? data.aluno.currentModule}
          totalAtividadesPendentes={data.atividadesPendentes.filter((a) => !a.concluida).length}
          totalFlashcardsParaRevisar={data.flashcardsResumo?.totalParaRevisarHoje ?? 0}
          pontosTotais={pontosData.pontosTotais || 350}
          streakWeeks={data.aluno.streakWeeks}
        />

        {/* 4. Quarta Seção: Faixa Horizontal Compacta Jornada MTD */}
        <JornadaCompactCard progresso={data.progressoJornada} />
      </div>

      {/* 5. Painel Complementar: Atualizações Recentes & Dedicação Semanal (Preservados) */}
      <div className="pt-8 mt-28 border-t border-[#DDDDE5]/60 space-y-4 pb-12">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#60708F] uppercase tracking-[0.2em] font-sans">
            Histórico Pedagógico e Evolução
          </span>
          <span className="text-[11px] text-[#60708F]">
            Registro contínuo do Método Paulo
          </span>
        </div>

        <AtualizacoesRecentesGrid
          selfPresentation={data.selfPresentationAtiva}
          conquistas={data.conquistasRecentes}
          conquistaConcedidaDestaque={conquistaDestaque}
        />

        <MinhaSemanaCard
          tempoEstudoTexto={data.aluno.studyHoursThisWeek}
          atividadesConcluidasCount={data.aluno.completedActivitiesCount}
          dias={data.evolucaoSemanal}
        />
      </div>
    </div>
  );
}
