import {
  TentativaExercicio,
  RespostaItemExercicio,
  OperationResult,
} from "@/types";
import { SEED_TENTATIVAS_EXERCICIOS } from "./mockData";
import { exercicioLocalStorageRepository } from "./exercicioLocalStorageRepository";
import {
  corrigirQuestaoObjetiva,
  calcularNotaAvaliacaoObjetiva,
} from "./pedagogicoCalculos";

const STORAGE_KEY = "mtd_demonstrativo_tentativas_exercicios_v1";

export function loadTentativasFromStorage(): TentativaExercicio[] {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") {
    return SEED_TENTATIVAS_EXERCICIOS;
  }
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(SEED_TENTATIVAS_EXERCICIOS)
        );
      } else if (globalThis.localStorage) {
        globalThis.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(SEED_TENTATIVAS_EXERCICIOS)
        );
      }
      return SEED_TENTATIVAS_EXERCICIOS;
    }
    return JSON.parse(raw) as TentativaExercicio[];
  } catch (err) {
    console.error("Erro ao carregar tentativas de exercícios do storage:", err);
    return SEED_TENTATIVAS_EXERCICIOS;
  }
}

export function saveTentativasToStorage(list: TentativaExercicio[]): void {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") return;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("mtd_storage_updated", {
          detail: { entity: "tentativas_exercicios" },
        })
      );
    } else if (globalThis.localStorage) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error("Erro ao salvar tentativas no storage:", err);
  }
}

