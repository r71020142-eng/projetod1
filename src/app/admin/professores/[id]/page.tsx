"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Languages,
  BookOpen,
  Mic,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Professor, Turma, Aula, AcessoUsuario } from "@/types";
import { professorRepository } from "@/data/professorRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { aulaRepository } from "@/data/aulaRepository";
import { acessoUsuarioRepository } from "@/data/acessoUsuarioRepository";
import { getAcademicCoreDataSource } from "@/data/repositoryFactory";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TurmaStatusBadge, ModalidadeBadge } from "@/components/common/TurmaBadges";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { ProfessorFormModal } from "@/components/admin/ProfessorFormModal";
import { CardAcessoSistema } from "@/components/admin/CardAcessoSistema";
import { executeWithTimeout } from "@/lib/asyncUtils";

export default function AdminProfessorDetalhesPage() {
  const params = useParams();
  const professorId = params.id as string;

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [proximasAulas, setProximasAulas] = useState<Aula[]>([]);
  const [totalAlunosVinculados, setTotalAlunosVinculados] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmInativarOpen, setIsConfirmInativarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast
  const [feedback, setFeedback] = useState<string | null>(null);

  // Acesso ao Sistema (Etapa 10.2C1)
  const [acesso, setAcesso] = useState<AcessoUsuario | null>(null);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const profData = await professorRepository.obterPorId(professorId);
      setProfessor(profData);

      if (profData) {
        const [listTurmas, listAulas, acessoData] = await Promise.all([
          turmaRepository.listarPorProfessor(professorId),
          aulaRepository.listarPorProfessor(professorId),
          acessoUsuarioRepository.obterPorProfessorId(professorId),
        ]);

        setTurmas(listTurmas);
        setProximasAulas(listAulas.filter((a) => a.status === "agendada"));
        setAcesso(acessoData);

        // Count unique students across all turmas of this professor
        const studentSet = new Set<string>();
        for (const t of listTurmas) {
          t.alunoIds.forEach((id) => studentSet.add(id));
        }
        setTotalAlunosVinculados(studentSet.size);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do professor:", err);
    } finally {
      setIsLoading(false);
    }
  }, [professorId]);

  useEffect(() => {
    if (professorId) {
      carregarDados();
    }

    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "turmas" ||
        customEvent.detail.entity === "aulas" ||
        customEvent.detail.entity === "professores"
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
  }, [professorId, carregarDados]);

  const handleInativarConfirm = async () => {
    if (!professor) return;
    setIsProcessing(true);

    try {
      const res = await executeWithTimeout(
        professorRepository.inativar(professor.id),
        15000,
        "Tempo limite excedido ao inativar professor. Tente novamente."
      );

      if (res.success && res.data) {
        setProfessor(res.data);
        setFeedback(`O professor "${res.data.nomeCompleto}" foi inativado.`);
      } else {
        alert(res.error || "Erro ao inativar professor.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao inativar professor.";
      alert(msg);
    } finally {
      setIsProcessing(false);
      setIsConfirmInativarOpen(false);
    }
  };

  const handleReativar = async () => {
    if (!professor) return;
    setIsProcessing(true);

    try {
      const res = await executeWithTimeout(
        professorRepository.reativar(professor.id),
        15000,
        "Tempo limite excedido ao reativar professor. Tente novamente."
      );

      if (res.success && res.data) {
        setProfessor(res.data);
        setFeedback(`O professor "${res.data.nomeCompleto}" foi reativado com sucesso!`);
      } else {
        alert(res.error || "Erro ao reativar professor.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao reativar professor.";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSuccess = (updatedProfessor: Professor) => {
    setIsEditModalOpen(false);
    setProfessor(updatedProfessor);
    setFeedback("Ficha do professor atualizada com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Carregando dados do professor...
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Professor não encontrado</h2>
        <p className="text-xs text-slate-500">
          O registro com ID <span className="font-mono text-slate-700">{professorId}</span> não existe no repositório.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/professores"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5046E5] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retornar para a lista de professores</span>
          </Link>
        </div>
      </div>
    );
  }

  const dataCadastroFormatada = new Date(professor.dataCadastro).toLocaleDateString("pt-BR", {
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
            href="/admin/professores"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para Listagem de Professores</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Ficha do Professor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados docentes, turmas sob responsabilidade, aulas síncronas e alunos vinculados
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

          {professor.status === "ativo" ? (
            <button
              type="button"
              onClick={() => setIsConfirmInativarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 transition-colors"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>Inativar Professor</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReativar}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Reativar Professor</span>
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
                {professor.avatarUrl ? (
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs shrink-0">
                    <Image
                      src={professor.avatarUrl}
                      alt={professor.nomeCompleto}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg border border-purple-200 shadow-2xs shrink-0">
                    {professor.nomeCompleto.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{professor.nomeCompleto}</h2>
                    <StatusBadge status={professor.status} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{professor.id}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Turmas Atribuídas
                </span>
                <span className="text-lg font-black text-purple-700 block mt-0.5">
                  {turmas.length}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Nome Completo</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{professor.nomeCompleto}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Endereço de E-mail</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{professor.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Telefone de Contato</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{professor.telefone || "Não informado"}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-slate-400 block text-[11px] font-medium">Data de Cadastro</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{dataCadastroFormatada}</span>
              </div>
            </div>

            {/* Idiomas Falados */}
            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100/70 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                <Languages className="h-4 w-4" />
                <span>Idiomas Falados</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {professor.idiomasFalados.map((idioma, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-lg bg-white border border-purple-200/80 px-2.5 py-1 text-xs font-medium text-purple-900 shadow-2xs"
                  >
                    {idioma}
                  </span>
                ))}
              </div>
            </div>

            {/* Biografia Curta */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>Perfil Profissional e Biografia</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-wrap">
                {professor.biografiaCurta}
              </p>
            </div>
          </div>

          {/* Account Linking Alert */}
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">
                Diretriz de Segurança e Contas de Usuário:
              </p>
              <p className="mt-0.5 text-amber-900/90 leading-relaxed text-[11px]">
                O cadastro de professor registra a identidade docente, porém <strong>não cria automaticamente uma conta de acesso ao sistema nem credenciais de login</strong>. Esta associação ocorrerá de forma segura quando a etapa de Autenticação e RBAC for implantada.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Turmas & Upcoming Classes */}
        <div className="space-y-6">
          {/* Card Acesso ao Sistema (Etapa 10.2C1) */}
          <CardAcessoSistema
            tipo="professor"
            entidadeId={professor.id}
            nomeCompleto={professor.nomeCompleto}
            email={professor.email}
            perfilId={professor.perfilId}
            statusOperacional={professor.status}
            acesso={acesso}
            onConviteEnviado={carregarDados}
          />

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
              <p className="text-[11px] font-semibold text-slate-500">Turmas</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{turmas.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
              <p className="text-[11px] font-semibold text-slate-500">Alunos Totais</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5">{totalAlunosVinculados}</p>
            </div>
          </div>

          {/* Turmas sob Responsabilidade */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <span>Turmas sob Responsabilidade</span>
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
                    <strong>Vínculo no Supabase:</strong> As turmas sob responsabilidade deste docente são persistidas e gerenciadas diretamente no banco de dados da plataforma.
                  </>
                ) : (
                  <>
                    <strong>Isolamento Modular:</strong> Os dados cadastrais deste docente são gerenciados no Supabase. Os vínculos com turmas e aulas permanecem em armazenamento local e serão migrados nas etapas seguintes.
                  </>
                )}
              </p>
            </div>

            {turmas.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 text-xs text-slate-500">
                Nenhuma turma atribuída a este professor.
              </div>
            ) : (
              <div className="space-y-2.5">
                {turmas.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-purple-200 transition-all space-y-1.5"
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
                      <span>{t.alunoIds.length} alunos</span>
                      <TurmaStatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximas Aulas a Ministrar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>Próximas Aulas ({proximasAulas.length})</span>
              </h3>
            </div>

            {proximasAulas.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 text-xs text-slate-500">
                Nenhuma aula futura agendada para este professor.
              </div>
            ) : (
              <div className="space-y-2">
                {proximasAulas.slice(0, 4).map((a) => (
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

          {/* Fila de Correção (Etapa 4 Preview) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-slate-400" />
                <span>Fila de Correções</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Etapa 4
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Self Presentations a avaliar</p>
              <p className="text-[11px] leading-relaxed">
                A fila de correções orais gravadas pelos alunos será ativada no módulo de Self Presentation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ProfessorFormModal
        isOpen={isEditModalOpen}
        professorParaEditar={professor}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />

      {/* Inactivation Modal */}
      <ConfirmModal
        isOpen={isConfirmInativarOpen}
        title="Confirmar Inativação de Professor"
        description={`Tem certeza que deseja inativar o docente "${professor.nomeCompleto}"? Ele ficará indisponível para alocação de novas turmas até que seja reativado.`}
        confirmLabel="Sim, Inativar Docente"
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
