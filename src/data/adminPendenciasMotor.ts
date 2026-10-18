/**
 * adminPendenciasMotor.ts
 *
 * Motor determinístico de priorização operacional e pedagógica para o Painel Administrativo.
 * Função pura, tipada e determinística, sem efeitos colaterais e sem dependência de IA.
 *
 * Hierarquia de Prioridades da Coordenação:
 * 1. Denúncia na comunidade pendente de moderação (urgência crítica)
 * 2. Self Presentation aguardando avaliação docente (urgência alta)
 * 3. Aula nas próximas 24 horas sem link do Zoom cadastrado (urgência alta)
 * 4. Módulo aguardando validação pedagógica formal do professor (urgência média)
 * 5. Avaliação prática de módulo aguardando correção com rubrica (urgência média)
 * 6. Entregas de atividades pedagógicas aguardando correção (urgência média)
 * 7. Solicitações de placa física aguardando análise de elegibilidade (urgência baixa)
 */

export type TipoPendenciaAdmin =
  | "denuncia_comunidade"
  | "self_presentation_pendente"
  | "aula_sem_zoom"
  | "modulo_aguardando_validacao"
  | "avaliacao_aguardando_correcao"
  | "atividade_aguardando_correcao"
  | "placa_aguardando_analise";

export interface ItemPendenciaAdmin {
  id: string;
  prioridade: number; // 1 a 7
  tipo: TipoPendenciaAdmin;
  titulo: string;
  descricao: string;
  responsavelSugerido: string;
  prazoOuTempo: string;
  href: string;
  botaoTexto: string;
  icone: string; // Lucide icon
  urgencia: "critica" | "alta" | "media" | "baixa";
}

export interface ContextoPendenciasAdmin {
  agora?: Date;
  denunciasPendentesCount?: number;
  selfPresentationsAguardandoCount?: number;
  aulasProximasSemZoom?: Array<{
    id: string;
    titulo: string;
    data: string;
    horario: string;
    turmaNome?: string;
  }>;
  modulosAguardandoValidacaoCount?: number;
  avaliacoesAguardandoCorrecaoCount?: number;
  entregasAguardandoCorrecaoCount?: number;
  placasAguardandoAnaliseCount?: number;
}

/**
 * Calcula determinísticamente as pendências administrativas mais urgentes, retornando no máximo 4 itens.
 */
