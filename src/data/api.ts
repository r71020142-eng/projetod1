import {
  AlunoDashboardData,
  AdminDashboardData,
  AdminProximaAula,
} from "@/types";
import { MOCK_ALUNO_DATA, MOCK_ADMIN_DATA } from "./mockData";
import { alunoRepository } from "./alunoRepository";
import { professorRepository } from "./professorRepository";
import { turmaRepository } from "./turmaRepository";
import { aulaRepository } from "./aulaRepository";
import { materialRepository } from "./materialRepository";
import { atividadeRepository } from "./atividadeRepository";
import { entregaRepository } from "./entregaRepository";
import { conteudoDiarioRepository } from "./conteudoDiarioRepository";
import { selfPresentationRepository } from "./selfPresentationRepository";
import { historicoNivelRepository } from "./historicoNivelRepository";
import * as baralhoRepository from "./baralhoRepository";
import * as cartaoRepository from "./cartaoRepository";
import * as progressoCartaoRepository from "./progressoCartaoRepository";
import * as historicoRevisaoRepository from "./historicoRevisaoRepository";
import * as sessaoEstudoRepository from "./sessaoEstudoRepository";
import { programaRepository } from "./programaRepository";
import { etapaRepository } from "./etapaRepository";
import { moduloRepository } from "./moduloRepository";
import { progressoModuloRepository } from "./progressoModuloRepository";
import { avaliacaoRepository } from "./avaliacaoRepository";
import { tentativaAvaliacaoRepository } from "./tentativaAvaliacaoRepository";
import { comunidadeRepository } from "./comunidadeRepository";
import { gamificacaoRepository } from "./gamificacaoRepository";

/**
 * Camada de acesso a dados demonstrativos para a plataforma DEMOSTRATIVO MTD.
 * Todas as funções são assíncronas para simular o comportamento de chamadas de API reais,
 * facilitando a migração futura para backend sem alterar os componentes da interface.
 */

