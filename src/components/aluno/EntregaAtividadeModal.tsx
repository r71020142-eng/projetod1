"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  BookOpen,
  Award,
  History,
} from "lucide-react";
import { Atividade, Entrega, Material } from "@/types";
import { entregaRepository } from "@/data/entregaRepository";
import { materialRepository } from "@/data/materialRepository";
import { StatusEntregaBadge } from "@/components/common/MaterialBadges";

interface EntregaAtividadeModalProps {
  isOpen: boolean;
  atividade: Atividade | null;
  alunoId: string;
  onClose: () => void;
  onSuccess: (entrega: Entrega) => void;
}

export function EntregaAtividadeModal({
  isOpen,
  atividade,
  alunoId,
  onClose,
  onSuccess,
}: EntregaAtividadeModalProps) {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [respostaTexto, setRespostaTexto] = useState("");
  const [respostaLink, setRespostaLink] = useState("");
  const [materialRelacionado, setMaterialRelacionado] = useState<Material | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!isOpen || !atividade) return;
      setError(null);
      setFeedbackSuccess(null);

      try {
        const ent = await entregaRepository.obterPorAtividadeEAluno(atividade.id, alunoId);
        setEntrega(ent);

        if (ent) {
          setRespostaTexto(ent.respostaTexto || "");
          setRespostaLink(ent.respostaLink || "");
        } else {
          setRespostaTexto("");
          setRespostaLink("");
        }

        if (atividade.materialRelacionadoId) {
          const mat = await materialRepository.obterPorId(atividade.materialRelacionadoId);
          setMaterialRelacionado(mat);
        } else {
          setMaterialRelacionado(null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados da entrega:", err);
      }
    }

    loadData();
  }, [isOpen, atividade, alunoId]);

  if (!isOpen || !atividade) return null;

  const isBloqueadaParaEdicao =
    entrega?.status === "entregue" ||
    entrega?.status === "atrasada" ||
    entrega?.status === "corrigida";

  const handleSalvarRascunho = async () => {
    setIsSubmitting(true);
    setError(null);
    setFeedbackSuccess(null);

    try {
      const res = await entregaRepository.salvarRascunho(atividade.id, alunoId, {
        respostaTexto,
        respostaLink,
      });

      if (!res.success) {
        setError(res.error || "Falha ao salvar rascunho.");
        setIsSubmitting(false);
        return;
      }

      setEntrega(res.data!);
      setFeedbackSuccess("Rascunho salvo com sucesso! Você pode continuar editando antes de entregar.");
      onSuccess(res.data!);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Erro inesperado ao salvar rascunho.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEntregar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFeedbackSuccess(null);

    try {
      const res = await entregaRepository.enviarEntrega(atividade.id, alunoId, {
        respostaTexto,
        respostaLink,
      });

      if (!res.success) {
        setError(res.error || "Falha ao enviar resposta da atividade.");
        setIsSubmitting(false);
        return;
      }

      setEntrega(res.data!);
      setFeedbackSuccess("Atividade entregue com sucesso! O professor irá avaliar em breve.");
      onSuccess(res.data!);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Erro inesperado ao enviar resposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-entrega-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-entrega-title" className="text-base font-bold text-slate-800">
                {atividade.titulo}
              </h2>
              <p className="text-xs text-slate-500">
                Envio de atividade do Método Paulo
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
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {feedbackSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{feedbackSuccess}</span>
            </div>
          )}

          {/* Activity Info Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">Instruções da Atividade:</span>
              <div className="flex items-center gap-2">
                {entrega && <StatusEntregaBadge status={entrega.status} />}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {atividade.instrucoes}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60 text-xs text-slate-500">
              {atividade.prazoEntrega && (
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  Prazo: {new Date(atividade.prazoEntrega).toLocaleString("pt-BR")}
                </span>
              )}
              {atividade.pontuacaoMaxima && (
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  Valor: {atividade.pontuacaoMaxima} pontos
                </span>
              )}
              {!atividade.permitirAtraso && (
                <span className="text-rose-600 text-[11px] font-semibold">
                  * Não permite envio com atraso
                </span>
              )}
            </div>

            {materialRelacionado && (
              <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    Material: {materialRelacionado.titulo}
                  </span>
                </div>
                {materialRelacionado.linkExterno && (
                  <a
                    href={materialRelacionado.linkExterno}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold shrink-0"
                  >
                    <span>Consultar</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Graded Feedback Card if status === corrigida */}
          {entrega?.status === "corrigida" && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Avaliação do Professor Concluída</span>
                </div>
                {entrega.pontuacao !== undefined && entrega.pontuacao !== null && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-xs shadow-2xs">
                    Nota: {entrega.pontuacao}{atividade.pontuacaoMaxima ? ` / ${atividade.pontuacaoMaxima}` : ""}
                  </span>
                )}
              </div>

              {entrega.feedback && (
                <div className="p-3 rounded-lg bg-white border border-emerald-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  <p className="font-semibold text-emerald-800 mb-1">Feedback do Tutor:</p>
                  {entrega.feedback}
                </div>
              )}

              {entrega.corrigidoEm && (
                <p className="text-[10px] text-emerald-700">
                  Avaliado em: {new Date(entrega.corrigidoEm).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {/* Resubmission Request Card if status === reenviar */}
          {entrega?.status === "reenviar" && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <RotateCcw className="h-4 w-4 text-purple-600" />
                <span>Reenvio Solicitado pelo Professor</span>
              </div>
              <p className="text-xs text-purple-800">
                O professor solicitou ajustes nesta atividade. Leia os comentários abaixo e envie uma nova versão:
              </p>
              {entrega.feedback && (
                <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs text-slate-800 whitespace-pre-wrap font-medium">
                  {entrega.feedback}
                </div>
              )}
            </div>
          )}

          {/* Submission History */}
          {entrega?.historicoEnvios && entrega.historicoEnvios.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <History className="h-3.5 w-3.5 text-slate-500" />
                <span>Versões Anteriores ({entrega.historicoEnvios.length})</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {entrega.historicoEnvios.map((h, i) => (
                  <div key={h.id || i} className="p-2 rounded bg-white border border-slate-200/80 text-[11px]">
                    <span className="text-slate-400">Versão {i + 1} • {new Date(h.enviadoEm).toLocaleString("pt-BR")}</span>
                    {h.motivoReenvio && (
                      <p className="text-purple-700 mt-0.5">Motivo do reenvio: {h.motivoReenvio}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleEntregar} className="space-y-3">
            {atividade.tipo === "texto" && (
              <div>
                <label htmlFor="aluno-resposta-texto" className="block text-xs font-semibold text-slate-700 mb-1">
                  Sua Resposta em Texto *
                </label>
                <textarea
                  id="aluno-resposta-texto"
                  rows={6}
                  disabled={isBloqueadaParaEdicao}
                  value={respostaTexto}
                  onChange={(e) => setRespostaTexto(e.target.value)}
                  placeholder="Escreva sua resposta ou roteiro aqui em inglês..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                    isBloqueadaParaEdicao
                      ? "bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed"
                      : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  }`}
                />
              </div>
            )}

            {atividade.tipo === "link" && (
              <div>
                <label htmlFor="aluno-resposta-link" className="block text-xs font-semibold text-slate-700 mb-1">
                  Link do seu Trabalho (URL externa HTTPS) *
                </label>
                <input
                  id="aluno-resposta-link"
                  type="url"
                  disabled={isBloqueadaParaEdicao}
                  value={respostaLink}
                  onChange={(e) => setRespostaLink(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                    isBloqueadaParaEdicao
                      ? "bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed"
                      : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  }`}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>

              {!isBloqueadaParaEdicao ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSalvarRascunho}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 text-slate-500" />
                    <span>Salvar Rascunho</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span>{entrega?.status === "reenviar" ? "Reenviar Atividade" : "Entregar Atividade"}</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  {entrega?.status === "corrigida"
                    ? "Atividade avaliada pelo corpo docente."
                    : "Atividade entregue. Aguardando correção."}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
