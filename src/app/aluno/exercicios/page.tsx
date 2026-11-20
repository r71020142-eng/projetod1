"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  BookOpen,
  Headphones,
  Sparkles,
  Layers,
  CheckCircle2,
  RotateCcw,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  ExercicioInterativo,
  NivelMaterial,
  TentativaExercicio,
  Turma,
  Baralho,
} from "@/types";
import { exercicioRepository } from "@/data/exercicioRepository";
import { tentativaExercicioRepository } from "@/data/tentativaExercicioRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { baralhoRepository } from "@/data/baralhoRepository";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoExerciciosPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth
    ? identity.alunoId || ""
    : identity?.alunoId || DEMO_ALUNO_ID;

  const [exercicios, setExercicios] = useState<ExercicioInterativo[]>([]);
  const [tentativasMap, setTentativasMap] = useState<Record<string, TentativaExercicio>>({});
  const [baralhosMap, setBaralhosMap] = useState<Record<string, Baralho>>({});
  const [resumo, setResumo] = useState({
    totalConcluidos: 0,
    mediaNotas: 0,
    totalAcertos: 0,
    totalQuestoes: 0,
    percentualGeral: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [abaTipo, setAbaTipo] = useState<"todos" | "multipla_escolha" | "leitura_audio" | "flashcards">("todos");
  const [filtroNivel, setFiltroNivel] = useState<NivelMaterial | "todos">("todos");
  const [busca, setBusca] = useState("");

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const turmas = await turmaRepository.listarPorAluno(alunoId);
      const turmaIds = turmas.map((t: Turma) => t.id);

      const [exerciciosList, tentativasList, resumoData, bList] = await Promise.all([
        exercicioRepository.listarParaAluno(alunoId, undefined, turmaIds),
        tentativaExercicioRepository.listarPorAluno(alunoId),
        tentativaExercicioRepository.obterResumoDesempenho(alunoId),
        baralhoRepository.listar(),
      ]);

      setExercicios(exerciciosList);
      setResumo(resumoData);

      // Mapeia última tentativa de cada exercício
      const tMap: Record<string, TentativaExercicio> = {};
      tentativasList.forEach((t) => {
        if (!tMap[t.exercicioId] || new Date(t.iniciadaEm) > new Date(tMap[t.exercicioId].iniciadaEm)) {
          tMap[t.exercicioId] = t;
        }
      });
      setTentativasMap(tMap);

      const bMap: Record<string, Baralho> = {};
      bList.forEach((b) => (bMap[b.id] = b));
      setBaralhosMap(bMap);
    } catch (e) {
      console.error("Erro ao carregar exercícios:", e);
    } finally {
      setLoading(false);
    }
  }, [alunoId]);

  useEffect(() => {
    carregarDados();

    const handleStorage = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.entity === "exercicios" || detail?.entity === "tentativas_exercicios") {
        carregarDados();
      }
    };
    window.addEventListener("mtd_storage_updated", handleStorage);
    return () => window.removeEventListener("mtd_storage_updated", handleStorage);
  }, [carregarDados]);

  const filtrados = exercicios.filter((ex) => {
    if (abaTipo !== "todos" && abaTipo !== "flashcards" && ex.tipo !== abaTipo) {
      return false;
    }
    if (filtroNivel !== "todos" && ex.nivel !== filtroNivel) {
      return false;
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const match =
        ex.titulo.toLowerCase().includes(q) ||
        ex.descricao.toLowerCase().includes(q) ||
        ex.categoria.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl pb-16">
      {/* Top Section Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <Link
          href="/aluno/atividades"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap transition-colors"
        >
          <CheckSquare className="h-4 w-4" />
          <span>Atividades Práticas</span>
        </Link>
        <Link
          href="/aluno/materiais"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          <span>Biblioteca de Materiais</span>
        </Link>
        <Link
          href="/aluno/exercicios"
          className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-purple-600 text-purple-700 whitespace-nowrap"
        >
          <Sparkles className="h-4 w-4" />
          <span>Exercícios Interativos ({exercicios.length})</span>
        </Link>
      </div>

      {/* Header & Métricas de Desempenho do Aluno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Padrão Lingua.com
            </span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight mt-1">
            Exercícios Interativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Treine interpretação de texto com áudio de narração e questionários com 4 alternativas e correção automática
          </p>
        </div>

        {/* Resumo Rápido */}
        {resumo.totalConcluidos > 0 && (
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 shrink-0">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Exercícios Realizados
              </p>
              <p className="text-lg font-black text-slate-900">
                {resumo.totalConcluidos}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Média de Aproveitamento
              </p>
              <p className="text-lg font-black text-emerald-600">
                {resumo.percentualGeral}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sub-abas de Categorização Lingua.com */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setAbaTipo("todos")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            abaTipo === "todos"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Todos os Exercícios ({exercicios.length})
        </button>

        <button
          type="button"
          onClick={() => setAbaTipo("multipla_escolha")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            abaTipo === "multipla_escolha"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Múltipla Escolha Pura
        </button>

        <button
          type="button"
          onClick={() => setAbaTipo("leitura_audio")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            abaTipo === "leitura_audio"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Headphones className="h-4 w-4" />
          Leitura & Compreensão com Áudio
        </button>

        <button
          type="button"
          onClick={() => setAbaTipo("flashcards")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            abaTipo === "flashcards"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          Vocabulário & Flashcards SRS
        </button>
      </div>

      {/* Conteúdo da Aba Especial de Flashcards SRS Integrados */}
      {abaTipo === "flashcards" ? (
        <div className="p-6 bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 text-purple-200 inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-300" /> Repetição Espaçada Integrada
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Vocabulário & Flashcards SRS do Método Paulo
              </h2>
              <p className="text-xs sm:text-sm text-purple-200 max-w-2xl font-normal leading-relaxed">
                Estude vocabulário prático e retenha expressões essenciais através do algoritmo determinístico SM-2, preservando seus streaks diários e histórico de revisões.
              </p>
            </div>
            <Link
              href="/aluno/flashcards"
              className="px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs sm:text-sm shrink-0 flex items-center gap-2 shadow-md transition-transform active:scale-95"
            >
              Ir aos Flashcards <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <p className="text-xs text-purple-200 uppercase font-semibold">Algoritmo</p>
              <p className="text-base font-bold">SM-2 SuperMemo</p>
              <p className="text-[11px] text-purple-300">4 opções: Errei, Difícil, Bom, Fácil</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <p className="text-xs text-purple-200 uppercase font-semibold">Gamificação</p>
              <p className="text-base font-bold">+10 XP Diário</p>
              <p className="text-[11px] text-purple-300">Sequência ativa e pontuação de sessão</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <p className="text-xs text-purple-200 uppercase font-semibold">Baralhos</p>
              <p className="text-base font-bold">Por Nível CEFR</p>
              <p className="text-[11px] text-purple-300">Conectados aos temas de leitura</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de Busca e Nível */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar exercício..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value as NivelMaterial | "todos")}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="todos">Todos os Níveis CEFR</option>
                <option value="A1">Nível A1 • Iniciante</option>
                <option value="A2">Nível A2 • Básico</option>
                <option value="B1">Nível B1 • Intermediário</option>
                <option value="B2">Nível B2 • Independente</option>
                <option value="C1">Nível C1 • Avançado</option>
                <option value="C2">Nível C2 • Fluente</option>
              </select>
            </div>
          </div>

          {/* Grid de Cards de Exercícios */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Carregando exercícios interativos...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4 max-w-lg mx-auto my-6 shadow-sm">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-800">
                  {busca.trim() || filtroNivel !== "todos"
                    ? "Nenhum exercício encontrado com estes filtros"
                    : "Nenhum exercício publicado no momento"}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {busca.trim() || filtroNivel !== "todos"
                    ? "Tente ajustar ou limpar seus filtros de busca e nível CEFR."
                    : "Novos exercícios interativos de múltipla escolha e leitura com áudio serão disponibilizados periodicamente pelo seu professor."}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/aluno/flashcards"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                >
                  Praticar Vocabulário nos Flashcards
                </Link>
                {(busca.trim() || filtroNivel !== "todos") && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusca("");
                      setFiltroNivel("todos");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtrados.map((ex) => {
                const ultTentativa = tentativasMap[ex.id];
                const jaRealizou = Boolean(ultTentativa && ultTentativa.status === "concluida");
                const baralhoVinculado = ex.baralhoVocabularioId
                  ? baralhosMap[ex.baralhoVocabularioId]
                  : null;

                return (
                  <div
                    key={ex.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                            {ex.nivel}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            {ex.tipo === "leitura_audio" ? (
                              <>
                                <Headphones className="h-3 w-3" /> Leitura & Áudio
                              </>
                            ) : (
                              <>
                                <CheckSquare className="h-3 w-3" /> Múltipla Escolha
                              </>
                            )}
                          </span>
                        </div>

                        {jaRealizou && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              ultTentativa.aprovado
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Nota {ultTentativa.notaFinal.toFixed(1)}/10
                          </span>
                        )}
                      </div>

                      {/* Título e Descrição */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {ex.titulo}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {ex.descricao || "Exercício prático de conversação e compreensão em inglês."}
                        </p>
                      </div>

                      {/* Metadados adicionais */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
                          {ex.questoes?.length || 0} questões (4 opções)
                        </span>

                        {ex.tipo === "leitura_audio" && ex.audioUrl && (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Headphones className="h-3.5 w-3.5 text-emerald-600" />
                            Com áudio
                          </span>
                        )}

                        <span className="text-slate-500 font-medium">
                          {ex.categoria}
                        </span>
                      </div>

                      {/* Card de Flashcards Vinculados (se houver) */}
                      {baralhoVinculado && (
                        <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Layers className="h-4 w-4 text-purple-600 shrink-0" />
                            <span className="font-semibold text-purple-900 truncate">
                              Flashcards: {baralhoVinculado.nome}
                            </span>
                          </div>
                          <Link
                            href={`/aluno/flashcards/${baralhoVinculado.id}/estudar`}
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline shrink-0 ml-2"
                          >
                            Revisar Vocabulário
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Botão de Ação Inferior */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {jaRealizou
                          ? `Realizado (${ultTentativa.percentualAproveitamento}% de acerto)`
                          : "Ainda não praticado"}
                      </span>

                      <Link
                        href={`/aluno/exercicios/${ex.id}`}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm ${
                          jaRealizou
                            ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                            : "bg-purple-600 hover:bg-purple-700 text-white"
                        }`}
                      >
                        {jaRealizou ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" /> Praticar Novamente
                          </>
                        ) : (
                          <>
                            Praticar Agora <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
