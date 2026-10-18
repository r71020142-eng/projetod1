"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckSquare,
  Sparkles,
  Search,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  Material,
  Atividade,
  Entrega,
  ConteudoDiario,
} from "@/types";
import { materialRepository } from "@/data/materialRepository";
import { atividadeRepository } from "@/data/atividadeRepository";
import { entregaRepository } from "@/data/entregaRepository";
import { conteudoDiarioRepository } from "@/data/conteudoDiarioRepository";
import { turmaRepository } from "@/data/turmaRepository";
import {
  TipoMaterialBadge,
  TipoAtividadeBadge,
  StatusEntregaBadge,
} from "@/components/common/MaterialBadges";
import { EntregaAtividadeModal } from "@/components/aluno/EntregaAtividadeModal";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoMateriaisPage() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [praticaHoje, setPraticaHoje] = useState<ConteudoDiario | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [buscaMaterial, setBuscaMaterial] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [abaAtividades, setAbaAtividades] = useState<"todas" | "pendentes" | "concluidas">("todas");

  // Modal State
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const turmas = await turmaRepository.listarPorAluno(DEMO_ALUNO_ID);
      const turmaIds = turmas.map((t) => t.id);

      const [mats, atvs, ents, cd] = await Promise.all([
        materialRepository.listarParaAluno(DEMO_ALUNO_ID, turmaIds),
        atividadeRepository.listarParaAluno(DEMO_ALUNO_ID, turmaIds),
        entregaRepository.listar({ alunoId: DEMO_ALUNO_ID }),
        conteudoDiarioRepository.obterPraticaDeHoje(DEMO_ALUNO_ID, turmaIds),
      ]);

      setMateriais(mats);
      setAtividades(atvs);
      setEntregas(ents);
      setPraticaHoje(cd);
    } catch (err) {
      console.error("Erro ao carregar dados do aluno:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "materiais" ||
        custom.detail.entity === "atividades" ||
        custom.detail.entity === "entregas" ||
        custom.detail.entity === "conteudos_diarios"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, [carregarDados]);

  const entregaMap = new Map(entregas.map((e) => [e.atividadeId, e]));

  // Unique categories for filter
  const categorias = Array.from(new Set(materiais.map((m) => m.categoria)));

  // Filtered materials
  const materiaisFiltrados = materiais.filter((m) => {
    if (buscaMaterial && !m.titulo.toLowerCase().includes(buscaMaterial.toLowerCase())) {
      return false;
    }
    if (filtroCategoria !== "todas" && m.categoria !== filtroCategoria) {
      return false;
    }
    return true;
  });

  // Filtered activities
  const atividadesFiltradas = atividades.filter((atv) => {
    const ent = entregaMap.get(atv.id);
    const isConcluida =
      ent?.status === "entregue" ||
      ent?.status === "atrasada" ||
      ent?.status === "corrigida";

    if (abaAtividades === "pendentes") return !isConcluida;
    if (abaAtividades === "concluidas") return isConcluida;
    return true;
  });

  const abrirModalEntrega = (atv: Atividade) => {
    setAtividadeSelecionada(atv);
    setModalEntregaOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8">
        <div className="h-8 bg-slate-200 rounded w-64"></div>
        <div className="h-32 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-slate-200 rounded-2xl"></div>
          <div className="h-40 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
          Materiais e Atividades
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Acesse os conteúdos de estudo, apostilas e realize as atividades práticas do Método Paulo
        </p>
      </div>

      {/* Prática de Hoje Banner */}
      {praticaHoje && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-bold border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Prática de Hoje • Método Paulo</span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {praticaHoje.titulo}
            </h2>

            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              {praticaHoje.texto}
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: MINHAS ATIVIDADES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-900">Minhas Atividades Práticas</h2>
          </div>

          {/* Activity Sub-tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAbaAtividades("todas")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                abaAtividades === "todas"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({atividades.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtividades("pendentes")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                abaAtividades === "pendentes"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setAbaAtividades("concluidas")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                abaAtividades === "concluidas"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Concluídas
            </button>
          </div>
        </div>

        {atividadesFiltradas.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
            <p className="text-sm font-semibold">Nenhuma atividade nesta categoria</p>
            <p className="text-xs text-slate-400 mt-1">Você está em dia com seus envios!</p>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <TipoAtividadeBadge tipo={atv.tipo} />
                      <StatusEntregaBadge status={ent ? ent.status : "nao_iniciada"} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {atv.titulo}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
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
      </div>

      {/* SECTION 2: BIBLIOTECA DE CONTEÚDOS */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-900">Biblioteca de Conteúdos</h2>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={buscaMaterial}
                onChange={(e) => setBuscaMaterial(e.target.value)}
                placeholder="Buscar materiais..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-white"
            >
              <option value="todas">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {materiaisFiltrados.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">Nenhum material disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiaisFiltrados.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <TipoMaterialBadge tipo={m.tipo} />
                    <span className="text-[11px] font-semibold text-slate-400">
                      {m.categoria}
                    </span>
                  </div>

                  <Link
                    href={`/aluno/materiais/${m.id}`}
                    className="font-bold text-slate-900 hover:text-purple-600 block transition-colors leading-snug"
                  >
                    {m.titulo}
                  </Link>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {m.descricao}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Nível: {m.nivelRecomendado === "todos" ? "Todos" : m.nivelRecomendado}
                  </span>

                  <Link
                    href={`/aluno/materiais/${m.id}`}
                    className="font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <span>Acessar</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Submission Modal */}
      <EntregaAtividadeModal
        isOpen={modalEntregaOpen}
        atividade={atividadeSelecionada}
        alunoId={DEMO_ALUNO_ID}
        onClose={() => {
          setModalEntregaOpen(false);
          setAtividadeSelecionada(null);
        }}
        onSuccess={() => carregarDados()}
      />
    </div>
  );
}
