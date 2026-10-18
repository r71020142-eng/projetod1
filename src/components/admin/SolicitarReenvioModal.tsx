"use client";

import React, { useState } from "react";
import { X, RotateCcw, AlertTriangle, Calendar, User } from "lucide-react";
import { SolicitacaoReenvio, Professor } from "@/types";

interface SolicitarReenvioModalProps {
  isOpen: boolean;
  alunoNome: string;
  professores: Professor[];
  professorAtivoId?: string;
  onClose: () => void;
  onConfirm: (solicitacao: SolicitacaoReenvio) => Promise<void>;
}

export function SolicitarReenvioModal({
  isOpen,
  alunoNome,
  professores,
  professorAtivoId,
  onClose,
  onConfirm,
}: SolicitarReenvioModalProps) {
  const [motivo, setMotivo] = useState("");
  const [orientacoes, setOrientacoes] = useState("");
  const [prazoSugerido, setPrazoSugerido] = useState("");
  const [professorId, setProfessorId] = useState(
    professorAtivoId || (professores[0]?.id || "prof-001")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (motivo.trim().length < 5) {
      setError("Informe o motivo da solicitação de reenvio (mínimo 5 caracteres).");
      return;
    }

    if (orientacoes.trim().length < 10) {
      setError("Forneça orientações claras para o aluno regravar (mínimo 10 caracteres).");
      return;
    }

    const prof = professores.find((p) => p.id === professorId) || professores[0];
    const professorNome = prof ? prof.nomeCompleto : "Professor MTD";

    setIsSubmitting(true);
    try {
      await onConfirm({
        motivo: motivo.trim(),
        orientacoes: orientacoes.trim(),
        prazoSugerido: prazoSugerido || undefined,
        solicitadoEm: new Date().toISOString(),
        professorId,
        professorNome,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao solicitar reenvio.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
          <div className="flex items-center gap-2 text-purple-900 font-bold">
            <RotateCcw className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              Solicitar Novo Vídeo • {alunoNome}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Preservação Histórica da Versão:</p>
              <p className="text-amber-800 mt-0.5">
                Ao solicitar um novo envio, o vídeo atual, as anotações e a data original serão arquivados como versão anterior no histórico do aluno. Nenhum dado será apagado.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Professor Responsável */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Professor Solicitante *
            </label>
            <div className="relative">
              <select
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500 font-medium text-slate-800"
              >
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeCompleto} ({p.status === "ativo" ? "Ativo" : "Inativo"})
                  </option>
                ))}
              </select>
              <User className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Motivo do Reenvio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo do Pedido de Reenvio *
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Áudio com ruído ambiente excessivo que dificultou avaliar a pronúncia; ou o vídeo foi interrompido antes do 2º minuto."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Orientações Pedagógicas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Orientações para a Nova Gravação *
            </label>
            <textarea
              rows={3}
              value={orientacoes}
              onChange={(e) => setOrientacoes(e.target.value)}
              placeholder="Ex: Por favor, grave em um ambiente silencioso, posicione a câmera na altura dos olhos e siga o roteiro de 6 passos sem ler anotações."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Prazo Sugerido (Opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prazo Sugerido para Envio (Opcional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={prazoSugerido}
                onChange={(e) => setPrazoSugerido(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500 text-slate-800"
              />
              <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Enviando..." : "Solicitar Reenvio"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
