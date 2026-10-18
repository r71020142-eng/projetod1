"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Baralho,
  FlashcardsMetricasAluno,
  NivelMaterial,
} from "@/types";
import {
  baralhoRepository,
  turmaRepository,
  historicoRevisaoRepository,
  progressoCartaoRepository,
} from "@/data/api";
import {
  Layers,
  Flame,
  Clock,
  Search,
  CheckCircle,
  Play,
  RotateCw,
} from "lucide-react";

export default function AlunoFlashcardsPage() {
  const [baralhos, setBaralhos] = useState<Baralho[]>([]);
  const [metricas, setMetricas] = useState<FlashcardsMetricasAluno | null>(null);
  const [filasMap, setFilasMap] = useState<
    Record<string, { totalVencidos: number; totalAprendendo: number; totalNovos: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroNivel, setFiltroNivel] = useState<NivelMaterial>("todos");

  const carregarDados = useCallback(async (isMounted = true) => {
    try {
      setError(null);
      // Discente demonstrativo: Mariana Oliveira (alu-001)
      const turmasAluno = await turmaRepository.listarPorAluno("alu-001");
      const turmasIds = turmasAluno.map((t) => t.id);

      const baralhosPermitidos = await baralhoRepository.getBaralhosAluno("alu-001", turmasIds);
      if (!isMounted) return;
      setBaralhos(baralhosPermitidos);

      const metricasRes = await historicoRevisaoRepository.obterMetricasAluno(
        "alu-001",
        baralhosPermitidos
      );
      if (!isMounted) return;
      setMetricas(metricasRes);

      // Carrega filas individuais de cada baralho
      const filasTemp: Record<
        string,
        { totalVencidos: number; totalAprendendo: number; totalNovos: number }
      > = {};

      await Promise.all(
        baralhosPermitidos.map(async (b) => {
          const f = await progressoCartaoRepository.obterFilaEstudoBaralho(
            "alu-001",
            b.id,
            b.limiteDiarioNovos
          );
          filasTemp[b.id] = {
            totalVencidos: f.totalVencidos,
            totalAprendendo: f.totalAprendendo,
            totalNovos: f.totalNovos,
          };
        })
      );

      if (!isMounted) return;
      setFilasMap(filasTemp);
    } catch (err) {
      console.error("Erro ao carregar flashcards do aluno:", err);
      if (isMounted) {
        setError("Não foi possível carregar os flashcards. Tente novamente.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    carregarDados(isMounted);

    const handleStorageUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ entity: string }>;
      if (
        customEvent.detail?.entity === "baralhos" ||
        customEvent.detail?.entity === "cartoes" ||
        customEvent.detail?.entity === "progresso_cartoes" ||
        customEvent.detail?.entity === "historico_revisoes"
      ) {
        carregarDados(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
    };
  }, [carregarDados]);

  const baralhosFiltrados = baralhos.filter((b) => {
    if (filtroNivel !== "todos" && b.nivelRecomendado !== filtroNivel && b.nivelRecomendado !== "todos") {
      return false;
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const matchNome = b.nome.toLowerCase().includes(termo);
      const matchDesc = b.descricao.toLowerCase().includes(termo);
      const matchCat = b.categoria.toLowerCase().includes(termo);
      const matchTag = b.tags?.some((t) => t.toLowerCase().includes(termo));
      if (!matchNome && !matchDesc && !matchCat && !matchTag) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header com Saudação e Metodologia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
              Repetição Espaçada MTD
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Método Paulo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Meus Flashcards
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fixação de connected speech, phrasal verbs e vocabulário contextual com repetição espaçada.
          </p>
        </div>

        {metricas && metricas.sequenciaDias > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-extrabold shadow-sm shrink-0">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
            <span>{metricas.sequenciaDias} dias consecutivos!</span>
          </div>
        )}
      </div>

      {/* Painel de Métricas do Aluno */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Para Hoje */}
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.revisoesHoje ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Para Revisar Hoje</div>
          </div>
        </div>

        {/* Em Aprendizado */}
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.emAprendizado ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Em Aprendizado</div>
          </div>
        </div>

        {/* Novos Disponíveis */}
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.novosDisponiveis ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Novos Disponíveis</div>
          </div>
        </div>

        {/* Total Estudado */}
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.totalEstudadosHistorico ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Revisões Realizadas</div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtro de Nível */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por expressão, tema ou categoria..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value as NivelMaterial)}
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filtrar por nível"
          >
            <option value="todos">Todos os níveis</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>

          {(busca || filtroNivel !== "todos") && (
            <button
              onClick={() => {
                setBusca("");
                setFiltroNivel("todos");
              }}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Grade de Baralhos Disponíveis */}
      {error ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm space-y-3">
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
      ) : loading ? (
        <div className="p-12 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
          Carregando seus baralhos pedagógicos...
        </div>
      ) : baralhosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3">
          <Layers className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Nenhum baralho disponível</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Não há baralhos que correspondam à sua busca no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {baralhosFiltrados.map((b) => {
            const fila = filasMap[b.id] || { totalVencidos: 0, totalAprendendo: 0, totalNovos: 0 };
            const totalPraEstudarHoje = fila.totalVencidos + fila.totalAprendendo + fila.totalNovos;

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {b.nivelRecomendado === "todos" ? "Geral" : b.nivelRecomendado}
                    </span>
                    <span className="text-xs font-medium text-gray-400">
                      {b.categoria}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                      {b.nome}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {b.descricao}
                    </p>
                  </div>

                  {/* Resumo da Fila do Baralho */}
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-extrabold text-indigo-600">
                        {fila.totalVencidos}
                      </div>
                      <div className="text-[10px] text-gray-400">Vencidos</div>
                    </div>
                    <div>
                      <div className="font-extrabold text-amber-600">
                        {fila.totalAprendendo}
                      </div>
                      <div className="text-[10px] text-gray-400">Aprendendo</div>
                    </div>
                    <div>
                      <div className="font-extrabold text-emerald-600">
                        {fila.totalNovos}
                      </div>
                      <div className="text-[10px] text-gray-400">Novos</div>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                  <Link
                    href={`/aluno/flashcards/${b.id}`}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Ver Baralho
                  </Link>

                  <Link
                    href={`/aluno/flashcards/${b.id}/estudar`}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      totalPraEstudarHoje > 0
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {totalPraEstudarHoje > 0
                        ? `Estudar (${totalPraEstudarHoje})`
                        : "Revisar"}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
