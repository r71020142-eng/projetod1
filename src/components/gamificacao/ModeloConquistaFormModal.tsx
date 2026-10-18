"use client";

import React, { useState } from "react";
import {
  ModeloConquista,
  CategoriaConquista,
  TipoCriterioConquista,
  TipoPremioConquista,
  StatusModeloConquista,
} from "@/types";
import { X, Trophy, AlertCircle, Save } from "lucide-react";

interface ModeloConquistaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dados: Partial<ModeloConquista>) => Promise<void>;
  modeloParaEditar?: ModeloConquista | null;
}

export function ModeloConquistaFormModal({
  isOpen,
  onClose,
  onSave,
  modeloParaEditar,
}: ModeloConquistaFormModalProps) {
  const [nome, setNome] = useState(modeloParaEditar?.nome || "");
  const [descricao, setDescricao] = useState(modeloParaEditar?.descricao || "");
  const [categoria, setCategoria] = useState<CategoriaConquista>(
    modeloParaEditar?.categoria || "avaliacoes_progresso"
  );
  const [icone, setIcone] = useState(modeloParaEditar?.icone || "Award");
  const [tipoCriterio, setTipoCriterio] = useState<TipoCriterioConquista>(
    modeloParaEditar?.tipoCriterio || "modulos_concluidos"
  );
  const [metaValor, setMetaValor] = useState(modeloParaEditar?.metaValor || 1);
  const [nivelRequerido, setNivelRequerido] = useState(modeloParaEditar?.nivelRequerido || "B1");
  const [tipoPremio, setTipoPremio] = useState<TipoPremioConquista>(
    modeloParaEditar?.tipoPremio || "badge"
  );
  const [pontosRecompensa, setPontosRecompensa] = useState(
    modeloParaEditar?.pontosRecompensa || 100
  );
  const [elegivelPlacaFisica, setElegivelPlacaFisica] = useState(
    modeloParaEditar?.elegivelPlacaFisica || false
  );
  const [status, setStatus] = useState<StatusModeloConquista>(
    modeloParaEditar?.status || "ativa"
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || nome.trim().length < 3) {
      setErro("O título da conquista deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Informe a descrição da conquista.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      await onSave({
        id: modeloParaEditar?.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        categoria,
        icone,
        tipoCriterio,
        metaValor: Number(metaValor),
        nivelRequerido: tipoCriterio === "nivel_alcancado" ? nivelRequerido : undefined,
        tipoPremio,
        pontosRecompensa: Number(pontosRecompensa),
        elegivelPlacaFisica: Boolean(elegivelPlacaFisica),
        status,
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar conquista.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
            <Trophy className="w-5 h-5 text-amber-600" />
            <span>{modeloParaEditar ? "Editar Conquista" : "Nova Conquista Pedagógica"}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Título da Conquista *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Marco Operacional B1 • Independência Comunicativa"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição Pedagógica *
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que o aluno precisa realizar para alcançar este marco..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaConquista)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="aulas_frequencia">Aulas e Frequência</option>
                <option value="flashcards_estudo">Flashcards e Hábitos</option>
                <option value="avaliacoes_progresso">Avaliações e Módulos</option>
                <option value="comunidade_engajamento">Comunidade e Interação</option>
                <option value="nivel_marco">Marco de Nível Operacional</option>
                <option value="placas_reconhecimento">Placas de Reconhecimento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ícone / Badge Visual
              </label>
              <select
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Award">Award (Medalha de Honra)</option>
                <option value="Trophy">Trophy (Troféu)</option>
                <option value="ShieldCheck">ShieldCheck (Escudo de Validação)</option>
                <option value="Flame">Flame (Chama / Sequência de Estudos)</option>
                <option value="Layers">Layers (Baralhos de Cartões)</option>
                <option value="Clock">Clock (Tempo Dedicado)</option>
                <option value="Compass">Compass (Bússola / Início)</option>
                <option value="CheckCircle">CheckCircle (Conclusão de Módulo)</option>
                <option value="MessageSquare">MessageSquare (Comunidade)</option>
                <option value="Sparkles">Sparkles (Especial)</option>
                <option value="Star">Star (Estrela)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Critério *
              </label>
              <select
                value={tipoCriterio}
                onChange={(e) => setTipoCriterio(e.target.value as TipoCriterioConquista)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="horas_aulas">Horas de Aula com Presença</option>
                <option value="streak_dias">Dias de Sequência (Flashcards)</option>
                <option value="flashcards_revisados">Total de Cartões Revisados</option>
                <option value="modulos_concluidos">Módulos Concluídos</option>
                <option value="avaliacoes_aprovadas">Avaliações Práticas Aprovadas</option>
                <option value="nivel_alcancado">Nível Operacional Alcançado</option>
                <option value="participacao_comunidade">Participações na Comunidade</option>
                <option value="manual">Concessão Manual pelo Professor</option>
              </select>
            </div>

            {tipoCriterio === "nivel_alcancado" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nível Operacional Requerido *
                </label>
                <select
                  value={nivelRequerido}
                  onChange={(e) => setNivelRequerido(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="A1">A1 (Iniciante)</option>
                  <option value="A2">A2 (Básico)</option>
                  <option value="B1">B1 (Independente Intermediário)</option>
                  <option value="B2">B2 (Usuário Independente Avançado)</option>
                  <option value="C1">C1 (Autonomia Plena)</option>
                  <option value="C2">C2 (Domínio Fluente)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Valor da Meta *
                </label>
                <input
                  type="number"
                  min={1}
                  value={metaValor}
                  onChange={(e) => setMetaValor(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Prêmio *
              </label>
              <select
                value={tipoPremio}
                onChange={(e) => setTipoPremio(e.target.value as TipoPremioConquista)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="badge">Badge Digital</option>
                <option value="pontos">Apenas Pontos</option>
                <option value="placa_digital">Placa Digital com Código</option>
                <option value="placa_fisica">Placa Física de Reconhecimento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Pontos de Recompensa
              </label>
              <input
                type="number"
                min={0}
                step={5}
                value={pontosRecompensa}
                onChange={(e) => setPontosRecompensa(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={elegivelPlacaFisica}
                onChange={(e) => setElegivelPlacaFisica(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              Habilitar solicitação de Placa Física para este marco
            </label>

            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-slate-500">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusModeloConquista)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 text-xs"
              >
                <option value="ativa">Ativa</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivada">Arquivada</option>
              </select>
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
              <Save className="w-3.5 h-3.5" />
              <span>{salvando ? "Salvando..." : "Salvar Conquista"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
