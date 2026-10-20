"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  History,
  Clock,
} from "lucide-react";
import { Entrega, Atividade, Aluno } from "@/types";
import { entregaRepository } from "@/data/entregaRepository";
import { StatusEntregaBadge } from "@/components/common/MaterialBadges";

interface CorrecaoEntregaModalProps {
  isOpen: boolean;
  entrega: Entrega | null;
  atividade: Atividade | null;
  aluno: Aluno | null;
  onClose: () => void;
  onSuccess: (entregaAtualizada: Entrega) => void;
}

export function CorrecaoEntregaModal({
  isOpen,
  entrega,
  atividade,
  aluno,
  onClose,
  onSuccess,
}: CorrecaoEntregaModalProps) {
  const [feedback, setFeedback] = useState("");
  const [pontuacao, setPontuacao] = useState<string>("");
  const [motivoReenvio, setMotivoReenvio] = useState("");
  const [modoReenvio, setModoReenvio] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entrega) {
      setFeedback(entrega.feedback || "");
      setPontuacao(
        entrega.pontuacao !== undefined && entrega.pontuacao !== null
          ? String(entrega.pontuacao)
          : ""
      );
      setMotivoReenvio("");
      setModoReenvio(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, entrega]);

  if (!isOpen || !entrega || !atividade) return null;

  const handleSalvarCorrecao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await entregaRepository.corrigir(entrega.id, "prof-001", {
        feedback,
        pontuacao: pontuacao.trim().length > 0 ? Number(pontuacao) : null,
      });

      if (!res.success) {
        setError(res.error || "Erro ao salvar correção.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao corrigir entrega:", err);
      setError("Erro inesperado ao salvar correção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSolicitarReenvio = async () => {
    if (!motivoReenvio || motivoReenvio.trim().length < 5) {
      setError("Descreva as orientações e o motivo do reenvio (mínimo 5 caracteres).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await entregaRepository.solicitarReenvio(
        entrega.id,
        "prof-001",
        motivoReenvio.trim()
      );

      if (!res.success) {
        setError(res.error || "Erro ao solicitar reenvio.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao solicitar reenvio:", err);
      setError("Erro inesperado ao solicitar reenvio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correcao-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="correcao-modal-title" className="text-base font-bold text-slate-800">
                Avaliação Pedagógica da Entrega
              </h2>
              <p className="text-xs text-slate-500">
                Aluno: <span className="font-semibold text-slate-700">{aluno?.nomeCompleto || entrega.alunoId}</span>
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
        <div className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Activity Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">{atividade.titulo}</span>
              <StatusEntregaBadge status={entrega.status} />
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">{atividade.instrucoes}</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
              {entrega.entregueEm && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Entregue em: {new Date(entrega.entregueEm).toLocaleString("pt-BR")}
                </span>
              )}
              {atividade.pontuacaoMaxima && (
                <span>Pontuação máxima: {atividade.pontuacaoMaxima} pts</span>
              )}
            </div>
          </div>

          {/* Student Response Display */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Resposta Enviada pelo Aluno:
            </label>

            {entrega.respostaTexto && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 font-sans text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                {entrega.respostaTexto}
              </div>
            )}

            {entrega.respostaLink && (
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-sky-800 block">Link de Entrega:</span>
                  <a
                    href={entrega.respostaLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-sky-700 underline font-medium truncate block hover:text-sky-900"
                  >
                    {entrega.respostaLink}
                  </a>
                </div>
                <a
                  href={entrega.respostaLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir</span>
                </a>
              </div>
            )}
          </div>

          {/* Submission History if any */}
          {entrega.historicoEnvios && entrega.historicoEnvios.length > 0 && (
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <History className="h-4 w-4 text-purple-600" />
                <span>Histórico de Envios Anteriores ({entrega.historicoEnvios.length})</span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {entrega.historicoEnvios.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="p-2.5 rounded-lg bg-white border border-purple-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-purple-800">
                      <span>Versão {i + 1} • {new Date(h.enviadoEm).toLocaleString("pt-BR")}</span>
                      {h.motivoReenvio && (
                        <span className="font-semibold text-purple-700">Reenvio solicitado</span>
                      )}
                    </div>
                    {h.respostaTexto && (
                      <p className="text-slate-600 italic line-clamp-2 text-[11px] bg-slate-50 p-1.5 rounded">
                        &quot;{h.respostaTexto}&quot;
                      </p>
                    )}
                    {h.motivoReenvio && (
                      <p className="text-amber-800 text-[11px]">
                        <strong>Motivo:</strong> {h.motivoReenvio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correction Form / Reenvio Toggle */}
          {!modoReenvio ? (
            <form onSubmit={handleSalvarCorrecao} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label htmlFor="correcao-feedback" className="block text-xs font-semibold text-slate-700 mb-1">
                  Feedback Pedagógico ao Aluno *
                </label>
                <textarea
                  id="correcao-feedback"
                  rows={4}
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Oriente o discente sobre acertos, pontos de pronúncia, escolha de vocabulário e dicas práticas de melhoria contínua..."
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors resize-none"
                />
              </div>

              {atividade.pontuacaoMaxima && (
                <div className="w-48">
                  <label htmlFor="correcao-pontuacao" className="block text-xs font-semibold text-slate-700 mb-1">
                    Pontuação (Máx: {atividade.pontuacaoMaxima} pts)
                  </label>
                  <input
                    id="correcao-pontuacao"
                    type="number"
                    step="0.5"
                    min="0"
                    max={atividade.pontuacaoMaxima}
                    value={pontuacao}
                    onChange={(e) => setPontuacao(e.target.value)}
                    placeholder="Ex: 9.5"
                    className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModoReenvio(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Solicitar Reenvio ao Aluno</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span>Salvar Correção</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Resubmission Mode */
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2">
                <RotateCcw className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Solicitação de Reenvio</h4>
                  <p className="text-[11px] text-purple-800">
                    A versão atual será preservada no histórico e a atividade será desbloqueada para nova submissão pelo aluno.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="motivo-reenvio" className="block text-xs font-semibold text-purple-900 mb-1">
                  Motivo e Orientações para o Reenvio *
                </label>
                <textarea
                  id="motivo-reenvio"
                  rows={3}
                  required
                  value={motivoReenvio}
                  onChange={(e) => setMotivoReenvio(e.target.value)}
                  placeholder="Explique o que precisa ser ajustado ou refeito antes da nova avaliação..."
                  className="w-full px-3 py-2 rounded-xl text-xs border border-purple-200 bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModoReenvio(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSolicitarReenvio}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && (
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Confirmar Solicitação de Reenvio</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
