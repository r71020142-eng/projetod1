"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  UserCheck,
  Check,
  HelpCircle,
} from "lucide-react";
import { Aula, Turma, Aluno, StatusPresenca, RegistroPresencaItem } from "@/types";
import { aulaRepository } from "@/data/aulaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { alunoRepository } from "@/data/alunoRepository";

interface PresencaModalProps {
  isOpen: boolean;
  aula: Aula | null;
  onClose: () => void;
  onSuccess: (aulaAtualizada: Aula) => void;
}

export function PresencaModal({ isOpen, aula, onClose, onSuccess }: PresencaModalProps) {
  const [turma, setTurma] = useState<Turma | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [presencas, setPresencas] = useState<Record<string, { status: StatusPresenca; justificativa?: string }>>({});
  const [topicoTrabalhado, setTopicoTrabalhado] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [marcarComoConcluida, setMarcarComoConcluida] = useState(true);
  const [confirmarConclusaoPendente, setConfirmarConclusaoPendente] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!isOpen || !aula) return;
      setIsSubmitting(false);
      setLoading(true);
      setError(null);

      try {
        const turmaData = await turmaRepository.obterPorId(aula.turmaId);
        setTurma(turmaData);

        if (turmaData) {
          const todosAlunos = await alunoRepository.listar();
          const alunosMatriculados = todosAlunos.filter((a) =>
            turmaData.alunoIds.includes(a.id)
          );
          setAlunos(alunosMatriculados);

          // Populate presencas from existing or default to nao_registrado
          const initialPresencas: Record<string, { status: StatusPresenca; justificativa?: string }> = {};
          for (const alu of alunosMatriculados) {
            if (aula.presencas && aula.presencas[alu.id]) {
              initialPresencas[alu.id] = {
                status: aula.presencas[alu.id].status,
                justificativa: aula.presencas[alu.id].justificativa || "",
              };
            } else {
              initialPresencas[alu.id] = {
                status: "nao_registrado",
                justificativa: "",
              };
            }
          }
          setPresencas(initialPresencas);
        }

        setTopicoTrabalhado(aula.topicoTrabalhado || aula.titulo);
        setObservacoesGerais(aula.observacoes || "");
        setMarcarComoConcluida(aula.status !== "cancelada");
      } catch (err) {
        console.error("Erro ao carregar dados para presença:", err);
        setError("Não foi possível carregar os alunos da turma.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, aula]);

  if (!isOpen || !aula) return null;

  const handleStatusChange = (alunoId: string, status: StatusPresenca) => {
    setPresencas((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        status,
      },
    }));
  };

  const handleJustificativaChange = (alunoId: string, justificativa: string) => {
    setPresencas((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        justificativa,
      },
    }));
  };

  // Calculate live summary
  const summary = Object.values(presencas).reduce(
    (acc, cur) => {
      if (cur.status === "presente") acc.presentes++;
      else if (cur.status === "ausente") acc.ausentes++;
      else if (cur.status === "justificado") acc.justificados++;
      else if (cur.status === "nao_registrado") acc.naoRegistrados++;
      return acc;
    },
    { presentes: 0, ausentes: 0, justificados: 0, naoRegistrados: 0 }
  );

  const totalConsiderado = summary.presentes + summary.ausentes;
  const taxaPresenca =
    totalConsiderado > 0 ? `${Math.round((summary.presentes / totalConsiderado) * 100)}%` : "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if concluding class with students still "nao_registrado"
    if (marcarComoConcluida && summary.naoRegistrados > 0 && !confirmarConclusaoPendente) {
      setConfirmarConclusaoPendente(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build registro record
      const presencasPayload: Record<string, RegistroPresencaItem> = {};
      const dataHoraRegistro = new Date().toISOString();

      for (const aluno of alunos) {
        const item = presencas[aluno.id] || { status: "nao_registrado" };
        presencasPayload[aluno.id] = {
          alunoId: aluno.id,
          status: item.status,
          justificativa: item.justificativa?.trim() || undefined,
          registradoEm: dataHoraRegistro,
        };
      }

      const res = await aulaRepository.registrarPresencas(
        aula.id,
        presencasPayload,
        topicoTrabalhado.trim() || undefined,
        observacoesGerais.trim() || undefined
      );

      if (!res.success) {
        setError(res.error || "Falha ao registrar presença.");
        setIsSubmitting(false);
        return;
      }

      // If user kept marcarComoConcluida checked and aula was not already concluded
      if (marcarComoConcluida && res.data!.status !== "concluida") {
        await aulaRepository.concluir(aula.id);
        const updated = await aulaRepository.obterPorId(aula.id);
        if (updated) {
          onSuccess(updated);
          onClose();
          return;
        }
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar presenças:", err);
      setError("Erro inesperado ao registrar presenças.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-presenca-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-presenca-title" className="text-base font-bold text-slate-800">
                Registro de Presença da Aula
              </h2>
              <p className="text-xs text-slate-500">
                Turma: <span className="font-semibold text-slate-700">{turma?.nome || aula.turmaId}</span> • Data: {aula.data} às {aula.horario}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Info & Formula */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-purple-900 block">{aula.titulo}</span>
              <span className="text-purple-700">
                {alunos.length} {alunos.length === 1 ? "aluno matriculado" : "alunos matriculados"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-900 font-semibold shadow-xs">
                <span>Frequência:</span>
                <span className="text-purple-700 font-bold">{taxaPresenca}%</span>
              </div>
              <div className="text-[11px] text-purple-700">
                ({summary.presentes}P / {summary.ausentes}A / {summary.justificados}J / {summary.naoRegistrados}NR)
              </div>
            </div>
          </div>

          {/* Student Attendance List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700">
                Lista de Chamada dos Alunos
              </label>
              <span className="text-[11px] text-slate-400">
                * Toda nova chamada começa como Não registrado
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Carregando lista de alunos...</div>
            ) : alunos.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                Nenhum aluno matriculado nesta turma para registrar presença.
              </div>
            ) : (
              <div className="space-y-3">
                {alunos.map((aluno) => {
                  const item = presencas[aluno.id] || { status: "nao_registrado" };
                  return (
                    <div
                      key={aluno.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{aluno.nomeCompleto}</p>
                          <p className="text-xs text-slate-400">{aluno.email}</p>
                        </div>

                        {/* 4 Status Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              handleStatusChange(aluno.id, "nao_registrado");
                              setConfirmarConclusaoPendente(false);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              item.status === "nao_registrado"
                                ? "bg-slate-700 text-white shadow-xs ring-2 ring-slate-300"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            <HelpCircle className="h-3 w-3" />
                            <span>Não reg.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleStatusChange(aluno.id, "presente");
                              setConfirmarConclusaoPendente(false);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              item.status === "presente"
                                ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>Presente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleStatusChange(aluno.id, "ausente");
                              setConfirmarConclusaoPendente(false);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              item.status === "ausente"
                                ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-300"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            }`}
                          >
                            <X className="h-3 w-3 stroke-[3]" />
                            <span>Ausente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleStatusChange(aluno.id, "justificado");
                              setConfirmarConclusaoPendente(false);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              item.status === "justificado"
                                ? "bg-amber-500 text-white shadow-xs ring-2 ring-amber-300"
                                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Justificado</span>
                          </button>
                        </div>
                      </div>

                      {/* Optional Note or Justification */}
                      {(item.status === "justificado" || item.status === "ausente" || item.justificativa) && (
                        <input
                          type="text"
                          placeholder={
                            item.status === "justificado"
                              ? "Motivo da justificativa (ex: Consulta médica informada)"
                              : "Observação opcional sobre o discente"
                          }
                          value={item.justificativa || ""}
                          onChange={(e) => handleJustificativaChange(aluno.id, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tópico Trabalhado na Aula */}
          <div>
            <label htmlFor="topicoTrabalhado" className="block text-xs font-semibold text-slate-700 mb-1">
              Conteúdo / Tópico Trabalhado em Sala
            </label>
            <input
              id="topicoTrabalhado"
              type="text"
              placeholder="Ex: Treino de pronúncia e ritmo do Método Paulo, blocos de diálogo 1 e 2"
              value={topicoTrabalhado}
              onChange={(e) => setTopicoTrabalhado(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors"
            />
          </div>

          {/* Observações Gerais */}
          <div>
            <label htmlFor="observacoesGerais" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Pedagógicas da Sessão (opcional)
            </label>
            <textarea
              id="observacoesGerais"
              rows={2}
              placeholder="Observações de desempenho da turma, pontos a reforçar na próxima aula, etc."
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Concluir aula checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="marcar-concluida"
              type="checkbox"
              checked={marcarComoConcluida}
              onChange={(e) => setMarcarComoConcluida(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="marcar-concluida" className="text-xs font-medium text-slate-700 cursor-pointer">
              Marcar status da aula como <strong>Concluída</strong> ao salvar
            </label>
          </div>

          {/* Warning banner when concluding class with pending records */}
          {confirmarConclusaoPendente && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-950">
                    Confirmação obrigatória para conclusão da aula
                  </p>
                  <p className="text-amber-900">
                    Existem <strong>{summary.naoRegistrados} aluno(s)</strong> com presença <strong>&quot;Não registrado&quot;</strong>.
                    Deseja concluir a aula mesmo com esses registros pendentes?
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium">
                    * Registros &quot;Não registrado&quot; não serão transformados em falta e não entram no denominador da frequência oficial.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => setConfirmarConclusaoPendente(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Revisar Chamada
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleSubmit(e);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors"
                >
                  Confirmar Conclusão com Pendências
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || alunos.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Salvar Registro de Presença</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
