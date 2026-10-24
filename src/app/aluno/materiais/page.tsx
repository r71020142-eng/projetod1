"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckSquare,
  Search,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Material,
  Turma,
} from "@/types";
import { materialRepository } from "@/data/materialRepository";
import { atividadeRepository } from "@/data/atividadeRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { TipoMaterialBadge } from "@/components/common/MaterialBadges";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoMateriaisPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || DEMO_ALUNO_ID);

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [atividadesCount, setAtividadesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [buscaMaterial, setBuscaMaterial] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const carregarDados = useCallback(async (isMounted = true) => {
    try {
      setError(null);
      const turmas = await turmaRepository.listarPorAluno(alunoId);
      const turmaIds = turmas.map((t: Turma) => t.id);

      const [mats, atvs] = await Promise.all([
        materialRepository.listarParaAluno(alunoId, turmaIds),
        atividadeRepository.listarParaAluno(alunoId, turmaIds),
      ]);

      if (!isMounted) return;
      setMateriais(mats);
      setAtividadesCount(atvs.length);
    } catch (err) {
      console.error("Erro ao carregar materiais do aluno:", err);
      if (isMounted) {
        setError("Não foi possível carregar os materiais. Tente novamente.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [alunoId]);

  useEffect(() => {
    let isMounted = true;
    carregarDados(isMounted);

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "materiais" ||
        custom.detail.entity === "atividades"
      ) {
        carregarDados(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, [carregarDados]);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8 max-w-5xl">
        <div className="h-8 bg-slate-200 rounded w-64"></div>
        <div className="h-10 bg-slate-200 rounded-xl w-80"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm max-w-xl mx-auto my-8 space-y-3">
        <p className="text-sm font-bold text-red-700">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            carregarDados(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      {/* Top Section Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <Link
          href="/aluno/atividades"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap transition-colors"
        >
          <CheckSquare className="h-4 w-4" />
          <span>Atividades Práticas ({atividadesCount})</span>
        </Link>
        <Link
          href="/aluno/materiais"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-purple-600 text-purple-700 whitespace-nowrap"
        >
          <BookOpen className="h-4 w-4" />
          <span>Biblioteca de Materiais ({materiais.length})</span>
        </Link>
      </div>

      {/* Header and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Biblioteca de Materiais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Apostilas, PDFs de aula, áudios e conteúdos complementares do Método Paulo
          </p>
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
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-purple-500"
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

      {/* Materials Grid */}
      {materiaisFiltrados.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
          <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold">Nenhum material encontrado</p>
          <p className="text-xs text-slate-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
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

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
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
  );
}
