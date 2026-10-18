"use client";

import React, { useState } from "react";
import { SolicitacaoPlacaFisica, StatusPlacaFisica } from "@/types";
import { X, Trophy, Check, History, Truck } from "lucide-react";

interface GerenciarPlacaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dados: {
    novoStatus: StatusPlacaFisica;
    observacao?: string;
    codigoRastreio?: string;
    observacoesInternas?: string;
  }) => Promise<void>;
  solicitacao: SolicitacaoPlacaFisica;
  responsavelNome: string;
}

export function GerenciarPlacaModal({
  isOpen,
  onClose,
  onSubmit,
  solicitacao,
  responsavelNome,
}: GerenciarPlacaModalProps) {
  const [novoStatus, setNovoStatus] = useState<StatusPlacaFisica>(solicitacao.status);
  const [observacao, setObservacao] = useState("");
  const [codigoRastreio, setCodigoRastreio] = useState(solicitacao.codigoRastreio || "");
  const [observacoesInternas, setObservacoesInternas] = useState(
    solicitacao.observacoesInternas || ""
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await onSubmit({
        novoStatus,
        observacao: observacao.trim() || undefined,
        codigoRastreio: codigoRastreio.trim() || undefined,
        observacoesInternas: observacoesInternas.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar status da placa.");
    } finally {
      setSalvando(false);
    }
  }

  const statusLabels: Record<StatusPlacaFisica, string> = {
    elegivel: "Elegível (Aguardando interesse)",
    interesse_registrado: "Interesse Registrado pelo Aluno",
    solicitada: "Solicitada",
    em_analise: "Em Análise Pedagógica",
    aprovado: "Aprovado para Produção",
    aprovada: "Aprovada para Produção",
    em_producao: "Em Produção / Gravação a Laser",
    pronta: "Pronta",
    enviado: "Enviado / Em Trânsito",
    enviada: "Enviada / Em Trânsito",
    entregue: "Entregue ao Aluno",
    rejeitada: "Rejeitada",
    cancelado: "Cancelado",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div>
              <span>Gerenciar Placa Física • {solicitacao.alunoNome}</span>
              {responsavelNome && (
                <span className="block text-[10px] text-slate-400 font-normal">
                  Responsável: {responsavelNome}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {erro}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Conquista:</span>
              <span className="font-bold text-slate-900">{solicitacao.conquistaNome || solicitacao.modeloNome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Identificador demonstrativo:</span>
              <span className="font-mono font-bold text-indigo-600">{solicitacao.codigoValidacao || solicitacao.codigoAutenticidade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Solicitado em:</span>
              <span className="text-slate-700">
                {new Date(solicitacao.dataSolicitacao || solicitacao.dataInteresse || solicitacao.atualizadoEm || 0).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Atualizar Status da Placa *
            </label>
            <select
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as StatusPlacaFisica)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {(Object.keys(statusLabels) as StatusPlacaFisica[]).map((st) => (
                <option key={st} value={st}>
                  {statusLabels[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Código de Rastreio Demonstrativo (Opcional)
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={codigoRastreio}
                onChange={(e) => setCodigoRastreio(e.target.value)}
                placeholder="Ex: BR-MTD-987452-EXP"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Mensagem para o Aluno na Atualização
            </label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Sua placa metálica personalizada foi gravada a laser com sucesso."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Observações Internas da Equipe (Sigilosas / Não visíveis para o aluno)
            </label>
            <textarea
              rows={2}
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Ex: Aluno confirmou telefone por WhatsApp. Endereço checado diretamente..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Histórico de Transições */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-600" />
              Histórico de Status:
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(solicitacao.historicoStatus || []).map((h, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-0.5"
                >
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{h.status ? statusLabels[h.status] : (h.statusNovo ? statusLabels[h.statusNovo] : "Em Análise")}</span>
                    <span className="text-slate-400">
                      {new Date(h.dataHora || h.data || 0).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    Por: {h.responsavelNome} {h.observacao && `— ${h.observacao}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{salvando ? "Salvando..." : "Salvar Alterações"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
