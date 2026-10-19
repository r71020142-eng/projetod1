/**
 * planoDiarioMotor.ts
 *
 * Motor determinístico de priorização pedagógica para o "Plano de Hoje" do Aluno.
 * Função pura, tipada e determinística, sem efeitos colaterais e sem dependência de IA.
 *
 * Hierarquia estrita de prioridade (máximo 3 ações por dia):
 * 1. Item atrasado (atividades vencidas ou reenvio solicitado)
 * 2. Aula nas próximas 24 horas (ou marcada para hoje)
 * 3. Avaliação ou atividade com prazo próximo (próximos 3-5 dias)
 * 4. Flashcards vencidos (revisões espaçadas pendentes para hoje)
 * 5. Prática diária (pílula diária não realizada)
 * 6. Feedback pedagógico recém-publicado ou conquista recente
 */

export type TipoAcaoPlanoDiario =
  | "item_atrasado"
  | "aula_proxima"
  | "prazo_proximo"
  | "flashcards"
  | "pratica_diaria"
  | "feedback"
  | "conquista";

export interface AcaoPlanoDiario {
  id: string;
  prioridade: number; // 1 a 6
  tipo: TipoAcaoPlanoDiario;
  titulo: string;
  contexto: string;
  prazoOuTempo: string;
  href: string;
  botaoTexto: string;
  icone: string; // Identificador do ícone Lucide
  urgencia: "critica" | "alta" | "media" | "baixa";
}

export interface ContextoPlanoDiario {
  alunoId: string;
  agora?: Date;
  proximaAula?: {
    id: string;
    titulo: string;
    data: string; // YYYY-MM-DD
    horario: string; // HH:mm
    duracaoMinutos?: number;
    meetingUrl?: string;
    turmaNome?: string;
    status?: string;
  } | null;
  atividades?: Array<{
    id: string;
    titulo: string;
    prazoEntrega?: string | null;
    concluida: boolean;
    atrasada?: boolean;
    reenvioSolicitado?: boolean;
  }>;
  avaliacoesPendentes?: Array<{
    id: string;
    titulo: string;
    prazo?: string | null;
    tipo: "objetiva" | "pratica";
  }>;
  flashcards?: {
    revisoesHoje: number;
    sequenciaDias: number;
  } | null;
  selfPresentationPendente?: {
    id: string;
    titulo?: string;
    reenvioSolicitado?: boolean;
    linkDestino?: string;
  } | null;
  praticaDiaria?: {
    id: string;
    titulo: string;
    concluida?: boolean;
    duracaoMinutos?: number;
  } | null;
  feedbackRecente?: {
    id: string;
    tipo: string;
    titulo: string;
    professorNome?: string;
    data?: string;
    visualizado?: boolean;
    linkDestino?: string;
  } | null;
  conquistaRecente?: {
    id: string;
    nome: string;
    pontos: number;
    visualizada?: boolean;
    linkDestino?: string;
  } | null;
}

/**
 * Calcula determinísticamente as ações diárias do aluno, retornando no máximo 3 itens.
 */
