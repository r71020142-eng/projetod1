"use client";

import React, { useState } from "react";
import {
  ProgressoModuloAluno,
  Modulo,
  Aluno,
  Avaliacao,
} from "@/types";
import {
  X,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// VALIDAR MÓDULO MODAL
// ============================================================================
interface ValidarModuloModalProps {
  isOpen: boolean;
  onClose: () => void;
  progresso: ProgressoModuloAluno | null;
  modulo: Modulo | null;
  aluno: Aluno | null;
  professorId: string;
  professorNome: string;
  onConfirmar: (
    alunoId: string,
    moduloId: string,
    professorId: string,
    professorNome: string,
    observacao?: string
  ) => Promise<void>;
}

export function ValidarModuloModal({
  isOpen,
  onClose,
  progresso,
  modulo,
  aluno,
  professorId,
  professorNome,
  onConfirmar,
}: ValidarModuloModalProps) {
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen || !progresso || !modulo || !aluno) return null;

  async function handleValidar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      await onConfirmar(
        aluno!.id,
        modulo!.id,
        professorId,
        professorNome,
        observacao.trim() || undefined
      );
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao validar conclusão do módulo.");
    } finally {
      setLoading(false);
    }
  }

  const ind = progresso.indicadoresCalculados;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-lg">Validação Pedagógica de Conclusão</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleValidar} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2 text-xs">
            <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Aluno: {aluno.nomeCompleto} ({aluno.id})
            </div>
            <div className="text-emerald-900">
              <strong>Módulo:</strong> {modulo.nome}
            </div>
            <div className="text-emerald-800">
              <strong>Critérios cumpridos:</strong> {ind.criteriosCumpridos} de {ind.totalCriteriosAplicaveis} (
              {ind.percentualConclusao.toFixed(0)}%)
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Ao confirmar, o status deste módulo será formalmente alterado para <strong>Concluído</strong>. O aluno será notificado e terá sua jornada pedagógica avançada com registro histórico auditável.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Observação / Parecer do Professor (Opcional)
            </label>
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Excelente evolução comunicativa ao longo de todo o módulo. Aluno pronto para avançar."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

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
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition"
            >
              {loading ? "Validando..." : "Confirmar Conclusão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// REABRIR MÓDULO MODAL
// ============================================================================
interface ReabrirModuloModalProps {
  isOpen: boolean;
  onClose: () => void;
  progresso: ProgressoModuloAluno | null;
  modulo: Modulo | null;
  aluno: Aluno | null;
  professorId: string;
  professorNome: string;
  onConfirmar: (
    alunoId: string,
    moduloId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ) => Promise<void>;
}

export function ReabrirModuloModal({
  isOpen,
  onClose,
  progresso,
  modulo,
  aluno,
  professorId,
  professorNome,
  onConfirmar,
}: ReabrirModuloModalProps) {
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen || !progresso || !modulo || !aluno) return null;

  async function handleReabrir(e: React.FormEvent) {
    e.preventDefault();
    if (!justificativa.trim()) {
      setErro("A justificativa pedagógica é obrigatória para reabrir um módulo.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      await onConfirmar(
        aluno!.id,
        modulo!.id,
        professorId,
        professorNome,
        justificativa.trim()
      );
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao reabrir módulo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <RotateCcw className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-lg">Reabertura de Módulo</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleReabrir} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1.5 text-xs text-purple-950">
            <div>
              <strong>Aluno:</strong> {aluno.nomeCompleto}
            </div>
            <div>
              <strong>Módulo:</strong> {modulo.nome}
            </div>
            <div>
              <strong>Status Atual:</strong> {progresso.status}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            A reabertura de módulo permite ao discente revisar conteúdos ou refazer avaliações. Esta ação exige justificativa pedagógica formal que constará no histórico do aluno.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Justificativa Pedagógica *
            </label>
            <textarea
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo pedagógico para a reabertura deste módulo (ex: reforço em estruturas gramaticais específicas)..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
              required
            />
          </div>

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
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-sm transition"
            >
              {loading ? "Reabrindo..." : "Confirmar Reabertura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// AUTORIZAR TENTATIVA EXTRA MODAL
// ============================================================================
interface AutorizarTentativaModalProps {
  isOpen: boolean;
  onClose: () => void;
  avaliacao: Avaliacao | null;
  aluno: Aluno | null;
  professorId: string;
  professorNome: string;
  onConfirmar: (
    avaliacaoId: string,
    alunoId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ) => Promise<void>;
}

export function AutorizarTentativaModal({
  isOpen,
  onClose,
  avaliacao,
  aluno,
  professorId,
  professorNome,
  onConfirmar,
}: AutorizarTentativaModalProps) {
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen || !avaliacao || !aluno) return null;

  async function handleAutorizar(e: React.FormEvent) {
    e.preventDefault();
    if (!justificativa.trim()) {
      setErro("A justificativa é obrigatória para liberar uma tentativa adicional.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      await onConfirmar(
        avaliacao!.id,
        aluno!.id,
        professorId,
        professorNome,
        justificativa.trim()
      );
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao autorizar tentativa extra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Autorizar Tentativa Extra</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAutorizar} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1.5 text-xs text-indigo-950">
            <div>
              <strong>Aluno:</strong> {aluno.nomeCompleto}
            </div>
            <div>
              <strong>Avaliação:</strong> {avaliacao.titulo}
            </div>
            <div>
              <strong>Limite Padrão:</strong> {avaliacao.maxTentativas} tentativas
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Esta ação permite que o aluno realize mais uma tentativa desta avaliação, mesmo tendo esgotado o limite configurado.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Justificativa Pedagógica *
            </label>
            <textarea
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: Aluno realizou tutoria de reforço e está autorizado a demonstrar o domínio dos critérios..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              required
            />
          </div>

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
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition"
            >
              {loading ? "Autorizando..." : "Autorizar Nova Tentativa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
