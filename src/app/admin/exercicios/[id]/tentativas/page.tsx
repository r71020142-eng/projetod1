"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
  X,
} from "lucide-react";
import { ExercicioInterativo, TentativaExercicio } from "@/types";
import { exercicioRepository } from "@/data/exercicioRepository";
import { tentativaExercicioRepository } from "@/data/tentativaExercicioRepository";

export default function ExercicioTentativasPage() {
  const params = useParams();
  const id = params?.id as string;

  const [exercicio, setExercicio] = useState<ExercicioInterativo | null>(null);
  const [tentativas, setTentativas] = useState<TentativaExercicio[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Detalhes da Tentativa
  const [tentativaSelecionada, setTentativaSelecionada] = useState<TentativaExercicio | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      try {
        setLoading(true);
        const [exData, tList] = await Promise.all([
          exercicioRepository.obterPorId(id),
          tentativaExercicioRepository.listarPorExercicio(id),
        ]);
        setExercicio(exData);
        setTentativas(tList);
      } catch (err) {
        console.error("Erro ao carregar tentativas do exercício:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Carregando histórico de tentativas...
      </div>
    );
  }

  if (!exercicio) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-rose-600">Exercício não encontrado.</p>
        <Link
          href="/admin/exercicios"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Exercícios
        </Link>
      </div>
    );
  }

  const concluidas = tentativas.filter((t) => t.status === "concluida");
  const alunosUnicos = new Set(tentativas.map((t) => t.alunoId)).size;
  const mediaNotas =
    concluidas.length > 0
      ? (
          concluidas.reduce((acc, t) => acc + (t.notaFinal || 0), 0) /
          concluidas.length
        ).toFixed(1)
      : "0.0";
  const aprovadas = concluidas.filter((t) => t.aprovado).length;
  const taxaAprovacao =
    concluidas.length > 0 ? Math.round((aprovadas / concluidas.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exercicios"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                {exercicio.nivel}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                {exercicio.tipo === "leitura_audio" ? "Leitura & Áudio" : "Múltipla Escolha"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Tentativas dos Alunos • {exercicio.titulo}
            </h1>
          </div>
        </div>

        <Link
          href={`/admin/exercicios/${exercicio.id}/editar`}
          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold self-start sm:self-auto"
        >
          Editar Exercício
        </Link>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total de Tentativas
          </p>
          <p className="text-2xl font-black text-slate-900">{tentativas.length}</p>
          <p className="text-[11px] text-slate-400">{concluidas.length} finalizadas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Alunos Praticantes
          </p>
          <p className="text-2xl font-black text-purple-700">{alunosUnicos}</p>
          <p className="text-[11px] text-slate-400">Alunos distintos</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Média de Nota
          </p>
          <p className="text-2xl font-black text-emerald-600">{mediaNotas}/10</p>
          <p className="text-[11px] text-slate-400">Pontuação proporcional</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Taxa de Aproveitamento
          </p>
          <p className="text-2xl font-black text-slate-900">{taxaAprovacao}%</p>
          <p className="text-[11px] text-emerald-600 font-semibold">Nota ≥ 7.0</p>
        </div>
      </div>

      {/* Tabela de Tentativas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Histórico Detalhado ({tentativas.length})
          </h2>
          <span className="text-xs text-slate-400">
            Snapshots imutáveis das resoluções
          </span>
        </div>

        {tentativas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Nenhum aluno realizou este exercício até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Aluno</th>
                  <th className="py-3 px-4">Tentativa</th>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Tempo</th>
                  <th className="py-3 px-4">Acertos</th>
                  <th className="py-3 px-4">Nota Final</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700 font-medium">
                {tentativas.map((t) => {
                  const minutos = Math.floor(t.tempoGastoSegundos / 60);
                  const segundos = t.tempoGastoSegundos % 60;
                  const dataFormatada = new Date(t.iniciadaEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {t.alunoNome || t.alunoId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                          #{t.numeroTentativa}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {dataFormatada}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {t.tempoGastoSegundos > 0
                          ? `${minutos}m ${segundos}s`
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.totalAcertos} de {t.totalQuestoes} ({t.percentualAproveitamento}%)
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {t.notaFinal.toFixed(1)}/10
                      </td>
                      <td className="py-3.5 px-4">
                        {t.status === "em_andamento" ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Em andamento
                          </span>
                        ) : t.aprovado ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aprovado
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Reforço
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setTentativaSelecionada(t)}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-purple-200"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Respostas
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Inspeção de Respostas da Tentativa */}
      {tentativaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  Respostas do Aluno • Tentativa #{tentativaSelecionada.numeroTentativa}
                </p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {tentativaSelecionada.alunoNome} • Nota: {tentativaSelecionada.notaFinal.toFixed(1)}/10
                </h3>
              </div>
              <button
                onClick={() => setTentativaSelecionada(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {tentativaSelecionada.questoesSnapshot?.map((q, idx) => {
                const respAluno = tentativaSelecionada.respostas?.find(
                  (r) => r.questaoId === q.id
                );
                const altEscolhida = q.alternativas?.find(
                  (a) => a.id === respAluno?.alternativaEscolhidaId
                );
                const altCorreta = q.alternativas?.find(
                  (a) => a.id === q.alternativaCorretaId
                );
                const acertou = Boolean(respAluno?.correta);

                return (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        <span className="text-purple-600 mr-1.5">{idx + 1}.</span>
                        {q.enunciado}
                      </p>
                      {acertou ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Acertou (+{q.pontos} pts)
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1 shrink-0">
                          <XCircle className="h-3.5 w-3.5" /> Errou (0 pts)
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center gap-2">
                        <span className="font-semibold text-slate-500">
                          Alternativa selecionada pelo aluno:
                        </span>
                        <span
                          className={`font-bold ${
                            acertou ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {altEscolhida ? altEscolhida.texto : "Nenhuma resposta registrada"}
                        </span>
                      </div>

                      {!acertou && altCorreta && (
                        <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center gap-2 text-emerald-900">
                          <span className="font-bold">Gabarito correto:</span>
                          <span className="font-semibold">{altCorreta.texto}</span>
                        </div>
                      )}

                      {q.explicacao && (
                        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                          <span className="font-bold">Explicação: </span>
                          {q.explicacao}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setTentativaSelecionada(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
