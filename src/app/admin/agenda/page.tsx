"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Search,
  UserCheck,
  Edit,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  AlertTriangle,
  List,
  Grid,
  Database,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Aula, Turma, Professor } from "@/types";
import { aulaRepository } from "@/data/aulaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";
import { getAcademicAgendaDataSource } from "@/data/repositoryFactory";
import { useAdminIdentity } from "@/app/admin/AdminLayoutClient";
import { AulaStatusBadge } from "@/components/common/TurmaBadges";
import { AulaFormModal } from "@/components/admin/AulaFormModal";
import { PresencaModal } from "@/components/admin/PresencaModal";

export default function AdminAgendaPage() {
  const identity = useAdminIdentity();
  const isProfessor = identity?.role === "professor";
  const professorOperationalId = isProfessor ? (identity?.professorId || null) : null;

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonte de dados e auditoria de divergência
  const isSupabaseActive = getAcademicAgendaDataSource() === "supabase";
  const [divergenceError, setDivergenceError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/env/academic-agenda-data-source")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setDivergenceError(
            body.message || "Erro de validação de ambiente de agenda acadêmica no servidor."
          );
          return;
        }
        const data = await res.json();
        const clientSource = getAcademicAgendaDataSource();
        if (data.serverSource !== clientSource) {
          setDivergenceError(
            `Divergência detectada entre servidor ("${data.serverSource}") e navegador ("${clientSource}").`
          );
        }
      })
      .catch(() => {
        // Ignora falhas de conexão local
      });
  }, []);

  // Filters & View State
  const [viewMode, setViewMode] = useState<"lista" | "semanal">("lista");
  const [busca, setBusca] = useState("");
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");
  const [filtroProfessor, setFiltroProfessor] = useState<string>(
    isProfessor && professorOperationalId ? professorOperationalId : "todos"
  );
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Keep professor locked if role is professor
  useEffect(() => {
    if (isProfessor) {
      setFiltroProfessor(professorOperationalId || "");
    }
  }, [isProfessor, professorOperationalId]);

  // Week navigation (current date anchor)
  const [currentDateAnchor, setCurrentDateAnchor] = useState<Date>(() => new Date());

  // Modals
  const [modalAulaOpen, setModalAulaOpen] = useState(false);
  const [aulaParaEditar, setAulaParaEditar] = useState<Aula | null>(null);
  const [modalPresencaOpen, setModalPresencaOpen] = useState(false);
  const [aulaParaPresenca, setAulaParaPresenca] = useState<Aula | null>(null);

  // Cancellation modal
  const [aulaParaCancelar, setAulaParaCancelar] = useState<Aula | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("Cancelada pelo docente/administrador.");
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    if (isProfessor && !professorOperationalId && isSupabaseActive) {
      setError("Perfil docente sem vínculo com registro de professor. Não há aulas vinculadas para exibição.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [listAulas, listTurmas, listProfs] = await Promise.all([
        aulaRepository.listar(),
        turmaRepository.listar(),
        professorRepository.listar(),
      ]);
      setAulas(listAulas);
      setTurmas(listTurmas);
      setProfessores(listProfs);
    } catch (err: unknown) {
      console.error("Erro ao carregar dados da agenda:", err);
      const msg = err instanceof Error ? err.message : "Não foi possível carregar os dados da agenda.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isProfessor, professorOperationalId, isSupabaseActive]);

  useEffect(() => {
    carregarDados();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "aulas" ||
        customEvent.detail.entity === "turmas" ||
        customEvent.detail.entity === "presencas"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleUpdate);
    window.addEventListener("mtd_academic_agenda_updated", handleUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleUpdate);
      window.removeEventListener("mtd_academic_agenda_updated", handleUpdate);
    };
  }, [carregarDados]);

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);
  const profMap = useMemo(() => new Map(professores.map((p) => [p.id, p])), [professores]);

  // Turmas permitidas para o usuário logado
  const turmasDisponiveis = useMemo(() => {
    if (isProfessor) {
      if (!professorOperationalId) return [];
      return turmas.filter((t) => t.professorId === professorOperationalId);
    }
    return turmas;
  }, [turmas, isProfessor, professorOperationalId]);

  // Filtered aulas
  const aulasFiltradas = useMemo(() => {
    return aulas.filter((a) => {
      // Se professor logado, restringe rigorosamente às suas aulas
      if (isProfessor) {
        if (!professorOperationalId || a.professorId !== professorOperationalId) {
          return false;
        }
      }

      if (filtroTurma !== "todas" && a.turmaId !== filtroTurma) return false;
      if (!isProfessor && filtroProfessor !== "todos" && a.professorId !== filtroProfessor) {
        return false;
      }
      if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;

      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const tituloMatch = a.titulo.toLowerCase().includes(q);
        const turma = turmaMap.get(a.turmaId);
        const turmaMatch = turma?.nome.toLowerCase().includes(q);
        const prof = profMap.get(a.professorId);
        const profMatch = prof?.nomeCompleto.toLowerCase().includes(q);
        return tituloMatch || !!turmaMatch || !!profMatch;
      }

      return true;
    });
  }, [aulas, filtroTurma, filtroProfessor, filtroStatus, busca, turmaMap, profMap, isProfessor, professorOperationalId]);

  // Group by date for List View
  const aulasAgrupadasPorData = useMemo(() => {
    const map = new Map<string, Aula[]>();
    for (const a of aulasFiltradas) {
      if (!map.has(a.data)) {
        map.set(a.data, []);
      }
      map.get(a.data)!.push(a);
    }

    // Sort dates ascending
    const sortedDates = Array.from(map.keys()).sort();
    return sortedDates.map((d) => ({
      data: d,
      aulas: map.get(d)!.sort((a, b) => a.horario.localeCompare(b.horario)),
    }));
  }, [aulasFiltradas]);

  // Compute days of the current week for Weekly View
  const diasDaSemanaAtual = useMemo(() => {
    const curr = new Date(currentDateAnchor);
    const day = curr.getDay(); // 0 is Sunday
    // Adjust so week starts on Monday
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));

    const weekDays: { dateStr: string; label: string; dateObj: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
      weekDays.push({ dateStr, label, dateObj: d });
    }
    return weekDays;
  }, [currentDateAnchor]);

  const handleNextWeek = () => {
    setCurrentDateAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handlePrevWeek = () => {
    setCurrentDateAnchor((prev) => {
      const p = new Date(prev);
      p.setDate(p.getDate() - 7);
      return p;
    });
  };

  const handleToday = () => {
    setCurrentDateAnchor(new Date());
  };

  const handleCancelarAula = async () => {
    if (!aulaParaCancelar) return;
    setIsCanceling(true);
    setCancelError(null);
    try {
      const res = await aulaRepository.cancelar(
        aulaParaCancelar.id,
        motivoCancelamento.trim() || "Cancelada pelo docente/administrador."
      );
      if (res.success) {
        setAulaParaCancelar(null);
        setMotivoCancelamento("Cancelada pelo docente/administrador.");
        carregarDados();
      } else {
        setCancelError(res.error || "Falha ao cancelar aula no backend.");
      }
    } catch (err: unknown) {
      console.error("Erro ao cancelar aula:", err);
      setCancelError(err instanceof Error ? err.message : "Erro inesperado ao cancelar aula.");
    } finally {
      setIsCanceling(false);
    }
  };

  const formatDataBr = (dataIso: string) => {
    try {
      const [ano, mes, dia] = dataIso.split("-");
      const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
      return d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dataIso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Divergência de Ambiente (se houver) */}
      {divergenceError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Aviso de Configuração de Ambiente Acadêmico</p>
            <p>{divergenceError}</p>
          </div>
        </div>
      )}

      {/* Banner de Contexto e Status da Fonte de Dados */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <span>
            <strong>Agenda Acadêmica:</strong> Programação completa de sessões individuais e turmas em grupo com detecção atômica de conflitos.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>Supabase PostgreSQL Ativo</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
              <span>Modo Demonstrativo Local</span>
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda de Aulas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isProfessor
              ? "Gerenciamento das suas sessões pedagógicas ao vivo, links Zoom e controle de presença."
              : "Planejamento pedagógico das sessões ao vivo do Método Paulo com controle de links e presenças."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isProfessor && !professorOperationalId && isSupabaseActive) {
              setError("Não é possível agendar aulas: perfil docente sem vínculo com registro de professor.");
              return;
            }
            setAulaParaEditar(null);
            setModalAulaOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm transition-all hover:shadow"
        >
          <Plus className="h-4 w-4" />
          <span>Agendar Aula</span>
        </button>
      </div>

      {/* Controls & Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por tema, turma ou professor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
            />
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Turma */}
            <select
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="todas">Turma: Todas</option>
              {turmasDisponiveis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>

            {/* Professor (Locked if user is professor) */}
            {!isProfessor ? (
              <select
                value={filtroProfessor}
                onChange={(e) => setFiltroProfessor(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
              >
                <option value="todos">Professor: Todos</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeCompleto}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 text-xs rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-medium">
                Prof: {identity?.nomeCompleto || "Meu perfil"}
              </div>
            )}

            {/* Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Status: Todos</option>
              <option value="agendada">Agendada</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === "lista"
                    ? "bg-white text-purple-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title="Visualização em Lista"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("semanal")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === "semanal"
                    ? "bg-white text-purple-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title="Visualização Semanal"
              >
                <Grid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Semana</span>
              </button>
            </div>
          </div>
        </div>

        {/* Weekly View Navigator Controls */}
        {viewMode === "semanal" && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="text-xs font-medium text-slate-600">
              Semana de {diasDaSemanaAtual[0]?.label} a {diasDaSemanaAtual[6]?.label}
            </span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900">Erro ao carregar a agenda</h3>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => carregarDados()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Carregando sessões pedagógicas...</p>
        </div>
      ) : aulasFiltradas.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-800">Nenhuma aula encontrada</p>
            <p className="text-xs text-slate-500 mt-1">
              Não há sessões correspondentes aos filtros selecionados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltroTurma("todas");
              if (!isProfessor) setFiltroProfessor("todos");
              setFiltroStatus("todos");
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
          >
            Limpar filtros
          </button>
        </div>
      ) : viewMode === "lista" ? (
        /* LIST VIEW */
        <div className="space-y-6">
          {aulasAgrupadasPorData.map((grupo) => (
            <div key={grupo.data} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="h-4 w-4 text-purple-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {formatDataBr(grupo.data)}
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  ({grupo.aulas.length} {grupo.aulas.length === 1 ? "aula" : "aulas"})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {grupo.aulas.map((aula) => {
                  const turma = turmaMap.get(aula.turmaId);
                  const prof = profMap.get(aula.professorId);

                  // Count presenças registered
                  const presencasValues = aula.presencas ? Object.values(aula.presencas) : [];
                  const presentesCount = presencasValues.filter((p) => p.status === "presente").length;
                  const totalAlunosTurma = turma?.alunoIds.length || 0;

                  return (
                    <div
                      key={aula.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-white shadow-xs hover:shadow-md hover:border-purple-200 transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Time & Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {aula.horario} ({aula.duracaoMinutos || 50} min)
                            </span>
                          </div>
                          <AulaStatusBadge status={aula.status} />
                        </div>

                        {/* Title & Turma */}
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{aula.titulo}</h3>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate">
                            {turma?.nome || aula.turmaId}
                          </p>
                        </div>

                        {/* Professor & Students info */}
                        <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-50">
                          <div className="flex items-center justify-between">
                            <span className="truncate">Prof: {prof?.nomeCompleto || "Não atribuído"}</span>
                            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                              <Users className="h-3 w-3 text-slate-400" />
                              {totalAlunosTurma} {totalAlunosTurma === 1 ? "aluno" : "alunos"}
                            </span>
                          </div>

                          {/* Meeting Link status */}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Video className="h-3 w-3 text-slate-400 shrink-0" />
                            {aula.meetingUrl || aula.linkZoom ? (
                              <a
                                href={aula.meetingUrl || aula.linkZoom}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:underline font-semibold flex items-center gap-1 truncate"
                              >
                                <span>Acessar Zoom</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Link não disponibilizado</span>
                            )}
                          </div>

                          {/* Topico trabalhado */}
                          {aula.topicoTrabalhado && (
                            <p className="text-[11px] text-slate-600 line-clamp-1">
                              <strong>Tópico:</strong> {aula.topicoTrabalhado}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {(!isProfessor || (!!professorOperationalId && aula.professorId === professorOperationalId)) ? (
                          <>
                            {/* Presença Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAulaParaPresenca(aula);
                                setModalPresencaOpen(true);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>
                                Presença
                                {aula.status === "concluida" ? ` (${presentesCount}/${totalAlunosTurma})` : ""}
                              </span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAulaParaEditar(aula);
                                setModalAulaOpen(true);
                              }}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                              title="Editar aula"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {/* Cancel Button (only if not already canceled) */}
                            {aula.status !== "cancelada" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelError(null);
                                  setAulaParaCancelar(aula);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                                title="Cancelar aula"
                              >
                                <XIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Somente leitura</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* WEEKLY CALENDAR VIEW */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {diasDaSemanaAtual.map((dia) => {
            const aulasDoDia = aulasFiltradas
              .filter((a) => a.data === dia.dateStr)
              .sort((a, b) => a.horario.localeCompare(b.horario));

            const isHoje = new Date().toISOString().slice(0, 10) === dia.dateStr;

            return (
              <div
                key={dia.dateStr}
                className={`flex flex-col min-h-[360px] rounded-2xl border p-2.5 transition-all ${
                  isHoje
                    ? "bg-purple-50/30 border-purple-200 shadow-xs"
                    : "bg-slate-50/50 border-slate-100"
                }`}
              >
                {/* Day Header */}
                <div
                  className={`text-center pb-2 border-b ${
                    isHoje ? "border-purple-200" : "border-slate-200/60"
                  }`}
                >
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isHoje ? "text-purple-700" : "text-slate-500"
                    }`}
                  >
                    {dia.label.split(" ")[0]}
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      isHoje ? "text-purple-900" : "text-slate-800"
                    }`}
                  >
                    {dia.label.split(" ")[1]}
                  </p>
                </div>

                {/* Day Classes Column */}
                <div className="space-y-2 pt-2 flex-1">
                  {aulasDoDia.length === 0 ? (
                    <p className="text-[11px] text-slate-300 text-center pt-8 italic">Livre</p>
                  ) : (
                    aulasDoDia.map((a) => {
                      const turma = turmaMap.get(a.turmaId);
                      return (
                        <div
                          key={a.id}
                          className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-purple-300 transition-all text-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-700">{a.horario}</span>
                            <AulaStatusBadge status={a.status} className="text-[10px] px-1.5 py-0" />
                          </div>

                          <p className="font-semibold text-slate-800 line-clamp-2 leading-tight">
                            {a.titulo}
                          </p>

                          <p className="text-[10px] text-slate-400 truncate">{turma?.nome}</p>

                          <div className="pt-1 flex items-center justify-between border-t border-slate-50">
                            {(!isProfessor || (!!professorOperationalId && a.professorId === professorOperationalId)) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAulaParaPresenca(a);
                                    setModalPresencaOpen(true);
                                  }}
                                  className="text-[10px] text-purple-600 font-bold hover:underline"
                                >
                                  Presença
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAulaParaEditar(a);
                                    setModalAulaOpen(true);
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-slate-800"
                                >
                                  Editar
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic">Visualização</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Cancel */}
      {aulaParaCancelar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancelar Aula</h3>
                <p className="text-xs text-slate-500">Sessão: {aulaParaCancelar.titulo}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja marcar a aula do dia <strong>{aulaParaCancelar.data}</strong> às{" "}
              <strong>{aulaParaCancelar.horario}</strong> como <strong>Cancelada</strong>?
            </p>

            <div>
              <label htmlFor="motivoCancelamento" className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo do cancelamento (histórico pedagógico):
              </label>
              <input
                id="motivoCancelamento"
                type="text"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Feriado institucional / Solicitação do aluno"
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAulaParaCancelar(null);
                  setCancelError(null);
                }}
                disabled={isCanceling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelarAula}
                disabled={isCanceling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCanceling && (
                  <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>Confirmar Cancelamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AulaFormModal
        isOpen={modalAulaOpen}
        aulaParaEditar={aulaParaEditar}
        onClose={() => {
          setModalAulaOpen(false);
          setAulaParaEditar(null);
        }}
        onSuccess={() => carregarDados()}
      />

      <PresencaModal
        isOpen={modalPresencaOpen}
        aula={aulaParaPresenca}
        onClose={() => {
          setModalPresencaOpen(false);
          setAulaParaPresenca(null);
        }}
        onSuccess={() => carregarDados()}
      />
    </div>
  );
}
