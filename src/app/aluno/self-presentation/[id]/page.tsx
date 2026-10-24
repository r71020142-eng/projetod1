"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Video,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  History,
  Send,
} from "lucide-react";
import { SelfPresentation } from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import {
  StatusSelfPresentationBadge,
  TipoSelfPresentationBadge,
  ScorePill,
} from "@/components/common/SelfPresentationBadges";
import { NivelBadge } from "@/components/common/NivelBadge";
import { SelfPresentationFormModal } from "@/components/aluno/SelfPresentationFormModal";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoSelfPresentationDetailPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || DEMO_ALUNO_ID);

  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [sp, setSp] = useState<SelfPresentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalEditOpen, setModalEditOpen] = useState(false);

  const loadSp = useCallback(async (isMounted = true) => {
    if (!id) return;
    try {
      setError(null);
      // Consulta protegida com sanitização estrita de observacoesInternas
      const found = await selfPresentationRepository.obterParaAluno(id, alunoId);
      if (!isMounted) return;
      setSp(found);
    } catch (err) {
      console.error("Erro ao carregar detalhes da apresentação do aluno:", err);
      if (isMounted) {
        setError("Não foi possível carregar os detalhes desta apresentação.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [id, alunoId]);

  useEffect(() => {
    let isMounted = true;
    loadSp(isMounted);

    const handleStorageUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (!custom.detail || custom.detail.entity === "self_presentations") {
        loadSp(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
    };
  }, [loadSp]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Video className="h-8 w-8 text-purple-600 animate-pulse mx-auto" />
        <p className="text-sm font-semibold">Carregando detalhes da Self Presentation...</p>
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
            loadSp(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-4 max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Apresentação não encontrada</h2>
        <p className="text-xs text-slate-500">
          Você não possui permissão para visualizar este registro ou ele não existe.
        </p>
        <Link
          href="/aluno/self-presentation"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar para Minhas Apresentações</span>
        </Link>
      </div>
    );
  }

  const isAvaliada = sp.status === "avaliada";
  const isReenvio = sp.status === "reenvio_solicitado";
  const isRascunho = sp.status === "rascunho";

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link
          href="/aluno/self-presentation"
          className="hover:text-purple-600 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Self Presentation
        </Link>
        <span>/</span>
        <span className="text-slate-400">Minha Apresentação</span>
        <span>/</span>
        <span className="text-slate-700 font-semibold truncate max-w-xs">{sp.titulo}</span>
      </div>

      {/* Main Presentation Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TipoSelfPresentationBadge tipo={sp.tipo} />
              <StatusSelfPresentationBadge status={sp.status} />
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Versão {sp.versao}
              </span>
            </div>

            {isAvaliada && sp.avaliacao?.nivelDefinido && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Nível Operacional Homologado:
                </span>
                <NivelBadge nivel={sp.avaliacao.nivelDefinido} />
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {sp.titulo}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>
              Gravado em:{" "}
              <strong className="text-slate-700">
                {new Date(sp.dataGravacao).toLocaleDateString("pt-BR")}
              </strong>
            </span>
            {sp.dataEnvio && (
              <>
                <span>•</span>
                <span>
                  Enviado em:{" "}
                  <strong className="text-slate-700">
                    {new Date(sp.dataEnvio).toLocaleString("pt-BR")}
                  </strong>
                </span>
              </>
            )}
            {sp.professorAvaliadorNome && (
              <>
                <span>•</span>
                <span>
                  Professor Avaliador:{" "}
                  <strong className="text-slate-700">{sp.professorAvaliadorNome}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Reenvio Alert Banner if status === reenvio_solicitado */}
        {isReenvio && (
          <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
              <RotateCcw className="h-4 w-4 text-purple-700" />
              <span>Orientações do Professor para Nova Gravação</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-purple-200 text-xs text-purple-950 space-y-2">
              <div>
                <p className="font-bold text-purple-900">Motivo do Reenvio:</p>
                <p className="mt-0.5">{sp.solicitacaoReenvio?.motivo}</p>
              </div>
              <div className="pt-2 border-t border-purple-100">
                <p className="font-bold text-purple-900">Orientações Pedagógicas:</p>
                <p className="mt-0.5">{sp.solicitacaoReenvio?.orientacoes}</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalEditOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Gravar e Enviar Nova Versão</span>
              </button>
            </div>
          </div>
        )}

        {/* Video Link and External Notice */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
              <Video className="h-4.5 w-4.5 text-purple-600" />
              <span>Gravação Audiovisual</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-800 uppercase tracking-wider">
                Conteúdo Externo
              </span>
            </div>
            <p className="text-xs text-purple-900 max-w-xl leading-relaxed">
              Sua apresentação está disponível no link externo HTTPS abaixo. Ao clicar, o vídeo será aberto em uma nova aba do navegador.
            </p>
            <div className="text-xs font-mono text-purple-700 truncate max-w-md pt-0.5">
              {sp.linkVideo || "Link ainda não cadastrado"}
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            {sp.linkVideo ? (
              <a
                href={sp.linkVideo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs transition-all"
              >
                <span>Assistir Gravação</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">Nenhum link informado</span>
            )}
          </div>
        </div>

        {/* Student Observation & Registered Consent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Sua Observação / Reflexão Pessoal:
            </span>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              {sp.observacaoAluno
                ? `“${sp.observacaoAluno}”`
                : "Nenhuma observação informada no envio."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Consentimento Pedagógico Confirmado</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Uso autorizado exclusivamente para acompanhamento pedagógico no Método Paulo em{" "}
              {sp.consentimento?.dataHora
                ? new Date(sp.consentimento.dataHora).toLocaleString("pt-BR")
                : "data de envio"}
              .
            </p>
          </div>
        </div>

        {/* In Progress Status (enviada or em_avaliacao) */}
        {(sp.status === "enviada" || sp.status === "em_avaliacao") && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <Clock className="h-8 w-8 text-purple-600 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">
                {sp.status === "em_avaliacao"
                  ? "Sua apresentação está em análise pelo professor"
                  : "Apresentação em fila de avaliação pedagógica"}
              </h3>
              <p className="text-xs text-slate-500">
                O corpo docente está aplicando as rubricas qualitativas do Método Paulo. O parecer completo com suas notas e próximos passos será liberado aqui assim que concluído.
              </p>
            </div>
          </div>
        )}

        {/* Rascunho Action */}
        {isRascunho && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Esta apresentação ainda é um rascunho</p>
              <p className="text-xs text-slate-500">
                Complete o formulário e faça o envio formal para que os professores iniciem a análise.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalEditOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Continuar e Enviar</span>
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SECTION 2: PARECER PEDAGÓGICO E RUBRICA CONCLUÍDA */}
      {/* ================================================================= */}
      {isAvaliada && sp.avaliacao && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Avaliação e Diagnóstico Homologados</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Parecer Pedagógico • Método Paulo
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Concluído em{" "}
                {sp.avaliacao.concluidaEm
                  ? new Date(sp.avaliacao.concluidaEm).toLocaleDateString("pt-BR")
                  : "data recente"}{" "}
                pelo professor <strong>{sp.avaliacao.professorNome}</strong>
              </p>
            </div>

            {sp.avaliacao.nivelDefinido && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Nível Operacional Definido
                </span>
                <NivelBadge nivel={sp.avaliacao.nivelDefinido} />
              </div>
            )}
          </div>

          {/* CEFR Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
            <p className="font-bold text-slate-800">
              * Nota sobre Nível Operacional e Proficiência:
            </p>
            <p>
              O nível diagnosticado na Self Presentation analisa prioritariamente sua produção oral e desenvoltura comunicativa no Método Paulo. Uma classificação global CEFR oficial também pode requerer competências complementares de leitura, escrita e compreensão auditiva formal.
            </p>
          </div>

          {/* Qualitative Feedback Cards */}
          <div className="space-y-4">
            {/* Pontos Fortes */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                Pontos Fortes Observados na Sua Fala
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {sp.avaliacao.pontosFortes}
              </p>
            </div>

            {/* Pontos a Desenvolver */}
            <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-1.5">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                Pontos a Desenvolver nas Próximas Aulas
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {sp.avaliacao.pontosADesenvolver}
              </p>
            </div>

            {/* Orientação */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1.5">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                Orientações Pedagógicas e Próximos Passos
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {sp.avaliacao.orientacaoProximasAulas}
              </p>
            </div>
          </div>

          {/* Simplified Rubric */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Detalhamento das Rubricas (Notas de 1 a 5)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Fluência */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Fluência</span>
                  <ScorePill score={sp.avaliacao.rubrica.fluencia.pontuacao} />
                </div>
                {sp.avaliacao.rubrica.fluencia.comentario && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{sp.avaliacao.rubrica.fluencia.comentario}&rdquo;
                  </p>
                )}
              </div>

              {/* Vocabulário */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Vocabulário</span>
                  <ScorePill score={sp.avaliacao.rubrica.vocabulario.pontuacao} />
                </div>
                {sp.avaliacao.rubrica.vocabulario.comentario && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{sp.avaliacao.rubrica.vocabulario.comentario}&rdquo;
                  </p>
                )}
              </div>

              {/* Gramática Aplicada */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Gramática Aplicada</span>
                  <ScorePill score={sp.avaliacao.rubrica.gramaticaAplicada.pontuacao} />
                </div>
                {sp.avaliacao.rubrica.gramaticaAplicada.comentario && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{sp.avaliacao.rubrica.gramaticaAplicada.comentario}&rdquo;
                  </p>
                )}
              </div>

              {/* Pronúncia */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Pronúncia</span>
                  <ScorePill score={sp.avaliacao.rubrica.pronunciaInteligibilidade.pontuacao} />
                </div>
                {sp.avaliacao.rubrica.pronunciaInteligibilidade.comentario && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{sp.avaliacao.rubrica.pronunciaInteligibilidade.comentario}&rdquo;
                  </p>
                )}
              </div>

              {/* Coerência */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Coerência e Organização</span>
                  <ScorePill score={sp.avaliacao.rubrica.coerenciaOrganizacao.pontuacao} />
                </div>
                {sp.avaliacao.rubrica.coerenciaOrganizacao.comentario && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{sp.avaliacao.rubrica.coerenciaOrganizacao.comentario}&rdquo;
                  </p>
                )}
              </div>

              {/* Compreensão Geral */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Compreensão Geral</span>
                  <ScorePill score={sp.avaliacao.rubrica.compreensaoGeral.pontuacao} />
                </div>
                {sp.avaliacao.rubrica.compreensaoGeral.comentario && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{sp.avaliacao.rubrica.compreensaoGeral.comentario}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History of Previous Versions (if any) */}
      {sp.historicoVersoes && sp.historicoVersoes.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">
              Versões Anteriores Desta Apresentação
            </h3>
          </div>

          <div className="space-y-3">
            {sp.historicoVersoes.map((v) => (
              <div
                key={v.versao}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Versão {v.versao} • Gravada em{" "}
                    {new Date(v.dataGravacao).toLocaleDateString("pt-BR")}
                  </span>
                  <a
                    href={v.linkVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Ver link externo</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {v.solicitacaoReenvio && (
                  <div className="p-3 rounded-xl bg-purple-50 text-[11px] text-purple-900 space-y-0.5">
                    <p className="font-bold">
                      Ajuste solicitado pelo professor {v.solicitacaoReenvio.professorNome}:
                    </p>
                    <p>{v.solicitacaoReenvio.motivo}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit / Resubmit Modal */}
      {modalEditOpen && (
        <SelfPresentationFormModal
          isOpen={modalEditOpen}
          alunoId={alunoId}
          alunoNome={identity?.nomeCompleto || "Mariana Oliveira"}
          presentation={sp}
          tipo={sp.tipo}
          onClose={() => setModalEditOpen(false)}
          onSuccess={() => {
            loadSp();
          }}
        />
      )}
    </div>
  );
}
