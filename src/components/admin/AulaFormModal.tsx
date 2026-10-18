"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Video,
  AlertTriangle,
  CheckCircle2,
  Repeat,
} from "lucide-react";
import { Aula, Turma, Professor, ConflitoHorario } from "@/types";
import { aulaRepository } from "@/data/aulaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";

interface AulaFormModalProps {
  isOpen: boolean;
  aulaParaEditar?: Aula | null;
  turmaIdPreselecionada?: string;
  onClose: () => void;
  onSuccess: (aulaOuAulas: Aula | Aula[], isNew: boolean) => void;
}

export function AulaFormModal({
  isOpen,
  aulaParaEditar,
  turmaIdPreselecionada,
  onClose,
  onSuccess,
}: AulaFormModalProps) {
  const isEditing = !!aulaParaEditar;

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);

  // Form State
  const [turmaId, setTurmaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState("09:00");
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [linkZoom, setLinkZoom] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Recurrence (only for new classes)
  const [tipoAgendamento, setTipoAgendamento] = useState<"unica" | "recorrente">("unica");
  const [semanasRecorrencia, setSemanasRecorrencia] = useState(4);

  // Validation & Conflicts
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflitos, setConflitos] = useState<ConflitoHorario[]>([]);
  const [checkingConflitos, setCheckingConflitos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load turmas and professores
  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;
      try {
        const [turmaList, profList] = await Promise.all([
          turmaRepository.listar(),
          professorRepository.listar(),
        ]);
        setTurmas(turmaList);
        setProfessores(profList);
      } catch (err) {
        console.error("Erro ao carregar dados para agendamento:", err);
      }
    }
    loadData();
  }, [isOpen]);

  // Set form state based on edit or preselected turma
  useEffect(() => {
    if (!isOpen) return;

    if (aulaParaEditar) {
      setTurmaId(aulaParaEditar.turmaId);
      setTitulo(aulaParaEditar.titulo);
      setData(aulaParaEditar.data);
      setHorario(aulaParaEditar.horario);
      setDuracaoMinutos(aulaParaEditar.duracaoMinutos || 60);
      setLinkZoom(aulaParaEditar.linkZoom || "");
      setObservacoes(aulaParaEditar.observacoes || "");
      setTipoAgendamento("unica");
    } else {
      setTurmaId(turmaIdPreselecionada || "");
      setTitulo("");
      // Default date: tomorrow at 09:00
      const amanhã = new Date();
      amanhã.setDate(amanhã.getDate() + 1);
      setData(amanhã.toISOString().slice(0, 10));
      setHorario("10:00");
      setDuracaoMinutos(60);
      setLinkZoom("");
      setObservacoes("");
      setTipoAgendamento("unica");
      setSemanasRecorrencia(4);
    }
    setErrors({});
    setGeneralError(null);
    setConflitos([]);
  }, [isOpen, aulaParaEditar, turmaIdPreselecionada]);

  // Derived selected turma and professor
  const selectedTurma = turmas.find((t) => t.id === turmaId);
  const selectedProfessor = selectedTurma
    ? professores.find((p) => p.id === selectedTurma.professorId)
    : null;

  // Conflict check debounce
  useEffect(() => {
    if (!isOpen || !turmaId || !data || !horario || !duracaoMinutos) {
      setConflitos([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflitos(true);
      try {
        const result = await aulaRepository.verificarConflitos({
          id: aulaParaEditar?.id,
          turmaId,
          professorId: selectedTurma ? selectedTurma.professorId : "",
          data,
          horario,
          duracaoMinutos: Number(duracaoMinutos) || 60,
          status: "agendada",
        });
        setConflitos(result);
      } catch (err) {
        console.error("Erro ao verificar conflitos:", err);
      } finally {
        setCheckingConflitos(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, turmaId, data, horario, duracaoMinutos, aulaParaEditar, selectedTurma]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGeneralError(null);

    if (!turmaId) {
      setErrors((prev) => ({ ...prev, turmaId: "Selecione a turma." }));
      setIsSubmitting(false);
      return;
    }

    if (!selectedTurma) {
      setGeneralError("Turma selecionada não encontrada.");
      setIsSubmitting(false);
      return;
    }

    // Block if conflict exists
    if (conflitos.length > 0) {
      setGeneralError(
        "Não é possível agendar esta aula devido a conflitos de horário com o professor ou alunos."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing && aulaParaEditar) {
        const res = await aulaRepository.atualizar(aulaParaEditar.id, {
          turmaId,
          titulo,
          data,
          horario,
          duracaoMinutos: Number(duracaoMinutos),
          linkZoom: linkZoom.trim() ? linkZoom.trim() : undefined,
          observacoes: observacoes.trim() ? observacoes.trim() : undefined,
        });

        if (!res.success) {
          if (res.fieldErrors) setErrors(res.fieldErrors);
          setGeneralError(res.error || "Não foi possível atualizar a aula.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data!, false);
        onClose();
      } else {
        // New class
        if (tipoAgendamento === "recorrente") {
          const res = await aulaRepository.criarSequenciaSemanal(
            {
              turmaId,
              titulo,
              data,
              horario,
              duracaoMinutos: Number(duracaoMinutos),
              linkZoom: linkZoom.trim() ? linkZoom.trim() : undefined,
              status: "agendada",
              observacoes: observacoes.trim() ? observacoes.trim() : undefined,
            },
            Number(semanasRecorrencia)
          );

          if (!res.success) {
            setGeneralError(res.error || "Falha ao gerar sequência semanal.");
            setIsSubmitting(false);
            return;
          }

          onSuccess(res.data!, true);
          onClose();
        } else {
          // Single class
          const res = await aulaRepository.criar({
            turmaId,
            titulo,
            data,
            horario,
            duracaoMinutos: Number(duracaoMinutos),
            linkZoom: linkZoom.trim() ? linkZoom.trim() : undefined,
            status: "agendada",
            observacoes: observacoes.trim() ? observacoes.trim() : undefined,
          });

          if (!res.success) {
            if (res.fieldErrors) setErrors(res.fieldErrors);
            setGeneralError(res.error || "Falha ao agendar aula.");
            setIsSubmitting(false);
            return;
          }

          onSuccess(res.data!, true);
          onClose();
        }
      }
    } catch (err) {
      console.error("Erro ao salvar aula:", err);
      setGeneralError("Erro inesperado ao salvar o agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-aula-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-aula-title" className="text-base font-bold text-slate-800">
                {isEditing ? `Editar Aula: ${aulaParaEditar.titulo}` : "Agendar Nova Aula"}
              </h2>
              <p className="text-xs text-slate-500">
                Sessão ao vivo com detecção automática de conflitos de horário
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* General Error Banner */}
          {generalError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Erro no agendamento</p>
                <p className="mt-0.5">{generalError}</p>
              </div>
            </div>
          )}

          {/* Conflict Alert Banner */}
          {conflitos.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Conflito de Horário Detectado! O salvamento está bloqueado:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {conflitos.map((c, i) => (
                  <li key={i} className="text-amber-800 leading-relaxed">
                    <strong className="text-amber-900">
                      {c.tipo === "professor" ? "Professor" : "Aluno"}: {c.nomeEnvolvido}
                    </strong>{" "}
                    já possui a aula <em>&ldquo;{c.aulaExistenteTitulo}&rdquo;</em> na turma{" "}
                    <strong>{c.turmaNome}</strong> das <strong>{c.horarioExistente}</strong> às{" "}
                    <strong>{c.horarioFimExistente}</strong>.
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 italic">
                Escolha outro horário ou data para evitar sobreposições na agenda.
              </p>
            </div>
          )}

          {/* Recurrence Mode Selector (Only when creating) */}
          {!isEditing && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Tipo de Agendamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAgendamento("unica")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    tipoAgendamento === "unica"
                      ? "bg-white border-purple-300 text-purple-700 shadow-sm ring-1 ring-purple-100"
                      : "border-transparent text-slate-600 hover:bg-white/60"
                  }`}
                >
                  Aula Única
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAgendamento("recorrente")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    tipoAgendamento === "recorrente"
                      ? "bg-white border-purple-300 text-purple-700 shadow-sm ring-1 ring-purple-100"
                      : "border-transparent text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <Repeat className="h-3.5 w-3.5" />
                  <span>Sequência Semanal</span>
                </button>
              </div>

              {tipoAgendamento === "recorrente" && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Quantidade de semanas:</span>
                  <select
                    value={semanasRecorrencia}
                    onChange={(e) => setSemanasRecorrencia(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    {[2, 3, 4, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} semanas ({n} aulas)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Turma Selection */}
          <div>
            <label htmlFor="turmaId" className="block text-xs font-semibold text-slate-700 mb-1">
              Turma <span className="text-rose-500">*</span>
            </label>
            <select
              id="turmaId"
              required
              disabled={isEditing || !!turmaIdPreselecionada}
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                errors.turmaId
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
            >
              <option value="">Selecione uma turma...</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} — {t.modalidade === "individual" ? "Individual" : "Grupo"} ({t.alunoIds.length} alunos)
                </option>
              ))}
            </select>
            {errors.turmaId && <p className="text-xs text-rose-600 mt-1">{errors.turmaId}</p>}

            {/* Display Professor Info automatically */}
            {selectedTurma && (
              <div className="mt-2 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs text-purple-900">
                <span className="text-slate-600">Professor responsável:</span>
                <span className="font-bold text-purple-700">
                  {selectedProfessor?.nomeCompleto || "Professor não encontrado"}
                </span>
              </div>
            )}
          </div>

          {/* Título da Aula / Tema */}
          <div>
            <label htmlFor="titulo" className="block text-xs font-semibold text-slate-700 mb-1">
              Título da Aula / Tema Pedagógico <span className="text-rose-500">*</span>
            </label>
            <input
              id="titulo"
              type="text"
              required
              placeholder="Ex: Introdução ao Método Paulo: Fonemas e Conexões"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                errors.titulo
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
            />
            {errors.titulo && <p className="text-xs text-rose-600 mt-1">{errors.titulo}</p>}
          </div>

          {/* Data, Horário e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="data" className="block text-xs font-semibold text-slate-700 mb-1">
                Data <span className="text-rose-500">*</span>
              </label>
              <input
                id="data"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                  errors.data
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                    : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                }`}
              />
              {errors.data && <p className="text-xs text-rose-600 mt-1">{errors.data}</p>}
            </div>

            <div>
              <label htmlFor="horario" className="block text-xs font-semibold text-slate-700 mb-1">
                Horário de Início <span className="text-rose-500">*</span>
              </label>
              <input
                id="horario"
                type="time"
                required
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                  errors.horario
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                    : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                }`}
              />
              {errors.horario && <p className="text-xs text-rose-600 mt-1">{errors.horario}</p>}
            </div>

            <div>
              <label htmlFor="duracao" className="block text-xs font-semibold text-slate-700 mb-1">
                Duração (minutos) <span className="text-rose-500">*</span>
              </label>
              <input
                id="duracao"
                type="number"
                min="15"
                max="300"
                step="5"
                required
                value={duracaoMinutos}
                onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                  errors.duracaoMinutos
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                    : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                }`}
              />
              {errors.duracaoMinutos && (
                <p className="text-xs text-rose-600 mt-1">{errors.duracaoMinutos}</p>
              )}
            </div>
          </div>

          {/* Link do Zoom (Manual e Opcional) */}
          <div>
            <label htmlFor="linkZoom" className="block text-xs font-semibold text-slate-700 mb-1">
              Link da Sala Zoom (opcional)
            </label>
            <div className="relative">
              <input
                id="linkZoom"
                type="url"
                placeholder="https://zoom.us/j/123456789"
                value={linkZoom}
                onChange={(e) => setLinkZoom(e.target.value)}
                className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                  errors.linkZoom
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                    : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                }`}
              />
              <Video className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            {errors.linkZoom && <p className="text-xs text-rose-600 mt-1">{errors.linkZoom}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              Inserção manual. Caso não preenchido, os alunos verão &ldquo;Link da aula ainda não disponibilizado&rdquo;.
            </p>
          </div>

          {/* Observações / Pauta */}
          <div>
            <label htmlFor="observacoes" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Pauta Pedagógica (opcional)
            </label>
            <textarea
              id="observacoes"
              rows={2}
              placeholder="Ex: Trazer dúvidas sobre os primeiros 3 fonemas e o áudio da aula anterior."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              {checkingConflitos ? (
                <span className="flex items-center gap-1.5 text-purple-600">
                  <div className="h-3 w-3 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  Verificando agenda...
                </span>
              ) : conflitos.length === 0 && turmaId ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sem conflitos de horário
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
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
                disabled={isSubmitting || conflitos.length > 0}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>
                  {isEditing
                    ? "Salvar Aula"
                    : tipoAgendamento === "recorrente"
                    ? `Agendar ${semanasRecorrencia} Aulas`
                    : "Agendar Aula"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
