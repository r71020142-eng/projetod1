"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  Video,
  User,
  Users,
  ExternalLink,
  VideoOff,
  Database,
  RotateCcw,
} from "lucide-react";
import { Aula, Turma, Professor, FrequenciaCalculada, StatusPresenca } from "@/types";
import { aulaRepository } from "@/data/aulaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";
import { getAcademicAgendaDataSource } from "@/data/repositoryFactory";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";
import { PresencaBadge, AulaStatusBadge } from "@/components/common/TurmaBadges";

const DEMO_ALUNO_ID = "alu-001"; // Fallback para modo demonstrativo (Mariana Oliveira)

export default function MinhasAulasPage() {
  const identity = useAlunoIdentity();
  const isSupabaseActive = getAcademicAgendaDataSource() === "supabase";

  // Determina o ID operacional do discente.
  // Em modo Supabase: exige estritamente o alunoId resolvido do perfil autenticado; NUNCA usa fallback demonstrativo.
  // Em modo Demonstrativo: utiliza o alunoId da identidade ou fallback para DEMO_ALUNO_ID.
  const alunoId = useMemo(() => {
    if (isSupabaseActive) {
      if (identity?.isRealAuth && identity.role === "aluno" && identity.alunoId) {
        return identity.alunoId;
      }
      return null;
    }
    return identity?.alunoId || DEMO_ALUNO_ID;
  }, [identity, isSupabaseActive]);

  const alunoNome = identity?.nomeCompleto || "Mariana Oliveira";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [frequencia, setFrequencia] = useState<FrequenciaCalculada | null>(null);

  const carregarDados = useCallback(async (isMounted = true) => {
    if (!alunoId) {
      if (isMounted) {
        if (isSupabaseActive) {
          setError(
            "Vínculo acadêmico de aluno não encontrado para este usuário. Entre em contato com a coordenação pedagógica."
          );
        } else {
          setError("Identificador de aluno não configurado.");
        }
        setLoading(false);
      }
      return;
    }

    try {
      setError(null);
      const [listTurmas, listAulas, listProfs, freqData] = await Promise.all([
        turmaRepository.listarPorAluno(alunoId),
        aulaRepository.listarPorAluno(alunoId),
        professorRepository.listar(),
        aulaRepository.calcularFrequenciaAluno(alunoId),
      ]);

      if (!isMounted) return;
      setTurmas(listTurmas);
      setAulas(listAulas);
      setProfessores(listProfs);
      setFrequencia(freqData);
    } catch (err: unknown) {
      console.error("Erro ao carregar aulas do aluno:", err);
      if (isMounted) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as informações das aulas. Tente novamente."
        );
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [alunoId, isSupabaseActive]);

  useEffect(() => {
    let isMounted = true;
    carregarDados(isMounted);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        !customEvent.detail?.entity ||
        customEvent.detail.entity === "aulas" ||
        customEvent.detail.entity === "turmas" ||
        customEvent.detail.entity === "presencas"
      ) {
        carregarDados(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleUpdate);
    window.addEventListener("mtd_academic_agenda_updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleUpdate);
      window.removeEventListener("mtd_academic_agenda_updated", handleUpdate);
    };
  }, [carregarDados]);

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);
  const profMap = useMemo(() => new Map(professores.map((p) => [p.id, p])), [professores]);

  // Next upcoming class for the student
  const proximaAula = useMemo(() => {
    const agendadas = aulas.filter((a) => a.status === "agendada");
    return agendadas.length > 0 ? agendadas[0] : null;
  }, [aulas]);

  // Future classes list
  const proximasAulas = useMemo(() => {
    return aulas.filter((a) => a.status === "agendada");
  }, [aulas]);

  // Completed classes list
  const aulasConcluidas = useMemo(() => {
    return aulas.filter((a) => a.status === "concluida");
  }, [aulas]);

  const formatDataBr = (dataIso: string) => {
    try {
      const [ano, mes, dia] = dataIso.split("-");
      const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
      return d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
    } catch {
      return dataIso;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto my-8">
        <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Carregando suas aulas...</p>
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
            carregarDados(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>
            <strong>Portal do Aluno • {alunoNome}:</strong> Suas aulas ao vivo, turmas e histórico de presenças no Método Paulo.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Database className="h-3 w-3 text-emerald-600" />
              <span>Supabase Seguro</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              <RotateCcw className="h-3 w-3 text-purple-600" />
              <span>Modo Demonstrativo</span>
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Minhas Aulas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acesse a sala oficial do Zoom, consulte datas programadas e acompanhe sua taxa de presença.
        </p>
      </div>

      {/* Hero: Next Class Highlight Card */}
      {proximaAula ? (
        (() => {
          const turma = turmaMap.get(proximaAula.turmaId);
          const prof = profMap.get(proximaAula.professorId);

          return (
            <div className="relative overflow-hidden rounded-3xl bg-[#5046E5] text-white p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold tracking-wide">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Sua Próxima Aula ao Vivo
                </span>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  {proximaAula.titulo}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-indigo-100 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-indigo-200" />
                    <span className="capitalize">{formatDataBr(proximaAula.data)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-200" />
                    <span>
                      {proximaAula.horario} ({proximaAula.duracaoMinutos || 50} min)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-indigo-200" />
                    <span>Prof. {prof?.nomeCompleto || "Lucas Ferreira"}</span>
                  </div>
                  {turma && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-200" />
                      <span>{turma.nome}</span>
                    </div>
                  )}
                </div>

                {proximaAula.topicoTrabalhado && (
                  <p className="text-xs text-indigo-200/90 pt-1">
                    Tema da aula: {proximaAula.topicoTrabalhado}
                  </p>
                )}
              </div>

              {/* Action: Zoom Button */}
              <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-2 shrink-0">
                {proximaAula.linkZoom || proximaAula.meetingUrl ? (
                  <a
                    href={proximaAula.linkZoom || proximaAula.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-[#5046E5] font-extrabold text-sm shadow-md hover:bg-indigo-50 transition-all active:scale-[0.99]"
                  >
                    <Video className="h-4 w-4 text-[#5046E5]" />
                    <span>Entrar na Aula pelo Zoom</span>
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                  </a>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs text-indigo-100 flex items-center gap-2.5">
                    <VideoOff className="h-4 w-4 text-indigo-200 shrink-0" />
                    <span>Link da aula ainda não disponibilizado</span>
                  </div>
                )}
                <span className="text-[11px] text-indigo-200/80">
                  {proximaAula.linkZoom || proximaAula.meetingUrl
                    ? "Link oficial cadastrado para a sessão ao vivo"
                    : "O professor disponibilizará o link antes do início"}
                </span>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
          <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma próxima aula agendada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Assim que a equipe pedagógica agendar sua próxima sessão do Método Paulo, ela aparecerá em destaque aqui.
          </p>
        </div>
      )}

      {/* Grid: Frequência do Aluno & Turmas Atuais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Frequência Individual */}
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Sua Frequência</h3>
            <span className="text-2xl font-black text-purple-700">
              {frequencia?.porcentagem !== null && frequencia?.porcentagem !== undefined
                ? `${frequencia.porcentagem}%`
                : "—"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <p className="text-[10px] font-semibold text-emerald-700">Presenças</p>
              <p className="text-base font-bold text-emerald-800 mt-0.5">
                {frequencia?.totalPresentes || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
              <p className="text-[10px] font-semibold text-rose-700">Ausências</p>
              <p className="text-base font-bold text-rose-800 mt-0.5">
                {frequencia?.totalAusentes || 0}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
              <p className="text-[10px] font-semibold text-amber-700">Justificadas</p>
              <p className="text-base font-bold text-amber-800 mt-0.5">
                {frequencia?.totalJustificados || 0}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
            Sua frequência reflete sua consistência no Método Paulo. Ausências justificadas junto à coordenação não penalizam seu percentual.
          </p>
        </div>

        {/* Minhas Turmas */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Minhas Turmas Atuais</h3>
          {turmas.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
              Você ainda não está matriculado em nenhuma turma.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {turmas.map((t) => {
                const prof = profMap.get(t.professorId);
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">{t.nome}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700">
                        {t.modalidade === "individual" ? "Individual" : "Grupo"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1">{t.objetivoPrincipal}</p>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span>Professor: {prof?.nomeCompleto || "Lucas Ferreira"}</span>
                      <span>Nível: {t.nivel === "nao_definido" ? "Não definido" : t.nivel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Próximas Aulas Programadas */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Próximas Sessões na Grade</h3>
          <p className="text-xs text-slate-500">Aulas agendadas das suas turmas</p>
        </div>

        {proximasAulas.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            Nenhuma outra sessão agendada no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {proximasAulas.map((aula) => {
              const turma = turmaMap.get(aula.turmaId);
              const prof = profMap.get(aula.professorId);
              const linkZoom = aula.linkZoom || aula.meetingUrl;

              return (
                <div
                  key={aula.id}
                  className="p-4 rounded-xl border border-slate-100 hover:border-purple-200 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{aula.titulo}</span>
                      <AulaStatusBadge status={aula.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="capitalize font-medium text-slate-700">
                        {formatDataBr(aula.data)} às {aula.horario}
                      </span>
                      <span>•</span>
                      <span>{turma?.nome}</span>
                      <span>•</span>
                      <span>Prof. {prof?.nomeCompleto}</span>
                    </div>
                  </div>

                  <div>
                    {linkZoom ? (
                      <a
                        href={linkZoom}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Acessar Zoom</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" />
                        <span>Link da aula ainda não disponibilizado</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico de Aulas e Presença Individual */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Histórico de Aulas Concluídas</h3>
          <p className="text-xs text-slate-500">
            Registro de presenças e temas já trabalhados com seus professores
          </p>
        </div>

        {aulasConcluidas.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            Nenhuma aula foi concluída ainda no seu histórico.
          </div>
        ) : (
          <div className="space-y-3">
            {aulasConcluidas.map((aula) => {
              const turma = turmaMap.get(aula.turmaId);
              const prof = profMap.get(aula.professorId);
              const regPresenca = (aula.presencas && alunoId)
                ? (aula.presencas[alunoId] || null)
                : null;
              const statusPresenca: StatusPresenca = regPresenca
                ? regPresenca.status
                : "nao_registrado";

              return (
                <div
                  key={aula.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{aula.titulo}</span>
                      <PresencaBadge status={statusPresenca} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{aula.data} às {aula.horario}</span>
                      <span>•</span>
                      <span>{turma?.nome}</span>
                      <span>•</span>
                      <span>Prof. {prof?.nomeCompleto}</span>
                    </div>

                    {aula.topicoTrabalhado && (
                      <p className="text-xs text-slate-600 pt-0.5">
                        <strong>Tópico trabalhado:</strong> {aula.topicoTrabalhado}
                      </p>
                    )}

                    {regPresenca?.justificativa && (
                      <p className="text-xs text-amber-800 italic pt-0.5">
                        Observação/Justificativa: &ldquo;{regPresenca.justificativa}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
