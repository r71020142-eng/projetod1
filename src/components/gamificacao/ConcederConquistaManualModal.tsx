"use client";

import React, { useState } from "react";
import { ModeloConquista, Aluno } from "@/types";
import { X, Award, Check, AlertCircle } from "lucide-react";

interface ConcederConquistaManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dados: {
    modeloId: string;
    alunoId: string;
    alunoNome: string;
    justificativaDocente: string;
  }) => Promise<void>;
  modelos: ModeloConquista[];
  alunos: Aluno[];
}

export function ConcederConquistaManualModal({
  isOpen,
  onClose,
  onSubmit,
  modelos,
  alunos,
}: ConcederConquistaManualModalProps) {
  const [modeloId, setModeloId] = useState(modelos[0]?.id || "");
  const [alunoId, setAlunoId] = useState(alunos[0]?.id || "");
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!justificativa.trim() || justificativa.trim().length < 10) {
      setErro("A justificativa pedagógica é obrigatória e deve ter pelo menos 10 caracteres.");
      return;
    }

    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) {
      setErro("Selecione um aluno válido.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      await onSubmit({
        modeloId,
        alunoId: aluno.id,
        alunoNome: aluno.nomeCompleto,
        justificativaDocente: justificativa.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao conceder conquista.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
            <Award className="w-5 h-5 text-purple-600" />
            <span>Concessão Manual de Conquista</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Selecione o Aluno *
            </label>
            <select
              value={alunoId}
              onChange={(e) => setAlunoId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nomeCompleto} ({a.email}) — Nível: {a.nivel}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Selecione o Reconhecimento / Conquista *
            </label>
            <select
              value={modeloId}
              onChange={(e) => setModeloId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} (+{m.pontosRecompensa} pts)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Justificativa Pedagógica do Docente *
            </label>
            <textarea
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo pedagógico que fundamenta a atribuição deste marco ao discente..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-400">
              Mínimo de 10 caracteres. A justificativa ficará salva no histórico do discente.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{salvando ? "Concedendo..." : "Conceder Reconhecimento"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
