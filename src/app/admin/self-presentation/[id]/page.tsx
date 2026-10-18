"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Video,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Award,
  Save,
  Send,
  History,
  EyeOff,
} from "lucide-react";
import {
  SelfPresentation,
  RubricaPedagogica,
  NivelAluno,
  Professor,
  Aluno,
  SolicitacaoReenvio,
} from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import { professorRepository } from "@/data/professorRepository";
import { alunoRepository } from "@/data/alunoRepository";
import {
  StatusSelfPresentationBadge,
  TipoSelfPresentationBadge,
  ScorePill,
} from "@/components/common/SelfPresentationBadges";
import { NivelBadge } from "@/components/common/NivelBadge";
import { SolicitarReenvioModal } from "@/components/admin/SolicitarReenvioModal";
import { AplicarNivelModal } from "@/components/admin/AplicarNivelModal";
import {
  calcularMediaCriteriosOrais,
} from "@/data/validators";

export default function AdminSelfPresentationDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [sp, setSp] = useState<SelfPresentation | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modais
  const [modalReenvioOpen, setModalReenvioOpen] = useState(false);
  const [modalAplicarNivelOpen, setModalAplicarNivelOpen] = useState(false);

  // Estado do formulário de avaliação
  const [professorId, setProfessorId] = useState("prof-001");
  const [rubrica, setRubrica] = useState<RubricaPedagogica>({
    fluencia: { pontuacao: 3, comentario: "", exemploObservado: "" },
    vocabulario: { pontuacao: 3, comentario: "", exemploObservado: "" },
    gramaticaAplicada: { pontuacao: 3, comentario: "", exemploObservado: "" },
    pronunciaInteligibilidade: { pontuacao: 3, comentario: "", exemploObservado: "" },
    coerenciaOrganizacao: { pontuacao: 3, comentario: "", exemploObservado: "" },
    compreensaoGeral: { pontuacao: 3, comentario: "", exemploObservado: "" },
  });

  const [pontosFortes, setPontosFortes] = useState("");
  const [pontosADesenvolver, setPontosADesenvolver] = useState("");
  const [orientacaoProximasAulas, setOrientacaoProximasAulas] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [nivelDefinido, setNivelDefinido] = useState<NivelAluno>("B1");
  const [justificativaNivel, setJustificativaNivel] = useState("");

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [foundSp, profs] = await Promise.all([
        selfPresentationRepository.obterPorId(id),
        professorRepository.listar(),
      ]);

      setSp(foundSp);
      setProfessores(profs);

      if (foundSp) {
        const foundAluno = await alunoRepository.obterPorId(foundSp.alunoId);
        setAluno(foundAluno);

        if (foundSp.professorAvaliadorId) {
          setProfessorId(foundSp.professorAvaliadorId);
        }

        if (foundSp.avaliacao) {
          setRubrica(foundSp.avaliacao.rubrica);
          setPontosFortes(foundSp.avaliacao.pontosFortes || "");
          setPontosADesenvolver(foundSp.avaliacao.pontosADesenvolver || "");
          setOrientacaoProximasAulas(foundSp.avaliacao.orientacaoProximasAulas || "");
          setObservacoesInternas(foundSp.avaliacao.observacoesInternas || "");
          setNivelDefinido(foundSp.avaliacao.nivelDefinido || "B1");
          setJustificativaNivel(foundSp.avaliacao.justificativaNivel || "");
        }
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes da self presentation:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Cálculo da média aritmética simples dos critérios orais
  const calculoMedia = useMemo(() => {
    return calcularMediaCriteriosOrais(rubrica);
  }, [rubrica]);

  const handleScoreChange = (
    criterio: keyof RubricaPedagogica,
    score: number
  ) => {
    setRubrica((prev) => ({
      ...prev,
      [criterio]: {
        ...prev[criterio],
        pontuacao: score,
      },
    }));
  };

  const handleComentarioChange = (
    criterio: keyof RubricaPedagogica,
    comentario: string
  ) => {
    setRubrica((prev) => ({
      ...prev,
      [criterio]: {
        ...prev[criterio],
        comentario,
      },
    }));
  };

  const handleSalvarRascunhoAvaliacao = async () => {
    if (!sp) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const prof = professores.find((p) => p.id === professorId) || professores[0];
    const professorNome = prof ? prof.nomeCompleto : "Professor MTD";

    try {
      const res = await selfPresentationRepository.salvarAvaliacao(
        sp.id,
        {
          professorId,
          professorNome,
          rubrica,
          pontosFortes,
          pontosADesenvolver,
          orientacaoProximasAulas,
          observacoesInternas,
          mediaCriteriosOrais: calculoMedia.media,
          nivelDefinido,
          justificativaNivel,
        },
        false // apenas rascunho
      );

      if (!res.success || !res.data) {
        setError(res.error || "Falha ao salvar rascunho da avaliação.");
        setIsSubmitting(false);
        return;
      }

      setSp(res.data);
      setSuccessMsg("Rascunho da avaliação salvo com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar rascunho.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublicarFeedback = async () => {
    if (!sp) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const prof = professores.find((p) => p.id === professorId) || professores[0];
    const professorNome = prof ? prof.nomeCompleto : "Professor MTD";

    try {
      const res = await selfPresentationRepository.salvarAvaliacao(
        sp.id,
        {
          professorId,
          professorNome,
          rubrica,
          pontosFortes,
          pontosADesenvolver,
          orientacaoProximasAulas,
          observacoesInternas,
          mediaCriteriosOrais: calculoMedia.media,
          nivelDefinido,
          justificativaNivel,
        },
        true // publica formalmente
      );

      if (!res.success || !res.data) {
        setError(res.error || "Falha ao publicar avaliação.");
        setIsSubmitting(false);
        return;
      }

      setSp(res.data);
      setSuccessMsg("Avaliação pedagógica publicada com sucesso para o aluno!");
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao publicar avaliação.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSolicitarReenvioConfirm = async (
    solicitacao: SolicitacaoReenvio
  ) => {
    if (!sp) return;
    const res = await selfPresentationRepository.solicitarReenvio(sp.id, solicitacao);
    if (!res.success || !res.data) {
      throw new Error(res.error || "Falha ao solicitar reenvio.");
    }
    setSp(res.data);
    setSuccessMsg("Reenvio solicitado com sucesso ao aluno! Versão anterior arquivada.");
  };

  const handleAplicarNivelConfirm = async () => {
    if (!sp) return;
    const prof = professores.find((p) => p.id === professorId) || professores[0];
    const professorNome = prof ? prof.nomeCompleto : "Professor MTD";

    const res = await selfPresentationRepository.aplicarNivelAoPerfil(
      sp.id,
      professorId,
      professorNome
    );

    if (!res.success || !res.data) {
      throw new Error(res.error || "Falha ao aplicar nível ao perfil.");
    }

    setSp(res.data.sp);
    setAluno(res.data.aluno);
    setSuccessMsg(
      `Nível ${res.data.aluno.nivel} aplicado com sucesso ao cadastro de ${res.data.aluno.nomeCompleto}!`
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Video className="h-8 w-8 text-purple-600 animate-pulse mx-auto" />
        <p className="text-sm font-semibold">Carregando detalhes da Self Presentation...</p>
      </div>
    );
  }

  if (!sp) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-4 max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Apresentação não encontrada</h2>
        <p className="text-xs text-slate-500">
          O registro solicitado não foi localizado no armazenamento demonstrativo local.
        </p>
        <Link
          href="/admin/self-presentation"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar para a fila</span>
        </Link>
      </div>
    );
  }

  const isAvaliada = sp.status === "avaliada";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link
          href="/admin/self-presentation"
          className="hover:text-purple-600 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Fila de Self Presentations
        </Link>
        <span>/</span>
        <span className="text-slate-400">Avaliação</span>
        <span>/</span>
        <span className="text-slate-700 font-semibold truncate max-w-xs">{sp.titulo}</span>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Student and Video Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TipoSelfPresentationBadge tipo={sp.tipo} />
              <StatusSelfPresentationBadge status={sp.status} />
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Versão {sp.versao}
              </span>
              {sp.nivelAplicadoAoPerfil && sp.avaliacao?.nivelDefinido && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Nível Aplicado ao Perfil: {sp.avaliacao.nivelDefinido}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {sp.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                Aluno: <strong className="text-slate-800">{sp.alunoNome}</strong>
              </span>
              <span>•</span>
              {aluno && (
                <>
                  <span>
                    Nível no Cadastro: <NivelBadge nivel={aluno.nivel} />
                  </span>
                  <span>•</span>
                </>
              )}
              <span>
                Gravado em:{" "}
                {new Date(sp.dataGravacao).toLocaleDateString("pt-BR")}
              </span>
              <span>•</span>
              <span>
                Enviado em:{" "}
                {sp.dataEnvio
                  ? new Date(sp.dataEnvio).toLocaleString("pt-BR")
                  : "Não enviado"}
              </span>
            </div>
          </div>

          {/* Quick Level Application Action if already evaluated */}
          {isAvaliada && aluno && (
            <div className="flex flex-col sm:items-end gap-2">
              {!sp.nivelAplicadoAoPerfil ? (
                <button
                  type="button"
                  onClick={() => setModalAplicarNivelOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs"
                >
                  <Award className="h-4 w-4" />
                  <span>Aplicar este nível ao perfil do aluno</span>
                </button>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Nível homologado no perfil</span>
                </div>
              )}
              <span className="text-[11px] text-slate-400">
                Ação com confirmação e histórico auditável
              </span>
            </div>
          )}
        </div>

        {/* Video Card and External HTTPS Link */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
              <Video className="h-4.5 w-4.5 text-purple-600" />
              <span>Gravação Audiovisual Enviada pelo Aluno</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-800 uppercase tracking-wider">
                Conteúdo Externo
              </span>
            </div>
            <p className="text-xs text-purple-900 max-w-xl leading-relaxed">
              O vídeo foi submetido via link externo HTTPS. Clique no botão ao lado para assistir à apresentação completa em uma nova aba do navegador.
            </p>
            <div className="text-xs font-mono text-purple-700 truncate max-w-lg pt-1">
              {sp.linkVideo || "Link ainda não informado"}
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            {sp.linkVideo ? (
              <a
                href={sp.linkVideo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-2xs"
              >
                <span>Acessar Vídeo Externo (HTTPS)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-xs font-medium text-slate-400 italic">
                Nenhum link cadastrado
              </span>
            )}
          </div>
        </div>

        {/* Student Observation & Consent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Observation */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Observação / Reflexão do Aluno:
            </span>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              {sp.observacaoAluno
                ? `“${sp.observacaoAluno}”`
                : "Nenhuma observação informada pelo discente."}
            </p>
          </div>

          {/* Consent Registered */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Consentimento Pedagógico Registrado</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Termo oficial aceito em{" "}
              {sp.consentimento?.dataHora
                ? new Date(sp.consentimento.dataHora).toLocaleString("pt-BR")
                : "data não registrada"}{" "}
              ({sp.consentimento?.versaoTexto || "v1.0"}).
            </p>
          </div>
        </div>

        {/* Previous Versions Timeline (if any) */}
        {sp.historicoVersoes && sp.historicoVersoes.length > 0 && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <History className="h-4 w-4 text-purple-600" />
              <span>Histórico de Versões e Reenvios Anteriores ({sp.historicoVersoes.length})</span>
            </div>
            <div className="space-y-3">
              {sp.historicoVersoes.map((v) => (
                <div
                  key={v.versao}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Versão {v.versao} • Gravado em{" "}
                      {new Date(v.dataGravacao).toLocaleDateString("pt-BR")}
                    </span>
                    <a
                      href={v.linkVideo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Ver link desta versão</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {v.solicitacaoReenvio && (
                    <div className="p-2.5 rounded-lg bg-purple-50 text-[11px] text-purple-900 space-y-0.5">
                      <p className="font-bold">
                        Motivo do Reenvio solicitado por {v.solicitacaoReenvio.professorNome}:
                      </p>
                      <p>{v.solicitacaoReenvio.motivo}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SECTION 2: RUBRICA PEDAGÓGICA E PARECER DO PROFESSOR */}
      {/* ================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Rubrica de Avaliação Oral • Método Paulo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Critérios de Fluência e Produção Oral
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Avaliação estritamente manual pelo professor tutor com notas de 1 a 5 e justificativa pedagógica
            </p>
          </div>

          {/* Evaluator Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Professor Avaliador:</span>
            <select
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              disabled={isAvaliada}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-purple-500"
            >
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The 6 Rubric Criteria Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CRITÉRIO 1: Fluência */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">1. Fluência</h3>
                <p className="text-[11px] text-slate-500">
                  Ritmo de fala, ausência de bloqueios severos e continuidade espontânea
                </p>
              </div>
              <ScorePill score={rubrica.fluencia.pontuacao} />
            </div>

            {/* Score Selector (1 to 5) */}
            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  disabled={isAvaliada}
                  onClick={() => handleScoreChange("fluencia", score)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    rubrica.fluencia.pontuacao === score
                      ? "bg-purple-600 text-white shadow-2xs scale-105"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                disabled={isAvaliada}
                value={rubrica.fluencia.comentario || ""}
                onChange={(e) => handleComentarioChange("fluencia", e.target.value)}
                placeholder="Comentário sobre o ritmo e pausas de fala..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* CRITÉRIO 2: Vocabulário */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">2. Vocabulário</h3>
                <p className="text-[11px] text-slate-500">
                  Variedade lexical, termos adequados ao contexto e precisão
                </p>
              </div>
              <ScorePill score={rubrica.vocabulario.pontuacao} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  disabled={isAvaliada}
                  onClick={() => handleScoreChange("vocabulario", score)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    rubrica.vocabulario.pontuacao === score
                      ? "bg-purple-600 text-white shadow-2xs scale-105"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                disabled={isAvaliada}
                value={rubrica.vocabulario.comentario || ""}
                onChange={(e) => handleComentarioChange("vocabulario", e.target.value)}
                placeholder="Comentário sobre escolha de palavras e repertório..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* CRITÉRIO 3: Gramática Aplicada */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">3. Gramática Aplicada</h3>
                <p className="text-[11px] text-slate-500">
                  Uso intuitivo de tempos verbais, concordâncias e estruturas orais
                </p>
              </div>
              <ScorePill score={rubrica.gramaticaAplicada.pontuacao} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  disabled={isAvaliada}
                  onClick={() => handleScoreChange("gramaticaAplicada", score)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    rubrica.gramaticaAplicada.pontuacao === score
                      ? "bg-purple-600 text-white shadow-2xs scale-105"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                disabled={isAvaliada}
                value={rubrica.gramaticaAplicada.comentario || ""}
                onChange={(e) => handleComentarioChange("gramaticaAplicada", e.target.value)}
                placeholder="Comentário sobre tempos verbais e concordâncias..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* CRITÉRIO 4: Pronúncia e Inteligibilidade */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  4. Pronúncia e Inteligibilidade
                </h3>
                <p className="text-[11px] text-slate-500">
                  Clareza fonética, entonação comunicativa e facilidade de entendimento
                </p>
              </div>
              <ScorePill score={rubrica.pronunciaInteligibilidade.pontuacao} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  disabled={isAvaliada}
                  onClick={() => handleScoreChange("pronunciaInteligibilidade", score)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    rubrica.pronunciaInteligibilidade.pontuacao === score
                      ? "bg-purple-600 text-white shadow-2xs scale-105"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                disabled={isAvaliada}
                value={rubrica.pronunciaInteligibilidade.comentario || ""}
                onChange={(e) =>
                  handleComentarioChange("pronunciaInteligibilidade", e.target.value)
                }
                placeholder="Comentário sobre fonemas e inteligibilidade fonética..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* CRITÉRIO 5: Coerência e Organização */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  5. Coerência e Organização
                </h3>
                <p className="text-[11px] text-slate-500">
                  Estruturação do raciocínio, uso de conectivos e aderência ao roteiro
                </p>
              </div>
              <ScorePill score={rubrica.coerenciaOrganizacao.pontuacao} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  disabled={isAvaliada}
                  onClick={() => handleScoreChange("coerenciaOrganizacao", score)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    rubrica.coerenciaOrganizacao.pontuacao === score
                      ? "bg-purple-600 text-white shadow-2xs scale-105"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                disabled={isAvaliada}
                value={rubrica.coerenciaOrganizacao.comentario || ""}
                onChange={(e) =>
                  handleComentarioChange("coerenciaOrganizacao", e.target.value)
                }
                placeholder="Comentário sobre sequência e lógica das ideias..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* CRITÉRIO 6: Compreensão Geral */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  6. Compreensão Geral Demonstrada
                </h3>
                <p className="text-[11px] text-slate-500">
                  Segurança, autoconfiança e capacidade de se fazer entender
                </p>
              </div>
              <ScorePill score={rubrica.compreensaoGeral.pontuacao} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  disabled={isAvaliada}
                  onClick={() => handleScoreChange("compreensaoGeral", score)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    rubrica.compreensaoGeral.pontuacao === score
                      ? "bg-purple-600 text-white shadow-2xs scale-105"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                disabled={isAvaliada}
                value={rubrica.compreensaoGeral.comentario || ""}
                onChange={(e) => handleComentarioChange("compreensaoGeral", e.target.value)}
                placeholder="Comentário sobre a confiança comunicativa..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Média dos Critérios Orais e Definição Manual pelo Professor */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-50 via-purple-50/40 to-white border border-purple-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Média dos Critérios Orais
              </span>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                {calculoMedia.explicacao}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right bg-white px-3.5 py-2 rounded-xl border border-purple-100 shadow-xs">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  Média dos Critérios
                </span>
                <span className="text-lg font-black text-purple-700">
                  {calculoMedia.media.toFixed(1)}{" "}
                  <span className="text-xs font-medium text-slate-400">/ 5.0</span>
                </span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-700 font-bold uppercase mb-1">
                  Nível Operacional Definido pelo Professor *
                </label>
                <select
                  value={nivelDefinido}
                  disabled={isAvaliada}
                  onChange={(e) => setNivelDefinido(e.target.value as NivelAluno)}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold border border-purple-300 bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="A1">A1 - Iniciante</option>
                  <option value="A2">A2 - Básico</option>
                  <option value="B1">B1 - Intermediário</option>
                  <option value="B2">B2 - Intermediário Superior</option>
                  <option value="C1">C1 - Avançado</option>
                  <option value="C2">C2 - Proficiente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Justificativa do Nível Definido */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Justificativa Pedagógica do Nível Definido *
            </label>
            <textarea
              rows={2}
              disabled={isAvaliada}
              value={justificativaNivel}
              onChange={(e) => setJustificativaNivel(e.target.value)}
              placeholder="Explique os fundamentos pedagógicos que determinaram a atribuição deste nível operacional (mínimo 10 caracteres)..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-800"
              required
            />
          </div>
        </div>

        {/* Qualitative Feedback Fields */}
        <div className="space-y-4 pt-2">
          {/* Pontos Fortes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pontos Fortes Observados na Produção Oral *
            </label>
            <textarea
              rows={3}
              disabled={isAvaliada}
              value={pontosFortes}
              onChange={(e) => setPontosFortes(e.target.value)}
              placeholder="Ex: Excelente segurança ao falar de si; ritmo contínuo sem leitura; boa projeção de voz e entonação amigável."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-800"
              required
            />
          </div>

          {/* Pontos a Desenvolver */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pontos a Desenvolver no Método Paulo *
            </label>
            <textarea
              rows={3}
              disabled={isAvaliada}
              value={pontosADesenvolver}
              onChange={(e) => setPontosADesenvolver(e.target.value)}
              placeholder="Ex: Treinar reduções de fala conectada (connected speech); enriquecer o vocabulário para além de frases curtas no presente."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-800"
              required
            />
          </div>

          {/* Orientação para as Próximas Aulas */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Orientação e Próximos Passos Pedagógicos *
            </label>
            <textarea
              rows={3}
              disabled={isAvaliada}
              value={orientacaoProximasAulas}
              onChange={(e) => setOrientacaoProximasAulas(e.target.value)}
              placeholder="Ex: Participar ativamente das discussões em grupo; praticar os flashcards de phrasal verbs diariamente e revisar a aula gravada de pronúncia."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-800"
              required
            />
          </div>

          {/* Observações Internas (Sigilosas) */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <EyeOff className="h-4 w-4 text-amber-700" />
              <span>Observações Internas da Equipe Pedagógica (Sigilosas)</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Estas anotações são restritas à coordenação e ao corpo docente. <strong>Nunca são exibidas ao aluno</strong>.
            </p>
            <textarea
              rows={2}
              disabled={isAvaliada}
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Anotações internas sobre perfil, velocidade de retenção, bloqueios emocionais ou alinhamento com a turma..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-amber-200 bg-white focus:outline-none focus:border-amber-500 text-slate-800"
            />
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {!isAvaliada && (
              <button
                type="button"
                onClick={() => setModalReenvioOpen(true)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Solicitar Reenvio de Vídeo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isAvaliada ? (
              <>
                <button
                  type="button"
                  onClick={handleSalvarRascunhoAvaliacao}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5 text-slate-500" />
                  <span>Salvar Rascunho</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublicarFeedback}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Publicando..." : "Publicar Feedback para o Aluno"}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Avaliação publicada em{" "}
                  {sp.avaliacao?.publicadaEm
                    ? new Date(sp.avaliacao.publicadaEm).toLocaleDateString("pt-BR")
                    : "data recente"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalReenvioOpen && (
        <SolicitarReenvioModal
          isOpen={modalReenvioOpen}
          alunoNome={sp.alunoNome}
          professores={professores}
          professorAtivoId={professorId}
          onClose={() => setModalReenvioOpen(false)}
          onConfirm={handleSolicitarReenvioConfirm}
        />
      )}

      {modalAplicarNivelOpen && aluno && sp.avaliacao && (
        <AplicarNivelModal
          isOpen={modalAplicarNivelOpen}
          aluno={aluno}
          novoNivel={sp.avaliacao.nivelDefinido}
          professorNome={sp.avaliacao.professorNome || "Lucas Ferreira"}
          justificativaNivel={sp.avaliacao.justificativaNivel}
          onClose={() => setModalAplicarNivelOpen(false)}
          onConfirm={handleAplicarNivelConfirm}
        />
      )}
    </div>
  );
}
