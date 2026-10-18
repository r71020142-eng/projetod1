"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Avaliacao,
  TentativaAvaliacao,
  Modulo,
  Etapa,
  Programa,
  Professor,
  ResultadoAvaliacao,
  FeedbackAvaliacao,
} from "@/types";
import {
  avaliacaoRepository,
  tentativaAvaliacaoRepository,
  moduloRepository,
  etapaRepository,
  programaRepository,
  professorRepository,
} from "@/data/api";
import {
  TipoAvaliacaoBadge,
  StatusAvaliacaoBadge,
  StatusTentativaBadge,
  ResultadoBadge,
} from "@/components/admin/AvaliacaoBadges";
import { CorrigirTentativaPraticaModal } from "@/components/admin/CorrigirTentativaPraticaModal";
import {
  ArrowLeft,
  Copy,
  FileText,
  HelpCircle,
  Clock,
  Award,
} from "lucide-react";

export default function AdminAvaliacaoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [tentativas, setTentativas] = useState<TentativaAvaliacao[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de correção
  const [isCorrigirModalOpen, setIsCorrigirModalOpen] = useState(false);
  const [tentativaParaCorrigir, setTentativaParaCorrigir] = useState<TentativaAvaliacao | null>(null);

  const carregarDetalhes = React.useCallback(async () => {
    setLoading(true);
    try {
      const aval = await avaliacaoRepository.obterPorId(id);
      if (!aval) {
        setLoading(false);
        return;
      }
      setAvaliacao(aval);

      const [mod, etp, prog, tents, profs] = await Promise.all([
        moduloRepository.obterPorId(aval.moduloId),
        etapaRepository.obterPorId(aval.etapaId),
        programaRepository.obterPorId(aval.programaId),
        tentativaAvaliacaoRepository.listar({ avaliacaoId: aval.id }),
        professorRepository.listar(),
      ]);

      setModulo(mod || null);
      setEtapa(etp || null);
      setPrograma(prog || null);
      setTentativas(tents);
      setProfessores(profs);
    } catch (err) {
      console.error("Erro ao carregar detalhes da avaliação:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      carregarDetalhes();
    }
  }, [id, carregarDetalhes]);

  async function handleDuplicar() {
    if (!avaliacao) return;
    const confirm = window.confirm(
      `Deseja duplicar esta avaliação para a versão v${avaliacao.versao + 1}? O histórico desta versão v${avaliacao.versao} permanecerá intacto.`
    );
    if (!confirm) return;

    const res = await avaliacaoRepository.duplicarComoNovaVersao(avaliacao.id);
    if (res.success && res.data) {
      router.push(`/admin/avaliacoes/${res.data.id}`);
    }
  }

  async function handleSalvarCorrecao(
    tentativaId: string,
    _nota: number,
    resultado: ResultadoAvaliacao,
    feedback: FeedbackAvaliacao
  ) {
    await tentativaAvaliacaoRepository.corrigirTentativaPratica(
      tentativaId,
      feedback.corrigidoPorProfessorId,
      feedback.corrigidoPorProfessorNome,
      {
        itensRubrica: (feedback.itensRubrica || []).map((it) => ({
          criterioId: it.criterioId,
          pontosAtribuidos: it.pontosAtribuidos,
          comentario: it.comentario,
        })),
        pontosFortes: feedback.pontosFortes || "",
        pontosADesenvolver: feedback.pontosADesenvolver || "",
        orientacoes: feedback.orientacoes || "",
        observacoesInternas: feedback.observacoesInternas,
        resultado,
      }
    );
    await carregarDetalhes();
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        Carregando detalhes da avaliação...
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-slate-600 font-semibold">Avaliação não encontrada.</p>
        <Link
          href="/admin/avaliacoes"
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          Voltar para Lista de Avaliações
        </Link>
      </div>
    );
  }

  const professorAtivo = professores[0] || {
    id: "prof-001",
    nomeCompleto: "Lucas Ferreira",
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/avaliacoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Avaliações</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicar Versão v{avaliacao.versao + 1}
          </button>
        </div>
      </div>

      {/* Header do Detalhe */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <TipoAvaliacaoBadge tipo={avaliacao.tipo} />
              <StatusAvaliacaoBadge status={avaliacao.status} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                Versão {avaliacao.versao}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{avaliacao.titulo}</h1>
            <p className="text-xs text-slate-500">
              {programa?.nome} • {etapa?.nome} • {modulo?.nome}
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-1">
            <div>
              Professor Responsável:{" "}
              <strong className="text-slate-800">{avaliacao.professorNome || "Equipe MTD"}</strong>
            </div>
            {avaliacao.prazo && (
              <div>
                Prazo: <strong className="text-slate-800">{new Date(avaliacao.prazo).toLocaleDateString("pt-BR")}</strong>
              </div>
            )}
            <div>
              Máximo de Tentativas:{" "}
              <strong className="text-slate-800">{avaliacao.maxTentativas}</strong>
            </div>
            <div>
              Nota de Aprovação:{" "}
              <strong className="text-slate-800">
                {avaliacao.notaMinimaAprovacao ?? 7} / {avaliacao.notaMaxima}
              </strong>
            </div>
          </div>
        </div>

        {avaliacao.descricao && (
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
            {avaliacao.descricao}
          </p>
        )}

        {avaliacao.instrucoes && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Instruções para o Aluno:
            </span>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">
              {avaliacao.instrucoes}
            </p>
          </div>
        )}
      </div>

      {/* Conteúdo Pedagógico: Questões ou Rubrica */}
      {avaliacao.tipo === "objetiva" ? (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Banco de Questões Objetivas ({(avaliacao.questoes || []).length})
            </h2>
            <span className="text-xs text-slate-500">
              Correção 100% automática via gabarito
            </span>
          </div>

          <div className="space-y-6">
            {(avaliacao.questoes || []).map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-xs">
                      Questão {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Peso: {q.pontos} ponto(s)
                    </span>
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  {q.enunciado}
                </p>

                <div className="space-y-1.5 pl-2">
                  {q.alternativas.map((alt, aIdx) => {
                    const isCorreta = q.alternativaCorretaId === alt.id;
                    return (
                      <div
                        key={alt.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-xs ${
                          isCorreta
                            ? "bg-emerald-50 text-emerald-950 font-semibold border border-emerald-200"
                            : "text-slate-600"
                        }`}
                      >
                        <span className="w-5 text-center font-bold">
                          {String.fromCharCode(65 + aIdx)})
                        </span>
                        <span>{alt.texto}</span>
                        {isCorreta && (
                          <span className="ml-auto text-[10px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Gabarito Correto
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explicacao && (
                  <div className="text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-700">Explicação:</strong> {q.explicacao}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              Rubrica de Correção Pedagógica ({(avaliacao.rubrica || []).length} critérios)
            </h2>
            <div className="text-xs text-purple-700 font-semibold flex items-center gap-2">
              <span>Envio de Texto: {avaliacao.permitirTexto ? "Habilitado" : "Desabilitado"}</span>
              <span>•</span>
              <span>Envio de Link HTTPS: {avaliacao.permitirLink ? "Habilitado" : "Desabilitado"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(avaliacao.rubrica || []).map((cr, idx) => (
              <div
                key={cr.id}
                className="p-4 rounded-2xl bg-purple-50/30 border border-purple-100 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    {idx + 1}. {cr.nome}
                  </h3>
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    Máx: {cr.pontuacaoMaxima} pts
                  </span>
                </div>
                {cr.descricao && (
                  <p className="text-xs text-slate-600 leading-relaxed">{cr.descricao}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de Tentativas dos Alunos */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Histórico de Submissões ({tentativas.length})
          </h2>
          <span className="text-xs text-slate-500">
            Todas as tentativas registradas para esta versão
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Aluno</th>
                <th className="py-2.5 px-3 font-semibold text-center">Tentativa</th>
                <th className="py-2.5 px-3 font-semibold">Data Envio</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-center">Nota</th>
                <th className="py-2.5 px-3 font-semibold">Resultado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tentativas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Nenhum aluno realizou esta avaliação até o momento.
                  </td>
                </tr>
              ) : (
                tentativas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {t.alunoNome || t.alunoId}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-bold">
                        #{t.numeroTentativa}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {t.enviadaEm
                        ? new Date(t.enviadaEm).toLocaleDateString("pt-BR")
                        : new Date(t.iniciadaEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-3">
                      <StatusTentativaBadge status={t.status} />
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {t.nota !== undefined ? (
                        <span className={t.nota >= (avaliacao.notaMinimaAprovacao || 7) ? "text-emerald-700" : "text-rose-600"}>
                          {t.nota.toFixed(1)} / {t.notaMaxima ?? 10}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <ResultadoBadge resultado={t.resultado} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {avaliacao.tipo === "pratica" && (
                        <button
                          onClick={() => {
                            setTentativaParaCorrigir(t);
                            setIsCorrigirModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs transition"
                        >
                          {t.status === "aguardando_correcao" ? "Corrigir" : "Ver Correção"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CorrigirTentativaPraticaModal
        isOpen={isCorrigirModalOpen}
        onClose={() => setIsCorrigirModalOpen(false)}
        tentativa={tentativaParaCorrigir}
        avaliacao={avaliacao}
        professorId={professorAtivo.id}
        professorNome={professorAtivo.nomeCompleto}
        onSalvarCorrecao={handleSalvarCorrecao}
      />
    </div>
  );
}