export async function getAlunoDashboardData(alunoId?: string): Promise<AlunoDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 10));
  const data: AlunoDashboardData = JSON.parse(JSON.stringify(MOCK_ALUNO_DATA));
  const targetAlunoId = alunoId || "alu-001";

  try {
    const turmasDoAluno = await turmaRepository.listarPorAluno(targetAlunoId);
    const turmaIds = turmasDoAluno.map((t) => t.id);

    const [proxima, praticaHoje, atividadesRepo, entregasAluno, totalConcluidas, spAtiva] =
      await Promise.all([
        aulaRepository.obterProximaAulaAluno(targetAlunoId),
        conteudoDiarioRepository.obterPraticaDeHoje(targetAlunoId, turmaIds),
        atividadeRepository.listarParaAluno(targetAlunoId, turmaIds),
        entregaRepository.listar({ alunoId: targetAlunoId }),
        entregaRepository.contarConcluidasPorAluno(targetAlunoId),
        selfPresentationRepository.obterAtivaParaAluno(targetAlunoId),
      ]);

    if (spAtiva) {
      data.selfPresentationAtiva = spAtiva;
    }

    if (praticaHoje) {
      data.praticaDeHoje = praticaHoje;
    }

    if (totalConcluidas > 0) {
      data.aluno.completedActivitiesCount = totalConcluidas;
    }

    // Etapa 6: Métricas Reais de Flashcards (SRS)
    try {
      const baralhosAluno = await baralhoRepository.getBaralhosAluno(targetAlunoId, turmaIds);
      const metricasFlashcards = await historicoRevisaoRepository.obterMetricasAluno(targetAlunoId, baralhosAluno);
      data.flashcardsMetricas = metricasFlashcards;
      data.flashcardsResumo = {
        totalParaRevisarHoje: metricasFlashcards.revisoesHoje,
        revisadosHoje: 4,
        sequenciaDias: metricasFlashcards.sequenciaDias,
        proximaSessaoTexto:
          metricasFlashcards.revisoesHoje > 0
            ? "Disponível agora"
            : "Tudo revisado hoje!",
      };
    } catch {
      // Fallback gracioso
    }

    // Map real pending activities
    if (atividadesRepo.length > 0) {
      const entregaMap = new Map(entregasAluno.map((e) => [e.atividadeId, e]));
      const mappedPendentes = atividadesRepo.map((atv) => {
        const entrega = entregaMap.get(atv.id);
        const isConcluida =
          entrega?.status === "entregue" ||
          entrega?.status === "atrasada" ||
          entrega?.status === "corrigida";

        return {
          id: atv.id,
          titulo: atv.titulo,
          modulo: atv.destinoTipo === "turma" ? "Turma B1" : "Geral",
          duracaoTexto: atv.prazoEntrega
            ? `Prazo: ${new Date(atv.prazoEntrega).toLocaleDateString("pt-BR")}`
            : "Sem prazo fixo",
          concluida: isConcluida,
          tipo: "exercicio" as const,
        };
      });

      data.atividadesPendentes = mappedPendentes.slice(0, 5);
    }

    if (proxima) {
      const turma = await turmaRepository.obterPorId(proxima.turmaId);
      const prof = await professorRepository.obterPorId(proxima.professorId);

      const dataObj = new Date(`${proxima.data}T${proxima.horario}`);
      const hoje = new Date();
      const isHoje =
        dataObj.toISOString().slice(0, 10) === hoje.toISOString().slice(0, 10);

      const dataTexto = isHoje
        ? `Hoje, ${proxima.horario}`
        : `${dataObj.toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          })}, ${proxima.horario}`;

      data.proximaAula = {
        id: proxima.id,
        modulo: turma?.nome || "Módulo 3 • Comunicação prática",
        titulo: proxima.titulo,
        dataTexto,
        horario: proxima.horario,
        professorNome: prof ? `Professor ${prof.nomeCompleto.split(" ")[0]}` : "Professor MTD",
        professorTitulo: "Professor MTD",
        professorAvatar: "/teacher-hd.jpg",
        status: "confirmada",
        meetingUrl: proxima.linkZoom,
        meetingUrlNotice: proxima.linkZoom
          ? "Link oficial da sala no Zoom verificado pela coordenação."
          : "Link da aula ainda não disponibilizado.",
      };
    }

    // Etapa 7: Jornada Real do Aluno e Progresso no Método Paulo
    try {
      const [progressoModulos, modulos, etapas, programas, avaliacoesDisponiveis, tentativasAluno] =
        await Promise.all([
          progressoModuloRepository.listar({ alunoId: targetAlunoId }),
          moduloRepository.listar(),
          etapaRepository.listar(),
          programaRepository.listar(),
          avaliacaoRepository.listarParaAluno(targetAlunoId, turmaIds),
          tentativaAvaliacaoRepository.listarPorAluno(targetAlunoId),
        ]);

      const moduloAtualProg =
        progressoModulos.find(
          (p) => p.status === "em_andamento" || p.status === "aguardando_validacao"
        ) || progressoModulos[0];
      const moduloAtual =
        modulos.find((m) => m.id === moduloAtualProg?.moduloId) || modulos[1] || modulos[0];
      const etapaAtual = etapas.find((e) => e.id === moduloAtual?.etapaId) || etapas[0];
      const programa = programas[0];

      if (moduloAtual) {
        data.aluno.currentModule = moduloAtual.nome;
      }

      if (moduloAtualProg) {
        data.aluno.journeyProgress = moduloAtualProg.indicadoresCalculados.percentualConclusao;
      }

      // Próxima avaliação pendente
      const tentativasPorAvaliacao = new Map<string, typeof tentativasAluno>();
      for (const t of tentativasAluno) {
        const arr = tentativasPorAvaliacao.get(t.avaliacaoId) || [];
        arr.push(t);
        tentativasPorAvaliacao.set(t.avaliacaoId, arr);
      }

      const avaliacaoPendente = avaliacoesDisponiveis.find((a) => {
        const tList = tentativasPorAvaliacao.get(a.id) || [];
        const concluidas = tList.filter(
          (t) => t.status === "corrigida" || t.status === "aguardando_correcao"
        );
        return concluidas.length < a.maxTentativas;
      });

      const aguardandoCorrecaoCount = tentativasAluno.filter(
        (t) => t.status === "aguardando_correcao"
      ).length;

      const resultadosRecentes = tentativasAluno
        .filter((t) => t.status === "corrigida")
        .slice(0, 3)
        .map((t) => {
          const aval = avaliacoesDisponiveis.find((a) => a.id === t.avaliacaoId);
          return {
            avaliacaoId: t.avaliacaoId,
            titulo: aval?.titulo || "Avaliação",
            tipo: aval?.tipo || "objetiva",
            nota: t.nota,
            notaMaxima: t.notaMaxima,
            resultado: t.resultado,
            data: t.enviadaEm || t.iniciadaEm,
          };
        });

      // Descrições de critérios cumpridos e pendentes
      const pendentesDesc: string[] = [];
      const cumpridosDesc: string[] = [];
      if (moduloAtual) {
        const ind = moduloAtualProg?.indicadoresCalculados;
        const cfg = moduloAtual.criteriosConclusao;
        if (cfg.presencaMinimaPercentual) {
          const text = `Presença mínima de ${cfg.presencaMinimaPercentual}% nas aulas`;
          if (ind?.presencaCumprida) {
            cumpridosDesc.push(text);
          } else {
            pendentesDesc.push(text);
          }
        }
        if (cfg.atividadesMinimasConcluidas) {
          const text = `Completar ao menos ${cfg.atividadesMinimasConcluidas} atividades`;
          if (ind?.atividadesCumpridas) {
            cumpridosDesc.push(text);
          } else {
            pendentesDesc.push(text);
          }
        }
        if (cfg.notaMinimaObjetivas) {
          const text = `Média mínima de ${cfg.notaMinimaObjetivas} em avaliações objetivas`;
          if (ind?.objetivasCumpridas) {
            cumpridosDesc.push(text);
          } else {
            pendentesDesc.push(text);
          }
        }
        if (cfg.avaliacaoPraticaObrigatoria) {
          const text = "Aprovação na avaliação prática do módulo";
          if (ind?.praticaCumprida) {
            cumpridosDesc.push(text);
          } else {
            pendentesDesc.push(text);
          }
        }
        if (cfg.exigeValidacaoHumana) {
          const text = "Validação pedagógica final pelo professor";
          if (ind?.validacaoHumanaConcluida) {
            cumpridosDesc.push(text);
          } else {
            pendentesDesc.push(text);
          }
        }
      }

      data.progressoJornada = {
        programaNome: programa?.nome || "Programa de Fluência MTD",
        etapaAtualNome: etapaAtual?.nome || "Etapa Atual",
        moduloAtualNome: moduloAtual?.nome || "Módulo Atual",
        moduloAtualId: moduloAtual?.id || "mod-002",
        statusModuloAtual: moduloAtualProg?.status || "em_andamento",
        percentualConclusaoModulo: moduloAtualProg?.indicadoresCalculados.percentualConclusao || 0,
        totalCriteriosAplicaveis: moduloAtualProg?.indicadoresCalculados.totalCriteriosAplicaveis || 0,
        criteriosCumpridos: moduloAtualProg?.indicadoresCalculados.criteriosCumpridos || 0,
        indicadores: moduloAtualProg?.indicadoresCalculados || {
          presencaPercentual: null,
          atividadesConcluidas: 0,
          mediaAvaliacoesObjetivas: null,
          criteriosCumpridos: 0,
          totalCriteriosAplicaveis: 0,
          percentualConclusao: 0,
          todosCriteriosCumpridos: false,
        },
        criteriosPendentesDescricoes: pendentesDesc,
        criteriosCumpridosDescricoes: cumpridosDesc,
        proximaAvaliacaoPendente: avaliacaoPendente
          ? {
              id: avaliacaoPendente.id,
              titulo: avaliacaoPendente.titulo,
              tipo: avaliacaoPendente.tipo,
              prazo: avaliacaoPendente.prazo,
            }
          : null,
        avaliacoesAguardandoCorrecaoCount: aguardandoCorrecaoCount,
        resultadosRecentes,
      };
    } catch (err) {
      console.warn("Aviso ao carregar progresso da jornada do aluno:", err);
    }
  } catch (err) {
    console.warn("Aviso ao buscar dados do aluno:", err);
  }

  return data;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 10));
  const data: AdminDashboardData = JSON.parse(JSON.stringify(MOCK_ADMIN_DATA));

  try {
    const [
      totalAlunosAtivos,
      totalProfessoresAtivos,
      totalAulasAgendadas,
      frequenciaGeral,
      proximasAulasRepo,
      todasTurmas,
      todosAlunos,
      atividadesPublicadas,
      entregasAguardando,
      entregasAtrasadas,
      conteudosAgendados,
    ] = await Promise.all([
      alunoRepository.contarAtivos(),
      professorRepository.contarAtivos(),
      aulaRepository.contarAgendadas(),
      aulaRepository.calcularFrequenciaGeral(),
      aulaRepository.listarProximas(4),
      turmaRepository.listar(),
      alunoRepository.listar(),
      atividadeRepository.contarPublicadas(),
      entregaRepository.contarAguardandoCorrecao(),
      entregaRepository.contarAtrasadas(),
      conteudoDiarioRepository.contarAgendados(),
    ]);

    // Metric 1: Alunos ativos
    const metricAlunos = data.metricas.find((m) => m.tipo === "alunos");
    if (metricAlunos) {
      metricAlunos.valor = totalAlunosAtivos.toString();
    }

    // Metric 2: Professores
    const metricProfessores = data.metricas.find((m) => m.tipo === "professores");
    if (metricProfessores) {
      metricProfessores.valor = totalProfessoresAtivos.toString();
    }

    // Metric 3: Aulas agendadas
    const metricAulas = data.metricas.find((m) => m.tipo === "aulas");
    if (metricAulas) {
      metricAulas.label = "Aulas agendadas";
      metricAulas.valor = totalAulasAgendadas.toString();
    }

    // Metric 4: Frequência média (ou Sem dados suficientes)
    const metricConclusao = data.metricas.find((m) => m.tipo === "conclusao");
    if (metricConclusao) {
      metricConclusao.label = "Frequência média";
      if (frequenciaGeral.porcentagem !== null) {
        metricConclusao.valor = `${frequenciaGeral.porcentagem}%`;
      } else {
        metricConclusao.valor = "Sem dados suficientes";
      }
    }

    // Etapa 4: Indicadores Pedagógicos
    data.indicadoresPedagogicos = {
      atividadesPublicadas,
      entregasAguardando,
      entregasAtrasadas,
      conteudosAgendados,
    };

    // Etapa 5: Métricas de Self Presentation
    try {
      const spMetricas = await selfPresentationRepository.contadoresDashboard();
      data.selfPresentationsMetricas = spMetricas;
    } catch {
      // Ignora falha silenciosa para fallback
    }

    // Etapa 6: Métricas Globais de Flashcards
    try {
      const flashcardsMetricas = await historicoRevisaoRepository.obterMetricasAdmin();
      data.flashcardsMetricas = flashcardsMetricas;
    } catch {
      // Ignora falha silenciosa para fallback
    }

    // Etapa 7: Indicadores Reais de Avaliações e Progresso
    try {
      const [todasAvaliacoes, todasTentativas, todosProgressosModulos] = await Promise.all([
        avaliacaoRepository.listar(),
        tentativaAvaliacaoRepository.listar(),
        progressoModuloRepository.listar(),
      ]);

      const avaliacoesPublicadas = todasAvaliacoes.filter((a) => a.status === "publicada").length;
      const tentativasAguardandoCorrecao = todasTentativas.filter(
        (t) => t.status === "aguardando_correcao"
      ).length;
      const alunosAguardandoValidacao = todosProgressosModulos.filter(
        (p) => p.status === "aguardando_validacao"
      ).length;

      // Média das avaliações objetivas corrigidas (somente quando houver dados)
      const tentativasObjetivas = todasTentativas.filter((t) => {
        const aval = todasAvaliacoes.find((a) => a.id === t.avaliacaoId);
        return aval?.tipo === "objetiva" && t.status === "corrigida" && typeof t.nota === "number";
      });

      let mediaAvaliacoesObjetivas: number | null = null;
      if (tentativasObjetivas.length > 0) {
        const somaNotas = tentativasObjetivas.reduce((acc, t) => acc + (t.nota || 0), 0);
        mediaAvaliacoesObjetivas = Number((somaNotas / tentativasObjetivas.length).toFixed(1));
      }

      // Alunos precisando de reforço (sem confundir com reprovação automática)
      const alunosPrecisandoReforcoSet = new Set<string>();
      for (const t of todasTentativas) {
        if (t.resultado === "precisa_reforco") {
          alunosPrecisandoReforcoSet.add(t.alunoId);
        }
      }

      data.metricasAvaliacoes = {
        avaliacoesPublicadas,
        tentativasAguardandoCorrecao,
        alunosAguardandoValidacao,
        mediaAvaliacoesObjetivas,
        totalAlunosPrecisandoReforco: alunosPrecisandoReforcoSet.size,
      };
    } catch (err) {
      console.warn("Aviso ao calcular indicadores de avaliações no admin:", err);
    }

    // Proximas Aulas no Admin
    if (proximasAulasRepo.length > 0) {
      const turmaMap = new Map(todasTurmas.map((t) => [t.id, t]));
      const alunoMap = new Map(todosAlunos.map((a) => [a.id, a]));

      const mappedProximas: AdminProximaAula[] = proximasAulasRepo.map((aula, idx) => {
        const turma = turmaMap.get(aula.turmaId);
        const primeiroAlunoId = turma?.alunoIds[0];
        const aluno = primeiroAlunoId ? alunoMap.get(primeiroAlunoId) : null;

        const dataObj = new Date(`${aula.data}T${aula.horario}`);
        const dataLabel = dataObj.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });

        const avatarList = [
          "/carla-avatar.png",
          "/ana-clara.png",
          "/pedro-henrique.png",
          "/beatriz-lima.png",
        ];

        return {
          id: aula.id,
          horario: aula.horario,
          dataLabel,
          alunoNome: aluno?.nomeCompleto || turma?.nome || "Aluno MTD",
          alunoAvatar: avatarList[idx % avatarList.length],
          turmaOuModulo: turma?.nome || "Inglês • Método Paulo",
          status: aula.status === "agendada" ? "Confirmada" : "A confirmar",
        };
      });

      data.proximasAulas = mappedProximas;
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar dados do painel admin:", err);
  }

  return data;
}

export async function toggleAtividadeStatus(id: string): Promise<boolean> {
  const atv = MOCK_ALUNO_DATA.atividadesPendentes.find((a) => a.id === id);
  if (atv) {
    atv.concluida = !atv.concluida;
    return atv.concluida;
  }
  return false;
}

export {
  alunoRepository,
  professorRepository,
  turmaRepository,
  aulaRepository,
  materialRepository,
  atividadeRepository,
  entregaRepository,
  conteudoDiarioRepository,
  selfPresentationRepository,
  historicoNivelRepository,
  baralhoRepository,
  cartaoRepository,
  progressoCartaoRepository,
  historicoRevisaoRepository,
  sessaoEstudoRepository,
  programaRepository,
  etapaRepository,
  moduloRepository,
  progressoModuloRepository,
  avaliacaoRepository,
  tentativaAvaliacaoRepository,
  comunidadeRepository,
  gamificacaoRepository,
};
