import {
  SelfPresentation,
  SelfPresentationFilters,
  OperationResult,
  AvaliacaoPedagogica,
  SolicitacaoReenvio,
  VersaoHistoricoSelfPresentation,
  ConsentimentoUsoVideo,
  SelfPresentationsMetricasAdmin,
  Aluno,
} from "@/types";
import { SEED_SELF_PRESENTATIONS } from "./mockData";
import {
  validateSelfPresentationInput,
  validateAvaliacaoInput,
  validateSolicitacaoReenvioInput,
  isValidHttpsUrl,
} from "./validators";
import { alunoRepository } from "./alunoRepository";

const STORAGE_KEY = "mtd_demonstrativo_self_presentations_v1";

let memoryCache: SelfPresentation[] | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): SelfPresentation[] {
  if (!isBrowser()) {
    if (!memoryCache) {
      memoryCache = [...SEED_SELF_PRESENTATIONS];
    }
    return memoryCache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SELF_PRESENTATIONS));
      return [...SEED_SELF_PRESENTATIONS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as SelfPresentation[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SELF_PRESENTATIONS));
    return [...SEED_SELF_PRESENTATIONS];
  } catch (err) {
    console.warn("Aviso ao carregar self presentations do localStorage:", err);
    return [...SEED_SELF_PRESENTATIONS];
  }
}

function saveToStorage(list: SelfPresentation[]): boolean {
  if (!isBrowser()) {
    memoryCache = [...list];
    return true;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "self_presentations" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir self presentations no localStorage:", err);
    return false;
  }
}

