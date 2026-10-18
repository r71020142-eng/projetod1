"use client";

import React, { useState } from "react";
import { X, Award, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { NivelAluno, Aluno } from "@/types";
import { NivelBadge } from "@/components/common/NivelBadge";

interface AplicarNivelModalProps {
  isOpen: boolean;
  aluno: Aluno;
  novoNivel: NivelAluno;
  professorNome: string;
  justificativaNivel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function AplicarNivelModal({
  isOpen,
  aluno,
  novoNivel,
  professorNome,
  justificativaNivel,
  onClose,
  onConfirm,
}: AplicarNivelModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao homologar nível.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <Award className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              Aplicar Nível Operacional ao Perfil
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
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Aluno(a) Selecionado(a)
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-900">{aluno.nomeCompleto}</p>
                <p className="text-xs text-slate-500">{aluno.email}</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">ID: {aluno.id}</span>
            </div>

            {/* Level Comparison */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3">
              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-1">
                  Nível Atual no Cadastro
                </span>
                <NivelBadge nivel={aluno.nivel} />
              </div>

              <div className="p-2 rounded-full bg-emerald-100 text-emerald-700">
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="text-right">
                <span className="block text-[11px] text-slate-500 font-medium mb-1">
                  Novo Nível Homologado
                </span>
                <NivelBadge nivel={novoNivel} />
              </div>
            </div>
          </div>

          {/* Justification summary */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-slate-700">Justificativa Pedagógica Registrada:</span>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed italic">
              &ldquo;{justificativaNivel}&rdquo;
            </div>
          </div>

          {/* Important Notices */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Aviso Pedagógico de Nivelamento Operacional</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Esta ação atualizará o cadastro do discente e registrará a transição no histórico de evolução de níveis com a assinatura de <strong>{professorNome}</strong>.
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              * A definição de nível na plataforma orienta turmas e materiais do Método Paulo e não constitui emissão de certificado formal CEFR.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Aplicando..." : "Confirmar e Aplicar Nível"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
