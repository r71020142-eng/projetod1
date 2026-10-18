"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Aula, Turma, Professor } from "@/types";
import { aulaRepository } from "@/data/aulaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";
import { AulaStatusBadge } from "@/components/common/TurmaBadges";
import { AulaFormModal } from "@/components/admin/AulaFormModal";
import { PresencaModal } from "@/components/admin/PresencaModal";

export default function AdminAgendaPage() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [viewMode, setViewMode] = useState<"lista" | "semanal">("lista");
  const [busca, setBusca] = useState("");
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");
  const [filtroProfessor, setFiltroProfessor] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Week navigation (current date anchor)
  const [currentDateAnchor, setCurrentDateAnchor] = useState<Date>(() => new Date());

  // Modals
  const [modalAulaOpen, setModalAulaOpen] = useState(false);
  const [aulaParaEditar, setAulaParaEditar] = useState<Aula | null>(null);
  const [modalPresencaOpen, setModalPresencaOpen] = useState(false);
  const [aulaParaPresenca, setAulaParaPresenca] = useState<Aula | null>(null);

  // Cancellation modal
  const [aulaParaCancelar, setAulaParaCancelar] = useState<Aula | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [listAulas, listTurmas, listProfs] = await Promise.all([
        aulaRepository.listar(),
        turmaRepository.listar(),
        professorRepository.listar(),
      ]);
      setAulas(listAulas);
      setTurmas(listTurmas);
      setProfessores(listProfs);
    } catch (err) {
      console.error("Erro ao carregar dados da agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();

    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "aulas" ||
        customEvent.detail.entity === "turmas"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
  }, []);

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);
  const profMap = useMemo(() => new Map(professores.map((p) => [p.id, p])), [professores]);

  // Filtered aulas
  const aulasFiltradas = useMemo(() => {
    return aulas.filter((a) => {
      if (filtroTurma !== "todas" && a.turmaId !== filtroTurma) return false;
      if (filtroProfessor !== "todos" && a.professorId !== filtroProfessor) return false;
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
  }, [aulas, filtroTurma, filtroProfessor, filtroStatus, busca, turmaMap, profMap]);

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
    try {
      const res = await aulaRepository.cancelar(aulaParaCancelar.id, "Cancelada pelo administrador.");
      if (res.success) {
        setAulaParaCancelar(null);
        carregarDados();
      } else {
        alert(res.error || "Falha ao cancelar aula.");
      }
    } catch (err) {
      console.error("Erro:", err);
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
      {/* Disclaimer */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/5 border border-slate-200/60 rounded-xl text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <span>
            <strong>Agenda Escolar Demonstrativa:</strong> Programação completa de sessões individuais e turmas em grupo com detecção de conflitos.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda de Aulas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Planejamento pedagógico das sessões ao vivo do Método Paulo com controle de links e presenças.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
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
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>

            {/* Professor */}
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

            {/* Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Status: Todos</option>
              <option value="agendada">Agendada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === "lista"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em lista cronológica"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Cronológica</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("semanal")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === "semanal"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em grade semanal"
              >
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">Semanal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Weekly View Navigator (only shown in weekly view) */}
        {viewMode === "semanal" && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="font-semibold text-slate-700">
              Semana de {diasDaSemanaAtual[0].label} a {diasDaSemanaAtual[6].label}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Carregando agenda...</p>
        </div>
      ) : aulas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-800">Nenhuma aula agendada</h3>
            <p className="text-xs text-slate-500 mt-1">
              Agende sessões individuais ou em sequência semanal para começar as aulas do Método Paulo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAulaParaEditar(null);
              setModalAulaOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar Primeira Aula</span>
          </button>
        </div>
      ) : aulasFiltradas.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Nenhuma aula corresponde aos filtros</p>
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltroTurma("todas");
              setFiltroProfessor("todos");
              setFiltroStatus("todos");
            }}
            className="text-xs text-purple-600 font-bold hover:underline"
          >
            Limpar filtros de busca
          </button>
        </div>
      ) : viewMode === "lista" ? (
        /* LISTA CRONOLÓGICA */
        <div className="space-y-6">
          {aulasAgrupadasPorData.map((grupo) => (
            <div key={grupo.data} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-600" />
                <h2 className="text-sm font-bold text-slate-800 capitalize">
                  {formatDataBr(grupo.data)}
                </h2>
                <span className="text-xs text-slate-400">({grupo.aulas.length} {grupo.aulas.length === 1 ? "aula" : "aulas"})</span>
              </div>

              {/* Class Cards */}
              <div className="space-y-3">
                {grupo.aulas.map((aula) => {
                  const turma = turmaMap.get(aula.turmaId);
                  const prof = profMap.get(aula.professorId);

                  return (
                    <div
                      key={aula.id}
                      className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Time, Title, Turma, Professor */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs flex items-center gap-1.5 border border-purple-100">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {aula.horario} ({aula.duracaoMinutos} min)
                            </span>
                          </span>
                          <AulaStatusBadge status={aula.status} />
                          {turma && (
                            <Link
                              href={`/admin/turmas/${turma.id}`}
                              className="text-xs font-semibold text-slate-600 hover:text-purple-600 transition-colors flex items-center gap-1"
                            >
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span>{turma.nome}</span>
                            </Link>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{aula.titulo}</h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>
                            Professor: <strong>{prof?.nomeCompleto || "Não atribuído"}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Alunos: <strong>{turma?.alunoIds.length || 0} matriculados</strong>
                          </span>
                        </div>

                        {/* Zoom status indicator */}
                        <div className="pt-0.5">
                          {aula.linkZoom ? (
                            <a
                              href={aula.linkZoom}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>Link da sala Zoom cadastrado</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic flex items-center gap-1">
                              <Video className="h-3.5 w-3.5" />
                              <span>Link da aula ainda não disponibilizado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {aula.status !== "cancelada" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAulaParaPresenca(aula);
                              setModalPresencaOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>
                              {aula.status === "concluida" ? "Ver Presenças" : "Registrar Presença"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setAulaParaEditar(aula);
                            setModalAulaOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Editar aula"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {aula.status === "agendada" && (
                          <button
                            type="button"
                            onClick={() => setAulaParaCancelar(aula)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Cancelar aula"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
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
        /* GRADE SEMANAL */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {diasDaSemanaAtual.map((dia) => {
            const aulasDoDia = aulasFiltradas
              .filter((a) => a.data === dia.dateStr)
              .sort((a, b) => a.horario.localeCompare(b.horario));

            const isToday = new Date().toISOString().slice(0, 10) === dia.dateStr;

            return (
              <div
                key={dia.dateStr}
                className={`p-3 rounded-2xl border min-h-[350px] flex flex-col justify-start space-y-2.5 transition-all ${
                  isToday
                    ? "bg-purple-50/40 border-purple-200 shadow-xs"
                    : "bg-white border-slate-100 shadow-sm"
                }`}
              >
                {/* Day Header */}
                <div className="pb-2 border-b border-slate-100 text-center">
                  <p
                    className={`text-xs uppercase font-bold tracking-wider ${
                      isToday ? "text-purple-700" : "text-slate-500"
                    }`}
                  >
                    {dia.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {aulasDoDia.length} {aulasDoDia.length === 1 ? "aula" : "aulas"}
                  </p>
                </div>

                {/* Day Classes */}
                <div className="space-y-2 flex-1">
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
              Tem certeza de que deseja marcar a aula do dia <strong>{aulaParaCancelar.data}</strong> às <strong>{aulaParaCancelar.horario}</strong> como <strong>Cancelada</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAulaParaCancelar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelarAula}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                Confirmar Cancelamento
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