function generateSpId(existingList: SelfPresentation[]): string {
  const maxNum = existingList.reduce((acc, sp) => {
    const match = sp.id.match(/^sp-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const next = maxNum + 1;
  return `sp-${String(next).padStart(3, "0")}`;
}

export const selfPresentationRepository = {
  async listar(filters?: SelfPresentationFilters): Promise<SelfPresentation[]> {
    const list = loadFromStorage();

    if (!filters) {
      return [...list].sort(
        (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
      );
    }

    let result = [...list];

    // Busca por aluno ou título
    if (filters.busca && filters.busca.trim()) {
      const q = filters.busca.trim().toLowerCase();
      result = result.filter(
        (sp) =>
          sp.alunoNome.toLowerCase().includes(q) ||
          sp.titulo.toLowerCase().includes(q)
      );
    }

    // Filtro por status
    if (filters.status && filters.status !== "todos") {
      result = result.filter((sp) => sp.status === filters.status);
    }

    // Filtro por professor
    if (filters.professorId && filters.professorId !== "todos") {
      result = result.filter((sp) => sp.professorAvaliadorId === filters.professorId);
    }

    // Filtro por tipo
    if (filters.tipo && filters.tipo !== "todos") {
      result = result.filter((sp) => sp.tipo === filters.tipo);
    }

    // Ordenação
    if (filters.ordenacao === "recentes_primeiro") {
      result.sort(
        (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
    } else {
      // antigas_primeiro (Padrão para fila de atendimento)
      result.sort(
        (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
      );
    }

    return result;
  },

  async obterPorId(id: string): Promise<SelfPresentation | null> {
    const list = loadFromStorage();
    const found = list.find((sp) => sp.id === id);
    return found ? { ...found } : null;
  },

  /**
   * Consulta protegida para o perfil do aluno:
   * 1. Garante que o aluno acesse apenas seus próprios dados.
   * 2. Sanitiza rigorosamente observacoesInternas da equipe pedagógica.
   * 3. Oculta rascunhos de avaliação não publicados.
   */
  async obterParaAluno(id: string, alunoId: string): Promise<SelfPresentation | null> {
    const list = loadFromStorage();
    const found = list.find((sp) => sp.id === id && sp.alunoId === alunoId);
    if (!found) return null;

    const copy = { ...found };

    // Sanitização de privacidade: observacoesInternas NUNCA são expostas ao aluno
    if (copy.avaliacao) {
      if (!copy.avaliacao.publicada) {
        // Se a avaliação ainda não foi formalmente publicada pelo professor, oculta detalhes
        copy.avaliacao = undefined;
      } else {
        const avaliacaoSanitizada = { ...copy.avaliacao };
        delete (avaliacaoSanitizada as Partial<AvaliacaoPedagogica>).observacoesInternas;
        copy.avaliacao = avaliacaoSanitizada as AvaliacaoPedagogica;
      }
    }

    return copy;
  },

  async listarParaAluno(alunoId: string): Promise<SelfPresentation[]> {
    const list = loadFromStorage();
    const doAluno = list.filter((sp) => sp.alunoId === alunoId);

    // Sanitiza cada registro para não vazar observacoesInternas
    return doAluno.map((found) => {
      const copy = { ...found };
      if (copy.avaliacao) {
        if (!copy.avaliacao.publicada) {
          copy.avaliacao = undefined;
        } else {
          const avaliacaoSanitizada = { ...copy.avaliacao };
          delete (avaliacaoSanitizada as Partial<AvaliacaoPedagogica>).observacoesInternas;
          copy.avaliacao = avaliacaoSanitizada as AvaliacaoPedagogica;
        }
      }
      return copy;
    }).sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  /**
   * Consulta administrativa: retorna todas as apresentações do aluno com dados completos
   */
  async listarPorAluno(alunoId: string): Promise<SelfPresentation[]> {
    const list = loadFromStorage();
    return list
      .filter((sp) => sp.alunoId === alunoId)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  async obterAtivaParaAluno(alunoId: string): Promise<SelfPresentation | null> {
    const list = await this.listarParaAluno(alunoId);
    // Prioriza apresentação em andamento / recente
    return list[0] || null;
  },

  async salvarRascunho(
    dados: {
      id?: string;
      alunoId: string;
      alunoNome?: string;
      tipo?: "nivelamento_inicial" | "reavaliacao";
      titulo: string;
      linkVideo?: string;
      dataGravacao?: string;
      observacaoAluno?: string;
      consentimento?: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>> {
    const list = loadFromStorage();

    const tipo = dados.tipo || "nivelamento_inicial";

    // Regra de unicidade para nivelamento inicial ativo
    if (tipo === "nivelamento_inicial") {
      const outraAtiva = list.find(
        (sp) =>
          sp.alunoId === dados.alunoId &&
          sp.tipo === "nivelamento_inicial" &&
          sp.id !== dados.id &&
          (sp.status === "enviada" || sp.status === "em_avaliacao" || sp.status === "avaliada")
      );
      if (outraAtiva) {
        return {
          success: false,
          error:
            "O aluno já possui uma apresentação de nivelamento inicial ativa ou concluída. Novas apresentações devem ser registradas como Reavaliação.",
        };
      }
    }

    const validation = validateSelfPresentationInput(
      {
        ...dados,
        tipo,
        dataGravacao: dados.dataGravacao || new Date().toISOString(),
      },
      true
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: "Existem campos inválidos no rascunho.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const now = new Date().toISOString();

    if (dados.id) {
      const index = list.findIndex((sp) => sp.id === dados.id);
      if (index === -1) {
        return { success: false, error: "Apresentação não encontrada." };
      }

      // Bloqueio de edição pós-envio
      if (list[index].status !== "rascunho" && list[index].status !== "reenvio_solicitado") {
        return {
          success: false,
          error: "Esta apresentação já foi submetida e está bloqueada para edição casual.",
        };
      }

      const updated: SelfPresentation = {
        ...list[index],
        titulo: dados.titulo.trim(),
        linkVideo: dados.linkVideo?.trim() || list[index].linkVideo || "",
        dataGravacao: dados.dataGravacao || list[index].dataGravacao || now,
        observacaoAluno: dados.observacaoAluno?.trim(),
        consentimento: dados.consentimento || list[index].consentimento,
        atualizadoEm: now,
      };

      list[index] = updated;
      saveToStorage(list);
      return { success: true, data: updated };
    }

    // Novo rascunho
    const aluno = await alunoRepository.obterPorId(dados.alunoId);
    const alunoNome = dados.alunoNome || aluno?.nomeCompleto || "Aluno";

    const nova: SelfPresentation = {
      id: generateSpId(list),
      alunoId: dados.alunoId,
      alunoNome,
      tipo,
      titulo: dados.titulo.trim(),
      idiomaAvaliado: "Inglês",
      linkVideo: dados.linkVideo?.trim() || "",
      dataGravacao: dados.dataGravacao || now,
      status: "rascunho",
      versao: 1,
      consentimento: dados.consentimento || {
        aceito: false,
        dataHora: now,
        versaoTexto: "v1.0",
      },
      observacaoAluno: dados.observacaoAluno?.trim(),
      criadoEm: now,
      atualizadoEm: now,
    };

    list.unshift(nova);
    saveToStorage(list);

    return { success: true, data: nova };
  },

  async enviar(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>> {
    const list = loadFromStorage();
    const index = list.findIndex((sp) => sp.id === id);

    if (index === -1) {
      return { success: false, error: "Apresentação não encontrada." };
    }

    const atual = list[index];

    // Bloqueia se já tiver sido enviada
    if (atual.status === "enviada" || atual.status === "em_avaliacao" || atual.status === "avaliada") {
      return {
        success: false,
        error: "Esta apresentação já foi enviada e não pode ser reenviada diretamente.",
      };
    }

    // Validação formal de submissão
    const validation = validateSelfPresentationInput(
      {
        ...atual,
        linkVideo: dados.linkVideo,
        dataGravacao: dados.dataGravacao,
        consentimento: dados.consentimento,
      },
      false
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: "Não foi possível enviar a apresentação. Verifique os campos destacados.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const now = new Date().toISOString();
    const enviada: SelfPresentation = {
      ...atual,
      linkVideo: dados.linkVideo.trim(),
      dataGravacao: dados.dataGravacao,
      observacaoAluno: dados.observacaoAluno?.trim(),
      consentimento: {
        aceito: true,
        dataHora: now,
        versaoTexto: dados.consentimento.versaoTexto || "v1.0",
      },
      status: "enviada",
      dataEnvio: now,
      atualizadoEm: now,
    };

    list[index] = enviada;
    saveToStorage(list);

    return { success: true, data: enviada };
  },

  async assumirAvaliacao(
    id: string,
    professorId: string,
    professorNome: string
  ): Promise<OperationResult<SelfPresentation>> {
    const list = loadFromStorage();
    const index = list.findIndex((sp) => sp.id === id);

    if (index === -1) {
      return { success: false, error: "Apresentação não encontrada." };
    }

    const atual = list[index];

    // Somente um professor pode ser responsável por vez
    const now = new Date().toISOString();
    const atualizada: SelfPresentation = {
      ...atual,
      professorAvaliadorId: professorId,
      professorAvaliadorNome: professorNome,
      status: "em_avaliacao",
      dataInicioAvaliacao: atual.dataInicioAvaliacao || now,
      atualizadoEm: now,
    };

    list[index] = atualizada;
    saveToStorage(list);

    return { success: true, data: atualizada };
  },

  async salvarAvaliacao(
    id: string,
    avaliacaoInput: Partial<AvaliacaoPedagogica>,
    publicar = false
  ): Promise<OperationResult<SelfPresentation>> {
    const list = loadFromStorage();
    const index = list.findIndex((sp) => sp.id === id);

    if (index === -1) {
      return { success: false, error: "Apresentação não encontrada." };
    }

    const atual = list[index];

    // Validação da avaliação
    const val = validateAvaliacaoInput(avaliacaoInput, publicar);
    if (!val.isValid) {
      return {
        success: false,
        error: "Existem pendências no preenchimento da avaliação pedagógica.",
        fieldErrors: val.errors as Record<string, string>,
      };
    }

    const now = new Date().toISOString();
    const avaliacaoSalva: AvaliacaoPedagogica = {
      id: atual.avaliacao?.id || `av-${Date.now()}`,
      selfPresentationId: id,
      professorId: avaliacaoInput.professorId || atual.professorAvaliadorId || "prof-001",
      professorNome: avaliacaoInput.professorNome || atual.professorAvaliadorNome || "Professor",
      rubrica: avaliacaoInput.rubrica!,
      pontosFortes: avaliacaoInput.pontosFortes?.trim() || "",
      pontosADesenvolver: avaliacaoInput.pontosADesenvolver?.trim() || "",
      orientacaoProximasAulas: avaliacaoInput.orientacaoProximasAulas?.trim() || "",
      observacoesInternas: avaliacaoInput.observacoesInternas?.trim() || undefined,
      mediaCriteriosOrais:
        avaliacaoInput.mediaCriteriosOrais !== undefined
          ? avaliacaoInput.mediaCriteriosOrais
          : 0,
      nivelDefinido: avaliacaoInput.nivelDefinido || "nao_avaliado",
      justificativaNivel: avaliacaoInput.justificativaNivel?.trim() || "",
      concluidaEm: publicar ? now : (atual.avaliacao?.concluidaEm || now),
      publicada: publicar,
      publicadaEm: publicar ? now : undefined,
    };

    const atualizada: SelfPresentation = {
      ...atual,
      avaliacao: avaliacaoSalva,
      status: publicar ? "avaliada" : "em_avaliacao",
      dataConclusao: publicar ? now : atual.dataConclusao,
      atualizadoEm: now,
    };

    list[index] = atualizada;
    saveToStorage(list);

    return { success: true, data: atualizada };
  },

  async solicitarReenvio(
    id: string,
    solicitacao: SolicitacaoReenvio
  ): Promise<OperationResult<SelfPresentation>> {
    const list = loadFromStorage();
    const index = list.findIndex((sp) => sp.id === id);

    if (index === -1) {
      return { success: false, error: "Apresentação não encontrada." };
    }

    const val = validateSolicitacaoReenvioInput(solicitacao);
    if (!val.isValid) {
      return {
        success: false,
        error: "Preencha o motivo e as orientações para o reenvio.",
        fieldErrors: val.errors as Record<string, string>,
      };
    }

    const atual = list[index];
    const now = new Date().toISOString();

    // Arquiva a versão anterior no histórico de versões
    const versaoAnterior: VersaoHistoricoSelfPresentation = {
      versao: atual.versao,
      linkVideo: atual.linkVideo,
      dataGravacao: atual.dataGravacao,
      dataEnvio: atual.dataEnvio || atual.criadoEm,
      observacaoAluno: atual.observacaoAluno,
      consentimento: atual.consentimento,
      solicitacaoReenvio: solicitacao,
      avaliacaoAnterior: atual.avaliacao ? { ...atual.avaliacao } : undefined,
      arquivadoEm: now,
    };

    const historico = atual.historicoVersoes ? [...atual.historicoVersoes] : [];
    historico.push(versaoAnterior);

    const atualizada: SelfPresentation = {
      ...atual,
      status: "reenvio_solicitado",
      solicitacaoReenvio: solicitacao,
      historicoVersoes: historico,
      atualizadoEm: now,
    };

    list[index] = atualizada;
    saveToStorage(list);

    return { success: true, data: atualizada };
  },

  async criarNovaVersao(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>> {
    const list = loadFromStorage();
    const index = list.findIndex((sp) => sp.id === id);

    if (index === -1) {
      return { success: false, error: "Apresentação não encontrada." };
    }

    const atual = list[index];

    if (atual.status !== "reenvio_solicitado") {
      return {
        success: false,
        error: "Uma nova versão só pode ser criada após solicitação explícita de reenvio pelo professor.",
      };
    }

    if (!isValidHttpsUrl(dados.linkVideo)) {
      return {
        success: false,
        error: "Informe um link externo HTTPS válido para a nova gravação.",
      };
    }

    if (!dados.consentimento?.aceito) {
      return {
        success: false,
        error: "É obrigatório confirmar o consentimento de uso do novo vídeo.",
      };
    }

    const now = new Date().toISOString();
    const novaVersaoNum = (atual.versao || 1) + 1;

    const atualizada: SelfPresentation = {
      ...atual,
      versao: novaVersaoNum,
      linkVideo: dados.linkVideo.trim(),
      dataGravacao: dados.dataGravacao,
      observacaoAluno: dados.observacaoAluno?.trim(),
      consentimento: {
        aceito: true,
        dataHora: now,
        versaoTexto: dados.consentimento.versaoTexto || "v1.0",
      },
      status: "enviada",
      dataEnvio: now,
      solicitacaoReenvio: undefined,
      atualizadoEm: now,
    };

    list[index] = atualizada;
    saveToStorage(list);

    return { success: true, data: atualizada };
  },

  async aplicarNivelAoPerfil(
    id: string,
    professorId: string,
    professorNome: string
  ): Promise<OperationResult<{ aluno: Aluno; sp: SelfPresentation }>> {
    const list = loadFromStorage();
    const index = list.findIndex((sp) => sp.id === id);

    if (index === -1) {
      return { success: false, error: "Apresentação não encontrada." };
    }

    const sp = list[index];

    if (sp.status !== "avaliada" || !sp.avaliacao || !sp.avaliacao.publicada) {
      return {
        success: false,
        error: "Apenas apresentações avaliadas com feedback publicado podem ter o nível aplicado ao perfil.",
      };
    }

    const novoNivel = sp.avaliacao.nivelDefinido;
    if (!novoNivel || novoNivel === "nao_avaliado") {
      return {
        success: false,
        error: "O nível definido pelo professor não pode ser 'Não avaliado' para aplicação ao perfil.",
      };
    }

    // Aplica o nível ao cadastro do aluno
    const resAluno = await alunoRepository.atualizarNivel(sp.alunoId, novoNivel, {
      origem: "self_presentation",
      origemReferenciaId: sp.id,
      professorId,
      professorNome,
      justificativa: sp.avaliacao.justificativaNivel,
    });

    if (!resAluno.success || !resAluno.data) {
      return {
        success: false,
        error: resAluno.error || "Falha ao aplicar nível ao perfil do aluno.",
      };
    }

    // Marca na apresentação que o nível foi aplicado
    const spAtualizada: SelfPresentation = {
      ...sp,
      nivelAplicadoAoPerfil: true,
      atualizadoEm: new Date().toISOString(),
    };

    list[index] = spAtualizada;
    saveToStorage(list);

    return {
      success: true,
      data: {
        aluno: resAluno.data,
        sp: spAtualizada,
      },
    };
  },

  async contadoresDashboard(): Promise<SelfPresentationsMetricasAdmin> {
    const list = loadFromStorage();

    const aguardando = list.filter((sp) => sp.status === "enviada").length;
    const emAvaliacao = list.filter((sp) => sp.status === "em_avaliacao").length;
    const reenviosPendentes = list.filter((sp) => sp.status === "reenvio_solicitado").length;
    const avaliadas = list.filter((sp) => sp.status === "avaliada").length;

    // Tempo médio de avaliação em horas (diferença entre dataEnvio e dataConclusao)
    const comTempo = list.filter((sp) => sp.dataEnvio && sp.dataConclusao);
    let tempoMedioHorasTexto = "—";

    if (comTempo.length > 0) {
      const totalMs = comTempo.reduce((acc, sp) => {
        const tEnvio = new Date(sp.dataEnvio!).getTime();
        const tConc = new Date(sp.dataConclusao!).getTime();
        return acc + Math.max(0, tConc - tEnvio);
      }, 0);
      const mediaHoras = Math.round(totalMs / comTempo.length / (1000 * 60 * 60));
      tempoMedioHorasTexto = `${mediaHoras}h`;
    }

    return {
      aguardando,
      emAvaliacao,
      reenviosPendentes,
      avaliadas,
      tempoMedioHorasTexto,
    };
  },
};