export function calcularPendenciasAdmin(
  contexto: ContextoPendenciasAdmin
): ItemPendenciaAdmin[] {
  const pendencias: ItemPendenciaAdmin[] = [];

  // 1. Denúncia na Comunidade (Crítica)
  if (contexto.denunciasPendentesCount && contexto.denunciasPendentesCount > 0) {
    pendencias.push({
      id: "pend-denuncia",
      prioridade: 1,
      tipo: "denuncia_comunidade",
      titulo: `${contexto.denunciasPendentesCount} ${
        contexto.denunciasPendentesCount === 1 ? "denúncia pendente" : "denúncias pendentes"
      } na comunidade`,
      descricao: "Publicações sinalizadas por membros aguardando deliberação ética da moderação.",
      responsavelSugerido: "Moderação / Coordenação",
      prazoOuTempo: "Ação imediata",
      href: "/admin/comunidade",
      botaoTexto: "Moderar agora",
      icone: "ShieldAlert",
      urgencia: "critica",
    });
  }

  // 2. Self Presentations aguardando avaliação (Alta)
  if (
    contexto.selfPresentationsAguardandoCount &&
    contexto.selfPresentationsAguardandoCount > 0
  ) {
    pendencias.push({
      id: "pend-self-presentation",
      prioridade: 2,
      tipo: "self_presentation_pendente",
      titulo: `${contexto.selfPresentationsAguardandoCount} ${
        contexto.selfPresentationsAguardandoCount === 1
          ? "apresentação oral"
          : "apresentações orais"
      } em fila`,
      descricao: "Vídeos de nivelamento ou reavaliação enviados aguardando preenchimento de rubrica.",
      responsavelSugerido: "Professores avaliadores",
      prazoOuTempo: "Fila ativa",
      href: "/admin/self-presentation",
      botaoTexto: "Avaliar vídeos",
      icone: "Video",
      urgencia: "alta",
    });
  }

  // 3. Aulas nas próximas 24h sem link Zoom (Alta)
  if (contexto.aulasProximasSemZoom && contexto.aulasProximasSemZoom.length > 0) {
    const primeiraAula = contexto.aulasProximasSemZoom[0];
    pendencias.push({
      id: `pend-zoom-${primeiraAula.id}`,
      prioridade: 3,
      tipo: "aula_sem_zoom",
      titulo: `Aula de ${primeiraAula.turmaNome || "Inglês"} sem link do Zoom`,
      descricao: `Encontro marcado para ${primeiraAula.data} às ${primeiraAula.horario}. O link oficial ainda não foi cadastrado.`,
      responsavelSugerido: "Secretaria / Coordenação",
      prazoOuTempo: `Às ${primeiraAula.horario}`,
      href: "/admin/agenda",
      botaoTexto: "Cadastrar link",
      icone: "AlertCircle",
      urgencia: "alta",
    });
  }

  // 4. Módulos aguardando validação pedagógica do docente (Média)
  if (
    contexto.modulosAguardandoValidacaoCount &&
    contexto.modulosAguardandoValidacaoCount > 0
  ) {
    pendencias.push({
      id: "pend-validacao-modulo",
      prioridade: 4,
      tipo: "modulo_aguardando_validacao",
      titulo: `${contexto.modulosAguardandoValidacaoCount} ${
        contexto.modulosAguardandoValidacaoCount === 1
          ? "aluno concluiu 100% do módulo"
          : "alunos concluíram 100% do módulo"
      }`,
      descricao: "Critérios cumpridos pelo aluno; aprovação formal depende do parecer do professor.",
      responsavelSugerido: "Docente da turma",
      prazoOuTempo: "Aguardando validação",
      href: "/admin/avaliacoes",
      botaoTexto: "Validar conclusão",
      icone: "CheckCircle",
      urgencia: "media",
    });
  }

  // 5. Avaliações práticas aguardando correção (Média)
  if (
    contexto.avaliacoesAguardandoCorrecaoCount &&
    contexto.avaliacoesAguardandoCorrecaoCount > 0
  ) {
    pendencias.push({
      id: "pend-avaliacoes",
      prioridade: 5,
      tipo: "avaliacao_aguardando_correcao",
      titulo: `${contexto.avaliacoesAguardandoCorrecaoCount} ${
        contexto.avaliacoesAguardandoCorrecaoCount === 1
          ? "avaliação prática"
          : "avaliações práticas"
      } para corrigir`,
      descricao: "Tentativas discursivas de checkpoints do Método Paulo aguardando atribuição de nota.",
      responsavelSugerido: "Corpo Docente",
      prazoOuTempo: "Prazo pedagógico",
      href: "/admin/avaliacoes",
      botaoTexto: "Corrigir tentativas",
      icone: "FileCheck",
      urgencia: "media",
    });
  }

  // 6. Entregas de atividades curriculares (Média)
  if (
    contexto.entregasAguardandoCorrecaoCount &&
    contexto.entregasAguardandoCorrecaoCount > 0
  ) {
    pendencias.push({
      id: "pend-atividades",
      prioridade: 6,
      tipo: "atividade_aguardando_correcao",
      titulo: `${contexto.entregasAguardandoCorrecaoCount} ${
        contexto.entregasAguardandoCorrecaoCount === 1
          ? "entrega de atividade"
          : "entregas de atividades"
      } pendente`,
      descricao: "Exercícios e desafios práticos enviados pelos alunos aguardando feedback qualitativo.",
      responsavelSugerido: "Professor da disciplina",
      prazoOuTempo: "Em análise",
      href: "/admin/materiais",
      botaoTexto: "Ver entregas",
      icone: "FileText",
      urgencia: "media",
    });
  }

  // 7. Placas físicas aguardando análise logística (Baixa)
  if (
    contexto.placasAguardandoAnaliseCount &&
    contexto.placasAguardandoAnaliseCount > 0
  ) {
    pendencias.push({
      id: "pend-placas",
      prioridade: 7,
      tipo: "placa_aguardando_analise",
      titulo: `${contexto.placasAguardandoAnaliseCount} ${
        contexto.placasAguardandoAnaliseCount === 1
          ? "solicitação de placa física"
          : "solicitações de placa física"
      }`,
      descricao: "Manifestação de interesse registrada por aluno elegível para esteira de fabricação.",
      responsavelSugerido: "Equipe de Gestão",
      prazoOuTempo: "Esteira de placas",
      href: "/admin/conquistas",
      botaoTexto: "Gerenciar placas",
      icone: "Award",
      urgencia: "baixa",
    });
  }

  // Ordena por prioridade estrita (1 a 7) e limita a no máximo 4 itens
  pendencias.sort((a, b) => a.prioridade - b.prioridade);

  return pendencias.slice(0, 4);
}
