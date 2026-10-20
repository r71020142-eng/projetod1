"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  UserPlus,
  Edit,
  Database,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Turma, Professor, Aula } from "@/types";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";
import { aulaRepository } from "@/data/aulaRepository";
import { getAcademicCoreDataSource } from "@/data/repositoryFactory";
import { useAdminIdentity } from "@/app/admin/AdminLayoutClient";
import { TurmaStatusBadge, ModalidadeBadge } from "@/components/common/TurmaBadges";
import { TurmaFormModal } from "@/components/admin/TurmaFormModal";
import { MatricularAlunoModal } from "@/components/admin/MatricularAlunoModal";

export default function AdminTurmasPage() {
  const identity = useAdminIdentity();
  const isProfessor = identity?.role === "professor";

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [proximasAulas, setProximasAulas] = useState<Record<string, Aula | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonte de dados e validação de divergência
  const isSupabaseActive = getAcademicCoreDataSource() === "supabase";
  const [divergenceError, setDivergenceError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/env/academic-core-data-source")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setDivergenceError(
            body.message || "Erro de validação de ambiente acadêmico no servidor."
          );
          return;
        }
        const data = await res.json();
        const clientSource = getAcademicCoreDataSource();
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

  // Filters State
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modals State
  const [modalTurmaOpen, setModalTurmaOpen] = useState(false);
  const [turmaParaEditar, setTurmaParaEditar] = useState<Turma | null>(null);

  const [modalMatricularOpen, setModalMatricularOpen] = useState(false);
  const [turmaParaMatricular, setTurmaParaMatricular] = useState<Turma | null>(null);

  // Load all turmas & data
  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listTurmas, listProfs, allAulas] = await Promise.all([
        turmaRepository.listar(),
        professorRepository.listar(),
        aulaRepository.listar({ status: "agendada" }),
      ]);

      setTurmas(listTurmas);
      setProfessores(listProfs);

      // Map next class for each turma
      const nextAulasMap: Record<string, Aula | null> = {};
      for (const t of listTurmas) {
        const aulasDaTurma = allAulas.filter((a) => a.turmaId === t.id);
        nextAulasMap[t.id] = aulasDaTurma.length > 0 ? aulasDaTurma[0] : null;
      }
      setProximasAulas(nextAulasMap);
    } catch (err: unknown) {
      console.error("Erro ao carregar turmas:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Não foi possível carregar as turmas.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const handleDataUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "turmas" ||
        customEvent.detail.entity === "aulas"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_academic_core_updated", handleDataUpdate);
    window.addEventListener("mtd_storage_updated", handleDataUpdate);
    return () => {
      window.removeEventListener("mtd_academic_core_updated", handleDataUpdate);
      window.removeEventListener("mtd_storage_updated", handleDataUpdate);
    };
  }, [carregarDados]);

  const professorMap = useMemo(() => {
    return new Map(professores.map((p) => [p.id, p]));
  }, [professores]);

  // Filtered turmas
  const turmasFiltradas = useMemo(() => {
    return turmas.filter((t) => {
      if (filtroStatus !== "todos" && t.status !== filtroStatus) return false;
      if (filtroNivel !== "todos" && t.nivel !== filtroNivel) return false;
      if (filtroModalidade !== "todos" && t.modalidade !== filtroModalidade) return false;

      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const nomeMatch = t.nome.toLowerCase().includes(q);
        const prof = professorMap.get(t.professorId);
        const profMatch = prof?.nomeCompleto.toLowerCase().includes(q);
        return nomeMatch || !!profMatch;
      }

      return true;
    });
  }, [turmas, filtroStatus, filtroNivel, filtroModalidade, busca, professorMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = turmas.length;
    const ativas = turmas.filter((t) => t.status === "ativa").length;
    const formacao = turmas.filter((t) => t.status === "formacao").length;
    const totalMatriculas = turmas.reduce((acc, t) => acc + t.alunoIds.length, 0);
    return { total, ativas, formacao, totalMatriculas };
  }, [turmas]);

  const handleOpenCriarTurma = () => {
    setTurmaParaEditar(null);
    setModalTurmaOpen(true);
  };

  const handleOpenEditarTurma = (t: Turma) => {
    setTurmaParaEditar(t);
    setModalTurmaOpen(true);
  };

  const handleOpenMatricular = (t: Turma) => {
    setTurmaParaMatricular(t);
    setModalMatricularOpen(true);
  };

  const handleSuccessTurma = () => {
    carregarDados();
  };

  return (
    <div className="space-y-6">
      {/* Divergence Critical Error Banner */}
      {divergenceError && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-2xs">
            <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="font-bold text-rose-900 text-sm">
              Erro Crítico de Configuração — Divergência entre Servidor e Navegador
            </p>
            <p className="text-[12px] text-rose-800 mt-1 leading-relaxed">
              {divergenceError}
            </p>
          </div>
        </div>
      )}

      {/* Datasource Banner Notice */}
      <div
        className={`rounded-2xl border p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
          isSupabaseActive
            ? "border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 text-emerald-950"
            : "border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 text-indigo-950"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
              isSupabaseActive ? "bg-emerald-600" : "bg-indigo-600"
            }`}
          >
            <Database className="h-4 w-4" />
          </div>
          <div>
            <p
              className={`font-bold ${
                isSupabaseActive ? "text-emerald-950" : "text-indigo-900"
              }`}
            >
              {isSupabaseActive
                ? "Dados reais no Supabase — Turmas e matrículas são persistidas no banco de dados."
                : "Ambiente Demonstrativo — Persistência Local Ativa."}
            </p>
            <p
              className={`text-[11px] mt-0.5 ${
                isSupabaseActive ? "text-emerald-800/90" : "text-indigo-800/80"
              }`}
            >
              {isSupabaseActive
                ? "Persistência em PostgreSQL gerenciado pelo Supabase com Row Level Security (RLS) e integridade relacional ativas."
                : "Novas turmas e matrículas são armazenadas de forma isolada no localStorage do seu navegador."}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-4 text-xs font-semibold text-slate-700 bg-white/90 rounded-xl px-3.5 py-2 border shrink-0 ${
            isSupabaseActive ? "border-emerald-200/70" : "border-indigo-100/60"
          }`}
        >
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Fonte Ativa
            </span>
            <span
              className={`text-xs font-bold ${
                isSupabaseActive ? "text-emerald-700" : "text-indigo-700"
              }`}
            >
              {isSupabaseActive ? "PostgreSQL Remoto" : "Armazenamento Local"}
            </span>
          </div>
        </div>
      </div>

      {/* Loading Error Alert with Retry */}
      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900 text-sm">Falha ao carregar turmas</p>
              <p className="text-rose-800 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={carregarDados}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Turmas</h1>
            {isProfessor && (
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-100">
                Visualização do Docente
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organize coortes em grupo e aulas individuais, acompanhando ocupação e professor responsável.
          </p>
        </div>

        {!isProfessor && (
          <button
            type="button"
            onClick={handleOpenCriarTurma}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm transition-all hover:shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Turma</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total de Turmas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600">Turmas Ativas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.ativas}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-amber-600">Em Formação</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.formacao}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-purple-600">Alunos Matriculados</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats.totalMatriculas}</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome da turma ou professor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Status: Todos</option>
              <option value="formacao">Em formação</option>
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
              <option value="encerrada">Encerrada</option>
            </select>

            {/* Modalidade */}
            <select
              value={filtroModalidade}
              onChange={(e) => setFiltroModalidade(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Modalidade: Todas</option>
              <option value="grupo">Em Grupo</option>
              <option value="individual">Individual</option>
            </select>

            {/* Nível */}
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-purple-500"
            >
              <option value="todos">Nível: Todos</option>
              <option value="nao_definido">Não definido</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em tabela"
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Carregando turmas...</p>
        </div>
      ) : turmas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Users className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">Nenhuma turma cadastrada</h3>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre sua primeira coorte ou turma individual para começar a vincular alunos, professores e agendar sessões ao vivo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCriarTurma}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Primeira Turma</span>
          </button>
        </div>
      ) : turmasFiltradas.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Nenhuma turma encontrada</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os termos de busca ou filtros.
          </p>
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltroStatus("todos");
              setFiltroNivel("todos");
              setFiltroModalidade("todos");
            }}
            className="text-xs text-purple-600 font-bold hover:underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW (Desktop) */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Turma</th>
                  <th className="px-4 py-3.5">Modalidade</th>
                  <th className="px-4 py-3.5">Nível</th>
                  <th className="px-4 py-3.5">Professor</th>
                  <th className="px-4 py-3.5">Ocupação</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Próxima Aula</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {turmasFiltradas.map((t) => {
                  const prof = professorMap.get(t.professorId);
                  const prox = proximasAulas[t.id];
                  const ocupacaoPercent = Math.min(
                    100,
                    Math.round((t.alunoIds.length / t.capacidade) * 100)
                  );

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/turmas/${t.id}`}
                          className="font-bold text-slate-900 hover:text-purple-600 transition-colors block"
                        >
                          {t.nome}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">{t.id}</span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <ModalidadeBadge modalidade={t.modalidade} />
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {t.nivel === "nao_definido" ? "Não definido" : t.nivel}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {prof ? (
                          <Link
                            href={`/admin/professores/${prof.id}`}
                            className="font-medium text-slate-800 hover:text-purple-600 transition-colors"
                          >
                            {prof.nomeCompleto}
                            {prof.status === "inativo" && (
                              <span className="ml-1 text-[10px] text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                                [Inativo]
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Não atribuído</span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800">
                            {t.alunoIds.length}/{t.capacidade}
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                ocupacaoPercent >= 100 ? "bg-amber-500" : "bg-purple-600"
                              }`}
                              style={{ width: `${ocupacaoPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <TurmaStatusBadge status={t.status} />
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-xs">
                        {prox ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-purple-600" />
                            <span>
                              {prox.data} às {prox.horario}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Nenhuma aula</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isProfessor && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenMatricular(t)}
                                title="Matricular discente"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditarTurma(t)}
                                title="Editar turma"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/admin/turmas/${t.id}`}
                            title="Ver detalhes da turma"
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmasFiltradas.map((t) => {
            const prof = professorMap.get(t.professorId);
            const prox = proximasAulas[t.id];
            const ocupacaoPercent = Math.min(
              100,
              Math.round((t.alunoIds.length / t.capacidade) * 100)
            );

            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/admin/turmas/${t.id}`}
                        className="font-bold text-base text-slate-900 hover:text-purple-600 transition-colors"
                      >
                        {t.nome}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{t.id}</p>
                    </div>
                    <TurmaStatusBadge status={t.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <ModalidadeBadge modalidade={t.modalidade} />
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                      Nível: {t.nivel === "nao_definido" ? "Não definido" : t.nivel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {t.objetivoPrincipal}
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Professor:</span>
                      <span className="font-semibold text-slate-800">
                        {prof?.nomeCompleto || "Não atribuído"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Ocupação:</span>
                        <span className="font-semibold text-slate-800">
                          {t.alunoIds.length} / {t.capacidade} alunos
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ocupacaoPercent >= 100 ? "bg-amber-500" : "bg-purple-600"
                          }`}
                          style={{ width: `${ocupacaoPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 pt-1">
                      <span>Próxima aula:</span>
                      <span className="font-medium text-slate-800">
                        {prox ? `${prox.data} às ${prox.horario}` : "Nenhuma"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  {!isProfessor ? (
                    <button
                      type="button"
                      onClick={() => handleOpenMatricular(t)}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Matricular</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Visualização docente</span>
                  )}

                  <div className="flex items-center gap-2">
                    {!isProfessor && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditarTurma(t)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        Editar
                      </button>
                    )}
                    <Link
                      href={`/admin/turmas/${t.id}`}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      Detalhes
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <TurmaFormModal
        isOpen={modalTurmaOpen}
        turmaParaEditar={turmaParaEditar}
        onClose={() => {
          setModalTurmaOpen(false);
          setTurmaParaEditar(null);
        }}
        onSuccess={handleSuccessTurma}
      />

      <MatricularAlunoModal
        isOpen={modalMatricularOpen}
        turma={turmaParaMatricular}
        onClose={() => {
          setModalMatricularOpen(false);
          setTurmaParaMatricular(null);
        }}
        onSuccess={handleSuccessTurma}
      />
    </div>
  );
}
