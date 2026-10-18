import {
  ProgressoModuloAluno,
  StatusProgressoModulo,
  OperationResult,
  ProgressoModuloFilters,
} from "../types";
import { SEED_PROGRESSO_MODULOS } from "./mockData";
import { moduloRepository } from "./moduloRepository";
import { verificarCriteriosConclusaoModulo, DadosVerificacaoModulo } from "./pedagogicoCalculos";

const STORAGE_KEY = "mtd_demonstrativo_progresso_modulos_v1";

function loadProgressosFromStorage(): ProgressoModuloAluno[] {
  if (typeof window === "undefined") {
    return SEED_PROGRESSO_MODULOS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROGRESSO_MODULOS));
      return SEED_PROGRESSO_MODULOS;
    }
    return JSON.parse(raw) as ProgressoModuloAluno[];
  } catch (err) {
    console.error("Erro ao carregar progressos de módulos:", err);
    return SEED_PROGRESSO_MODULOS;
  }
}

function saveProgressosToStorage(list: ProgressoModuloAluno[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "progresso_modulos" } })
    );
  } catch (err) {
    console.error("Erro ao salvar progressos de módulos:", err);
  }
}

export const progressoModuloRepository = {
  async listar(filters?: ProgressoModuloFilters): Promise<ProgressoModuloAluno[]> {
    const list = loadProgressosFromStorage();
    let filtrados = list;

    if (filters?.alunoId) {
      filtrados = filtrados.filter((p) => p.alunoId === filters.alunoId);
    }
    if (filters?.moduloId) {
      filtrados = filtrados.filter((p) => p.moduloId === filters.moduloId);
    }
    if (filters?.status && filters.status !== "todos") {
      filtrados = filtrados.filter((p) => p.status === filters.status);
    }

    return filtrados;
  },

  async obter(alunoId: string, moduloId: string): Promise<ProgressoModuloAluno | null> {
    const list = loadProgressosFromStorage();
    return list.find((p) => p.alunoId === alunoId && p.moduloId === moduloId) || null;
  },

  /**
   * Obtém ou inicializa o progresso de um discente em um determinado módulo.
   */
  async obterOuInicializar(alunoId: string, moduloId: string): Promise<ProgressoModuloAluno> {
    const list = loadProgressosFromStorage();
    let prog = list.find((p) => p.alunoId === alunoId && p.moduloId === moduloId);

    if (prog) return prog;

    const modulo = await moduloRepository.obterPorId(moduloId);
    const indicadoresIniciais = modulo
      ? verificarCriteriosConclusaoModulo(modulo, {})
      : {
          presencaPercentual: null,
          atividadesConcluidas: 0,
          mediaAvaliacoesObjetivas: null,
          criteriosCumpridos: 0,
          totalCriteriosAplicaveis: 0,
          percentualConclusao: 0,
          todosCriteriosCumpridos: false,
        };

    const agora = new Date().toISOString();
    prog = {
      id: `pma-${alunoId}-${moduloId}`,
      alunoId,
      moduloId,
      status: "em_andamento",
      iniciadoEm: agora,
      indicadoresCalculados: indicadoresIniciais,
      historicoMudancas: [
        {
          id: `log-${Date.now()}`,
          dataHora: agora,
          autorId: "sistema",
          autorNome: "Sistema MTD",
          acao: "inicio",
          statusAnterior: "nao_iniciado",
          novoStatus: "em_andamento",
          justificativa: "Início do módulo pelo discente.",
        },
      ],
      atualizadoEm: agora,
    };

    list.push(prog);
    saveProgressosToStorage(list);
    return prog;
  },

  /**
   * Atualiza os indicadores calculados do módulo com base nos dados do aluno.
   * Se todos os critérios forem cumpridos:
   * - Se exige validação humana, muda para 'aguardando_validacao' (não avança automaticamente).
   * - Se NÃO exige validação humana, conclui automaticamente.
   */
  async sincronizarIndicadores(
    alunoId: string,
    moduloId: string,
    dadosAtuais: DadosVerificacaoModulo
  ): Promise<ProgressoModuloAluno> {
    const list = loadProgressosFromStorage();
    let index = list.findIndex((p) => p.alunoId === alunoId && p.moduloId === moduloId);
    const modulo = await moduloRepository.obterPorId(moduloId);

    if (!modulo) {
      throw new Error(`Módulo ${moduloId} não encontrado.`);
    }

    const agora = new Date().toISOString();

    if (index === -1) {
      const novo = await this.obterOuInicializar(alunoId, moduloId);
      index = list.findIndex((p) => p.id === novo.id);
    }

    const progressoAtual = list[index];
    const novosIndicadores = verificarCriteriosConclusaoModulo(modulo, dadosAtuais);

    // Se já estiver concluído pelo professor, não regride status automaticamente
    if (progressoAtual.status === "concluido") {
      progressoAtual.indicadoresCalculados = novosIndicadores;
      progressoAtual.atualizadoEm = agora;
      saveProgressosToStorage(list);
      return progressoAtual;
    }

    let novoStatus: StatusProgressoModulo = progressoAtual.status;

    if (novosIndicadores.todosCriteriosCumpridos) {
      if (modulo.criteriosConclusao.exigeValidacaoHumana) {
        novoStatus = "aguardando_validacao";
      } else {
        novoStatus = "concluido";
        progressoAtual.concluidoEm = agora;
      }
    } else if (progressoAtual.status === "aguardando_validacao") {
      novoStatus = "em_andamento";
    }

    if (novoStatus !== progressoAtual.status) {
      progressoAtual.historicoMudancas.push({
        id: `log-${Date.now()}`,
        dataHora: agora,
        autorId: "sistema",
        autorNome: "Sistema MTD",
        acao: novoStatus === "concluido" ? "conclusao_automatica" : "inicio",
        statusAnterior: progressoAtual.status,
        novoStatus,
        justificativa: "Critérios de conclusão recalculados automaticamente.",
      });
      progressoAtual.status = novoStatus;
    }

    progressoAtual.indicadoresCalculados = novosIndicadores;
    progressoAtual.atualizadoEm = agora;
    saveProgressosToStorage(list);
    return progressoAtual;
  },

  /**
   * Validação humana do professor para conclusão do módulo.
   */
  async validarConclusaoProfessor(
    alunoId: string,
    moduloId: string,
    professorId: string,
    professorNome: string,
    observacao: string = "Conclusão pedagógica do módulo validada pelo professor responsável."
  ): Promise<OperationResult<ProgressoModuloAluno>> {
    const list = loadProgressosFromStorage();
    const index = list.findIndex((p) => p.alunoId === alunoId && p.moduloId === moduloId);
    if (index === -1) {
      return { success: false, error: "Registro de progresso não encontrado." };
    }

    const obsFinal = observacao?.trim() || "Conclusão pedagógica do módulo validada pelo professor responsável.";

    const agora = new Date().toISOString();
    const prog = list[index];
    const statusAnterior = prog.status;

    prog.status = "concluido";
    prog.concluidoEm = agora;
    prog.professorValidadorId = professorId;
    prog.professorValidadorNome = professorNome;
    prog.observacaoValidacao = obsFinal;
    prog.indicadoresCalculados.validacaoHumanaConcluida = true;
    prog.indicadoresCalculados.criteriosCumpridos = Math.min(
      prog.indicadoresCalculados.totalCriteriosAplicaveis,
      prog.indicadoresCalculados.criteriosCumpridos + 1
    );
    prog.indicadoresCalculados.percentualConclusao = 100;
    prog.indicadoresCalculados.todosCriteriosCumpridos = true;
    prog.atualizadoEm = agora;

    prog.historicoMudancas.push({
      id: `log-${Date.now()}`,
      dataHora: agora,
      autorId: professorId,
      autorNome: professorNome,
      acao: "validacao_professor",
      statusAnterior,
      novoStatus: "concluido",
      justificativa: obsFinal,
    });

    saveProgressosToStorage(list);
    return { success: true, data: prog };
  },

  /**
   * Reabertura de módulo previamente concluído mediante justificativa obrigatória.
   */
  async reabrirModulo(
    alunoId: string,
    moduloId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ): Promise<OperationResult<ProgressoModuloAluno>> {
    const list = loadProgressosFromStorage();
    const index = list.findIndex((p) => p.alunoId === alunoId && p.moduloId === moduloId);
    if (index === -1) {
      return { success: false, error: "Registro de progresso não encontrado." };
    }

    if (!justificativa || justificativa.trim().length < 10) {
      return {
        success: false,
        error: "A justificativa para reabertura de módulo deve possuir no mínimo 10 caracteres.",
      };
    }

    const agora = new Date().toISOString();
    const prog = list[index];
    const statusAnterior = prog.status;

    prog.status = "reaberto";
    prog.concluidoEm = undefined;
    prog.atualizadoEm = agora;

    prog.historicoMudancas.push({
      id: `log-${Date.now()}`,
      dataHora: agora,
      autorId: professorId,
      autorNome: professorNome,
      acao: "reabertura",
      statusAnterior,
      novoStatus: "reaberto",
      justificativa: justificativa.trim(),
    });

    saveProgressosToStorage(list);
    return { success: true, data: prog };
  },
};