export function calcularPlanoDiario(contexto: ContextoPlanoDiario): AcaoPlanoDiario[] {
  const agora = contexto.agora || new Date();
  const agoraTimestamp = agora.getTime();
  const acoesCandidatas: AcaoPlanoDiario[] = [];
  const chavesUnicas = new Set<string>();

  function adicionarAcao(acao: AcaoPlanoDiario) {
    const chave = `${acao.tipo}:${acao.id}`;
    if (!chavesUnicas.has(chave)) {
      chavesUnicas.add(chave);
      acoesCandidatas.push(acao);
    }
  }

  // -------------------------------------------------------------
  // PRIORIDADE 1: Itens Atrasados ou com Reenvio Solicitado
  // -------------------------------------------------------------
  if (contexto.atividades && contexto.atividades.length > 0) {
    for (const atv of contexto.atividades) {
      if (atv.concluida) continue;

      const isReenvio = !!atv.reenvioSolicitado;
      let isAtrasada = !!atv.atrasada;

      if (!isAtrasada && atv.prazoEntrega) {
        const prazoDate = new Date(atv.prazoEntrega);
        if (!isNaN(prazoDate.getTime()) && prazoDate.getTime() < agoraTimestamp) {
          isAtrasada = true;
        }
      }

      if (isReenvio) {
        adicionarAcao({
          id: atv.id,
          prioridade: 1,
          tipo: "item_atrasado",
          titulo: atv.titulo,
          contexto: "Reenvio solicitado pelo professor",
          prazoOuTempo: "Ajuste pendente",
          href: `/aluno/atividades/${atv.id}`,
          botaoTexto: "Reenviar",
          icone: "AlertCircle",
          urgencia: "critica",
        });
      } else if (isAtrasada) {
        adicionarAcao({
          id: atv.id,
          prioridade: 1,
          tipo: "item_atrasado",
          titulo: atv.titulo,
          contexto: "Prazo de entrega expirado",
          prazoOuTempo: "Entrega atrasada",
          href: `/aluno/atividades/${atv.id}`,
          botaoTexto: "Entregar agora",
          icone: "AlertTriangle",
          urgencia: "critica",
        });
      }
    }
  }

  if (contexto.selfPresentationPendente?.reenvioSolicitado) {
    adicionarAcao({
      id: contexto.selfPresentationPendente.id,
      prioridade: 1,
      tipo: "item_atrasado",
      titulo: "Reenviar Self Presentation",
      contexto: "Ajuste solicitado pelo professor",
      prazoOuTempo: "Ajuste pendente",
      href: contexto.selfPresentationPendente.linkDestino || "/aluno/self-presentation",
      botaoTexto: "Reenviar",
      icone: "Video",
      urgencia: "critica",
    });
  }

  // -------------------------------------------------------------
  // PRIORIDADE 2: Aula nas Próximas 24 Horas
  // -------------------------------------------------------------
  if (contexto.proximaAula && contexto.proximaAula.data && contexto.proximaAula.horario) {
    const aulaStr = `${contexto.proximaAula.data}T${contexto.proximaAula.horario}`;
    const aulaDate = new Date(aulaStr);

    if (!isNaN(aulaDate.getTime())) {
      const diffMs = aulaDate.getTime() - agoraTimestamp;
      const diffHoras = diffMs / (1000 * 60 * 60);

      // Aula ocorre entre -1h (em andamento) e +24h
      if (diffHoras >= -1 && diffHoras <= 24) {
        const isHoje = aulaDate.toISOString().slice(0, 10) === agora.toISOString().slice(0, 10);
        const prazoTexto = isHoje
          ? `Hoje às ${contexto.proximaAula.horario}`
          : `Amanhã às ${contexto.proximaAula.horario}`;

        adicionarAcao({
          id: contexto.proximaAula.id,
          prioridade: 2,
          tipo: "aula_proxima",
          titulo: contexto.proximaAula.titulo,
          contexto: contexto.proximaAula.turmaNome
            ? `Turma: ${contexto.proximaAula.turmaNome}`
            : "Aula ao vivo no Zoom",
          prazoOuTempo: prazoTexto,
          href: contexto.proximaAula.meetingUrl ? contexto.proximaAula.meetingUrl : "/aluno/aulas",
          botaoTexto: contexto.proximaAula.meetingUrl ? "Entrar na aula" : "Ver detalhes",
          icone: "Video",
          urgencia: "alta",
        });
      }
    }
  }

  // -------------------------------------------------------------
  // PRIORIDADE 3: Avaliação ou Atividade com Prazo Próximo (<= 5 dias)
  // -------------------------------------------------------------
  // 3.1 Avaliações pendentes
  if (contexto.avaliacoesPendentes && contexto.avaliacoesPendentes.length > 0) {
    for (const aval of contexto.avaliacoesPendentes) {
      if (aval.prazo) {
        const prazoDate = new Date(aval.prazo);
        if (!isNaN(prazoDate.getTime())) {
          const diffDias = Math.ceil((prazoDate.getTime() - agoraTimestamp) / (1000 * 60 * 60 * 24));
          if (diffDias >= 0 && diffDias <= 5) {
            adicionarAcao({
              id: aval.id,
              prioridade: 3,
              tipo: "prazo_proximo",
              titulo: aval.titulo,
              contexto: aval.tipo === "pratica" ? "Avaliação prática com rubrica" : "Avaliação objetiva",
              prazoOuTempo: diffDias === 0 ? "Vence hoje" : diffDias === 1 ? "Vence amanhã" : `Vence em ${diffDias} dias`,
              href: `/aluno/avaliacoes/${aval.id}`,
              botaoTexto: "Fazer avaliação",
              icone: "FileCheck",
              urgencia: diffDias <= 2 ? "alta" : "media",
            });
          }
        }
      }
    }
  }

  // 3.2 Atividades não concluídas com prazo nos próximos 5 dias
  if (contexto.atividades && contexto.atividades.length > 0) {
    for (const atv of contexto.atividades) {
      if (atv.concluida || atv.atrasada || atv.reenvioSolicitado) continue;
      if (atv.prazoEntrega) {
        const prazoDate = new Date(atv.prazoEntrega);
        if (!isNaN(prazoDate.getTime())) {
          const diffDias = Math.ceil((prazoDate.getTime() - agoraTimestamp) / (1000 * 60 * 60 * 24));
          if (diffDias >= 0 && diffDias <= 5) {
            adicionarAcao({
              id: atv.id,
              prioridade: 3,
              tipo: "prazo_proximo",
              titulo: atv.titulo,
              contexto: "Atividade curricular",
              prazoOuTempo: diffDias === 0 ? "Vence hoje" : diffDias === 1 ? "Vence amanhã" : `Vence em ${diffDias} dias`,
              href: `/aluno/atividades/${atv.id}`,
              botaoTexto: "Realizar entrega",
              icone: "Calendar",
              urgencia: diffDias <= 2 ? "alta" : "media",
            });
          }
        }
      }
    }
  }

  // 3.3 Self Presentation pendente de envio
  if (contexto.selfPresentationPendente && !contexto.selfPresentationPendente.reenvioSolicitado) {
    adicionarAcao({
      id: contexto.selfPresentationPendente.id,
      prioridade: 3,
      tipo: "prazo_proximo",
      titulo: contexto.selfPresentationPendente.titulo || "Gravar Self Presentation",
      contexto: "Rito de nivelamento oral",
      prazoOuTempo: "Pendente de envio",
      href: contexto.selfPresentationPendente.linkDestino || "/aluno/self-presentation",
      botaoTexto: "Gravar agora",
      icone: "Video",
      urgencia: "alta",
    });
  }

  // -------------------------------------------------------------
  // PRIORIDADE 4: Flashcards Vencidos (Revisão Espaçada para hoje)
  // -------------------------------------------------------------
  if (contexto.flashcards && contexto.flashcards.revisoesHoje > 0) {
    adicionarAcao({
      id: "flashcards-hoje",
      prioridade: 4,
      tipo: "flashcards",
      titulo: "Revisão Espaçada de Vocabulário",
      contexto: "Repetição espaçada (SRS) pronta",
      prazoOuTempo: `${contexto.flashcards.revisoesHoje} cartões para hoje`,
      href: "/aluno/flashcards",
      botaoTexto: "Revisar cartões",
      icone: "Layers",
      urgencia: "media",
    });
  }

  // -------------------------------------------------------------
  // PRIORIDADE 5: Prática Diária (Pílula prática do dia não concluída)
  // -------------------------------------------------------------
  if (contexto.praticaDiaria && !contexto.praticaDiaria.concluida) {
    adicionarAcao({
      id: contexto.praticaDiaria.id,
      prioridade: 5,
      tipo: "pratica_diaria",
      titulo: contexto.praticaDiaria.titulo || "Prática Diária de Speaking",
      contexto: "Pílula de desenvolvimento contínuo",
      prazoOuTempo: `${contexto.praticaDiaria.duracaoMinutos || 5} min de foco`,
      href: "/aluno/materiais",
      botaoTexto: "Praticar pílula",
      icone: "Compass",
      urgencia: "baixa",
    });
  }

  // -------------------------------------------------------------
  // PRIORIDADE 6: Feedback Recente ou Conquista Recente
  // -------------------------------------------------------------
  if (contexto.feedbackRecente) {
    adicionarAcao({
      id: contexto.feedbackRecente.id,
      prioridade: 6,
      tipo: "feedback",
      titulo: contexto.feedbackRecente.titulo,
      contexto: contexto.feedbackRecente.professorNome
        ? `Parecer emitido por ${contexto.feedbackRecente.professorNome}`
        : "Novo feedback pedagógico",
      prazoOuTempo: "Disponível para leitura",
      href: contexto.feedbackRecente.linkDestino || "/aluno/self-presentation",
      botaoTexto: "Ver parecer",
      icone: "CheckCheck",
      urgencia: "baixa",
    });
  } else if (contexto.conquistaRecente) {
    adicionarAcao({
      id: contexto.conquistaRecente.id,
      prioridade: 6,
      tipo: "conquista",
      titulo: contexto.conquistaRecente.nome,
      contexto: `Nova conquista desbloqueada (+${contexto.conquistaRecente.pontos} pts)`,
      prazoOuTempo: "Comemorar marco",
      href: contexto.conquistaRecente.linkDestino || "/aluno/conquistas",
      botaoTexto: "Ver conquista",
      icone: "Award",
      urgencia: "baixa",
    });
  }

  // Ordena estritamente por prioridade crescente (1 a 6) e corta no máximo em 3 itens
  acoesCandidatas.sort((a, b) => a.prioridade - b.prioridade);

  return acoesCandidatas.slice(0, 3);
}
