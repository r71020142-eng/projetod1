/**
 * Repositório Supabase para Presenças e Frequência (Etapa 10.3B1).
 *
 * Gerencia operações granulares de chamada, auditoria e cálculo de frequência
 * diretamente no Supabase PostgreSQL via RPCs transacionais com RLS.
 */

import { StatusPresenca, FrequenciaCalculada, OperationResult } from "@/types";
import { IPresencaRepository } from "./contracts/repositoryContracts";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Presenças] Cliente Supabase não pôde ser inicializado. Verifique as variáveis de ambiente."
    );
  }
  return client;
}

export const presencaSupabaseRepository: IPresencaRepository = {
  async salvarChamada(
    aulaId: string,
    presencas: Array<{
      alunoId: string;
      status: StatusPresenca;
      justificativa?: string;
      observacaoPedagogica?: string;
    }>,
    topicoTrabalhado?: string,
    observacoes?: string
  ): Promise<OperationResult<void>> {
    const supabase = getSupabase();

    const presencasPayload = presencas.map((p) => ({
      aluno_id: p.alunoId,
      status: p.status,
      justificativa: p.justificativa || null,
      observacao_pedagogica: p.observacaoPedagogica || null,
    }));

    const { error } = await supabase.rpc("salvar_chamada_aula", {
      p_aula_id: aulaId,
      p_presencas: presencasPayload,
      p_topico_trabalhado: topicoTrabalhado || null,
      p_observacoes: observacoes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mtd_academic_agenda_updated", { detail: { entity: "presencas", aulaId } })
      );
    }

    return { success: true };
  },

  async calcularFrequenciaAluno(alunoId: string, turmaId?: string): Promise<FrequenciaCalculada> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("calcular_frequencia_aluno", {
      p_aluno_id: alunoId,
      p_turma_id: turmaId || null,
    });

    if (error) {
      console.error("[presencaSupabaseRepository.calcularFrequenciaAluno] Erro:", error.message);
      return {
        totalAulasConcluidas: 0,
        presentes: 0,
        totalPresentes: 0,
        ausentes: 0,
        totalAusentes: 0,
        justificados: 0,
        totalJustificados: 0,
        naoRegistrados: 0,
        porcentagem: null,
        formulaExplicativa: "Frequência indisponível.",
      };
    }

    return data as FrequenciaCalculada;
  },
};
