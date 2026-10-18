import {
  CartaoProgressoAluno,
  EstadoCartaoAprendizagem,
  HistoricoRevisao,
  RespostaSRS,
} from "../types";

export const FATOR_FACILIDADE_PADRAO = 2.5;
export const FATOR_FACILIDADE_MINIMO = 1.3;

/**
 * Cria a estrutura inicial de progresso de um cartão para um determinado discente.
 * O cartão se inicia no estado 'novo' com facilidade 2.5 e intervalo 0.
 */
export function inicializarProgressoCartao(
  alunoId: string,
  cartaoId: string,
  baralhoId: string,
  dataReferencia: Date = new Date()
): CartaoProgressoAluno {
  const agoraIso = dataReferencia.toISOString();
  return {
    id: `cpa-${alunoId}-${cartaoId}`,
    alunoId,
    cartaoId,
    baralhoId,
    estado: "novo",
    totalRevisoes: 0,
    totalLapsos: 0,
    fatorFacilidade: FATOR_FACILIDADE_PADRAO,
    intervaloDias: 0,
    intervaloMinutos: undefined,
    proximaRevisao: agoraIso,
    criadoEm: agoraIso,
    atualizadoEm: agoraIso,
  };
}

export interface ResultadoCalculoSrs {
  novoProgresso: CartaoProgressoAluno;
  registroHistorico: Omit<HistoricoRevisao, "id">;
  reagendadoParaRevisao: boolean;
  reagendadoMinutos?: number;
  reagendadoMesmaSessao: boolean;
}

/**
 * Executa o cálculo determinístico de repetição espaçada inspirado nos princípios do SM-2
 * (sem afirmar implementação exata ou compatibilidade direta com o Anki),
 * garantindo ausência de efeitos colaterais e pura determinação matemática.
 *
 * Regras:
 * - "errei": lapsos incrementados, fator de facilidade penalizado em 0.20 (piso mínimo 1.3),
 *   estado alterado para 'aprendendo', intervalo de 10 minutos (proximaRevisao = agora + 10 min),
 *   reagendado para revisão futura (só reaparece se o tempo decorrido atingir os 10 minutos).
 * - "dificil": fator -0.15 (min 1.3). Se novo/aprendendo: 1 dia. Se revisão: intervalo * 1.2 dias.
 * - "bom": fator mantido. Se primeira revisão: 1 dia. Segunda: 3 dias. Subsequentes: intervalo * fator.
 * - "facil": fator +0.15. Se novo/aprendendo: 4 dias. Se revisão: intervalo * fator * 1.3.
 */
