"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  Plus,
  ArrowRight,
  Clock,
  Mic,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  History,
} from "lucide-react";
import { SelfPresentation, Aluno } from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import { alunoRepository } from "@/data/alunoRepository";
import {
  StatusSelfPresentationBadge,
  TipoSelfPresentationBadge,
} from "@/components/common/SelfPresentationBadges";
import { NivelBadge } from "@/components/common/NivelBadge";
import { SelfPresentationFormModal } from "@/components/aluno/SelfPresentationFormModal";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoSelfPresentationPage() {
  const [presentations, setPresentations] = useState<SelfPresentation[]>([]);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSp, setSelectedSp] = useState<SelfPresentation | null>(null);
  const [tipoModal, setTipoModal] = useState<"nivelamento_inicial" | "reavaliacao">("nivelamento_inicial");

  const loadData = useCallback(async (isMounted = true) => {
    try {
      setError(null);
      const [list, alu] = await Promise.all([
        selfPresentationRepository.listarParaAluno(DEMO_ALUNO_ID),
        alunoRepository.obterPorId(DEMO_ALUNO_ID),
      ]);
      if (!isMounted) return;
      setPresentations(list);
      setAluno(alu);
    } catch (err) {
      console.error("Erro ao carregar apresentações do aluno:", err);
      if (isMounted) {
        setError("Não foi possível carregar suas apresentações. Tente novamente.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadData(isMounted);

    const handleStorageUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "self_presentations" ||
        custom.detail.entity === "alunos"
      ) {
        loadData(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
    };
  }, [loadData]);

  // Apresentação ativa prioritária (a mais recente ou em andamento)
  const ativa = presentations[0] || null;

  const handleOpenNovoEnvio = () => {
    setSelectedSp(null);
    // Se o aluno já tem nivelamento inicial concluído ou ativo, sugere reavaliação
    const temInicial = presentations.some((p) => p.tipo === "nivelamento_inicial");
    setTipoModal(temInicial ? "reavaliacao" : "nivelamento_inicial");
    setModalOpen(true);
  };

  const handleOpenEditar = (sp: SelfPresentation) => {
    setSelectedSp(sp);
    setTipoModal(sp.tipo);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto my-8 space-y-3">
        <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando suas apresentações...</p>
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
            loadData(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Self Presentation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Grave suas apresentações orais em vídeo para receber diagnósticos e feedbacks detalhados do Método Paulo
          </p>
        </div>

        <div>
          {(!ativa || ativa.status === "avaliada") && (
            <button
              type="button"
              onClick={handleOpenNovoEnvio}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>
                {presentations.length === 0
                  ? "Gravar Apresentação Inicial"
                  : "Gravar Reavaliação"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Demonstrative Isolation Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
          <span>
            <strong>Ambiente Demonstrativo:</strong> O isolamento de dados de Self Presentation nesta etapa é local e demonstrativo para o discente <strong>{aluno?.nomeCompleto || "Mariana Oliveira"}</strong>, sem substituir autenticação no servidor.
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">ID: {DEMO_ALUNO_ID}</span>
      </div>

      {/* Hero Guidance Section (Roteiro dos 6 Passos) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-bold border border-white/10">
            <Mic className="h-3.5 w-3.5 text-amber-300" />
            <span>Rito Central de Fluência Oral • Método Paulo</span>
          </div>

          <span className="text-xs text-purple-200">
            Duração recomendada: <strong>2 a 3 minutos</strong>
          </span>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Como gravar sua Self Presentation
          </h2>
          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-normal">
            A Self Presentation é o pilar prático do Método Paulo para diagnosticar sua comunicação oral autêntica. Grave falando espontaneamente com a câmera, sem ler anotações prontas.
          </p>
        </div>

        {/* 6 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-purple-100 space-y-1">
            <span className="font-extrabold text-amber-300">1. Quem é você:</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">
              Diga seu nome e fale brevemente sobre você e sua trajetória.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-purple-100 space-y-1">
            <span className="font-extrabold text-amber-300">2. Sua rotina:</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">
              Conte como é o seu dia a dia, seu trabalho ou seus estudos.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-purple-100 space-y-1">
            <span className="font-extrabold text-amber-300">3. Por que inglês:</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">
              Explique seu motivo pessoal e o que deseja destravar no idioma.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-purple-100 space-y-1">
            <span className="font-extrabold text-amber-300">4. Experiência prévia:</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">
              Fale sobre cursos, tentativas anteriores ou medos já enfrentados.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-purple-100 space-y-1">
            <span className="font-extrabold text-amber-300">5. Próximo grande objetivo:</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">
              O que você gostaria de realizar quando falar com total confiança?
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-purple-100 space-y-1">
            <span className="font-extrabold text-amber-300">6. Fale naturalmente:</span>
            <p className="text-purple-200 text-[11px] leading-relaxed">
              Não se preocupe com erros. O objetivo é entender seu nível atual.
            </p>
          </div>
        </div>

        {/* CEFR Disclaimer Note */}
        <p className="text-[11px] text-purple-300/90 pt-1 italic">
          * A avaliação de Self Presentation analisa primariamente a produção oral e fluência comunicativa interna, não constituindo certificação oficial CEFR.
        </p>
      </div>

      {/* Active Presentation Card */}
      {ativa ? (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TipoSelfPresentationBadge tipo={ativa.tipo} />
              <StatusSelfPresentationBadge status={ativa.status} />
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                v{ativa.versao}
              </span>
            </div>

            {ativa.status === "avaliada" && ativa.avaliacao?.nivelDefinido && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Nível Operacional:
                </span>
                <NivelBadge nivel={ativa.avaliacao.nivelDefinido} />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
              {ativa.titulo}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gravado em: {new Date(ativa.dataGravacao).toLocaleDateString("pt-BR")}{" "}
              {ativa.dataEnvio && (
                <>• Enviado em {new Date(ativa.dataEnvio).toLocaleString("pt-BR")}</>
              )}
            </p>
          </div>

          {/* Contextual Status Banner */}
          {ativa.status === "rascunho" && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">Rascunho em andamento</p>
                <p className="text-slate-500 mt-0.5">
                  Você salvou este rascunho. Quando estiver pronto, insira o link externo HTTPS do seu vídeo e envie com o termo de consentimento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEditar(ativa)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shrink-0"
              >
                Continuar e Enviar
              </button>
            </div>
          )}

          {ativa.status === "enviada" && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Sua gravação está na fila pedagógica aguardando início da avaliação por um professor.
                </span>
              </div>
              <Link
                href={`/aluno/self-presentation/${ativa.id}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors shrink-0"
              >
                Ver Apresentação
              </Link>
            </div>
          )}

          {ativa.status === "em_avaliacao" && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  O professor <strong>{ativa.professorAvaliadorNome || "MTD"}</strong> está analisando seu vídeo e aplicando as rubricas.
                </span>
              </div>
              <Link
                href={`/aluno/self-presentation/${ativa.id}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 transition-colors shrink-0"
              >
                Acompanhar
              </Link>
            </div>
          )}

          {ativa.status === "reenvio_solicitado" && (
            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <RotateCcw className="h-4 w-4 text-purple-700" />
                <span>O Professor Solicitou um Novo Vídeo</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-purple-200/70 text-xs text-purple-900 space-y-1">
                <p className="font-bold">Motivo:</p>
                <p>{ativa.solicitacaoReenvio?.motivo}</p>
                <p className="font-bold pt-1">Orientações pedagógicas:</p>
                <p>{ativa.solicitacaoReenvio?.orientacoes}</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenEditar(ativa)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Gravar Nova Versão (Versão {(ativa.versao || 1) + 1})</span>
                </button>
              </div>
            </div>
          )}

          {ativa.status === "avaliada" && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Avaliação Concluída • Parecer do Professor Disponível</span>
                </div>
                {ativa.avaliacao?.nivelDefinido && (
                  <NivelBadge nivel={ativa.avaliacao.nivelDefinido} />
                )}
              </div>

              {ativa.avaliacao?.pontosFortes && (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 text-xs text-slate-800 space-y-1">
                  <p className="font-bold text-emerald-800">Destaque do parecer:</p>
                  <p className="line-clamp-2">{ativa.avaliacao.pontosFortes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-emerald-700">
                  Avaliado por <strong>{ativa.professorAvaliadorNome || "Lucas Ferreira"}</strong>
                </span>
                <Link
                  href={`/aluno/self-presentation/${ativa.id}`}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-2xs"
                >
                  <span>Ver Parecer Completo e Rubrica</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-4">
          <Video className="h-12 w-12 text-slate-300 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Você ainda não enviou sua Self Presentation
            </h3>
            <p className="text-xs text-slate-500">
              Grave seu vídeo de 2 a 3 minutos para que possamos entender seu ponto de partida e acompanhar sua evolução no Método Paulo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNovoEnvio}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-all"
          >
            <Video className="h-4 w-4" />
            <span>Iniciar Minha Primeira Apresentação</span>
          </button>
        </div>
      )}

      {/* History and Evolution Section */}
      {presentations.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">
                Histórico de Apresentações e Nivelamentos
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Total: {presentations.length} {presentations.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {presentations.map((item) => (
              <div
                key={item.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TipoSelfPresentationBadge tipo={item.tipo} />
                    <StatusSelfPresentationBadge status={item.status} />
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      v{item.versao}
                    </span>
                  </div>

                  <Link
                    href={`/aluno/self-presentation/${item.id}`}
                    className="text-sm font-bold text-slate-900 hover:text-purple-600 transition-colors block"
                  >
                    {item.titulo}
                  </Link>

                  <p className="text-xs text-slate-400">
                    Gravado em {new Date(item.dataGravacao).toLocaleDateString("pt-BR")}{" "}
                    {item.dataEnvio && (
                      <>• Enviado em {new Date(item.dataEnvio).toLocaleDateString("pt-BR")}</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {item.avaliacao?.nivelDefinido && (
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">
                        Nível
                      </span>
                      <NivelBadge nivel={item.avaliacao.nivelDefinido} />
                    </div>
                  )}

                  <Link
                    href={`/aluno/self-presentation/${item.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors"
                  >
                    <span>Abrir</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {modalOpen && (
        <SelfPresentationFormModal
          isOpen={modalOpen}
          alunoId={DEMO_ALUNO_ID}
          alunoNome={aluno?.nomeCompleto || "Mariana Oliveira"}
          presentation={selectedSp}
          tipo={tipoModal}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
