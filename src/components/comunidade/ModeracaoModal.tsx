"use client";

import React, { useState } from "react";
import { AcaoModeracao } from "@/types";
import { X, ShieldAlert, Check } from "lucide-react";

interface ModeracaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (acao: AcaoModeracao, motivo: string) => Promise<void>;
  alvoTitulo?: string;
  isFixada?: boolean;
  statusAtual?: string;
}

export function ModeracaoModal({
  isOpen,
  onClose,
  onSubmit,
  alvoTitulo,
  isFixada,
  statusAtual,
}: ModeracaoModalProps) {
  const [acao, setAcao] = useState<AcaoModeracao>("ocultar");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      setErro("Informe o motivo ou justificativa pedagógica da ação de moderação.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      await onSubmit(acao, motivo);
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao moderar publicação.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Moderação de Conteúdo (Admin MTD)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {alvoTitulo && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 truncate">
              <strong>Item:</strong> &quot;{alvoTitulo}&quot; (Status atual: {statusAtual || "publicada"})
            </div>
          )}

          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {erro}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Ação a Executar *
            </label>
            <select
              value={acao}
              onChange={(e) => setAcao(e.target.value as AcaoModeracao)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ocultar">Ocultar (Não visível para alunos)</option>
              <option value="remover">Remover (Excluído da comunidade)</option>
              <option value="restaurar">Restaurar / Aprovar (Tornar publicada)</option>
              {isFixada ? (
                <option value="desafixar">Desafixar do topo da comunidade</option>
              ) : (
                <option value="fixar">Fixar no topo da comunidade</option>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Justificativa Pedagógica da Moderação *
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo pedagógico ou a regra violada..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{salvando ? "Salvando..." : "Confirmar Moderação"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