export function processarRespostaSRS(
  progressoAtual: CartaoProgressoAluno,
  resposta: RespostaSRS,
  dataReferencia: Date = new Date()
): ResultadoCalculoSrs {
  const estadoAnterior = progressoAtual.estado;
  const intervaloAnterior = progressoAtual.intervaloDias;
  const fatorAnterior = progressoAtual.fatorFacilidade;
  const totalRevisoesAnterior = progressoAtual.totalRevisoes;
  const totalLapsosAnterior = progressoAtual.totalLapsos;

  let novoFator = fatorAnterior;
  let novoEstado: EstadoCartaoAprendizagem = "revisao";
  let novoIntervaloDias = 0;
  let novoIntervaloMinutos: number | undefined = undefined;
  let reagendadoParaRevisao = false;
  let reagendadoMinutos: number | undefined = undefined;
  let reagendadoMesmaSessao = false;
  let novosLapsos = totalLapsosAnterior;
  const novasRevisoes = totalRevisoesAnterior + 1;

  const dataBase = new Date(dataReferencia.getTime());

  switch (resposta) {
    case "errei": {
      novosLapsos += 1;
      // Penalidade de facilidade respeitando piso de 1.3
      novoFator = Math.max(FATOR_FACILIDADE_MINIMO, Number((fatorAnterior - 0.2).toFixed(2)));
      novoEstado = "aprendendo";
      novoIntervaloDias = 0;
      novoIntervaloMinutos = 10;
      reagendadoParaRevisao = true;
      reagendadoMinutos = 10;
      reagendadoMesmaSessao = false; // Não é colocado imediatamente no fim da sessão; agendado para 10 min
      dataBase.setMinutes(dataBase.getMinutes() + 10);
      break;
    }

    case "dificil": {
      novoFator = Math.max(FATOR_FACILIDADE_MINIMO, Number((fatorAnterior - 0.15).toFixed(2)));
      novoEstado = "revisao";
      if (estadoAnterior === "novo" || estadoAnterior === "aprendendo" || totalRevisoesAnterior === 0) {
        novoIntervaloDias = 1;
      } else {
        novoIntervaloDias = Math.max(1, Math.round(Math.max(1, intervaloAnterior) * 1.2));
      }
      dataBase.setDate(dataBase.getDate() + novoIntervaloDias);
      break;
    }

    case "bom": {
      novoEstado = "revisao";
      if (estadoAnterior === "novo" || estadoAnterior === "aprendendo" || totalRevisoesAnterior === 0) {
        novoIntervaloDias = 1;
      } else if (totalRevisoesAnterior === 1) {
        novoIntervaloDias = 3;
      } else {
        novoIntervaloDias = Math.max(1, Math.round(Math.max(1, intervaloAnterior) * novoFator));
      }
      dataBase.setDate(dataBase.getDate() + novoIntervaloDias);
      break;
    }

    case "facil": {
      novoFator = Number((fatorAnterior + 0.15).toFixed(2));
      novoEstado = "revisao";
      if (estadoAnterior === "novo" || estadoAnterior === "aprendendo" || totalRevisoesAnterior === 0) {
        novoIntervaloDias = 4;
      } else {
        novoIntervaloDias = Math.max(1, Math.round(Math.max(1, intervaloAnterior) * novoFator * 1.3));
      }
      dataBase.setDate(dataBase.getDate() + novoIntervaloDias);
      break;
    }
  }

  const proximaRevisaoIso = dataBase.toISOString();
  const agoraIso = dataReferencia.toISOString();

  const novoProgresso: CartaoProgressoAluno = {
    ...progressoAtual,
    estado: novoEstado,
    totalRevisoes: novasRevisoes,
    totalLapsos: novosLapsos,
    fatorFacilidade: novoFator,
    intervaloDias: novoIntervaloDias,
    intervaloMinutos: novoIntervaloMinutos,
    proximaRevisao: proximaRevisaoIso,
    ultimaRevisao: agoraIso,
    ultimaResposta: resposta,
    atualizadoEm: agoraIso,
  };

  const registroHistorico: Omit<HistoricoRevisao, "id"> = {
    alunoId: progressoAtual.alunoId,
    cartaoId: progressoAtual.cartaoId,
    baralhoId: progressoAtual.baralhoId,
    dataHora: agoraIso,
    resposta,
    estadoAnterior,
    intervaloAnterior,
    novoEstado,
    novoIntervalo: novoIntervaloDias,
    proximaRevisao: proximaRevisaoIso,
    fatorAnterior,
    novoFator,
  };

  return {
    novoProgresso,
    registroHistorico,
    reagendadoParaRevisao,
    reagendadoMinutos,
    reagendadoMesmaSessao,
  };
}

/**
 * Retorna estimativas legíveis de tempo para cada um dos 4 botões de resposta
 * para exibição no cartão de estudos.
 */
export function estimarProximosIntervalos(
  progressoAtual: CartaoProgressoAluno,
  dataReferencia: Date = new Date()
): Record<RespostaSRS, { texto: string; dias: number; minutos?: number }> {
  const opcoes: RespostaSRS[] = ["errei", "dificil", "bom", "facil"];
  const resultado = {} as Record<RespostaSRS, { texto: string; dias: number; minutos?: number }>;

  for (const resp of opcoes) {
    const { novoProgresso } = processarRespostaSRS(progressoAtual, resp, dataReferencia);
    if (resp === "errei") {
      resultado[resp] = {
        texto: "10 min",
        dias: 0,
        minutos: 10,
      };
    } else {
      const d = novoProgresso.intervaloDias;
      resultado[resp] = {
        texto: d === 1 ? "1 dia" : `${d} dias`,
        dias: d,
      };
    }
  }

  return resultado;
}
