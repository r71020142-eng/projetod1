"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Video,
  Search,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowUpDown,
  User,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import {
  SelfPresentation,
  StatusSelfPresentation,
  TipoSelfPresentation,
  Professor,
  SelfPresentationsMetricasAdmin,
} from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import { professorRepository } from "@/data/professorRepository";
import {
  StatusSelfPresentationBadge,
  TipoSelfPresentationBadge,
} from "@/components/common/SelfPresentationBadges";
import { NivelBadge } from "@/components/common/NivelBadge";

export default function AdminSelfPresentationPage() {
  const [presentations, setPresentations] = useState<SelfPresentation[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [metricas, setMetricas] = useState<SelfPresentationsMetricasAdmin>({
    aguardando: 0,
    emAvaliacao: 0,
    reenviosPendentes: 0,
    avaliadas: 0,
    tempoMedioHorasTexto: "—",
  });

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusSelfPresentation | "todos">("todos");
  const [professorFiltro, setProfessorFiltro] = useState<string>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<TipoSelfPresentation | "todos">("todos");
  const [ordenacao, setOrdenacao] = useState<"antigas_primeiro" | "recentes_primeiro">("antigas_primeiro");

  // Professor ativo simulado para assumir avaliações nesta fase sem autenticação
  const [professorAtivoId, setProfessorAtivoId] = useState<string>("prof-001");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [list, profs, counts] = await Promise.all([
        selfPresentationRepository.listar(),
        professorRepository.listar(),
        selfPresentationRepository.contadoresDashboard(),
      ]);
      setPresentations(list);
      setProfessores(profs);
      setMetricas(counts);
    } catch (err) {
      console.error("Erro ao carregar fila de self presentations:", err);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorageUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (!custom.detail || custom.detail.entity === "self_presentations") {
        loadData();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
    };
  }, []);

  const professorAtivo = useMemo(
    () => professores.find((p) => p.id === professorAtivoId) || professores[0],
    [professores, professorAtivoId]
  );

  const handleAssumirAvaliacao = async (spId: string) => {
    if (!professorAtivo) return;
    setLoadingActionId(spId);
    try {
      await selfPresentationRepository.assumirAvaliacao(
        spId,
        professorAtivo.id,
        professorAtivo.nomeCompleto
      );
      await loadData();
    } catch (err) {
      console.error("Erro ao assumir avaliação:", err);
    } finally {
      setLoadingActionId(null);
    }
  };

  // Filtragem e ordenação em memória
  const filtradas = useMemo(() => {
    let result = [...presentations];

    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      result = result.filter(
        (sp) =>
          sp.alunoNome.toLowerCase().includes(q) ||
          sp.titulo.toLowerCase().includes(q)
      );
    }

    if (statusFiltro !== "todos") {
      result = result.filter((sp) => sp.status === statusFiltro);
    }

    if (professorFiltro !== "todos") {
      result = result.filter((sp) => sp.professorAvaliadorId === professorFiltro);
    }

    if (tipoFiltro !== "todos") {
      result = result.filter((sp) => sp.tipo === tipoFiltro);
    }

    if (ordenacao === "antigas_primeiro") {
      result.sort(
        (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
      );
    } else {
      result.sort(
        (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
    }

    return result;
  }, [presentations, busca, statusFiltro, professorFiltro, tipoFiltro, ordenacao]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Fila de Self Presentations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Avaliação oral qualitativa do Método Paulo com rubricas pedagógicas e nivelamento
          </p>
        </div>

        {/* Demonstrative Active Teacher Selector */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
          <User className="h-4 w-4 text-purple-600 shrink-0" />
          <div className="text-xs">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">
              Professor Ativo na Sessão (Demo)
            </span>
            <select
              value={professorAtivoId}
              onChange={(e) => setProfessorAtivoId(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Aguardando Avaliação */}
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Aguardando Avaliação
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-950">{metricas.aguardando}</div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Fila prioritária de novos envios
          </p>
        </div>

        {/* Card 2: Em Avaliação */}
        <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              Em Avaliação
            </span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-950">{metricas.emAvaliacao}</div>
          <p className="text-[11px] text-indigo-700 font-medium mt-1">
            Com professores responsáveis
          </p>
        </div>

        {/* Card 3: Reenvios Solicitados */}
        <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              Reenvios Pendentes
            </span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-950">
            {metricas.reenviosPendentes}
          </div>
          <p className="text-[11px] text-purple-700 font-medium mt-1">
            Aguardando nova gravação do aluno
          </p>
        </div>

        {/* Card 4: Concluídas / Tempo Médio */}
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Avaliações Concluídas
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">{metricas.avaliadas}</span>
            <span className="text-xs text-emerald-700 font-bold">
              (Média: {metricas.tempoMedioHorasTexto})
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Diagnósticos orais homologados
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por aluno ou título da apresentação..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500 text-slate-800 placeholder:text-slate-400"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setOrdenacao(
                  ordenacao === "antigas_primeiro"
                    ? "recentes_primeiro"
                    : "antigas_primeiro"
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-purple-600" />
              <span>
                {ordenacao === "antigas_primeiro"
                  ? "Mais Antigas (Fila de Atendimento)"
                  : "Mais Recentes"}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as StatusSelfPresentation | "todos")}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 text-xs focus:outline-none"
            >
              <option value="todos">Todos os status</option>
              <option value="enviada">Aguardando Avaliação ({metricas.aguardando})</option>
              <option value="em_avaliacao">Em Avaliação ({metricas.emAvaliacao})</option>
              <option value="reenvio_solicitado">Reenvio Solicitado ({metricas.reenviosPendentes})</option>
              <option value="avaliada">Avaliada ({metricas.avaliadas})</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </div>

          {/* Professor */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Professor:</span>
            <select
              value={professorFiltro}
              onChange={(e) => setProfessorFiltro(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 text-xs focus:outline-none"
            >
              <option value="todos">Todos os professores</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Tipo:</span>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as TipoSelfPresentation | "todos")}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 text-xs focus:outline-none"
            >
              <option value="todos">Todos os tipos</option>
              <option value="nivelamento_inicial">Nivelamento Inicial</option>
              <option value="reavaliacao">Reavaliação</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Video className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Nenhuma Self Presentation encontrada
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhum registro corresponde aos filtros selecionados. Tente ajustar os termos de busca ou selecionar outro status.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtradas.map((sp) => {
              const isPendenteAguardando = sp.status === "enviada";
              const isAvaliada = sp.status === "avaliada";

              return (
                <div
                  key={sp.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TipoSelfPresentationBadge tipo={sp.tipo} />
                      <StatusSelfPresentationBadge status={sp.status} />
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        v{sp.versao}
                      </span>
                      {isAvaliada && sp.avaliacao?.nivelDefinido && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Nível:
                          </span>
                          <NivelBadge nivel={sp.avaliacao.nivelDefinido} />
                        </div>
                      )}
                    </div>

                    <div>
                      <Link
                        href={`/admin/self-presentation/${sp.id}`}
                        className="text-base font-extrabold text-slate-900 hover:text-purple-600 transition-colors truncate block"
                      >
                        {sp.titulo}
                      </Link>
                      <p className="text-xs text-slate-500 font-medium">
                        Aluno(a): <strong className="text-slate-800">{sp.alunoNome}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>
                        Enviado em:{" "}
                        {sp.dataEnvio
                          ? new Date(sp.dataEnvio).toLocaleString("pt-BR")
                          : new Date(sp.criadoEm).toLocaleDateString("pt-BR")}
                      </span>
                      <span>•</span>
                      <span>
                        Professor Avaliador:{" "}
                        <strong className="text-slate-700">
                          {sp.professorAvaliadorNome || "Nenhum atribuído"}
                        </strong>
                      </span>
                      {sp.consentimento?.aceito && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Consentimento Registrado
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                    {/* Botão de Assumir se estiver aguardando */}
                    {isPendenteAguardando && (
                      <button
                        type="button"
                        onClick={() => handleAssumirAvaliacao(sp.id)}
                        disabled={loadingActionId === sp.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-2xs disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {loadingActionId === sp.id
                            ? "Assumindo..."
                            : `Assumir como ${professorAtivo.nomeCompleto.split(" ")[0]}`}
                        </span>
                      </button>
                    )}

                    <Link
                      href={`/admin/self-presentation/${sp.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
                    >
                      <span>{isAvaliada ? "Ver Detalhes" : "Avaliar Apresentação"}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
