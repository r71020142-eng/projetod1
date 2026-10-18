"use client";

import React, { useState, useEffect } from "react";
import {
  Programa,
  Etapa,
  Modulo,
  CriteriosConclusaoModulo,
  NivelAluno,
  StatusPrograma,
  StatusEtapa,
  StatusModulo,
} from "@/types";
import { X, BookOpen, Layers, Milestone, Sliders, AlertCircle, Info } from "lucide-react";

// ============================================================================
// PROGRAMA MODAL
// ============================================================================
interface ProgramaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (programa: Partial<Programa>) => Promise<void>;
  programaParaEditar?: Programa | null;
}

export function ProgramaFormModal({
  isOpen,
  onClose,
  onSave,
  programaParaEditar,
}: ProgramaFormModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idioma, setIdioma] = useState("Inglês");
  const [duracaoMesesEstimada, setDuracaoMesesEstimada] = useState(12);
  const [status, setStatus] = useState<StatusPrograma>("ativo");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (programaParaEditar) {
      setNome(programaParaEditar.nome);
      setDescricao(programaParaEditar.descricao);
      setIdioma(programaParaEditar.idioma);
      setDuracaoMesesEstimada(programaParaEditar.duracaoMesesEstimada);
      setStatus(programaParaEditar.status);
    } else {
      setNome("");
      setDescricao("");
      setIdioma("Inglês");
      setDuracaoMesesEstimada(12);
      setStatus("ativo");
    }
    setErro("");
  }, [programaParaEditar, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("O nome do programa é obrigatório.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      await onSave({
        nome: nome.trim(),
        descricao: descricao.trim(),
        idioma: idioma.trim(),
        duracaoMesesEstimada: Number(duracaoMesesEstimada) || 12,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar programa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">
              {programaParaEditar ? "Editar Programa Pedagógico" : "Novo Programa Pedagógico"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Programa *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Programa de Fluência Método Paulo"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Visão geral e proposta pedagógica do programa..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Idioma
              </label>
              <input
                type="text"
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Duração Estimada (meses)
              </label>
              <input
                type="number"
                min={1}
                value={duracaoMesesEstimada}
                onChange={(e) => setDuracaoMesesEstimada(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Status do Programa
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusPrograma)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            >
              <option value="ativo">Ativo</option>
              <option value="rascunho">Rascunho</option>
              <option value="arquivado">Arquivado</option>
            </select>
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
              {loading ? "Salvando..." : "Salvar Programa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ETAPA MODAL
// ============================================================================
interface EtapaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (etapa: Partial<Etapa>) => Promise<void>;
  programaId: string;
  etapaParaEditar?: Etapa | null;
}

export function EtapaFormModal({
  isOpen,
  onClose,
  onSave,
  programaId,
  etapaParaEditar,
}: EtapaFormModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [objetivosText, setObjetivosText] = useState("");
  const [status, setStatus] = useState<StatusEtapa>("ativa");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (etapaParaEditar) {
      setNome(etapaParaEditar.nome);
      setDescricao(etapaParaEditar.descricao);
      setObjetivosText((etapaParaEditar.objetivos || []).join("\n"));
      setStatus(etapaParaEditar.status);
    } else {
      setNome("");
      setDescricao("");
      setObjetivosText("");
      setStatus("ativa");
    }
    setErro("");
  }, [etapaParaEditar, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("O nome da etapa é obrigatório.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      const objetivos = objetivosText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await onSave({
        programaId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        objetivos,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar etapa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">
              {etapaParaEditar ? "Editar Etapa Pedagógica" : "Nova Etapa Pedagógica"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Etapa *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Diagnóstico, Fundamentos, Desbloqueio..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Os nomes são demonstrativos e configuráveis conforme a evolução curricular do método.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Foco pedagógico desta fase..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Objetivos Gerais da Etapa (um por linha)
            </label>
            <textarea
              rows={3}
              value={objetivosText}
              onChange={(e) => setObjetivosText(e.target.value)}
              placeholder="Ex:&#10;Consolidar base gramatical&#10;Destravar segurança na fala"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Status da Etapa
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusEtapa)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            >
              <option value="ativa">Ativa</option>
              <option value="rascunho">Rascunho</option>
              <option value="arquivada">Arquivada</option>
            </select>
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
              {loading ? "Salvando..." : "Salvar Etapa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODULO MODAL
// ============================================================================
interface ModuloFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (modulo: Partial<Modulo>) => Promise<void>;
  etapaId: string;
  moduloParaEditar?: Modulo | null;
}

export function ModuloFormModal({
  isOpen,
  onClose,
  onSave,
  etapaId,
  moduloParaEditar,
}: ModuloFormModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivelReferenciaCEFR, setNivelReferenciaCEFR] = useState<NivelAluno | "">("");
  const [cargaHorariaEstimadaHoras, setCargaHorariaEstimadaHoras] = useState(20);
  const [objetivosText, setObjetivosText] = useState("");
  const [status, setStatus] = useState<StatusModulo>("ativo");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (moduloParaEditar) {
      setNome(moduloParaEditar.nome);
      setDescricao(moduloParaEditar.descricao);
      setNivelReferenciaCEFR(moduloParaEditar.nivelReferenciaCEFR || "");
      setCargaHorariaEstimadaHoras(moduloParaEditar.cargaHorariaEstimadaHoras || 20);
      setObjetivosText((moduloParaEditar.objetivosPedagogicos || []).join("\n"));
      setStatus(moduloParaEditar.status);
    } else {
      setNome("");
      setDescricao("");
      setNivelReferenciaCEFR("");
      setCargaHorariaEstimadaHoras(20);
      setObjetivosText("");
      setStatus("ativo");
    }
    setErro("");
  }, [moduloParaEditar, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("O nome do módulo é obrigatório.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      const objetivos = objetivosText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await onSave({
        etapaId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        nivelReferenciaCEFR: (nivelReferenciaCEFR as NivelAluno) || undefined,
        cargaHorariaEstimadaHoras: Number(cargaHorariaEstimadaHoras) || 20,
        objetivosPedagogicos: objetivos,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar módulo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Milestone className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">
              {moduloParaEditar ? "Editar Módulo Pedagógico" : "Novo Módulo Pedagógico"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Módulo *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Módulo 1 — Desbloqueio e Conexão"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Finalidade e conteúdos práticos deste módulo..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Referência CEFR (Opcional)
              </label>
              <select
                value={nivelReferenciaCEFR}
                onChange={(e) => setNivelReferenciaCEFR(e.target.value as NivelAluno)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              >
                <option value="">Sem referência</option>
                <option value="A1">A1 (Iniciante)</option>
                <option value="A2">A2 (Básico)</option>
                <option value="B1">B1 (Intermediário)</option>
                <option value="B2">B2 (Independente)</option>
                <option value="C1">C1 (Avançado)</option>
                <option value="C2">C2 (Proficiente)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">Apenas balizador curricular.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Carga Estimada (horas)
              </label>
              <input
                type="number"
                min={1}
                value={cargaHorariaEstimadaHoras}
                onChange={(e) => setCargaHorariaEstimadaHoras(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Objetivos Pedagógicos (um por linha)
            </label>
            <textarea
              rows={3}
              value={objetivosText}
              onChange={(e) => setObjetivosText(e.target.value)}
              placeholder="Ex:&#10;Expressar rotinas diárias com naturalidade&#10;Superar medo de falar em pequenos grupos"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Status do Módulo
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusModulo)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            >
              <option value="ativo">Ativo</option>
              <option value="rascunho">Rascunho</option>
              <option value="arquivado">Arquivado</option>
            </select>
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
              {loading ? "Salvando..." : "Salvar Módulo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CRITÉRIOS DE CONCLUSÃO MODAL
// ============================================================================
interface CriteriosConclusaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  modulo: Modulo | null;
  onSalvarCriterios: (moduloId: string, criterios: CriteriosConclusaoModulo) => Promise<void>;
}

export function CriteriosConclusaoModal({
  isOpen,
  onClose,
  modulo,
  onSalvarCriterios,
}: CriteriosConclusaoModalProps) {
  const [presencaMinima, setPresencaMinima] = useState<number | "">("");
  const [atividadesMinimas, setAtividadesMinimas] = useState<number | "">("");
  const [notaMinimaObjetivas, setNotaMinimaObjetivas] = useState<number | "">("");
  const [avaliacaoPraticaObrigatoria, setAvaliacaoPraticaObrigatoria] = useState(false);
  const [exigeValidacaoHumana, setExigeValidacaoHumana] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (modulo) {
      const c = modulo.criteriosConclusao;
      setPresencaMinima(c.presencaMinimaPercentual ?? "");
      setAtividadesMinimas(c.atividadesMinimasConcluidas ?? "");
      setNotaMinimaObjetivas(c.notaMinimaObjetivas ?? "");
      setAvaliacaoPraticaObrigatoria(c.avaliacaoPraticaObrigatoria ?? false);
      setExigeValidacaoHumana(c.exigeValidacaoHumana ?? false);
    }
    setErro("");
  }, [modulo, isOpen]);

  if (!isOpen || !modulo) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      const criterios: CriteriosConclusaoModulo = {
        presencaMinimaPercentual: presencaMinima !== "" ? Number(presencaMinima) : undefined,
        atividadesMinimasConcluidas: atividadesMinimas !== "" ? Number(atividadesMinimas) : undefined,
        notaMinimaObjetivas: notaMinimaObjetivas !== "" ? Number(notaMinimaObjetivas) : undefined,
        avaliacaoPraticaObrigatoria: Boolean(avaliacaoPraticaObrigatoria),
        exigeValidacaoHumana: Boolean(exigeValidacaoHumana),
      };

      await onSalvarCriterios(modulo!.id, criterios);
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar critérios.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-lg">Critérios de Conclusão do Módulo</h2>
              <p className="text-xs text-slate-500">{modulo.nome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <p>
              Os critérios configurados aqui determinam a barra de progresso do aluno e os requisitos
              para finalização do módulo.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Frequência / Presença Mínima (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Ex: 75 (deixe em branco se não aplicável)"
                value={presencaMinima}
                onChange={(e) => setPresencaMinima(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Calculada pela fórmula oficial: (Presente / (Presente + Ausente)) * 100.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Atividades Mínimas Entregues e Aprovadas
              </label>
              <input
                type="number"
                min={0}
                placeholder="Ex: 3 (deixe em branco se não aplicável)"
                value={atividadesMinimas}
                onChange={(e) => setAtividadesMinimas(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Média Mínima em Avaliações Objetivas (0 a 10)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={10}
                placeholder="Ex: 7.0 (deixe em branco se não aplicável)"
                value={notaMinimaObjetivas}
                onChange={(e) => setNotaMinimaObjetivas(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avaliacaoPraticaObrigatoria}
                  onChange={(e) => setAvaliacaoPraticaObrigatoria(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    Exigir Aprovação em Avaliação Prática
                  </span>
                  <p className="text-xs text-slate-500">
                    O aluno deve realizar e ser aprovado na avaliação prática com correção humana deste módulo.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exigeValidacaoHumana}
                  onChange={(e) => setExigeValidacaoHumana(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    Exigir Validação Pedagógica Humana do Professor
                  </span>
                  <p className="text-xs text-slate-500">
                    Mesmo com 100% dos critérios atingidos, o módulo ficará com status &quot;Aguardando Validação&quot; até que o professor valide explicitamente no painel.
                  </p>
                </div>
              </label>
            </div>
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
              {loading ? "Salvando..." : "Salvar Critérios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
