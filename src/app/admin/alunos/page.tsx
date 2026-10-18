"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  X,
  CheckCircle2,
  Database,
} from "lucide-react";
import { Aluno, NivelAluno, StatusCadastro } from "@/types";
import { alunoRepository } from "@/data/alunoRepository";
import { NivelBadge } from "@/components/common/NivelBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { AlunoFormModal } from "@/components/admin/AlunoFormModal";

export default function AdminAlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusCadastro | "todos">("todos");
  const [filtroNivel, setFiltroNivel] = useState<NivelAluno | "todos">("todos");

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null);

  const [alunoParaInativar, setAlunoParaInativar] = useState<Aluno | null>(null);
  const [isConfirmingInativar, setIsConfirmingInativar] = useState(false);

  // Success Toast / Alert
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

  const carregarAlunos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await alunoRepository.listar();
      setAlunos(data);
    } catch (err) {
      console.error("Erro ao carregar alunos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarAlunos();

    // Listen to storage events from other components/windows
    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ entity?: string }>;
      if (!customEvent.detail || customEvent.detail.entity === "alunos") {
        carregarAlunos();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, [carregarAlunos]);

  // Filtered List
  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      // Search
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const matchesName = aluno.nomeCompleto.toLowerCase().includes(q);
        const matchesEmail = aluno.email.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // Status
      if (filtroStatus !== "todos" && aluno.status !== filtroStatus) {
        return false;
      }

      // Nivel
      if (filtroNivel !== "todos" && aluno.nivel !== filtroNivel) {
        return false;
      }

      return true;
    });
  }, [alunos, busca, filtroStatus, filtroNivel]);

  const totalAtivos = useMemo(
    () => alunos.filter((a) => a.status === "ativo").length,
    [alunos]
  );
  const totalInativos = useMemo(
    () => alunos.filter((a) => a.status === "inativo").length,
    [alunos]
  );

  // Actions
  const handleNovoAluno = () => {
    setAlunoEditando(null);
    setIsFormOpen(true);
  };

  const handleEditarAluno = (aluno: Aluno) => {
    setAlunoEditando(aluno);
    setIsFormOpen(true);
  };

  const handleFormSuccess = (aluno: Aluno, isNew: boolean) => {
    setIsFormOpen(false);
    setAlunoEditando(null);
    carregarAlunos();
    showToast(
      isNew
        ? `Aluno "${aluno.nomeCompleto}" cadastrado com sucesso!`
        : `Cadastro de "${aluno.nomeCompleto}" atualizado com sucesso!`
    );
  };

  const handleConfirmarInativacao = async () => {
    if (!alunoParaInativar) return;
    setIsConfirmingInativar(true);

    const res = await alunoRepository.inativar(alunoParaInativar.id);
    setIsConfirmingInativar(false);
    setAlunoParaInativar(null);

    if (res.success) {
      carregarAlunos();
      showToast(`Aluno "${alunoParaInativar.nomeCompleto}" foi inativado.`, "info");
    } else {
      alert(res.error || "Erro ao inativar aluno.");
    }
  };

  const handleReativar = async (aluno: Aluno) => {
    const res = await alunoRepository.reativar(aluno.id);
    if (res.success) {
      carregarAlunos();
      showToast(`Aluno "${aluno.nomeCompleto}" reativado com sucesso!`);
    } else {
      alert(res.error || "Erro ao reativar aluno.");
    }
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("todos");
    setFiltroNivel("todos");
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
              Gestão de Alunos
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-[#5046E5] border border-indigo-100/80">
              Etapa 2
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Controle de matrículas, objetivos de aprendizagem e acompanhamento pedagógico do Método Paulo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNovoAluno}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5046E5] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* Demonstrative Banner Notice */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 p-4 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-indigo-900">
              Ambiente Demonstrativo — Persistência Local Ativa
            </p>
            <p className="text-[11px] text-indigo-800/80 mt-0.5">
              Novos cadastros e edições são armazenados de forma isolada no localStorage do seu navegador e não substituem dados ao recarregar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-white/80 rounded-xl px-3.5 py-2 border border-indigo-100/60 shrink-0">
          <div>
            <span className="text-slate-400 font-normal">Total: </span>
            <span className="text-slate-900 font-extrabold">{alunos.length}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            <span className="text-emerald-600 font-normal">Ativos: </span>
            <span className="text-emerald-700 font-extrabold">{totalAtivos}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 font-normal">Inativos: </span>
            <span className="text-slate-600 font-extrabold">{totalInativos}</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
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

          {/* Filter Nivel */}
          <div className="md:col-span-3">
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value as NivelAluno | "todos")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
            >
              <option value="todos">Nível: Todos os níveis</option>
              <option value="nao_avaliado">Não avaliado</option>
              <option value="A1">Iniciante (A1)</option>
              <option value="A2">Básico (A2)</option>
              <option value="B1">Intermediário (B1)</option>
              <option value="B2">Intermediário Superior (B2)</option>
              <option value="C1">Avançado (C1)</option>
              <option value="C2">Proficiente (C2)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-1 flex items-center justify-end">
            {(busca || filtroStatus !== "todos" || filtroNivel !== "todos") && (
              <button
                type="button"
                onClick={limparFiltros}
                title="Limpar todos os filtros"
                className="w-full h-full inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Filter count status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Exibindo <strong>{alunosFiltrados.length}</strong> de{" "}
            <strong>{alunos.length}</strong> alunos cadastrados
          </span>
          {(busca || filtroStatus !== "todos" || filtroNivel !== "todos") && (
            <span className="text-indigo-600 font-medium">
              Filtros ativos aplicados
            </span>
          )}
        </div>
      </div>

      {/* Main Table for Desktop and Cards for Mobile */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Carregando discentes...
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Nenhum aluno encontrado
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Não encontramos nenhum registro correspondente aos filtros ou termo de busca informado.
            </p>
            <button
              type="button"
              onClick={limparFiltros}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Redefinir filtros
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (md:) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Aluno</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Nível Pedagógico</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Cadastro</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {alunosFiltrados.map((aluno) => {
                    const initials = aluno.nomeCompleto
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const dataFormatada = new Date(aluno.dataCadastro).toLocaleDateString(
                      "pt-BR"
                    );

                    return (
                      <tr
                        key={aluno.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Name + Email + Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {aluno.avatarUrl ? (
                              <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                                <Image
                                  src={aluno.avatarUrl}
                                  alt={aluno.nomeCompleto}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5046E5] to-indigo-800 text-white font-bold text-xs shadow-2xs">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/admin/alunos/${aluno.id}`}
                                className="font-bold text-slate-900 hover:text-[#5046E5] transition-colors truncate block"
                              >
                                {aluno.nomeCompleto}
                              </Link>
                              <span className="text-[11px] text-slate-400 truncate block">
                                {aluno.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {aluno.telefone || (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </td>

                        {/* Level */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <NivelBadge nivel={aluno.nivel} />
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={aluno.status} />
                        </td>

                        {/* Registration Date */}
                        <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap text-[11px]">
                          {dataFormatada}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/alunos/${aluno.id}`}
                              title="Ver Ficha e Detalhes"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleEditarAluno(aluno)}
                              title="Editar Aluno"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {aluno.status === "ativo" ? (
                              <button
                                type="button"
                                onClick={() => setAlunoParaInativar(aluno)}
                                title="Inativar Matrícula"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReativar(aluno)}
                                title="Reativar Aluno"
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

            {/* Mobile Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100">
              {alunosFiltrados.map((aluno) => {
                const initials = aluno.nomeCompleto
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const dataFormatada = new Date(aluno.dataCadastro).toLocaleDateString(
                  "pt-BR"
                );

                return (
                  <div key={aluno.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {aluno.avatarUrl ? (
                          <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                            <Image
                              src={aluno.avatarUrl}
                              alt={aluno.nomeCompleto}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5046E5] to-indigo-800 text-white font-bold text-xs shadow-2xs">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/alunos/${aluno.id}`}
                            className="font-bold text-slate-900 hover:text-[#5046E5] text-sm truncate block"
                          >
                            {aluno.nomeCompleto}
                          </Link>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {aluno.email}
                          </span>
                        </div>
                      </div>

                      <StatusBadge status={aluno.status} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-50">
                      <div>
                        <span className="text-slate-400 text-[11px]">Nível: </span>
                        <NivelBadge nivel={aluno.nivel} />
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Cadastrado em {dataFormatada}
                      </div>
                    </div>

                    {aluno.objetivoIngles && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg line-clamp-2">
                        <strong className="text-slate-700">Objetivo: </strong>
                        {aluno.objetivoIngles}
                      </p>
                    )}

                    {/* Mobile Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/admin/alunos/${aluno.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detalhes</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEditarAluno(aluno)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>
                      {aluno.status === "ativo" ? (
                        <button
                          type="button"
                          onClick={() => setAlunoParaInativar(aluno)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Inativar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReativar(aluno)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Reativar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Form Modal (Create / Edit) */}
      <AlunoFormModal
        isOpen={isFormOpen}
        alunoParaEditar={alunoEditando}
        onClose={() => {
          setIsFormOpen(false);
          setAlunoEditando(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Inactivation Confirmation Modal */}
      <ConfirmModal
        isOpen={!!alunoParaInativar}
        title="Confirmar Inativação do Aluno"
        description={`Tem certeza que deseja inativar o discente "${alunoParaInativar?.nomeCompleto}"? O aluno não terá acesso às salas de aula e atividades até ser reativado pela coordenação. Nenhuma informação será excluída.`}
        confirmLabel="Sim, Inativar Aluno"
        cancelLabel="Voltar"
        isDestructive={true}
        isLoading={isConfirmingInativar}
        onConfirm={handleConfirmarInativacao}
        onCancel={() => setAlunoParaInativar(null)}
      />
    </div>
  );
}
