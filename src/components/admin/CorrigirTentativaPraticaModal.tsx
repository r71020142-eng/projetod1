"use client";

import React, { useState, useEffect } from "react";
import {
  TentativaAvaliacao,
  Avaliacao,
  FeedbackAvaliacao,
  CorrecaoItemRubrica,
  ResultadoAvaliacao,
} from "@/types";
import { calcularNotaAvaliacaoPratica } from "@/data/pedagogicoCalculos";
import {
  X,
  Award,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
} from "lucide-react";

interface CorrigirTentativaPraticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tentativa: TentativaAvaliacao | null;
  avaliacao: Avaliacao | null;
  professorId: string;
  professorNome: string;
  onSalvarCorrecao: (
    tentativaId: string,
    nota: number,
    resultado: ResultadoAvaliacao,
    feedback: FeedbackAvaliacao
  ) => Promise<void>;
}

export function CorrigirTentativaPraticaModal({
  isOpen,
  onClose,
  tentativa,
  avaliacao,
  professorId,
  professorNome,
  onSalvarCorrecao,
}: CorrigirTentativaPraticaModalProps) {
  const [itensRubrica, setItensRubrica] = useState<CorrecaoItemRubrica[]>([]);
  const [pontosFortes, setPontosFortes] = useState("");
  const [pontosADesenvolver, setPontosADesenvolver] = useState("");
  const [orientacoes, setOrientacoes] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [resultado, setResultado] = useState<ResultadoAvaliacao>("aprovado");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (tentativa && avaliacao?.rubrica) {
      if (tentativa.feedback?.itensRubrica && tentativa.feedback.itensRubrica.length > 0) {
        setItensRubrica(tentativa.feedback.itensRubrica);
        setPontosFortes(tentativa.feedback.pontosFortes || "");
        setPontosADesenvolver(tentativa.feedback.pontosADesenvolver || "");
        setOrientacoes(tentativa.feedback.orientacoes || "");
        setObservacoesInternas(tentativa.feedback.observacoesInternas || "");
        setResultado(tentativa.resultado || "aprovado");
      } else {
        // Inicializar com a pontuação padrão da rubrica
        const inicial: CorrecaoItemRubrica[] = avaliacao.rubrica.map((cr) => ({
          criterioId: cr.id,
          pontosAtribuidos: cr.pontuacaoMaxima,
          comentario: "",
        }));
        setItensRubrica(inicial);
        setPontosFortes("");
        setPontosADesenvolver("");
        setOrientacoes("");
        setObservacoesInternas("");
        setResultado("aprovado");
      }
    }
    setErro("");
    setLoading(false);
  }, [tentativa, avaliacao, isOpen]);

  if (!isOpen || !tentativa || !avaliacao) return null;

  const rubrica = avaliacao.rubrica || [];

  // Cálculo da nota em tempo real
  const { notaFinal } = calcularNotaAvaliacaoPratica(
    rubrica,
    itensRubrica,
    avaliacao.notaMaxima || 10
  );

  function handleItemScoreChange(criterioId: string, value: number) {
    const atualizados = itensRubrica.map((item) => {
      if (item.criterioId === criterioId) {
        return { ...item, pontosAtribuidos: value };
      }
      return item;
    });
    setItensRubrica(atualizados);
  }

  function handleItemCommentChange(criterioId: string, comment: string) {
    const atualizados = itensRubrica.map((item) => {
      if (item.criterioId === criterioId) {
        return { ...item, comentario: comment };
      }
      return item;
    });
    setItensRubrica(atualizados);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    // Validação de notas
    for (const item of itensRubrica) {
      const cr = rubrica.find((r) => r.id === item.criterioId);
      if (cr) {
        if (item.pontosAtribuidos < 0 || item.pontosAtribuidos > cr.pontuacaoMaxima) {
          setErro(
            `A pontuação para o critério "${cr.nome}" deve estar entre 0 e ${cr.pontuacaoMaxima}.`
          );
          return;
        }
      }
    }

    if (!pontosFortes.trim() && !pontosADesenvolver.trim() && !orientacoes.trim()) {
      setErro("Forneça ao menos um parecer pedagógico qualitativo para orientar o aluno.");
      return;
    }

    setLoading(true);
    try {
      const feedbackPayload: FeedbackAvaliacao = {
        corrigidoPorProfessorId: professorId,
        corrigidoPorProfessorNome: professorNome,
        corrigidoEm: new Date().toISOString(),
        itensRubrica,
        pontosFortes: pontosFortes.trim() || undefined,
        pontosADesenvolver: pontosADesenvolver.trim() || undefined,
        orientacoes: orientacoes.trim() || undefined,
        observacoesInternas: observacoesInternas.trim() || undefined,
        resultado,
      };

      await onSalvarCorrecao(tentativa!.id, notaFinal, resultado, feedbackPayload);
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar correção.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Award className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="font-semibold text-lg">Correção Pedagógica da Avaliação Prática</h2>
              <p className="text-xs text-slate-500">{avaliacao.titulo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Dados da Submissão */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{tentativa.alunoNome || "Aluno"}</span>
                <span className="text-slate-400">|</span>
                <span>Tentativa nº {tentativa.numeroTentativa} de {avaliacao.maxTentativas}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Enviada em: {new Date(tentativa.enviadaEm || tentativa.iniciadaEm).toLocaleString("pt-BR")}</span>
                {tentativa.atrasada && (
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                    Envio com atraso
                  </span>
                )}
              </div>
            </div>

            {/* Texto do aluno */}
            {tentativa.respostaPratica?.textoResposta && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Texto Enviado pelo Aluno:
                </span>
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {tentativa.respostaPratica.textoResposta}
                </div>
              </div>
            )}

            {/* Link externo do aluno */}
            {tentativa.respostaPratica?.linkExterno && (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Gravação / Link Externo (Áudio / Vídeo):
                </span>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200">
                  <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                  <a
                    href={tentativa.respostaPratica.linkExterno}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline truncate"
                  >
                    {tentativa.respostaPratica.linkExterno}
                  </a>
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                    Abre em nova aba
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rubrica */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Pontuação por Critério da Rubrica
              </h3>
              <div className="text-sm font-bold text-slate-800 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 flex items-center gap-2">
                <span>Nota Final Calculada:</span>
                <span className="text-purple-700 text-base">{notaFinal.toFixed(2)}</span>
                <span className="text-slate-400 font-normal">/ {avaliacao.notaMaxima}</span>
              </div>
            </div>

            <div className="space-y-4">
              {rubrica.map((cr, idx) => {
                const item = itensRubrica.find((i) => i.criterioId === cr.id) || {
                  criterioId: cr.id,
                  pontosAtribuidos: 0,
                  comentario: "",
                };

                return (
                  <div
                    key={cr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {idx + 1}. {cr.nome}
                        </h4>
                        {cr.descricao && (
                          <p className="text-xs text-slate-500 mt-0.5">{cr.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-semibold text-slate-700">Pontos:</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={cr.pontuacaoMaxima}
                          value={item.pontosAtribuidos}
                          onChange={(e) =>
                            handleItemScoreChange(cr.id, Number(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-center font-bold text-sm text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-xs text-slate-400 font-medium">
                          / {cr.pontuacaoMaxima}
                        </span>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.comentario || ""}
                        onChange={(e) => handleItemCommentChange(cr.id, e.target.value)}
                        placeholder="Comentário pontual sobre este critério (opcional)..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Qualitativo */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              2. Parecer Pedagógico Qualitativo (Visível ao Aluno)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Pontos Fortes Observados
                </label>
                <textarea
                  rows={3}
                  value={pontosFortes}
                  onChange={(e) => setPontosFortes(e.target.value)}
                  placeholder="Ex: Excelente clareza na entonação e uso natural de conectivos..."
                  className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/20 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                  Pontos a Desenvolver
                </label>
                <textarea
                  rows={3}
                  value={pontosADesenvolver}
                  onChange={(e) => setPontosADesenvolver(e.target.value)}
                  placeholder="Ex: Atenção ao passado simples de verbos irregulares..."
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/20 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Orientações de Estudo e Próximos Passos
              </label>
              <textarea
                rows={2}
                value={orientacoes}
                onChange={(e) => setOrientacoes(e.target.value)}
                placeholder="Ex: Revisar os cartões de verbos irregulares no módulo de Flashcards."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Decisão e Parecer Geral */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              3. Decisão da Avaliação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resultado Oficial *
                </label>
                <select
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value as ResultadoAvaliacao)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="aprovado">Aprovado (Critério cumprido)</option>
                  <option value="precisa_reforco">Precisa de Reforço (Aprovado com ressalvas)</option>
                  <option value="refazer">Refazer Avaliação (Nova tentativa)</option>
                  <option value="reprovado">Reprovado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Professor Validador
                </label>
                <input
                  type="text"
                  disabled
                  value={professorNome}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm"
                />
              </div>
            </div>

            {/* Observações internas sigilosas */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Observações Internas (Sigilosas — NUNCA Exibidas ao Aluno)</span>
              </div>
              <textarea
                rows={2}
                value={observacoesInternas}
                onChange={(e) => setObservacoesInternas(e.target.value)}
                placeholder="Notas confidenciais entre professores e coordenação pedagógica (ex: ritmo de evolução, perfil emocional)..."
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Salvando..." : "Publicar Correção"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
