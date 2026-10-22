import {
  Aula,
  AulaFilters,
  OperationResult,
  RegistroPresencaItem,
  ConflitoHorario,
  FrequenciaCalculada,
} from "@/types";
import { IAulaRepository } from "./contracts/repositoryContracts";
import { SEED_AULAS } from "./mockData";
import { turmaRepository } from "./turmaRepository";
import { professorRepository } from "./professorRepository";
import { alunoRepository } from "./alunoRepository";
import {
  validateAulaInput,
  checkConflitosHorario,
  calcularFrequencia,
  calcularFrequenciaTurma,
  normalizeText,
} from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_aulas_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Aula[] {
  if (!isBrowser()) {
    return [...SEED_AULAS];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_AULAS));
      return [...SEED_AULAS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Aula[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_AULAS));
    return [...SEED_AULAS];
  } catch (err) {
    console.warn("Aviso ao carregar aulas do localStorage, usando semente:", err);
    return [...SEED_AULAS];
  }
}

function saveToStorage(aulas: Aula[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(aulas));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "aulas" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir aulas no localStorage:", err);
    return false;
  }
}

function generateAulaId(existingList: Aula[]): string {
  const maxNum = existingList.reduce((acc, a) => {
    const match = a.id.match(/^aula-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `aula-${String(nextNum).padStart(3, "0")}`;
}

export const aulaLocalStorageRepository: IAulaRepository = {
  async listar(filters?: AulaFilters): Promise<Aula[]> {
    const list = loadFromStorage();

    if (!filters) {
      return [...list].sort(
        (a, b) =>
          new Date(`${b.data}T${b.horario}`).getTime() -
          new Date(`${a.data}T${a.horario}`).getTime()
      );
    }

    let result = [...list];

    // Filter by Turma
    if (filters.turmaId && filters.turmaId !== "todas") {
      result = result.filter((a) => a.turmaId === filters.turmaId);
    }

    // Filter by Professor
    if (filters.professorId && filters.professorId !== "todos") {
      result = result.filter((a) => a.professorId === filters.professorId);
    }

    // Filter by Status
    if (filters.status && filters.status !== "todos") {
      result = result.filter((a) => a.status === filters.status);
    }

    // Filter by exact Date
    if (filters.data) {
      result = result.filter((a) => a.data === filters.data);
    }

    // Filter by Date range
    if (filters.dataInicio) {
      result = result.filter((a) => a.data >= filters.dataInicio!);
    }
    if (filters.dataFim) {
      result = result.filter((a) => a.data <= filters.dataFim!);
    }

    // Search by title or turma name
    if (filters.busca && filters.busca.trim()) {
      const q = filters.busca.trim().toLowerCase();
      const todasTurmas = await turmaRepository.listar();
      const turmaMap = new Map(todasTurmas.map((t) => [t.id, t.nome.toLowerCase()]));

      result = result.filter((a) => {
        const matchesTitle = a.titulo.toLowerCase().includes(q);
        const turmaNome = turmaMap.get(a.turmaId) || "";
        const matchesTurma = turmaNome.includes(q);
        return matchesTitle || matchesTurma;
      });
    }

    // Default sort: Chronological ascending or descending depending on usage
    return result.sort(
      (a, b) =>
        new Date(`${a.data}T${a.horario}`).getTime() -
        new Date(`${b.data}T${b.horario}`).getTime()
    );
  },

  async obterPorId(id: string): Promise<Aula | null> {
    const list = loadFromStorage();
    const item = list.find((a) => a.id === id);
    return item ? { ...item } : null;
  },

  async listarPorTurma(turmaId: string): Promise<Aula[]> {
    const list = loadFromStorage();
    return list
      .filter((a) => a.turmaId === turmaId)
      .sort(
        (a, b) =>
          new Date(`${a.data}T${a.horario}`).getTime() -
          new Date(`${b.data}T${b.horario}`).getTime()
      );
  },

  async listarPorAluno(alunoId: string): Promise<Aula[]> {
    const turmasDoAluno = await turmaRepository.listarPorAluno(alunoId);
    const turmaIds = new Set(turmasDoAluno.map((t) => t.id));
    const list = loadFromStorage();

    return list
      .filter((a) => turmaIds.has(a.turmaId))
      .sort(
        (a, b) =>
          new Date(`${a.data}T${a.horario}`).getTime() -
          new Date(`${b.data}T${b.horario}`).getTime()
      );
  },

  async listarPorProfessor(professorId: string): Promise<Aula[]> {
    const list = loadFromStorage();
    return list
      .filter((a) => a.professorId === professorId)
      .sort(
        (a, b) =>
          new Date(`${a.data}T${a.horario}`).getTime() -
          new Date(`${b.data}T${b.horario}`).getTime()
      );
  },

  async obterProximaAulaAluno(alunoId: string): Promise<Aula | null> {
    const aulas = await this.listarPorAluno(alunoId);
    const agora = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

    const agendadas = aulas.filter(
      (a) => a.status === "agendada" && `${a.data}T${a.horario}` >= agora
    );

    if (agendadas.length > 0) {
      return agendadas[0]; // first upcoming
    }

    // If none in the future strictly, return the first agendada regardless
    const anyAgendada = aulas.filter((a) => a.status === "agendada");
    return anyAgendada.length > 0 ? anyAgendada[0] : null;
  },

  async listarProximas(limite = 5): Promise<Aula[]> {
    const list = loadFromStorage();
    const agora = new Date().toISOString().slice(0, 16);

    const futuras = list.filter((a) => a.status === "agendada" && `${a.data}T${a.horario}` >= agora);
    if (futuras.length >= limite) {
      return futuras.slice(0, limite);
    }
    // Fallback: any agendadas
    return list.filter((a) => a.status === "agendada").slice(0, limite);
  },

  async contarAgendadas(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((a) => a.status === "agendada").length;
  },

  async calcularFrequenciaGeral(): Promise<{
    porcentagem: number | null;
    totalAulas: number;
    presentes: number;
    ausentes: number;
    justificados: number;
  }> {
    const list = loadFromStorage();
    const concluidas = list.filter((a) => a.status === "concluida");

    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;

    for (const aula of concluidas) {
      if (aula.presencas) {
        for (const reg of Object.values(aula.presencas)) {
          if (reg.status === "presente") presentes++;
          else if (reg.status === "ausente") ausentes++;
          else if (reg.status === "justificado") justificados++;
        }
      }
    }

    const base = presentes + ausentes;
    const porcentagem = base > 0 ? Math.round((presentes / base) * 100) : null;

    return {
      porcentagem,
      totalAulas: concluidas.length,
      presentes,
      ausentes,
      justificados,
    };
  },

  async verificarConflitos(aulaCandidate: {
    id?: string;
    turmaId: string;
    professorId: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
    status: Aula["status"];
  }): Promise<ConflitoHorario[]> {
    const [todasAulas, todasTurmas, todosProfessores, todosAlunos] = await Promise.all([
      this.listar(),
      turmaRepository.listar(),
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    return checkConflitosHorario(
      aulaCandidate,
      todasAulas,
      todasTurmas,
      todosProfessores,
      todosAlunos
    );
  },

  async criar(
    dados: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas"> & {
      professorId?: string;
      presencas?: Record<string, RegistroPresencaItem>;
    }
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }> {
    const list = loadFromStorage();

    // Verify turma and get its professor & students
    const turma = await turmaRepository.obterPorId(dados.turmaId);
    if (!turma) {
      return { success: false, error: "Turma vinculada não encontrada." };
    }

    const professorId = dados.professorId || turma.professorId;
    const duracaoMinutos = dados.duracaoMinutos || 50;
    const zoomUrl = dados.linkZoom || dados.meetingUrl;

    const validation = validateAulaInput({
      turmaId: dados.turmaId,
      titulo: dados.titulo,
      data: dados.data,
      horario: dados.horario,
      duracaoMinutos,
      meetingUrl: zoomUrl,
      status: dados.status || "agendada",
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da aula antes de salvar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    // Check Schedule Conflicts
    const conflitos = await this.verificarConflitos!({
      turmaId: dados.turmaId,
      professorId,
      data: dados.data,
      horario: dados.horario,
      duracaoMinutos,
      status: dados.status || "agendada",
    });

    if (conflitos.length > 0) {
      return {
        success: false,
        error: "Não foi possível agendar a aula devido a conflito de horário com professor ou alunos.",
        conflitos,
      };
    }

    // Initialize presences for all students in the class
    const initialPresencas: Record<string, RegistroPresencaItem> = {};
    for (const aId of turma.alunoIds) {
      initialPresencas[aId] = dados.presencas?.[aId] || {
        status: "nao_registrado",
      };
    }

    const novaAula: Aula = {
      id: generateAulaId(list),
      turmaId: dados.turmaId,
      professorId,
      titulo: normalizeText(dados.titulo),
      data: dados.data,
      horario: dados.horario,
      duracaoMinutos,
      meetingUrl: zoomUrl ? zoomUrl.trim() : undefined,
      linkZoom: zoomUrl ? zoomUrl.trim() : undefined,
      topicoTrabalhado: dados.topicoTrabalhado ? normalizeText(dados.topicoTrabalhado) : undefined,
      status: dados.status || "agendada",
      observacoes: dados.observacoes ? normalizeText(dados.observacoes) : undefined,
      presencas: initialPresencas,
      dataCadastro: new Date().toISOString(),
    };

    const updatedList = [...list, novaAula];
    const saved = saveToStorage(updatedList);

    if (!saved && isBrowser()) {
      return { success: false, error: "Falha ao gravar aula no armazenamento local." };
    }

    return { success: true, data: novaAula };
  },

  async criarSequenciaSemanal(
    dadosBase: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas">,
    quantidadeEncontros: number
  ): Promise<OperationResult<Aula[]> & { conflitos?: ConflitoHorario[] }> {
    if (quantidadeEncontros < 1 || quantidadeEncontros > 24) {
      return { success: false, error: "Informe uma quantidade de encontros entre 1 e 24." };
    }

    const turma = await turmaRepository.obterPorId(dadosBase.turmaId);
    if (!turma) {
      return { success: false, error: "Turma vinculada não encontrada." };
    }

    const [, todasTurmas, todosProfessores, todosAlunos] = await Promise.all([
      this.listar(),
      turmaRepository.listar(),
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    const duracaoMinutos = dadosBase.duracaoMinutos || 50;
    const baseDate = new Date(`${dadosBase.data}T00:00:00`);
    const aulasGeradas: Aula[] = [];
    const list = loadFromStorage();

    const currentList = [...list];

    // Pre-validate all dates for conflicts before committing any save
    for (let i = 0; i < quantidadeEncontros; i++) {
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + i * 7);
      const dataStr = targetDate.toISOString().slice(0, 10);

      const conflitos = checkConflitosHorario(
        {
          turmaId: dadosBase.turmaId,
          professorId: turma.professorId,
          data: dataStr,
          horario: dadosBase.horario,
          duracaoMinutos,
          status: dadosBase.status || "agendada",
        },
        currentList,
        todasTurmas,
        todosProfessores,
        todosAlunos
      );

      if (conflitos.length > 0) {
        return {
          success: false,
          error: `Conflito de horário detectado no encontro #${i + 1} (${new Date(`${dataStr}T00:00:00`).toLocaleDateString("pt-BR")}).`,
          conflitos,
        };
      }

      // Initialize presences
      const initialPresencas: Record<string, RegistroPresencaItem> = {};
      for (const aId of turma.alunoIds) {
        initialPresencas[aId] = { status: "nao_registrado" };
      }

      const novaAula: Aula = {
        id: generateAulaId(currentList),
        turmaId: dadosBase.turmaId,
        professorId: turma.professorId,
        titulo: `${normalizeText(dadosBase.titulo)} (${i + 1}/${quantidadeEncontros})`,
        data: dataStr,
        horario: dadosBase.horario,
        duracaoMinutos,
        meetingUrl: dadosBase.meetingUrl ? dadosBase.meetingUrl.trim() : undefined,
        status: dadosBase.status || "agendada",
        observacoes: dadosBase.observacoes ? normalizeText(dadosBase.observacoes) : undefined,
        presencas: initialPresencas,
        dataCadastro: new Date().toISOString(),
      };

      currentList.push(novaAula);
      aulasGeradas.push(novaAula);
    }

    const saved = saveToStorage(currentList);
    if (!saved && isBrowser()) {
      return { success: false, error: "Falha ao gravar série de aulas no armazenamento local." };
    }

    return { success: true, data: aulasGeradas };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Aula, "id" | "dataCadastro">>
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: "Aula não encontrada." };
    }

    const current = list[index];
    const merged: Aula = { ...current, ...dados };

    const validation = validateAulaInput({
      turmaId: merged.turmaId,
      titulo: merged.titulo,
      data: merged.data,
      horario: merged.horario,
      duracaoMinutos: merged.duracaoMinutos,
      meetingUrl: merged.meetingUrl,
      status: merged.status,
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da aula.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    // Check conflicts if schedule changed and status is not cancelled
    if (
      merged.status !== "cancelada" &&
      (merged.data !== current.data ||
        merged.horario !== current.horario ||
        merged.duracaoMinutos !== current.duracaoMinutos ||
        merged.status !== current.status)
    ) {
      const conflitos = await this.verificarConflitos!({
        id: merged.id,
        turmaId: merged.turmaId,
        professorId: merged.professorId,
        data: merged.data,
        horario: merged.horario,
        duracaoMinutos: merged.duracaoMinutos,
        status: merged.status,
      });

      if (conflitos.length > 0) {
        return {
          success: false,
          error: "Conflito de horário ao atualizar aula.",
          conflitos,
        };
      }
    }

    const zoomUrl = dados.linkZoom || dados.meetingUrl || current.meetingUrl;
    list[index] = {
      ...merged,
      titulo: normalizeText(merged.titulo),
      observacoes: merged.observacoes ? normalizeText(merged.observacoes) : undefined,
      meetingUrl: zoomUrl ? zoomUrl.trim() : undefined,
      linkZoom: zoomUrl ? zoomUrl.trim() : undefined,
      topicoTrabalhado: merged.topicoTrabalhado ? normalizeText(merged.topicoTrabalhado) : undefined,
    };

    saveToStorage(list);
    return { success: true, data: list[index] };
  },

  async registrarPresencas(
    id: string,
    presencas: Record<string, RegistroPresencaItem>,
    topicoTrabalhadoOuConcluir?: string | boolean,
    observacoes?: string
  ): Promise<OperationResult<Aula>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: "Aula não encontrada." };
    }

    const aula = list[index];
    aula.presencas = {
      ...aula.presencas,
      ...presencas,
    };

    if (typeof topicoTrabalhadoOuConcluir === "boolean") {
      if (topicoTrabalhadoOuConcluir) aula.status = "concluida";
    } else if (typeof topicoTrabalhadoOuConcluir === "string") {
      aula.topicoTrabalhado = topicoTrabalhadoOuConcluir;
    }

    if (observacoes) {
      aula.observacoes = observacoes;
    }

    list[index] = { ...aula };
    saveToStorage(list);

    return { success: true, data: aula };
  },

  async cancelar(id: string, motivo?: string): Promise<OperationResult<Aula>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: "Aula não encontrada." };
    }

    list[index].status = "cancelada";
    if (motivo) {
      list[index].observacoes = list[index].observacoes
        ? `${list[index].observacoes} (Cancelada: ${motivo})`
        : `Cancelada: ${motivo}`;
    }
    saveToStorage(list);
    return { success: true, data: list[index] };
  },

  async concluir(id: string): Promise<OperationResult<Aula>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: "Aula não encontrada." };
    }

    list[index].status = "concluida";
    saveToStorage(list);
    return { success: true, data: list[index] };
  },

  async calcularFrequenciaAluno(alunoId: string): Promise<FrequenciaCalculada> {
    const list = loadFromStorage();
    const result = calcularFrequencia(alunoId, list);
    return {
      ...result,
      totalPresentes: result.presentes,
      totalAusentes: result.ausentes,
      totalJustificados: result.justificados,
    };
  },

  async calcularFrequenciaTurma(turmaId: string): Promise<FrequenciaCalculada> {
    const list = loadFromStorage();
    const result = calcularFrequenciaTurma(turmaId, list);
    return {
      ...result,
      totalPresentes: result.presentes,
      totalAusentes: result.ausentes,
      totalJustificados: result.justificados,
    };
  },
};
