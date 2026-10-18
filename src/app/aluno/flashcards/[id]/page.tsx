"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Baralho,
  Cartao,
  CartaoProgressoAluno,
  SessaoEstudoResumo,
} from "@/types";
import {
  baralhoRepository,
  cartaoRepository,
  progressoCartaoRepository,
  sessaoEstudoRepository,
} from "@/data/api";
import { BadgeEstadoAprendizagem } from "@/components/common/FlashcardBadges";
import {
  ArrowLeft,
  Play,
  Clock,
  Sparkles,
  RotateCw,
  CheckCircle,
  Volume2,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function AlunoBaralhoDetalhePage() {
  const params = useParams();
  const baralhoId = params.id as string;

  const [baralho, setBaralho] = useState<Baralho | null>(null);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [progressos, setProgressos] = useState<Record<string, CartaoProgressoAluno>>({});
  const [sessoes, setSessoes] = useState<SessaoEstudoResumo[]>([]);
  const [filaInfo, setFilaInfo] = useState<{
    totalVencidos: number;
    totalAprendendo: number;
    totalNovos: number;
  }>({ totalVencidos: 0, totalAprendendo: 0, totalNovos: 0 });
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    if (!baralhoId) return;
    setLoading(true);
    try {
      const [baralhoRes, cartoesRes, sessoesRes, filaRes] = await Promise.all([
        baralhoRepository.getBaralhoById(baralhoId),
        cartaoRepository.getCartoesPorBaralho(baralhoId, true), // apenas ativos
        sessaoEstudoRepository.obterSessoesPorAluno("alu-001", baralhoId),
        progressoCartaoRepository.obterFilaEstudoBaralho("alu-001", baralhoId),
      ]);

      setBaralho(baralhoRes);
      setCartoes(cartoesRes);
      setSessoes(sessoesRes);
      setProgressos(filaRes.progressos);
      setFilaInfo({
        totalVencidos: filaRes.totalVencidos,
        totalAprendendo: filaRes.totalAprendendo,
        totalNovos: filaRes.totalNovos,
      });
    } finally {
      setLoading(false);
    }
  }, [baralhoId]);

  useEffect(() => {
    carregarDados();

    const handleStorageUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ entity: string }>;
      if (
        customEvent.detail?.entity === "baralhos" ||
        customEvent.detail?.entity === "cartoes" ||
        customEvent.detail?.entity === "progresso_cartoes" ||
        customEvent.detail?.entity === "sessoes_estudo"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
  }, [carregarDados]);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-gray-400">
        Carregando baralho pedagógico...
      </div>
    );
  }

  if (!baralho) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Baralho não encontrado</h2>
        <p className="text-sm text-gray-500">
          O baralho solicitado não está disponível para o seu perfil.
        </p>
        <Link
          href="/aluno/flashcards"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Meus Flashcards</span>
        </Link>
      </div>
    );
  }

  const totalParaHoje =
    filaInfo.totalVencidos + filaInfo.totalAprendendo + filaInfo.totalNovos;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/aluno/flashcards"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Meus Flashcards</span>
        </Link>
      </div>

      {/* Cartão de Apresentação do Baralho */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                {baralho.nivelRecomendado === "todos" ? "Todos os Níveis" : baralho.nivelRecomendado}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 font-medium">{baralho.categoria}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 font-medium">Prof. {baralho.professorNome}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {baralho.nome}
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              {baralho.descricao}
            </p>
          </div>

          {/* CTA Estudar */}
          <div className="shrink-0">
            <Link
              href={`/aluno/flashcards/${baralho.id}/estudar`}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {totalParaHoje > 0
                  ? `Iniciar Sessão (${totalParaHoje} cartões)`
                  : "Praticar Baralho Novamente"}
              </span>
            </Link>
          </div>
        </div>

        {/* Status da Fila Diária */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-indigo-900">
                {filaInfo.totalVencidos}
              </div>
              <div className="text-xs font-semibold text-indigo-700">Revisões Vencidas</div>
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-amber-900">
                {filaInfo.totalAprendendo}
              </div>
              <div className="text-xs font-semibold text-amber-700">Em Aprendizado</div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-emerald-900">
                {filaInfo.totalNovos}
              </div>
              <div className="text-xs font-semibold text-emerald-700">Novos Liberados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartões do Baralho (Visualização e Revisão) */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Cartões do Baralho</h2>
            <p className="text-xs text-gray-500">
              Total de {cartoes.length} expressões e estruturas cadastradas
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Seu progresso é individual e preservado localmente
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {cartoes.map((c) => {
            const prog = progressos[c.id];
            const estado = prog ? prog.estado : "novo";
            const temAudio = c.linkAudio && c.linkAudio.trim().startsWith("https://");

            return (
              <div
                key={c.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 rounded-xl px-2 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{c.frente}</span>
                    {temAudio && (
                      <a
                        href={c.linkAudio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 p-1"
                        title="Ouvir áudio externo (abre em nova aba)"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-gray-600">{c.verso}</p>

                  {c.exemplo && (
                    <p className="text-xs text-gray-400 italic">
                      &ldquo;{c.exemplo}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {c.pronuncia && (
                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                      {c.pronuncia}
                    </span>
                  )}
                  <BadgeEstadoAprendizagem estado={estado} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de Sessões Concluídas */}
      {sessoes.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Suas Sessões de Estudo Recentes</span>
          </div>

          <div className="space-y-2">
            {sessoes.slice(0, 5).map((s) => {
              const minutos = Math.floor(s.tempoSegundos / 60);
              const segundos = s.tempoSegundos % 60;
              const dataFormatada = new Date(s.concluidaEm).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={s.id}
                  className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-gray-800">{dataFormatada}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      {s.totalEstudado} cartões estudados ({minutos}m {segundos}s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                      {s.bons + s.faceis} acertos
                    </span>
                    {s.erros > 0 && (
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold">
                        {s.erros} reagendado{s.erros > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
