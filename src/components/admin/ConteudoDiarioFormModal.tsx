"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, AlertCircle } from "lucide-react";
import {
  ConteudoDiario,
  StatusConteudoDiario,
  NivelMaterial,
  DestinoTipo,
  Turma,
  Aluno,
} from "@/types";
import { conteudoDiarioRepository } from "@/data/conteudoDiarioRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { alunoRepository } from "@/data/alunoRepository";

interface ConteudoDiarioFormModalProps {
  isOpen: boolean;
  conteudoParaEditar?: ConteudoDiario | null;
  onClose: () => void;
  onSuccess: (conteudoSalvo: ConteudoDiario) => void;
}

export function ConteudoDiarioFormModal({
  isOpen,
  conteudoParaEditar,
  onClose,
  onSuccess,
}: ConteudoDiarioFormModalProps) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [dataProgramada, setDataProgramada] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [nivelRecomendado, setNivelRecomendado] = useState<NivelMaterial>("todos");
  const [status, setStatus] = useState<StatusConteudoDiario>("publicado");
  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>("geral");
  const [destinoId, setDestinoId] = useState("");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      turmaRepository.listar().then(setTurmas);
      alunoRepository.listar().then(setAlunos);

      if (conteudoParaEditar) {
        setTitulo(conteudoParaEditar.titulo);
        setTexto(conteudoParaEditar.texto);
        setDataProgramada(conteudoParaEditar.dataProgramada);
        setNivelRecomendado(conteudoParaEditar.nivelRecomendado);
        setStatus(conteudoParaEditar.status);
        setDestinoTipo(conteudoParaEditar.destinoTipo);
        setDestinoId(conteudoParaEditar.destinoId || "");
      } else {
        setTitulo("");
        setTexto("");
        setDataProgramada(new Date().toISOString().slice(0, 10));
        setNivelRecomendado("todos");
        setStatus("publicado");
        setDestinoTipo("geral");
        setDestinoId("");
      }
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, conteudoParaEditar]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const payload: Partial<ConteudoDiario> = {
      titulo,
      texto,
      dataProgramada,
      nivelRecomendado,
      status,
      destinoTipo,
      destinoId: destinoTipo === "geral" ? undefined : destinoId,
    };

    try {
      const res = conteudoParaEditar
        ? await conteudoDiarioRepository.atualizar(conteudoParaEditar.id, payload)
        : await conteudoDiarioRepository.criar(payload);

      if (!res.success) {
        setError(res.error || "Erro ao salvar conteúdo diário.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao salvar conteúdo diário:", err);
      setError("Erro inesperado ao salvar conteúdo diário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diario-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="diario-modal-title" className="text-base font-bold text-slate-800">
                {conteudoParaEditar ? "Editar Conteúdo Diário" : "Novo Estímulo Diário"}
              </h2>
              <p className="text-xs text-slate-500">
                Prática de hoje e pílulas de aprendizado do Método Paulo
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="cd-titulo" className="block text-xs font-semibold text-slate-700 mb-1">
              Título do Estímulo Diário *
            </label>
            <input
              id="cd-titulo"
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Expressão do Dia: 'Hit the ground running'"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                fieldErrors.titulo
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              }`}
            />
            {fieldErrors.titulo && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.titulo}</p>
            )}
          </div>

          {/* Short Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="cd-texto" className="block text-xs font-semibold text-slate-700">
                Texto Curto de Prática *
              </label>
              <span className="text-[10px] text-slate-400">
                {texto.length}/600 caracteres
              </span>
            </div>
            <textarea
              id="cd-texto"
              rows={3}
              maxLength={600}
              required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Explique o termo com contexto prático e um exemplo aplicável para o aluno praticar hoje..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Date & Level Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cd-data" className="block text-xs font-semibold text-slate-700 mb-1">
                Data Programada *
              </label>
              <input
                id="cd-data"
                type="date"
                required
                value={dataProgramada}
                onChange={(e) => setDataProgramada(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cd-nivel" className="block text-xs font-semibold text-slate-700 mb-1">
                Nível Recomendado
              </label>
              <select
                id="cd-nivel"
                value={nivelRecomendado}
                onChange={(e) => setNivelRecomendado(e.target.value as NivelMaterial)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                <option value="todos">Todos os níveis</option>
                <option value="A1">A1 • Iniciante</option>
                <option value="A2">A2 • Básico</option>
                <option value="B1">B1 • Intermediário</option>
                <option value="B2">B2 • Independente</option>
                <option value="C1">C1 • Avançado</option>
              </select>
            </div>
          </div>

          {/* Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cd-destino" className="block text-xs font-semibold text-slate-700 mb-1">
                Destino
              </label>
              <select
                id="cd-destino"
                value={destinoTipo}
                onChange={(e) => {
                  setDestinoTipo(e.target.value as DestinoTipo);
                  setDestinoId("");
                }}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                <option value="geral">Geral (Todos)</option>
                <option value="turma">Turma específica</option>
                <option value="aluno">Aluno específico</option>
              </select>
            </div>

            <div>
              <label htmlFor="cd-status" className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                id="cd-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusConteudoDiario)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                <option value="publicado">Publicado</option>
                <option value="agendado">Agendado</option>
                <option value="rascunho">Rascunho</option>
              </select>
            </div>
          </div>

          {destinoTipo === "turma" && (
            <div>
              <label htmlFor="cd-turma" className="block text-xs font-semibold text-slate-700 mb-1">
                Turma Destinatária *
              </label>
              <select
                id="cd-turma"
                required
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Selecione uma turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {destinoTipo === "aluno" && (
            <div>
              <label htmlFor="cd-aluno" className="block text-xs font-semibold text-slate-700 mb-1">
                Aluno Destinatário *
              </label>
              <select
                id="cd-aluno"
                required
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Selecione um aluno...</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nomeCompleto}
                  </option>
                ))}
              </select>
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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{conteudoParaEditar ? "Salvar Alterações" : "Salvar Estímulo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