export const tentativaExercicioLocalStorageRepository = {
  async iniciarTentativa(dados: {
    exercicioId: string;
    alunoId: string;
    alunoNome?: string;
  }): Promise<OperationResult<TentativaExercicio>> {
    try {
      const exercicio = await exercicioLocalStorageRepository.obterPorId(dados.exercicioId);
      if (!exercicio) {
        return { success: false, error: "Exercício não encontrado." };
      }

      const list = loadTentativasFromStorage();
      const tentativasAnteriores = list.filter(
        (t) => t.exercicioId === dados.exercicioId && t.alunoId === dados.alunoId
      );

      // Se houver tentativa em andamento, retorna ela
      const emAndamento = tentativasAnteriores.find((t) => t.status === "em_andamento");
      if (emAndamento) {
        return { success: true, data: emAndamento };
      }

      const proximoNumero = tentativasAnteriores.length + 1;
      const agora = new Date().toISOString();
      const novaId = `tex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      // Snapshot imutável das questões para manter integridade
      const questoesSnapshot = JSON.parse(JSON.stringify(exercicio.questoes));

      const novaTentativa: TentativaExercicio = {
        id: novaId,
        exercicioId: exercicio.id,
        exercicioTitulo: exercicio.titulo,
        exercicioTipo: exercicio.tipo,
        exercicioNivel: exercicio.nivel,
        versaoExercicio: exercicio.versao || 1,
        alunoId: dados.alunoId,
        alunoNome: dados.alunoNome || "Aluno",
        numeroTentativa: proximoNumero,
        iniciadaEm: agora,
        tempoGastoSegundos: 0,
        status: "em_andamento",
        respostas: [],
        questoesSnapshot,
        totalQuestoes: questoesSnapshot.length,
        totalAcertos: 0,
        totalErros: 0,
        pontosObtidos: 0,
        pontosTotais: exercicio.notaMaxima || 10,
        notaFinal: 0,
        percentualAproveitamento: 0,
        aprovado: false,
        politicaGabarito: exercicio.politicaGabarito,
      };

      list.push(novaTentativa);
      saveTentativasToStorage(list);

      return { success: true, data: novaTentativa };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error)?.message || "Erro ao iniciar tentativa de exercício.",
      };
    }
  },

  async concluirTentativa(dados: {
    tentativaId: string;
    respostas: { questaoId: string; alternativaEscolhidaId?: string }[];
    tempoGastoSegundos: number;
  }): Promise<OperationResult<TentativaExercicio>> {
    try {
      const list = loadTentativasFromStorage();
      const idx = list.findIndex((t) => t.id === dados.tentativaId);
      if (idx === -1) {
        return { success: false, error: "Tentativa não encontrada." };
      }

      const tentativa = list[idx];
      const agora = new Date().toISOString();
      const questoes = tentativa.questoesSnapshot || [];

      // Correção estrita e determinística reaproveitando pedagogicoCalculos.ts
      const mapaRespostasEntrada = new Map<string, string | undefined>();
      dados.respostas.forEach((r) => mapaRespostasEntrada.set(r.questaoId, r.alternativaEscolhidaId));

      const respostasProcessadas: RespostaItemExercicio[] = [];
      let totalAcertos = 0;
      let totalErros = 0;

      for (const q of questoes) {
        const altEscolhida = mapaRespostasEntrada.get(q.id);
        const res = corrigirQuestaoObjetiva(q, altEscolhida);
        if (res.correta) {
          totalAcertos++;
        } else {
          totalErros++;
        }
        respostasProcessadas.push({
          questaoId: q.id,
          alternativaEscolhidaId: altEscolhida,
          correta: res.correta,
          pontosObtidos: res.pontosObtidos,
          respondidaEm: agora,
        });
      }

      // Cálculo da nota usando a fórmula proporcional oficial
      const calculo = calcularNotaAvaliacaoObjetiva(
        questoes,
        respostasProcessadas.map((r) => ({
          questaoId: r.questaoId,
          alternativaEscolhidaId: r.alternativaEscolhidaId,
          correta: r.correta,
          pontosObtidos: r.pontosObtidos || 0,
        })),
        tentativa.pontosTotais || 10
      );

      const percentual =
        questoes.length > 0 ? Math.round((totalAcertos / questoes.length) * 100) : 0;
      const aprovado = calculo.notaFinal >= 7.0;

      const tentativaConcluida: TentativaExercicio = {
        ...tentativa,
        status: "concluida",
        concluidaEm: agora,
        tempoGastoSegundos: dados.tempoGastoSegundos || 0,
        respostas: respostasProcessadas,
        totalAcertos,
        totalErros,
        pontosObtidos: calculo.somaPontosObtidos,
        notaFinal: calculo.notaFinal,
        percentualAproveitamento: percentual,
        aprovado,
      };

      list[idx] = tentativaConcluida;
      saveTentativasToStorage(list);

      return { success: true, data: tentativaConcluida };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error)?.message || "Erro ao concluir tentativa.",
      };
    }
  },

  async obterPorId(id: string): Promise<TentativaExercicio | null> {
    const list = loadTentativasFromStorage();
    const item = list.find((t) => t.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  },

  async listarPorAluno(
    alunoId: string,
    exercicioId?: string
  ): Promise<TentativaExercicio[]> {
    const list = loadTentativasFromStorage();
    return list
      .filter((t) => t.alunoId === alunoId)
      .filter((t) => (!exercicioId ? true : t.exercicioId === exercicioId))
      .sort((a, b) => new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime());
  },

  async listarPorExercicio(exercicioId: string): Promise<TentativaExercicio[]> {
    const list = loadTentativasFromStorage();
    return list
      .filter((t) => t.exercicioId === exercicioId)
      .sort((a, b) => new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime());
  },

  async obterUltimaTentativa(
    alunoId: string,
    exercicioId: string
  ): Promise<TentativaExercicio | null> {
    const list = loadTentativasFromStorage();
    const doAluno = list
      .filter((t) => t.alunoId === alunoId && t.exercicioId === exercicioId)
      .sort((a, b) => new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime());

    return doAluno[0] ? JSON.parse(JSON.stringify(doAluno[0])) : null;
  },

  async obterResumoDesempenho(alunoId: string): Promise<{
    totalConcluidos: number;
    mediaNotas: number;
    totalAcertos: number;
    totalQuestoes: number;
    percentualGeral: number;
  }> {
    const list = loadTentativasFromStorage();
    const concluidas = list.filter(
      (t) => t.alunoId === alunoId && t.status === "concluida"
    );

    if (concluidas.length === 0) {
      return {
        totalConcluidos: 0,
        mediaNotas: 0,
        totalAcertos: 0,
        totalQuestoes: 0,
        percentualGeral: 0,
      };
    }

    const totalConcluidos = concluidas.length;
    const somaNotas = concluidas.reduce((acc, t) => acc + (t.notaFinal || 0), 0);
    const mediaNotas = Number((somaNotas / totalConcluidos).toFixed(1));
    const totalAcertos = concluidas.reduce((acc, t) => acc + (t.totalAcertos || 0), 0);
    const totalQuestoes = concluidas.reduce((acc, t) => acc + (t.totalQuestoes || 0), 0);
    const percentualGeral =
      totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    return {
      totalConcluidos,
      mediaNotas,
      totalAcertos,
      totalQuestoes,
      percentualGeral,
    };
  },
};
