"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";
import { Turma, Aluno } from "@/types";
import { turmaRepository } from "@/data/turmaRepository";
import { alunoRepository } from "@/data/alunoRepository";

interface MatricularAlunoModalProps {
  isOpen: boolean;
  turma: Turma | null;
  onClose: () => void;
  onSuccess: (turmaAtualizada: Turma) => void;
}

export function MatricularAlunoModal({
  isOpen,
  turma,
  onClose,
  onSuccess,
}: MatricularAlunoModalProps) {
  const [alunosAtivos, setAlunosAtivos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregarAlunos() {
      if (!isOpen || !turma) return;
      setLoading(true);
      setError(null);
      setSelectedAlunoId("");

      try {
        const todos = await alunoRepository.listar();
        // Filter only active students who are not already in this turma
        const disponiveis = todos.filter(
          (a) => a.status === "ativo" && !turma.alunoIds.includes(a.id)
        );
        setAlunosAtivos(disponiveis);
      } catch (err) {
        console.error("Erro ao listar alunos:", err);
        setError("Não foi possível carregar a lista de alunos.");
      } finally {
        setLoading(false);
      }
    }

    carregarAlunos();
  }, [isOpen, turma]);

  if (!isOpen || !turma) return null;

  const isIndividual = turma.modalidade === "individual";
  const isFull = turma.alunoIds.length >= turma.capacidade;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlunoId) {
      setError("Selecione um aluno para matricular.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await turmaRepository.matricularAluno(turma.id, selectedAlunoId);
      if (!res.success) {
        setError(res.error || "Não foi possível realizar a matrícula.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro ao matricular aluno:", err);
      setError("Erro inesperado ao realizar a matrícula.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-matricular-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-matricular-title" className="text-base font-bold text-slate-800">
                Matricular Aluno
              </h2>
              <p className="text-xs text-slate-500">
                Turma: <span className="font-medium text-slate-700">{turma.nome}</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status da Capacidade */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600">Ocupação da Turma:</span>
            <span className="font-bold text-slate-800">
              {turma.alunoIds.length} de {turma.capacidade} alunos ({isIndividual ? "Individual" : "Grupo"})
            </span>
          </div>

          {/* Full Capacity Warning */}
          {isFull && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Capacidade máxima atingida</p>
                <p className="mt-0.5">
                  Esta turma já atingiu sua capacidade planejada ({turma.capacidade} alunos). Para adicionar novos alunos, edite a capacidade da turma nas configurações.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Student */}
          {!isFull && (
            <div>
              <label htmlFor="aluno-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Selecione o Aluno Ativo <span className="text-rose-500">*</span>
              </label>

              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400">Carregando discentes disponíveis...</div>
              ) : alunosAtivos.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Nenhum discente ativo disponível para matrícula nesta turma.
                </div>
              ) : (
                <select
                  id="aluno-select"
                  value={selectedAlunoId}
                  onChange={(e) => setSelectedAlunoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors"
                >
                  <option value="">Selecione um discente...</option>
                  {alunosAtivos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nomeCompleto} — Nível: {a.nivel === "nao_avaliado" ? "Não avaliado" : a.nivel} ({a.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-400 mt-1.5">
                Apenas discentes com cadastro ativo e que ainda não estejam na turma são exibidos.
              </p>
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
              disabled={isSubmitting || isFull || loading || alunosAtivos.length === 0 || !selectedAlunoId}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Confirmar Matrícula</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
