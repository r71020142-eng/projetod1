"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Avaliacao,
  TentativaAvaliacao,
  ProgressoJornadaAluno,
  Aluno,
} from "@/types";
import {
  avaliacaoRepository,
  tentativaAvaliacaoRepository,
  alunoRepository,
  turmaRepository,
  getAlunoDashboardData,
} from "@/data/api";
import {
  TipoAvaliacaoBadge,
  StatusTentativaBadge,
  ResultadoBadge,
} from "@/components/admin/AvaliacaoBadges";
import { ProgressoJornadaCard } from "@/components/aluno/ProgressoJornadaCard";
import {
  FileText,
  Clock,
  RotateCcw,
  Play,
  Award,
} from "lucide-react";

type FiltroAlunoAba = "todas" | "disponiveis" | "aguardando" | "concluidas";

export default function AvaliacoesAlunoPage() {
  const [aba, setAba] = useState<FiltroAlunoAba>("todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [tentativas, setTentativas] = useState<TentativaAvaliacao[]>([]);
  const [progressoJornada, setProgressoJornada] = useState<ProgressoJornadaAluno | undefined>();
  const [alunoAtual, setAlunoAtual] = useState<Aluno | null>(null);

  const carregarDados = useCallback(async (isMounted = true) => {
    try {
      setError(null);
      // Aluno demonstrativo padrão
      const aluno = (await alunoRepository.obterPorId("alu-001")) || null;
      if (!isMounted) return;
      setAlunoAtual(aluno);

      // Dashboard com dados da jornada calculados
      const dash = await getAlunoDashboardData();
      if (!isMounted) return;
      setProgressoJornada(dash.progressoJornada);

      // Turmas do aluno
      const turmasAluno = await turmaRepository.listarPorAluno("alu-001");
      const turmaIds = turmasAluno.map((t) => t.id);

      // Avaliações do aluno (publicadas ou agendadas)
      const avals = await avaliacaoRepository.listarParaAluno("alu-001", turmaIds);
      // Tentativas do aluno
      const tents = await tentativaAvaliacaoRepository.listar({ alunoId: "alu-001" });

      if (!isMounted) return;
      setAvaliacoes(avals);
      setTentativas(tents);
    } catch (err) {
      console.error("Erro ao carregar avaliações do aluno:", err);
      if (isMounted) {
        setError("Não foi possível carregar suas avaliações. Tente novamente.");
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

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "avaliacoes" ||
        custom.detail.entity === "tentativas" ||
        custom.detail.entity === "alunos"
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

  // Filtragem
  const avaliacoesFiltradas = avaliacoes.filter((a) => {
    const tentsDaAvaliacao = tentativas.filter((t) => t.avaliacaoId === a.id);
    const ultimaTentativa = tentsDaAvaliacao[tentsDaAvaliacao.length - 1];
    const concluidas = tentsDaAvaliacao.filter(
      (t) => t.status === "corrigida" || t.status === "aguardando_correcao"
    );
    const podeFazer = concluidas.length < a.maxTentativas;

    if (aba === "disponiveis") {
      return podeFazer && (!ultimaTentativa || ultimaTentativa.status === "em_andamento");
    }
    if (aba === "aguardando") {
      return tentsDaAvaliacao.some((t) => t.status === "aguardando_correcao");
    }
    if (aba === "concluidas") {
      return tentsDaAvaliacao.some((t) => t.status === "corrigida");
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Jornada Pedagógica do Método Paulo */}
      <ProgressoJornadaCard progresso={progressoJornada} />

      {/* Header das Avaliações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Minhas Avaliações & Checkpoints
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {alunoAtual ? `Acompanhamento pedagógico de ${alunoAtual.nomeCompleto} • ` : ""}
            Testes objetivos de autoavaliação e atividades práticas avaliadas pelo seu professor.
          </p>
        </div>

        {/* Abas de Filtro */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setAba("todas")}
            className={`px-3 py-1.5 rounded-lg transition ${
              aba === "todas"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todas ({avaliacoes.length})
          </button>
          <button
            onClick={() => setAba("disponiveis")}
            className={`px-3 py-1.5 rounded-lg transition ${
              aba === "disponiveis"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Disponíveis
          </button>
          <button
            onClick={() => setAba("aguardando")}
            className={`px-3 py-1.5 rounded-lg transition ${
              aba === "aguardando"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Aguardando Correção
          </button>
          <button
            onClick={() => setAba("concluidas")}
            className={`px-3 py-1.5 rounded-lg transition ${
              aba === "concluidas"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Corrigidas
          </button>
        </div>
      </div>

      {/* Cards de Avaliações */}
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
        <div className="py-12 text-center text-slate-400">Carregando avaliações...</div>
      ) : avaliacoesFiltradas.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação nesta categoria.</p>
          <p className="text-xs text-slate-400">
            Fique atento aos prazos comunicados nas suas aulas e no painel principal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {avaliacoesFiltradas.map((a) => {
            const tentsDaAvaliacao = tentativas.filter((t) => t.avaliacaoId === a.id);
            const ultimaTentativa = tentsDaAvaliacao[tentsDaAvaliacao.length - 1];
            const concluidas = tentsDaAvaliacao.filter(
              (t) => t.status === "corrigida" || t.status === "aguardando_correcao"
            );
            const emAndamento = tentsDaAvaliacao.find((t) => t.status === "em_andamento");
            const tentativasRestantes = Math.max(0, a.maxTentativas - concluidas.length);

            return (
              <div
                key={a.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-200 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <TipoAvaliacaoBadge tipo={a.tipo} />
                    {ultimaTentativa && (
                      <StatusTentativaBadge status={ultimaTentativa.status} />
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {a.titulo}
                    </h3>
                    {a.descricao && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {a.descricao}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Tentativas realizadas:</span>
                      <strong className="text-slate-800">
                        {concluidas.length} de {a.maxTentativas}
                      </strong>
                    </div>

                    {a.prazo && (
                      <div className="flex items-center justify-between">
                        <span>Prazo de entrega:</span>
                        <strong className="text-slate-800">
                          {new Date(a.prazo).toLocaleDateString("pt-BR")}
                        </strong>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Nota mínima para aprovação:</span>
                      <strong className="text-slate-800">
                        {a.notaMinimaAprovacao ?? 7.0} / {a.notaMaxima}
                      </strong>
                    </div>
                  </div>

                  {/* Resultado da última tentativa, se houver */}
                  {ultimaTentativa && ultimaTentativa.status === "corrigida" && (
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                          Seu Desempenho
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-emerald-950">
                            Nota: {ultimaTentativa.nota?.toFixed(1) ?? "—"} / {a.notaMaxima}
                          </span>
                        </div>
                      </div>
                      <ResultadoBadge resultado={ultimaTentativa.resultado} />
                    </div>
                  )}

                  {ultimaTentativa && ultimaTentativa.status === "aguardando_correcao" && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 text-xs flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Sua submissão está na fila de avaliação pedagógica do professor.</span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {tentativasRestantes > 0
                      ? `${tentativasRestantes} tentativa(s) restante(s)`
                      : "Limite de tentativas atingido"}
                  </span>

                  <Link
                    href={`/aluno/avaliacoes/${a.id}`}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition ${
                      emAndamento
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : tentativasRestantes > 0
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {emAndamento ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Continuar Rascunho</span>
                      </>
                    ) : ultimaTentativa?.status === "corrigida" ? (
                      <>
                        <Award className="w-3.5 h-3.5" />
                        <span>Ver Resultado & Feedback</span>
                      </>
                    ) : ultimaTentativa?.status === "aguardando_correcao" ? (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Minha Entrega</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Iniciar Avaliação</span>
                      </>
                    )}
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
