"use client";

import React, { useState } from "react";
import { X, Trophy, AlertCircle, CheckCircle2, PhoneCall } from "lucide-react";

interface SolicitarPlacaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  alunoNome: string;
  marcoNome: string;
}

export function SolicitarPlacaModal({
  isOpen,
  onClose,
  onSubmit,
  alunoNome,
  marcoNome,
}: SolicitarPlacaModalProps) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  async function handleConfirmar() {
    setSalvando(true);
    setErro("");
    try {
      await onSubmit();
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar solicitação.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Trophy className="w-5 h-5 text-amber-600" />
            <span>Solicitação de Placa Física de Reconhecimento</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-slate-500">Parabéns pela conquista,</p>
            <h3 className="font-bold text-slate-900 text-base">{alunoNome}</h3>
            <p className="text-xs font-semibold text-amber-800">
              Marco: {marcoNome}
            </p>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Como funciona o processo de entrega da sua placa?</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              O envio da placa física é um processo exclusivo para alunos elegíveis do Método Paulo. Nossa equipe pedagógica entrará em contato com você diretamente para confirmar detalhes e disponibilidade logística.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1.5">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Fluxo Pedagógico de Produção:
            </span>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
              <li>Validação da elegibilidade do marco operacional pelo professor</li>
              <li>Manifestação de interesse registrada no sistema</li>
              <li>Contato da equipe para conferência e confirmação</li>
              <li>Gravação a laser personalizada da sua placa com código único</li>
              <li>Envio seguro com código de rastreio demonstrativo</li>
            </ol>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Para sua privacidade e segurança, nenhum endereço ou dado sensível é armazenado localmente no navegador.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{salvando ? "Registrando..." : "Confirmar Manifestação de Interesse"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
