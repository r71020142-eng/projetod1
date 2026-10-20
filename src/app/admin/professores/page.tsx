"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Search,
  Plus,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  X,
  CheckCircle2,
  Database,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Professor, StatusCadastro } from "@/types";
import { professorRepository } from "@/data/professorRepository";
import { getCoreUsersDataSource } from "@/data/repositoryFactory";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { ProfessorFormModal } from "@/components/admin/ProfessorFormModal";
import { executeWithTimeout } from "@/lib/asyncUtils";

export default function AdminProfessoresPage() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusCadastro | "todos">("todos");

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<Professor | null>(null);

  const [professorParaInativar, setProfessorParaInativar] = useState<Professor | null>(null);
  const [isConfirmingInativar, setIsConfirmingInativar] = useState(false);

  // Fonte de dados e validação de divergência
  const isSupabaseActive = getCoreUsersDataSource() === "supabase";
  const [divergenceError, setDivergenceError] = useState<string | null>(null);

  useEffect(() => {
    // Validação de divergência de ambiente em tempo de execução
    fetch("/api/env/core-data-source")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setDivergenceError(
            body.message || "Erro de validação de ambiente no servidor."
          );
          return;
        }
        const data = await res.json();
        const clientSource = getCoreUsersDataSource();
        if (data.serverSource !== clientSource) {
          setDivergenceError(
            `Divergência detectada entre servidor ("${data.serverSource}") e navegador ("${clientSource}").`
          );
        }
      })
      .catch(() => {
        // Ignora falhas transitórias de conexão local
      });
  }, []);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const carregarProfessores = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await professorRepository.listar();
      setProfessores(data);
    } catch (err) {
      console.error("Erro ao carregar professores:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarProfessores();

    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ entity?: string }>;
      if (!customEvent.detail || customEvent.detail.entity === "professores") {
        carregarProfessores();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    window.addEventListener("mtd_core_users_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
      window.removeEventListener("mtd_core_users_updated", handleStorageUpdate);
    };
  }, [carregarProfessores]);

  // Filtered List
  const professoresFiltrados = useMemo(() => {
    return professores.filter((prof) => {
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const matchesName = prof.nomeCompleto.toLowerCase().includes(q);
        const matchesEmail = prof.email.toLowerCase().includes(q);
        const matchesLang = prof.idiomasFalados.some((i) =>
          i.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesEmail && !matchesLang) return false;
      }

      if (filtroStatus !== "todos" && prof.status !== filtroStatus) {
        return false;
      }

      return true;
    });
  }, [professores, busca, filtroStatus]);

  const totalAtivos = useMemo(
    () => professores.filter((p) => p.status === "ativo").length,
    [professores]
  );
  const totalInativos = useMemo(
    () => professores.filter((p) => p.status === "inativo").length,
    [professores]
  );

  // Actions
  const handleNovoProfessor = () => {
    setProfessorEditando(null);
    setIsFormOpen(true);
  };

  const handleEditarProfessor = (professor: Professor) => {
    setProfessorEditando(professor);
    setIsFormOpen(true);
  };

  const handleFormSuccess = (professor: Professor, isNew: boolean) => {
    setIsFormOpen(false);
    setProfessorEditando(null);
    carregarProfessores();
    showToast(
      isNew
        ? `Professor "${professor.nomeCompleto}" cadastrado com sucesso!`
        : `Cadastro de "${professor.nomeCompleto}" atualizado!`
    );
  };

  const handleConfirmarInativacao = async () => {
    if (!professorParaInativar) return;
    setIsConfirmingInativar(true);

    try {
      const res = await executeWithTimeout(
        professorRepository.inativar(professorParaInativar.id),
        15000,
        "Tempo limite excedido ao inativar professor. Tente novamente."
      );

      if (res.success) {
        carregarProfessores();
        showToast(`Professor "${professorParaInativar.nomeCompleto}" inativado.`, "info");
      } else {
        alert(res.error || "Erro ao inativar professor.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao inativar professor.";
      alert(msg);
    } finally {
      setIsConfirmingInativar(false);
      setProfessorParaInativar(null);
    }
  };

  const handleReativar = async (professor: Professor) => {
    try {
      const res = await executeWithTimeout(
        professorRepository.reativar(professor.id),
        15000,
        "Tempo limite excedido ao reativar professor. Tente novamente."
      );

      if (res.success) {
        carregarProfessores();
        showToast(`Professor "${professor.nomeCompleto}" reativado com sucesso!`);
      } else {
        alert(res.error || "Erro ao reativar professor.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao reativar professor.";
      alert(msg);
    }
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("todos");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-800 animate-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
              Professores
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100">
              Etapa 2
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestão do corpo docente, idiomas dominados e acompanhamento de instrutores no Método Paulo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNovoProfessor}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5046E5] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Novo Professor</span>
          </button>
        </div>
      </div>

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

      {/* Datasource Banner Notice & Account Disclaimer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`lg:col-span-2 rounded-2xl border p-4 text-xs flex items-center gap-3 shadow-2xs ${
            isSupabaseActive
              ? "border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 text-emerald-950"
              : "border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 text-indigo-950"
          }`}
        >
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
                ? "Dados reais no Supabase — Alunos e professores são persistidos no banco de dados."
                : "Ambiente Demonstrativo — Persistência Local Ativa."}
            </p>
            <p
              className={`text-[11px] mt-0.5 ${
                isSupabaseActive ? "text-emerald-800/90" : "text-indigo-800/80"
              }`}
            >
              {isSupabaseActive
                ? "Persistência em PostgreSQL gerenciado pelo Supabase com Row Level Security (RLS) e integridade relacional ativas."
                : "Os professores cadastrados são salvos isoladamente no localStorage. Modificações são preservadas mesmo após recarregar a página."}
            </p>
          </div>
        </div>

        {/* Counter Widget */}
        <div className="flex items-center justify-around text-xs font-semibold text-slate-700 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total</span>
            <span className="text-lg font-extrabold text-slate-900">{professores.length}</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <span className="text-[10px] text-emerald-600 block uppercase font-bold">Ativos</span>
            <span className="text-lg font-extrabold text-emerald-700">{totalAtivos}</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Inativos</span>
            <span className="text-lg font-extrabold text-slate-600">{totalInativos}</span>
          </div>
        </div>
      </div>

      {/* Account Notice Alert */}
      <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <p className="text-[11px] text-amber-900/90 leading-relaxed">
          <strong>Aviso de Autenticação:</strong> Cadastrar um professor neste painel registra sua ficha pedagógica na escola, mas <strong>não cria automaticamente uma conta de acesso ao sistema</strong>. A gestão de login e permissões será associada com a implementação do módulo de autenticação (RBAC).
        </p>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou idiomas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9.5 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5046E5] transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status */}
          <div className="md:col-span-3">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusCadastro | "todos")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
            >
              <option value="todos">Status: Todos</option>
              <option value="ativo">Status: Somente Ativos</option>
              <option value="inativo">Status: Somente Inativos</option>
            </select>
          </div>

          {/* Clear Button */}
          <div className="md:col-span-1 flex items-center justify-end">
            {(busca || filtroStatus !== "todos") && (
              <button
                type="button"
                onClick={limparFiltros}
                title="Limpar filtros"
                className="w-full h-full inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Exibindo <strong>{professoresFiltrados.length}</strong> de{" "}
            <strong>{professores.length}</strong> professores
          </span>
          {(busca || filtroStatus !== "todos") && (
            <span className="text-indigo-600 font-medium">Filtro ativo</span>
          )}
        </div>
      </div>

      {/* Main Table for Desktop & Cards for Mobile */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Carregando corpo docente...
          </div>
        ) : professoresFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {professores.length === 0
                ? isSupabaseActive
                  ? "Nenhum professor cadastrado no banco de dados"
                  : "Nenhum professor cadastrado"
                : "Nenhum professor encontrado"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {professores.length === 0
                ? isSupabaseActive
                  ? "O banco remoto Supabase está conectado e pronto para receber o corpo docente. Clique em 'Novo Professor' acima para cadastrar."
                  : "Nenhum registro local encontrado."
                : "Nenhum registro corresponde aos filtros ou termo de busca informado."}
            </p>
            {professores.length > 0 && (
              <button
                type="button"
                onClick={limparFiltros}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Redefinir filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Professor</th>
                    <th className="py-3 px-4">Contato</th>
                    <th className="py-3 px-4">Idiomas Falados</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Cadastro</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {professoresFiltrados.map((prof) => {
                    const initials = prof.nomeCompleto
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const dataFormatada = new Date(prof.dataCadastro).toLocaleDateString(
                      "pt-BR"
                    );

                    return (
                      <tr
                        key={prof.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Name + Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {prof.avatarUrl ? (
                              <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                                <Image
                                  src={prof.avatarUrl}
                                  alt={prof.nomeCompleto}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-xs shadow-2xs">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/admin/professores/${prof.id}`}
                                className="font-bold text-slate-900 hover:text-[#5046E5] transition-colors truncate block"
                              >
                                {prof.nomeCompleto}
                              </Link>
                              <span className="text-[11px] text-slate-400 truncate block">
                                {prof.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {prof.telefone || (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </td>

                        {/* Languages */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {prof.idiomasFalados.map((idioma, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100/60"
                              >
                                {idioma}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={prof.status} />
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap text-[11px]">
                          {dataFormatada}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/professores/${prof.id}`}
                              title="Ver Ficha e Biografia"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleEditarProfessor(prof)}
                              title="Editar Professor"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {prof.status === "ativo" ? (
                              <button
                                type="button"
                                onClick={() => setProfessorParaInativar(prof)}
                                title="Inativar Docente"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReativar(prof)}
                                title="Reativar Docente"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              >
                                <UserCheck className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {professoresFiltrados.map((prof) => {
                const initials = prof.nomeCompleto
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const dataFormatada = new Date(prof.dataCadastro).toLocaleDateString(
                  "pt-BR"
                );

                return (
                  <div key={prof.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {prof.avatarUrl ? (
                          <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                            <Image
                              src={prof.avatarUrl}
                              alt={prof.nomeCompleto}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-xs shadow-2xs">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/professores/${prof.id}`}
                            className="font-bold text-slate-900 hover:text-[#5046E5] text-sm truncate block"
                          >
                            {prof.nomeCompleto}
                          </Link>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {prof.email}
                          </span>
                        </div>
                      </div>

                      <StatusBadge status={prof.status} />
                    </div>

                    {/* Languages */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {prof.idiomasFalados.map((idioma, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100/60"
                        >
                          {idioma}
                        </span>
                      ))}
                    </div>

                    {prof.biografiaCurta && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl line-clamp-2 leading-relaxed">
                        {prof.biografiaCurta}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Cadastrado em {dataFormatada}</span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/professores/${prof.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Ficha</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEditarProfessor(prof)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                        {prof.status === "ativo" ? (
                          <button
                            type="button"
                            onClick={() => setProfessorParaInativar(prof)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <UserX className="h-3 w-3" />
                            <span>Inativar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReativar(prof)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Reativar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Form Modal (Create / Edit) */}
      <ProfessorFormModal
        isOpen={isFormOpen}
        professorParaEditar={professorEditando}
        onClose={() => {
          setIsFormOpen(false);
          setProfessorEditando(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Inactivation Confirmation Modal */}
      <ConfirmModal
        isOpen={!!professorParaInativar}
        title="Confirmar Inativação de Professor"
        description={`Tem certeza que deseja inativar o docente "${professorParaInativar?.nomeCompleto}"? O professor não aparecerá como disponível para novas turmas ou filas de correção até que seja reativado. Nenhuma informação será perdida.`}
        confirmLabel="Sim, Inativar Professor"
        cancelLabel="Voltar"
        isDestructive={true}
        isLoading={isConfirmingInativar}
        showPersistenceNotice={true}
        onConfirm={handleConfirmarInativacao}
        onCancel={() => setProfessorParaInativar(null)}
      />
    </div>
  );
}
