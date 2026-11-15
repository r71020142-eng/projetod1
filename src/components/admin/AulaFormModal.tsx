"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Video,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  Clock,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Aula, Turma, Professor, ConflitoHorario, TipoAula } from "@/types";
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

const DIAS_SEMANA = [
  { id: 1, nome: "Segunda", nomeCompleto: "Segunda-feira", curto: "Seg" },
  { id: 2, nome: "Terça", nomeCompleto: "Terça-feira", curto: "Ter" },
  { id: 3, nome: "Quarta", nomeCompleto: "Quarta-feira", curto: "Qua" },
  { id: 4, nome: "Quinta", nomeCompleto: "Quinta-feira", curto: "Qui" },
  { id: 5, nome: "Sexta", nomeCompleto: "Sexta-feira", curto: "Sex" },
  { id: 6, nome: "Sábado", nomeCompleto: "Sábado", curto: "Sáb" },
  { id: 0, nome: "Domingo", nomeCompleto: "Domingo", curto: "Dom" },
];

function getNextDayOfWeekDate(startDateStr: string, targetDow: number): string {
  const [year, month, day] = startDateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const currentDow = d.getDay();
  const diff = (targetDow - currentDow + 7) % 7;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function addWeeksToDate(dateStr: string, weeks: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + weeks * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function formatarDataAmigavel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatFriendlyError(rawMsg: string): string {
  if (rawMsg.includes("CONFLITO_HORARIO_PROFESSOR")) {
    return "Conflito de agenda: o professor já possui outra aula agendada nesse mesmo horário.";
  }
  if (rawMsg.includes("CONFLITO_HORARIO_ALUNO")) {
    return "Conflito de agenda: um ou mais alunos da turma já possuem outra aula agendada nesse horário.";
  }
  if (rawMsg.includes("TURMA_INATIVA") || rawMsg.includes("TURMA_ENCERRADA")) {
    return "Não é possível agendar aulas para uma turma inativa ou encerrada.";
  }
  if (rawMsg.includes("DURACAO_INVALIDA")) {
    return "A duração da aula deve estar entre 15 e 300 minutos.";
  }
  if (rawMsg.includes("ACESSO_NEGADO") || rawMsg.includes("violates row-level security")) {
    return "Acesso não autorizado: você não tem permissão para agendar aulas nesta turma.";
  }
  return rawMsg;
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
  const [tipo, setTipo] = useState<TipoAula>("regular");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState("10:00");
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [linkZoom, setLinkZoom] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Recurrence State (for new classes)
  const [tipoAgendamento, setTipoAgendamento] = useState<"unica" | "recorrente">("unica");
  const [semanasRecorrencia, setSemanasRecorrencia] = useState(4);
  const [diasConfig, setDiasConfig] = useState<
    Record<number, { ativo: boolean; horario: string }>
  >({
    1: { ativo: false, horario: "09:00" },
    2: { ativo: false, horario: "09:00" },
    3: { ativo: false, horario: "09:00" },
    4: { ativo: true, horario: "10:30" }, // Quinta 10:30
    5: { ativo: true, horario: "08:50" }, // Sexta 08:50
    6: { ativo: false, horario: "09:00" },
    0: { ativo: false, horario: "09:00" },
  });
  const [mostrarPrevia, setMostrarPrevia] = useState(true);

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
      setTipo(
        aulaParaEditar.tipo ||
          (aulaParaEditar.titulo?.toLowerCase().includes("reposi") ? "reposicao" : "regular")
      );
      setData(aulaParaEditar.data);
      setHorario(aulaParaEditar.horario);
      setDuracaoMinutos(aulaParaEditar.duracaoMinutos || 60);
      setLinkZoom(aulaParaEditar.linkZoom || aulaParaEditar.meetingUrl || "");
      setObservacoes(aulaParaEditar.observacoes || "");
      setTipoAgendamento("unica");
    } else {
      setTurmaId(turmaIdPreselecionada || "");
      setTitulo("");
      setTipo("regular");
      // Default date: tomorrow
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataAmanha = amanha.toISOString().slice(0, 10);
      setData(dataAmanha);
      setHorario("10:00");
      setDuracaoMinutos(60);
      setLinkZoom("");
      setObservacoes("");
      setTipoAgendamento("unica");
      setSemanasRecorrencia(4);

      // Default recurring days: Quinta (10:30) and Sexta (08:50)
      setDiasConfig({
        1: { ativo: false, horario: "09:00" },
        2: { ativo: false, horario: "09:00" },
        3: { ativo: false, horario: "09:00" },
        4: { ativo: true, horario: "10:30" },
        5: { ativo: true, horario: "08:50" },
        6: { ativo: false, horario: "09:00" },
        0: { ativo: false, horario: "09:00" },
      });
    }
    setErrors({});
    setGeneralError(null);
    setConflitos([]);
    setIsSubmitting(false);
  }, [isOpen, aulaParaEditar, turmaIdPreselecionada]);

  // Selected turma and professor
  const selectedTurma = turmas.find((t) => t.id === turmaId);
  const selectedProfessor = selectedTurma
    ? professores.find((p) => p.id === selectedTurma.professorId)
    : null;

  // Toggle day active state
  const handleToggleDia = (diaId: number) => {
    setDiasConfig((prev) => {
      const current = prev[diaId] || { ativo: false, horario: "09:00" };
      return {
        ...prev,
        [diaId]: { ...current, ativo: !current.ativo },
      };
    });
  };

  // Update specific day time
  const handleUpdateHorarioDia = (diaId: number, novoHorario: string) => {
    setDiasConfig((prev) => {
      const current = prev[diaId] || { ativo: true, horario: novoHorario };
      return {
        ...prev,
        [diaId]: { ...current, horario: novoHorario },
      };
    });
  };

  // Dynamic preview calculation of recurring classes
  const aulasRecorrentesPreview = useMemo(() => {
    if (tipoAgendamento !== "recorrente" || !data) return [];
    const diasAtivos = DIAS_SEMANA.filter((d) => diasConfig[d.id]?.ativo);
    if (diasAtivos.length === 0) return [];

    const lista: Array<{
      data: string;
      horario: string;
      diaSemanaId: number;
      diaNome: string;
      dataFormatada: string;
    }> = [];

    for (const d of diasAtivos) {
      const config = diasConfig[d.id];
      const firstDate = getNextDayOfWeekDate(data, d.id);
      for (let w = 0; w < semanasRecorrencia; w++) {
        const classDate = addWeeksToDate(firstDate, w);
        lista.push({
          data: classDate,
          horario: config.horario || horario,
          diaSemanaId: d.id,
          diaNome: d.nome,
          dataFormatada: formatarDataAmigavel(classDate),
        });
      }
    }

    // Sort chronologically by date and then time
    lista.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
    return lista;
  }, [tipoAgendamento, diasConfig, data, semanasRecorrencia, horario]);

  const totalAulasRecorrentes = aulasRecorrentesPreview.length;
  const diasAtivosCount = DIAS_SEMANA.filter((d) => diasConfig[d.id]?.ativo).length;

  // Conflict check debounce
  useEffect(() => {
    if (!isOpen || !turmaId || !selectedTurma) {
      setConflitos([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflitos(true);
      try {
        if (tipoAgendamento === "unica") {
          if (!data || !horario || !duracaoMinutos) {
            setConflitos([]);
            return;
          }
          const result = await aulaRepository.verificarConflitos({
            id: aulaParaEditar?.id,
            turmaId,
            professorId: selectedTurma.professorId,
            data,
            horario,
            duracaoMinutos: Number(duracaoMinutos) || 60,
            status: "agendada",
          });
          setConflitos(result);
        } else {
          // Check all recurring candidates
          if (aulasRecorrentesPreview.length === 0) {
            setConflitos([]);
            return;
          }

          const conflitosEncontrados: ConflitoHorario[] = [];
          for (let i = 0; i < aulasRecorrentesPreview.length; i++) {
            const preview = aulasRecorrentesPreview[i];
            const result = await aulaRepository.verificarConflitos({
              turmaId,
              professorId: selectedTurma.professorId,
              data: preview.data,
              horario: preview.horario,
              duracaoMinutos: Number(duracaoMinutos) || 60,
              status: "agendada",
            });
            if (result.length > 0) {
              conflitosEncontrados.push(...result);
            }
          }
          setConflitos(conflitosEncontrados);
        }
      } catch (err) {
        console.error("Erro ao verificar conflitos:", err);
      } finally {
        setCheckingConflitos(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    turmaId,
    data,
    horario,
    duracaoMinutos,
    aulaParaEditar,
    selectedTurma,
    tipoAgendamento,
    aulasRecorrentesPreview,
  ]);

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

    if (!titulo.trim()) {
      setErrors((prev) => ({ ...prev, titulo: "Informe o título ou tema da aula." }));
      setIsSubmitting(false);
      return;
    }

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
          titulo: titulo.trim(),
          tipo,
          data,
          horario,
          duracaoMinutos: Number(duracaoMinutos),
          linkZoom: linkZoom.trim() ? linkZoom.trim() : undefined,
          observacoes: observacoes.trim() ? observacoes.trim() : undefined,
        });

        if (!res.success) {
          if (res.fieldErrors) setErrors(res.fieldErrors);
          setGeneralError(formatFriendlyError(res.error || "Não foi possível atualizar a aula."));
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data!, false);
        onClose();
      } else {
        // Novo Agendamento
        if (tipoAgendamento === "recorrente") {
          if (aulasRecorrentesPreview.length === 0) {
            setGeneralError("Selecione pelo menos um dia da semana para agendar a recorrência.");
            setIsSubmitting(false);
            return;
          }

          const totalAulas = aulasRecorrentesPreview.length;
          const prefixoTipo =
            tipo === "reposicao" && !titulo.toLowerCase().includes("reposi") ? "[Reposição] " : "";

          const aulasParaCriar = aulasRecorrentesPreview.map((item, idx) => {
            const tituloFinal = `${prefixoTipo}${titulo.trim()} (${idx + 1}/${totalAulas})`;
            return {
              turmaId,
              titulo: tituloFinal,
              tipo,
              data: item.data,
              horario: item.horario,
              duracaoMinutos: Number(duracaoMinutos),
              linkZoom: linkZoom.trim() ? linkZoom.trim() : undefined,
              status: "agendada" as const,
              observacoes: observacoes.trim() ? observacoes.trim() : undefined,
            };
          });

          const res = await aulaRepository.criarMultiplasAulas(aulasParaCriar);

          if (!res.success) {
            setGeneralError(formatFriendlyError(res.error || "Falha ao gerar série de aulas."));
            setIsSubmitting(false);
            return;
          }

          onSuccess(res.data!, true);
          onClose();
        } else {
          // Aula Única
          const prefixoTipo =
            tipo === "reposicao" && !titulo.toLowerCase().includes("reposi") ? "[Reposição] " : "";
          const tituloFinal = `${prefixoTipo}${titulo.trim()}`;

          const res = await aulaRepository.criar({
            turmaId,
            titulo: tituloFinal,
            tipo,
            data,
            horario,
            duracaoMinutos: Number(duracaoMinutos),
            linkZoom: linkZoom.trim() ? linkZoom.trim() : undefined,
            status: "agendada",
            observacoes: observacoes.trim() ? observacoes.trim() : undefined,
          });

          if (!res.success) {
            if (res.fieldErrors) setErrors(res.fieldErrors);
            setGeneralError(formatFriendlyError(res.error || "Falha ao agendar aula."));
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
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
                tipo === "reposicao"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-purple-50 text-purple-600 border-purple-100"
              }`}
            >
              {tipo === "reposicao" ? (
                <RotateCcw className="h-5 w-5" />
              ) : (
                <Calendar className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 id="modal-aula-title" className="text-base font-bold text-slate-800">
                {isEditing
                  ? `Editar Aula: ${aulaParaEditar.titulo}`
                  : tipo === "reposicao"
                  ? "Agendar Aula de Reposição"
                  : "Agendar Nova Aula"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Atualização de dados e reagendamento seguro"
                  : "Agendamento ao vivo com detecção automática de conflitos"}
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

          {/* Tipo de Aula (Regular vs Reposição) */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Modalidade Pedagógica</label>
              {tipo === "reposicao" && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                  Reposição Ativa
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo("regular")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  tipo === "regular"
                    ? "bg-white border-purple-300 text-purple-700 shadow-sm ring-1 ring-purple-100"
                    : "border-transparent text-slate-600 hover:bg-white/60"
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Aula Regular</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo("reposicao");
                  if (!titulo || titulo.trim() === "") {
                    setTitulo("Reposição de Conteúdo");
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  tipo === "reposicao"
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm font-bold"
                    : "border-transparent text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Aula de Reposição</span>
              </button>
            </div>
          </div>

          {/* Recurrence Mode Selector (Only when creating) */}
          {!isEditing && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Frequência do Agendamento</label>
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
                  <span>Recorrente (Dias na Semana)</span>
                </button>
              </div>

              {/* Recurrent Setup: Weeks & Multi-day schedule */}
              {tipoAgendamento === "recorrente" && (
                <div className="space-y-3 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-semibold">Quantidade de semanas:</span>
                    <select
                      value={semanasRecorrencia}
                      onChange={(e) => setSemanasRecorrencia(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:border-purple-500"
                    >
                      {[1, 2, 3, 4, 6, 8, 10, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "semana" : "semanas"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Day Picker */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Dias da semana em que as aulas ocorrem:
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DIAS_SEMANA.map((dia) => {
                        const isAtivo = diasConfig[dia.id]?.ativo;
                        return (
                          <button
                            key={dia.id}
                            type="button"
                            onClick={() => handleToggleDia(dia.id)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                              isAtivo
                                ? "bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-200"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {dia.curto}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Independent Time Inputs for Active Days */}
                  {diasAtivosCount > 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2.5">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                        <span>Defina o horário de cada dia:</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {DIAS_SEMANA.filter((d) => diasConfig[d.id]?.ativo).map((dia) => (
                          <div
                            key={dia.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <span className="text-xs font-semibold text-slate-700">
                              {dia.nomeCompleto}:
                            </span>
                            <input
                              type="time"
                              required
                              value={diasConfig[dia.id]?.horario || "10:00"}
                              onChange={(e) => handleUpdateHorarioDia(dia.id, e.target.value)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Selecione pelo menos um dia da semana acima.</span>
                    </div>
                  )}

                  {/* Dynamic Summary Banner */}
                  {totalAulasRecorrentes > 0 && (
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-purple-900">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span>
                            {diasAtivosCount} {diasAtivosCount === 1 ? "dia" : "dias"} na semana ×{" "}
                            {semanasRecorrencia} {semanasRecorrencia === 1 ? "semana" : "semanas"} ={" "}
                            <span className="text-purple-700 font-extrabold">
                              {totalAulasRecorrentes} aulas geradas
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMostrarPrevia(!mostrarPrevia)}
                          className="text-[11px] font-semibold text-purple-700 hover:underline"
                        >
                          {mostrarPrevia ? "Ocultar prévia" : "Ver prévia"}
                        </button>
                      </div>

                      {/* Interactive Preview List */}
                      {mostrarPrevia && (
                        <div className="max-h-36 overflow-y-auto pr-1 space-y-1 pt-1 border-t border-purple-100">
                          {aulasRecorrentesPreview.map((aulaPrev, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-white/80 border border-purple-100/60 text-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-purple-700">#{idx + 1}</span>
                                <span className="font-medium">{aulaPrev.dataFormatada}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {aulaPrev.horario}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({duracaoMinutos} min)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
              placeholder={
                tipo === "reposicao"
                  ? "Ex: Reposição: Pronúncia e Fonemas Especiais"
                  : "Ex: Introdução ao Método Paulo: Fonemas e Conexões"
              }
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

          {/* Data e Horário (se Única ou Edição) OU Data de Início (se Recorrente) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="data" className="block text-xs font-semibold text-slate-700 mb-1">
                {tipoAgendamento === "recorrente" && !isEditing
                  ? "A partir da data"
                  : "Data da Aula"}{" "}
                <span className="text-rose-500">*</span>
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

            {/* If Single Class or Editing: Show Horário */}
            {(tipoAgendamento === "unica" || isEditing) && (
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
            )}

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
              {tipoAgendamento === "recorrente"
                ? "Este link será aplicado a todas as aulas geradas nesta sequência."
                : "Inserção manual. Caso não preenchido, os alunos verão 'Link ainda não disponibilizado'."}
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
              placeholder={
                tipo === "reposicao"
                  ? "Ex: Reposição da aula perdida pelo aluno devido a viagem/imprevisto."
                  : "Ex: Trazer dúvidas sobre os primeiros 3 fonemas e o áudio da aula anterior."
              }
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
                  Verificando conflitos...
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
                disabled={
                  isSubmitting ||
                  conflitos.length > 0 ||
                  (tipoAgendamento === "recorrente" && totalAulasRecorrentes === 0)
                }
                className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 ${
                  tipo === "reposicao"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {isSubmitting && (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>
                  {isEditing
                    ? "Salvar Aula"
                    : tipoAgendamento === "recorrente"
                    ? `Agendar ${totalAulasRecorrentes} Aulas`
                    : tipo === "reposicao"
                    ? "Agendar Reposição"
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
