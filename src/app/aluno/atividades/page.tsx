"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  BookOpen,
  Clock,
  ChevronRight,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  Atividade,
  Entrega,
  ConteudoDiario,
  Turma,
} from "@/types";
import { atividadeRepository } from "@/data/atividadeRepository";
import { entregaRepository } from "@/data/entregaRepository";
import { conteudoDiarioRepository } from "@/data/conteudoDiarioRepository";
import { turmaRepository } from "@/data/turmaRepository";
import {
  TipoAtividadeBadge,
  StatusEntregaBadge,
} from "@/components/common/MaterialBadges";
import { EntregaAtividadeModal } from "@/components/aluno/EntregaAtividadeModal";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoAtividadesPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.alunoId || DEMO_ALUNO_ID;

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [entregaMap, setEntregaMap] = useState<Map<string, Entrega>>(new Map());
  const [praticaHoje, setPraticaHoje] = useState<ConteudoDiario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "pendentes" | "concluidas">("todas");

  // Submission Modal state
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null);

  const carregarDados = useCallback(async (mounted = true) => {
    setLoading(true);
    setError(null);
    try {
      const turmas = await turmaRepository.listarPorAluno(alunoId);
      const turmaIds = turmas.map((t: Turma) => t.id);

      const [todasAtividades, todasEntregas, diario] = await Promise.all([
        atividadeRepository.listarParaAluno(alunoId, turmaIds),
        entregaRepository.listar({ alunoId }),
        conteudoDiarioRepository.obterPraticaDeHoje(alunoId, turmaIds),
      ]);

      if (!mounted) return;

      const mapEntregas = new Map<string, Entrega>();
      todasEntregas.forEach((e: Entrega) => mapEntregas.set(e.atividadeId, e));

      setAtividades(todasAtividades);
      setEntregaMap(mapEntregas);
      setPraticaHoje(diario);
    } catch (err: unknown) {
      if (mounted) {
        console.error("Erro ao carregar atividades do aluno:", err);
        setError((err as Error)?.message || "Não foi possível carregar as atividades práticas.");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, [alunoId]);

  useEffect(() => {
    let isMounted = true;
    carregarDados(isMounted);

    const handleStorage = () => {
      if (isMounted) carregarDados(isMounted);
    };
    window.addEventListener("mtd_storage_updated", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorage);
    };
  }, [carregarDados]);

  const abrirModalEntrega = (atv: Atividade) => {
    setAtividadeSelecionada(atv);
    setModalEntregaOpen(true);
  };

  const atividadesFiltradas = atividades.filter((atv) => {
    const ent = entregaMap.get(atv.id);
    const isConcluida =
      ent?.status === "entregue" ||
      ent?.status === "atrasada" ||
      ent?.status === "corrigida";

    if (filtroStatus === "pendentes") {
      return !isConcluida || ent?.status === "reenviar";
    }
    if (filtroStatus === "concluidas") {
      return isConcluida;
    }
    return true;
  });

  const totalPendentes = atividades.filter((atv) => {
    const ent = entregaMap.get(atv.id);
    return !ent || ent.status === "nao_iniciada" || ent.status === "em_andamento" || ent.status === "reenviar";
  }).length;

  const totalConcluidas = atividades.filter((atv) => {
    const ent = entregaMap.get(atv.id);
    return ent && (ent.status === "entregue" || ent.status === "atrasada" || ent.status === "corrigida");
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      {/* Top Section Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <Link
          href="/aluno/atividades"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-purple-600 text-purple-700 whitespace-nowrap"
        >
          <CheckSquare className="h-4 w-4" />
          <span>Atividades Práticas ({atividades.length})</span>
        </Link>
        <Link
          href="/aluno/materiais"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          <span>Biblioteca de Materiais</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Minhas Atividades Práticas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Realize suas entregas práticas, exercite o inglês e receba o feedback detalhado do seu professor
          </p>
        </div>

        {/* Filter Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setFiltroStatus("todas")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filtroStatus === "todas"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todas ({atividades.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus("pendentes")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filtroStatus === "pendentes"
                ? "bg-white text-purple-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pendentes ({totalPendentes})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus("concluidas")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filtroStatus === "concluidas"
                ? "bg-white text-emerald-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Concluídas ({totalConcluidas})
          </button>
        </div>
      </div>

      {/* Alerta de Erro com Retry */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => carregarDados()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Compact Prática de Hoje Pill */}
      {praticaHoje && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/80 to-indigo-50/50 border border-purple-100/80 text-xs text-purple-950 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-purple-950">
                Prática de Hoje • {praticaHoje.titulo}
              </p>
              <p className="text-[11px] text-purple-800 line-clamp-1 mt-0.5">
                {praticaHoje.texto}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activities Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Carregando atividades...</div>
      ) : atividadesFiltradas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
          <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold">Nenhuma atividade nesta categoria</p>
          <p className="text-xs text-slate-400 mt-1">Você está em dia com suas tarefas do Método Paulo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {atividadesFiltradas.map((atv) => {
            const ent = entregaMap.get(atv.id);
            const isConcluida =
              ent?.status === "entregue" ||
              ent?.status === "atrasada" ||
              ent?.status === "corrigida";

            return (
              <div
                key={atv.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <TipoAtividadeBadge tipo={atv.tipo} />
                    <StatusEntregaBadge status={ent ? ent.status : "nao_iniciada"} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {atv.titulo}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {atv.instrucoes}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500 font-medium">
                    {atv.prazoEntrega ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                        Até {new Date(atv.prazoEntrega).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span>Sem prazo fixo</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirModalEntrega(atv)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs transition-all"
                  >
                    <span>
                      {ent?.status === "corrigida"
                        ? "Ver Correção"
                        : ent?.status === "reenviar"
                        ? "Reenviar"
                        : isConcluida
                        ? "Ver Envio"
                        : "Realizar Atividade"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Submission Modal */}
      <EntregaAtividadeModal
        isOpen={modalEntregaOpen}
        atividade={atividadeSelecionada}
        alunoId={alunoId}
        onClose={() => {
          setModalEntregaOpen(false);
          setAtividadeSelecionada(null);
        }}
        onSuccess={() => carregarDados()}
      />
    </div>
  );
}
