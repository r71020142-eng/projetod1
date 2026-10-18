"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Edit,
  UserPlus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Info,
  UserCheck,
  X as XIcon,
} from "lucide-react";
import {
  Turma,
  Professor,
  Aluno,
  Aula,
  FrequenciaCalculada,
  StatusTurma,
} from "@/types";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";
import { alunoRepository } from "@/data/alunoRepository";
import { aulaRepository } from "@/data/aulaRepository";
import {
  TurmaStatusBadge,
  ModalidadeBadge,
  AulaStatusBadge,
} from "@/components/common/TurmaBadges";
import { TurmaFormModal } from "@/components/admin/TurmaFormModal";
import { MatricularAlunoModal } from "@/components/admin/MatricularAlunoModal";
import { AulaFormModal } from "@/components/admin/AulaFormModal";
import { PresencaModal } from "@/components/admin/PresencaModal";

export default function AdminTurmaDetailPage() {
  const params = useParams();
  const turmaId = params?.id as string;

  const [turma, setTurma] = useState<Turma | null>(null);
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [alunosMatriculados, setAlunosMatriculados] = useState<Aluno[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [frequencia, setFrequencia] = useState<FrequenciaCalculada | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalEditarTurma, setModalEditarTurma] = useState(false);
  const [modalMatricular, setModalMatricularOpen] = useState(false);
  const [modalAulaOpen, setModalAulaOpen] = useState(false);
  const [aulaParaEditar, setAulaParaEditar] = useState<Aula | null>(null);
  const [modalPresencaOpen, setModalPresencaOpen] = useState(false);
  const [aulaParaPresenca, setAulaParaPresenca] = useState<Aula | null>(null);

  // Confirmation state for unenrollment
  const [alunoParaDesmatricular, setAlunoParaDesmatricular] = useState<Aluno | null>(null);
  const [desmatriculando, setDesmatriculando] = useState(false);

  // Confirmation state for class cancellation
  const [aulaParaCancelar, setAulaParaCancelar] = useState<Aula | null>(null);

  const carregarDados = useCallback(async () => {
    if (!turmaId) return;
    setLoading(true);
    try {
      const turmaData = await turmaRepository.obterPorId(turmaId);
      if (!turmaData) {
        setTurma(null);
        setLoading(false);
        return;
      }
      setTurma(turmaData);

      const [profData, todosAlunos, aulasData, freqData] = await Promise.all([
        professorRepository.obterPorId(turmaData.professorId),
        alunoRepository.listar(),
        aulaRepository.listarPorTurma(turmaId),
        aulaRepository.calcularFrequenciaTurma(turmaId),
      ]);

      setProfessor(profData);
      setAlunosMatriculados(todosAlunos.filter((a) => turmaData.alunoIds.includes(a.id)));
      setAulas(aulasData);
      setFrequencia(freqData);
    } catch (err) {
      console.error("Erro ao carregar detalhes da turma:", err);
    } finally {
      setLoading(false);
    }
  }, [turmaId]);

  useEffect(() => {
    carregarDados();

    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "turmas" ||
        customEvent.detail.entity === "aulas"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
  }, [turmaId, carregarDados]);

  // Separate upcoming vs completed/past classes
  const proximasAulas = useMemo(() => {
    return aulas.filter((a) => a.status === "agendada");
  }, [aulas]);

  const historicoAulas = useMemo(() => {
    return aulas.filter((a) => a.status === "concluida" || a.status === "cancelada");
  }, [aulas]);

  // Handlers
  const handleDesmatricular = async () => {
    if (!turma || !alunoParaDesmatricular) return;
    setDesmatriculando(true);
    try {
      const res = await turmaRepository.desmatricularAluno(turma.id, alunoParaDesmatricular.id);
      if (res.success) {
        setAlunoParaDesmatricular(null);
        carregarDados();
      } else {
        alert(res.error || "Não foi possível remover a matrícula.");
      }
    } catch (err) {
      console.error("Erro ao desmatricular:", err);
    } finally {
      setDesmatriculando(false);
    }
  };

  const handleCancelarAula = async () => {
    if (!aulaParaCancelar) return;
    try {
      const res = await aulaRepository.cancelar(aulaParaCancelar.id, "Cancelada pelo administrador.");
      if (res.success) {
        setAulaParaCancelar(null);
        carregarDados();
      } else {
        alert(res.error || "Não foi possível cancelar a aula.");
      }
    } catch (err) {
      console.error("Erro ao cancelar aula:", err);
    }
  };

  const handleAlterarStatus = async (novoStatus: StatusTurma) => {
    if (!turma) return;
    if (novoStatus === turma.status) return;

    if (novoStatus === "encerrada" && proximasAulas.length > 0) {
      const confirmar = confirm(
        `Esta turma possui ${proximasAulas.length} aula(s) agendada(s). Deseja realmente encerrar a turma?`
      );
      if (!confirmar) return;
    }

    const res = await turmaRepository.alterarStatus(turma.id, novoStatus);
    if (res.success) {
      carregarDados();
    } else {
      alert(res.error || "Falha ao alterar status.");
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando detalhes da turma...</p>
      </div>
    );
  }

  if (!turma) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Turma não encontrada</h2>
        <p className="text-xs text-slate-500">
          A turma de ID <span className="font-mono text-slate-700">{turmaId}</span> não existe ou foi removida.
        </p>
        <Link
          href="/admin/turmas"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Turmas</span>
        </Link>
      </div>
    );
  }

  const ocupacaoPercent = Math.min(
    100,
    Math.round((turma.alunoIds.length / turma.capacidade) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/turmas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar para Lista de Turmas</span>
        </Link>
      </div>

      {/* Main Header */}
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{turma.nome}</h1>
              <TurmaStatusBadge status={turma.status} />
              <ModalidadeBadge modalidade={turma.modalidade} />
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                Nível: {turma.nivel === "nao_definido" ? "Não definido" : turma.nivel}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">ID: {turma.id}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalMatricularOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Matricular Aluno</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAulaParaEditar(null);
                setModalAulaOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Agendar Aula</span>
            </button>

            <button
              type="button"
              onClick={() => setModalEditarTurma(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Editar Turma</span>
            </button>
          </div>
        </div>

        {/* Objetivo */}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objetivo Pedagógico</p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">{turma.objetivoPrincipal}</p>
        </div>

        {/* Status switcher & Meta */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-500">
            <span>
              Início: <strong>{turma.dataInicio || "A definir"}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span>
                Capacidade:{" "}
                <strong>
                  {turma.alunoIds.length} de {turma.capacidade} alunos
                </strong>
              </span>
              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    ocupacaoPercent >= 100 ? "bg-amber-500" : "bg-purple-600"
                  }`}
                  style={{ width: `${ocupacaoPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Alterar status:</span>
            <select
              value={turma.status}
              onChange={(e) => handleAlterarStatus(e.target.value as StatusTurma)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-purple-500"
            >
              <option value="formacao">Em formação</option>
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid: Professor & Consolidado de Frequência */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Professor Responsável */}
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Professor Responsável</h3>
            {professor && (
              <Link
                href={`/admin/professores/${professor.id}`}
                className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1"
              >
                <span>Ver perfil</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>

          {professor ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-700 font-bold text-base flex items-center justify-center border border-purple-200">
                  {professor.nomeCompleto.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{professor.nomeCompleto}</h4>
                  <p className="text-xs text-slate-400">{professor.email}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        professor.status === "ativo" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {professor.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </p>
                </div>
              </div>

              {professor.biografiaCurta && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed line-clamp-3">
                  &ldquo;{professor.biografiaCurta}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Nenhum professor ativo associado a esta turma.
            </div>
          )}
        </div>

        {/* Frequência da Turma */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Frequência Consolidada da Turma</h3>
              <p className="text-xs text-slate-400">
                Fórmula oficial: <code>(Presentes / (Presentes + Ausentes)) * 100</code>
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-purple-700">
                {frequencia?.porcentagem !== null ? `${frequencia?.porcentagem}%` : "—"}
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Taxa de Presença</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500">Aulas Concluídas</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {frequencia?.totalAulasConcluidas || 0}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-700">Presentes</p>
              <p className="text-lg font-bold text-emerald-800 mt-0.5">
                {frequencia?.totalPresentes || 0}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
              <p className="text-[11px] font-semibold text-rose-700">Ausentes</p>
              <p className="text-lg font-bold text-rose-800 mt-0.5">
                {frequencia?.totalAusentes || 0}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
              <p className="text-[11px] font-semibold text-amber-700">Justificados</p>
              <p className="text-lg font-bold text-amber-800 mt-0.5">
                {frequencia?.totalJustificados || 0}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-500 flex items-start gap-2 border border-slate-100">
            <Info className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <p>
              Ausências justificadas são registradas com anotação do discente, mas <strong>não penalizam</strong> a taxa de frequência consolidada.
            </p>
          </div>
        </div>
      </div>

      {/* Alunos Matriculados */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Alunos Matriculados</h3>
            <p className="text-xs text-slate-500">
              {alunosMatriculados.length} de {turma.capacidade} alunos ({turma.modalidade === "individual" ? "Individual" : "Grupo"})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalMatricularOpen(true)}
            disabled={alunosMatriculados.length >= turma.capacidade}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition-all disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Matricular Aluno</span>
          </button>
        </div>

        {alunosMatriculados.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 space-y-2">
            <Users className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Nenhum aluno matriculado nesta turma</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Clique no botão acima para vincular discentes ativos a esta turma do Método Paulo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alunosMatriculados.map((aluno) => (
              <div
                key={aluno.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-purple-200 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {aluno.nomeCompleto.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/alunos/${aluno.id}`}
                      className="text-xs font-bold text-slate-800 hover:text-purple-600 transition-colors truncate block"
                    >
                      {aluno.nomeCompleto}
                    </Link>
                    <p className="text-[11px] text-slate-400 truncate">{aluno.email}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Nível: <strong>{aluno.nivel === "nao_avaliado" ? "Não avaliado" : aluno.nivel}</strong>{" "}
                      {aluno.status === "inativo" && (
                        <span className="text-rose-600 font-bold ml-1">[Inativo]</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAlunoParaDesmatricular(aluno)}
                  title="Remover matrícula"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas Aulas Agendadas */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Próximas Aulas Agendadas</h3>
            <p className="text-xs text-slate-500">Sessões síncronas programadas com o professor</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAulaParaEditar(null);
              setModalAulaOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Nova Sessão</span>
          </button>
        </div>

        {proximasAulas.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            Nenhuma aula futura agendada para esta turma.
          </div>
        ) : (
          <div className="space-y-3">
            {proximasAulas.map((aula) => (
              <div
                key={aula.id}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-purple-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{aula.titulo}</span>
                    <AulaStatusBadge status={aula.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="h-3.5 w-3.5 text-purple-600" />
                      <span>{aula.data}</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-purple-600" />
                      <span>
                        {aula.horario} ({aula.duracaoMinutos} min)
                      </span>
                    </div>
                  </div>

                  {/* Zoom Link */}
                  <div className="pt-1 text-xs">
                    {aula.linkZoom ? (
                      <a
                        href={aula.linkZoom}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-semibold"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Abrir Link do Zoom</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" />
                        <span>Link da aula ainda não disponibilizado</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAulaParaPresenca(aula);
                      setModalPresencaOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Registrar Presença</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAulaParaEditar(aula);
                      setModalAulaOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Editar aula"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setAulaParaCancelar(aula)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Cancelar aula"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Aulas Concluídas */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Histórico de Aulas Realizadas</h3>
          <p className="text-xs text-slate-500">Registro pedagógico, tópicos trabalhados e presenças</p>
        </div>

        {historicoAulas.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            Nenhuma aula foi concluída ainda para esta turma.
          </div>
        ) : (
          <div className="space-y-3">
            {historicoAulas.map((aula) => {
              const presencasValues = aula.presencas ? Object.values(aula.presencas) : [];
              const presentes = presencasValues.filter((p) => p.status === "presente").length;
              const ausentes = presencasValues.filter((p) => p.status === "ausente").length;
              const justificados = presencasValues.filter((p) => p.status === "justificado").length;

              return (
                <div
                  key={aula.id}
                  className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{aula.titulo}</span>
                      <AulaStatusBadge status={aula.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        {aula.data} às {aula.horario}
                      </span>
                      {aula.topicoTrabalhado && (
                        <span>
                          • Conteúdo: <strong>{aula.topicoTrabalhado}</strong>
                        </span>
                      )}
                    </div>

                    {/* Presenças badge */}
                    {aula.status === "concluida" && (
                      <div className="pt-1 flex items-center gap-2 text-xs">
                        <span className="text-emerald-700 font-semibold">{presentes} Presentes</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-rose-700 font-semibold">{ausentes} Ausentes</span>
                        {justificados > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-amber-800 font-semibold">{justificados} Justificados</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {aula.status === "concluida" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAulaParaPresenca(aula);
                        setModalPresencaOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all self-start sm:self-auto"
                    >
                      Ajustar Presenças
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Unenrollment */}
      {alunoParaDesmatricular && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirmar Desmatrícula</h3>
                <p className="text-xs text-slate-500">Exigência de confirmação antes de remover</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja remover a matrícula de{" "}
              <strong>{alunoParaDesmatricular.nomeCompleto}</strong> da turma{" "}
              <strong>{turma.nome}</strong>? O histórico de presenças anteriores será preservado.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAlunoParaDesmatricular(null)}
                disabled={desmatriculando}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDesmatricular}
                disabled={desmatriculando}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                {desmatriculando ? "Removendo..." : "Sim, Remover Matrícula"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Class Cancellation */}
      {aulaParaCancelar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancelar Aula</h3>
                <p className="text-xs text-slate-500">Sessão: {aulaParaCancelar.titulo}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja marcar a aula de <strong>{aulaParaCancelar.data}</strong> às <strong>{aulaParaCancelar.horario}</strong> como <strong>Cancelada</strong>?
              A aula não será excluída para manter o histórico da turma.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAulaParaCancelar(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelarAula}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TurmaFormModal
        isOpen={modalEditarTurma}
        turmaParaEditar={turma}
        onClose={() => setModalEditarTurma(false)}
        onSuccess={() => carregarDados()}
      />

      <MatricularAlunoModal
        isOpen={modalMatricular}
        turma={turma}
        onClose={() => setModalMatricularOpen(false)}
        onSuccess={() => carregarDados()}
      />

      <AulaFormModal
        isOpen={modalAulaOpen}
        aulaParaEditar={aulaParaEditar}
        turmaIdPreselecionada={turma.id}
        onClose={() => {
          setModalAulaOpen(false);
          setAulaParaEditar(null);
        }}
        onSuccess={() => carregarDados()}
      />

      <PresencaModal
        isOpen={modalPresencaOpen}
        aula={aulaParaPresenca}
        onClose={() => {
          setModalPresencaOpen(false);
          setAulaParaPresenca(null);
        }}
        onSuccess={() => carregarDados()}
      />
    </div>
  );
}
