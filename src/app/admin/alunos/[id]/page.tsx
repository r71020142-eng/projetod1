"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Target,
  FileText,
  AlertCircle,
  Clock,
  BookOpen,
  Mic,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle2,
  Info,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  Aluno,
  Turma,
  Aula,
  FrequenciaCalculada,
  SelfPresentation,
  RegistroHistoricoNivel,
  ProgressoModuloAluno,
  TentativaAvaliacao,
  Modulo,
  Avaliacao,
  AcessoUsuario,
} from "@/types";
import { alunoRepository } from "@/data/alunoRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { aulaRepository } from "@/data/aulaRepository";
import { getAcademicCoreDataSource } from "@/data/repositoryFactory";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import { historicoNivelRepository } from "@/data/historicoNivelRepository";
import { progressoModuloRepository } from "@/data/progressoModuloRepository";
import { tentativaAvaliacaoRepository } from "@/data/tentativaAvaliacaoRepository";
import { moduloRepository } from "@/data/moduloRepository";
import { avaliacaoRepository } from "@/data/avaliacaoRepository";
import { NivelBadge } from "@/components/common/NivelBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TurmaStatusBadge, ModalidadeBadge, PresencaBadge } from "@/components/common/TurmaBadges";
import {
  StatusSelfPresentationBadge,
  TipoSelfPresentationBadge,
} from "@/components/common/SelfPresentationBadges";
import {
  StatusProgressoModuloBadge,
  ResultadoBadge,
} from "@/components/admin/AvaliacaoBadges";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { AlunoFormModal } from "@/components/admin/AlunoFormModal";
import { CardAcessoSistema } from "@/components/admin/CardAcessoSistema";
import { acessoUsuarioRepository } from "@/data/acessoUsuarioRepository";
import { executeWithTimeout } from "@/lib/asyncUtils";

export default function AdminAlunoDetalhesPage() {
  const params = useParams();
  const alunoId = params.id as string;

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [aulasFuturas, setAulasFuturas] = useState<Aula[]>([]);
  const [aulasPassadas, setAulasPassadas] = useState<Aula[]>([]);
  const [frequencia, setFrequencia] = useState<FrequenciaCalculada | null>(null);
  const [selfPresentations, setSelfPresentations] = useState<SelfPresentation[]>([]);
  const [historicoNiveis, setHistoricoNiveis] = useState<RegistroHistoricoNivel[]>([]);
  const [progressosModulos, setProgressosModulos] = useState<ProgressoModuloAluno[]>([]);
  const [tentativasAluno, setTentativasAluno] = useState<TentativaAvaliacao[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit and Inactivate Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmInativarOpen, setIsConfirmInativarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<string | null>(null);

  // Acesso ao Sistema (Etapa 10.2C1)
  const [acesso, setAcesso] = useState<AcessoUsuario | null>(null);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const alunoData = await alunoRepository.obterPorId(alunoId);
      setAluno(alunoData);

      if (alunoData) {
        const [
          listTurmas,
          listAulas,
          freqData,
          listSps,
          listHistorico,
          listProgs,
          listTents,
          listMods,
          listAvals,
          acessoData,
        ] = await Promise.all([
          turmaRepository.listarPorAluno(alunoId),
          aulaRepository.listarPorAluno(alunoId),
          aulaRepository.calcularFrequenciaAluno(alunoId),
          selfPresentationRepository.listarPorAluno(alunoId),
          historicoNivelRepository.listarPorAluno(alunoId),
          progressoModuloRepository.listar({ alunoId }),
          tentativaAvaliacaoRepository.listar({ alunoId }),
          moduloRepository.listar(),
          avaliacaoRepository.listar(),
          acessoUsuarioRepository.obterPorAlunoId(alunoId),
        ]);

        setAcesso(acessoData);

        setTurmas(listTurmas);
        setAulasFuturas(listAulas.filter((a) => a.status === "agendada"));
        setAulasPassadas(listAulas.filter((a) => a.status === "concluida"));
        setFrequencia(freqData);
        setSelfPresentations(listSps);
        setHistoricoNiveis(listHistorico);
        setProgressosModulos(listProgs);
        setTentativasAluno(listTents);
        setModulos(listMods);
        setAvaliacoes(listAvals);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do aluno:", err);
    } finally {
      setIsLoading(false);
    }
  }, [alunoId]);

  useEffect(() => {
    if (alunoId) {
      carregarDados();
    }

    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "turmas" ||
        customEvent.detail.entity === "aulas" ||
        customEvent.detail.entity === "alunos" ||
        customEvent.detail.entity === "self_presentations" ||
        customEvent.detail.entity === "historico_niveis"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    window.addEventListener("mtd_core_users_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
      window.removeEventListener("mtd_core_users_updated", handleStorageUpdate);
    };
  }, [alunoId, carregarDados]);

  const handleInativarConfirm = async () => {
    if (!aluno) return;
    setIsProcessing(true);

    try {
      const res = await executeWithTimeout(
        alunoRepository.inativar(aluno.id),
        15000,
        "Tempo limite excedido ao inativar aluno. Tente novamente."
      );

      if (res.success && res.data) {
        setAluno(res.data);
        setFeedback(`O discente "${res.data.nomeCompleto}" foi inativado.`);
      } else {
        alert(res.error || "Erro ao inativar aluno.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao inativar aluno.";
      alert(msg);
    } finally {
      setIsProcessing(false);
      setIsConfirmInativarOpen(false);
    }
  };

  const handleReativar = async () => {
    if (!aluno) return;
    setIsProcessing(true);

    try {
      const res = await executeWithTimeout(
        alunoRepository.reativar(aluno.id),
        15000,
        "Tempo limite excedido ao reativar aluno. Tente novamente."
      );

      if (res.success && res.data) {
        setAluno(res.data);
        setFeedback(`O discente "${res.data.nomeCompleto}" foi reativado com sucesso!`);
      } else {
        alert(res.error || "Erro ao reativar aluno.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao reativar aluno.";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSuccess = (updatedAluno: Aluno) => {
    setIsEditModalOpen(false);
    setAluno(updatedAluno);
    setFeedback("Dados cadastrais do aluno atualizados com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Carregando detalhes do aluno...
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Aluno não encontrado</h2>
        <p className="text-xs text-slate-500">
          O registro com ID <span className="font-mono text-slate-700">{alunoId}</span> não existe no repositório.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/alunos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5046E5] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retornar para a lista de alunos</span>
          </Link>
        </div>
      </div>
    );
  }

  const dataCadastroFormatada = new Date(aluno.dataCadastro).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 font-bold hover:underline ml-4"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Navigation and Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/alunos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para Listagem de Alunos</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Ficha Cadastral do Aluno
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados pessoais, nível pedagógico do Método Paulo, turmas e histórico de presença
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar Cadastro</span>
          </button>

          {aluno.status === "ativo" ? (
            <button
              type="button"
              onClick={() => setIsConfirmInativarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 transition-colors"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>Inativar Matrícula</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReativar}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Reativar Matrícula</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cadastro Detalhado */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
            {/* Header with Avatar and Status */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                {aluno.avatarUrl ? (
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs shrink-0">
                    <Image
                      src={aluno.avatarUrl}
                      alt={aluno.nomeCompleto}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-[#5046E5]/10 text-[#5046E5] flex items-center justify-center font-bold text-lg border border-[#5046E5]/20 shadow-2xs shrink-0">
                    {aluno.nomeCompleto.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{aluno.nomeCompleto}</h2>
                    <StatusBadge status={aluno.status} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{aluno.id}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Nível Operacional
                </span>
                <div className="mt-1">
                  <NivelBadge nivel={aluno.nivel} />
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Nome Completo</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{aluno.nomeCompleto}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Endereço de E-mail</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{aluno.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Telefone / WhatsApp</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{aluno.telefone || "Não informado"}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Data de Cadastro</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{dataCadastroFormatada}</span>
              </div>
            </div>

            {/* Objective with English */}
            <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100/70 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#5046E5]">
                <Target className="h-4 w-4" />
                <span>Objetivo com o Inglês</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pt-1">
                {aluno.objetivoIngles}
              </p>
            </div>

            {/* Pedagogical Observations */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <FileText className="h-4 w-4 text-slate-500" />
                <span>Observações Pedagógicas Internas</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-wrap">
                {aluno.observacoesPedagogicas || "Nenhuma anotação pedagógica adicional cadastrada para este aluno."}
              </p>
            </div>
          </div>

          {/* CEFR Disclaimer Box */}
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">
                Diretriz de Nivelamento Pedagógico (Método Paulo):
              </p>
              <p className="mt-0.5 text-amber-900/90 leading-relaxed text-[11px]">
                O nível atribuído ao aluno (atualmente <strong>{aluno.nivel}</strong>) é uma métrica operacional para alocação em turmas compatíveis e trilha de vocabulário. A definição manual <strong>não substitui nem representa emissão de certificado formal CEFR</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Turmas, Agenda & Frequência */}
        <div className="space-y-6">
          {/* Card Acesso ao Sistema (Etapa 10.2C1) */}
          <CardAcessoSistema
            tipo="aluno"
            entidadeId={aluno.id}
            nomeCompleto={aluno.nomeCompleto}
            email={aluno.email}
            perfilId={aluno.perfilId}
            statusOperacional={aluno.status}
            acesso={acesso}
            onConviteEnviado={carregarDados}
          />

          {/* Turmas Atuais */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <span>Turmas Atuais ({turmas.length})</span>
              </h3>
            </div>

            <div
              className={`rounded-xl p-3 border text-[11px] flex items-start gap-2 ${
                getAcademicCoreDataSource() === "supabase"
                  ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-900"
                  : "bg-amber-50/70 border-amber-200/60 text-amber-900"
              }`}
            >
              <Info
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  getAcademicCoreDataSource() === "supabase"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              />
              <p>
                {getAcademicCoreDataSource() === "supabase" ? (
                  <>
                    <strong>Vínculo no Supabase:</strong> As matrículas e turmas deste discente são gerenciadas diretamente no banco de dados PostgreSQL com regras de capacidade e integridade relacional.
                  </>
                ) : (
                  <>
                    <strong>Isolamento Modular:</strong> Os dados cadastrais e pedagógicos deste discente são gerenciados no Supabase. Os vínculos com turmas, aulas e frequência permanecem em armazenamento local e serão migrados nas etapas seguintes.
                  </>
                )}
              </p>
            </div>

            {turmas.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Nenhuma turma atribuída</p>
                <p className="text-[11px] leading-relaxed">
                  Este discente ainda não foi matriculado em turmas. Acesse o módulo de turmas para realizar a matrícula.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {turmas.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-purple-200 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/turmas/${t.id}`}
                        className="font-bold text-xs text-slate-900 hover:text-purple-600 transition-colors truncate block"
                      >
                        {t.nome}
                      </Link>
                      <ModalidadeBadge modalidade={t.modalidade} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Nível: {t.nivel}</span>
                      <TurmaStatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Horários Futuros / Próximas Aulas */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>Horários Futuros ({aulasFuturas.length})</span>
              </h3>
            </div>

            {aulasFuturas.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 text-xs text-slate-500">
                Nenhuma aula futura agendada para este aluno.
              </div>
            ) : (
              <div className="space-y-2">
                {aulasFuturas.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 text-xs space-y-0.5"
                  >
                    <p className="font-bold text-slate-800 truncate">{a.titulo}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{a.data}</span>
                      <span>•</span>
                      <span>
                        {a.horario} ({a.duracaoMinutos} min)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de Frequência */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-purple-600" />
                <span>Histórico de Presença</span>
              </h3>
              <span className="text-xs font-extrabold text-purple-700">
                {frequencia?.porcentagem !== null ? `${frequencia?.porcentagem}%` : "100%"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-semibold">Presente</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {frequencia?.totalPresentes || 0}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                <span className="text-[10px] text-rose-700 block font-semibold">Ausente</span>
                <span className="font-bold text-rose-800 text-sm">
                  {frequencia?.totalAusentes || 0}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[10px] text-amber-700 block font-semibold">Justif.</span>
                <span className="font-bold text-amber-800 text-sm">
                  {frequencia?.totalJustificados || 0}
                </span>
              </div>
            </div>

            {aulasPassadas.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                {aulasPassadas.slice(0, 3).map((aula) => {
                  const reg = aula.presencas ? aula.presencas[aluno.id] : null;
                  return (
                    <div
                      key={aula.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50/60"
                    >
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {aula.titulo}
                      </span>
                      <PresencaBadge status={reg ? reg.status : "nao_registrado"} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Self Presentations & Avaliações Orais */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-purple-600" />
                <span>Self Presentations & Nivelamento</span>
              </h3>
              <Link
                href="/admin/self-presentation"
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline inline-flex items-center gap-1"
              >
                Fila de Avaliação
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {selfPresentations.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-500 text-center space-y-1">
                <p className="font-semibold text-slate-700">Nenhuma apresentação submetida</p>
                <p className="text-[11px] leading-relaxed">
                  O discente ainda não realizou o envio do vídeo de nivelamento oral ou reavaliação.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selfPresentations.map((sp) => (
                  <div
                    key={sp.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-purple-200 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/self-presentation/${sp.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-purple-600 truncate block"
                        >
                          {sp.titulo}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <TipoSelfPresentationBadge tipo={sp.tipo} />
                          <span className="text-[10px] font-semibold text-slate-500">v{sp.versao}</span>
                        </div>
                      </div>
                      <StatusSelfPresentationBadge status={sp.status} />
                    </div>

                    {sp.avaliacao && sp.avaliacao.nivelDefinido && sp.avaliacao.nivelDefinido !== "nao_avaliado" && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500">Nível atribuído:</span>
                        <NivelBadge nivel={sp.avaliacao.nivelDefinido} />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Gravado em: {new Date(sp.dataGravacao).toLocaleDateString("pt-BR")}</span>
                      <Link
                        href={`/admin/self-presentation/${sp.id}`}
                        className="font-semibold text-purple-600 hover:underline"
                      >
                        Ver detalhes &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de Nível / Diagnósticos Anteriores */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>Evolução de Nível CEFR</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {historicoNiveis.length} registros
              </span>
            </div>

            {historicoNiveis.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-500 text-center space-y-1">
                <p className="font-semibold text-slate-700">Sem alterações de nível registradas</p>
                <p className="text-[11px] leading-relaxed">
                  O discente mantém o nível inicial de cadastro ({aluno.nivel ? aluno.nivel.toUpperCase() : "Não avaliado"}).
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historicoNiveis.map((hn) => (
                  <div
                    key={hn.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <NivelBadge nivel={hn.nivelAnterior} />
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <NivelBadge nivel={hn.novoNivel} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(hn.dataAlteracao).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {hn.justificativa}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>Por: {hn.professorNome || "Equipe Pedagógica"}</span>
                      <span className="capitalize">{hn.origem.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Jornada no Método Paulo & Avaliações (Etapa 7) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <span>Jornada no Método Paulo & Avaliações</span>
              </h3>
              <Link
                href="/admin/avaliacoes"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
              >
                Gerenciar Avaliações
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {progressosModulos.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-500 text-center space-y-1">
                <p className="font-semibold text-slate-700">Sem progresso curricular registrado</p>
                <p className="text-[11px] leading-relaxed">
                  O discente ainda não iniciou módulos do Método Paulo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {progressosModulos.map((prog) => {
                  const mod = modulos.find((m) => m.id === prog.moduloId);
                  const ind = prog.indicadoresCalculados;

                  return (
                    <div
                      key={prog.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {mod?.nome || prog.moduloId}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ind.criteriosCumpridos} de {ind.totalCriteriosAplicaveis} critérios (
                            {ind.percentualConclusao.toFixed(0)}%)
                          </span>
                        </div>
                        <StatusProgressoModuloBadge status={prog.status} />
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${ind.percentualConclusao}%` }}
                        />
                      </div>

                      {/* Tentativas de avaliações do aluno neste módulo */}
                      {tentativasAluno.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Avaliações Realizadas:
                          </span>
                          {tentativasAluno.slice(0, 3).map((t) => {
                            const aval = avaliacoes.find((a) => a.id === t.avaliacaoId);
                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between text-[11px] py-0.5"
                              >
                                <span className="font-medium text-slate-700 truncate max-w-[140px]">
                                  {aval?.titulo || "Avaliação"}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {t.nota !== undefined && (
                                    <span className="font-bold text-slate-900">
                                      {t.nota.toFixed(1)}
                                    </span>
                                  )}
                                  <ResultadoBadge resultado={t.resultado} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AlunoFormModal
        isOpen={isEditModalOpen}
        alunoParaEditar={aluno}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />

      {/* Inactivation Modal */}
      <ConfirmModal
        isOpen={isConfirmInativarOpen}
        title="Confirmar Inativação do Aluno"
        description={`Tem certeza que deseja inativar a matrícula de "${aluno.nomeCompleto}"? O discente não terá acesso às salas de aula e atividades até que seja reativado pela coordenação.`}
        confirmLabel="Sim, Inativar Matrícula"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isProcessing}
        showPersistenceNotice={true}
        onConfirm={handleInativarConfirm}
        onCancel={() => setIsConfirmInativarOpen(false)}
      />
    </div>
  );
}
