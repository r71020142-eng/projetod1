"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Avaliacao,
  TentativaAvaliacao,
  RespostaQuestaoObjetiva,
  Modulo,
} from "@/types";
import {
  avaliacaoRepository,
  tentativaAvaliacaoRepository,
  moduloRepository,
} from "@/data/api";
import {
  sanitizarTentativaParaAluno,
  isGabaritoLiberado,
} from "@/data/tentativaAvaliacaoRepository";
import {
  TipoAvaliacaoBadge,
  StatusTentativaBadge,
  ResultadoBadge,
} from "@/components/admin/AvaliacaoBadges";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Save,
  HelpCircle,
  Award,
  ExternalLink,
  RotateCcw,
  BookOpen,
  FileText,
  Play,
} from "lucide-react";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

export default function AlunoAvaliacaoDetalhePage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || "alu-001");
  const params = useParams();
  const id = params?.id as string;

  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [tentativas, setTentativas] = useState<TentativaAvaliacao[]>([]);
  const [tentativaAtiva, setTentativaAtiva] = useState<TentativaAvaliacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Estados durante a realização de Objetiva
  const [respostasObjetivas, setRespostasObjetivas] = useState<Record<string, string>>({});

  // Estados durante a realização de Prática
  const [textoPratica, setTextoPratica] = useState("");
  const [linkPratica, setLinkPratica] = useState("");
  const [linkErro, setLinkErro] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  const carregarDados = useCallback(async (isMounted = true) => {
    try {
      setPageError(null);
      const aval = await avaliacaoRepository.obterPorId(id);
      if (!isMounted) return;
      if (!aval) {
        setLoading(false);
        return;
      }
      setAvaliacao(aval);

      const mod = await moduloRepository.obterPorId(aval.moduloId);
      if (!isMounted) return;
      setModulo(mod || null);

      // Carregar e sanitizar tentativas
      const tents = await tentativaAvaliacaoRepository.listar({
        avaliacaoId: aval.id,
        alunoId,
      });
      if (!isMounted) return;
      const tentsSanitizadas = tents.map((t) => sanitizarTentativaParaAluno(t, aval.status));
      setTentativas(tentsSanitizadas);

      // Verificar se há tentativa em andamento
      const rascunho = tentsSanitizadas.find((t) => t.status === "em_andamento");
      if (rascunho) {
        setTentativaAtiva(rascunho);
        // Preencher respostas
        if (rascunho.respostasObjetivas) {
          const mapa: Record<string, string> = {};
          rascunho.respostasObjetivas.forEach((r) => {
            if (r.alternativaEscolhidaId) mapa[r.questaoId] = r.alternativaEscolhidaId;
          });
          setRespostasObjetivas(mapa);
        }
        if (rascunho.respostaPratica) {
          setTextoPratica(rascunho.respostaPratica.textoResposta || "");
          setLinkPratica(rascunho.respostaPratica.linkExterno || "");
        }
      } else {
        // Se não há rascunho ativo, exibe a última tentativa concluída
        const ultima = tentsSanitizadas[tentsSanitizadas.length - 1];
        setTentativaAtiva(ultima || null);
      }
    } catch (err) {
      console.error("Erro ao carregar avaliação do aluno:", err);
      if (isMounted) {
        setPageError("Não foi possível carregar os detalhes da avaliação.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [id, alunoId]);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      carregarDados(isMounted);
    }

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "avaliacoes" ||
        custom.detail.entity === "tentativas"
      ) {
        carregarDados(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, [id, carregarDados]);

  // Iniciar nova tentativa
  async function handleIniciarTentativa() {
    if (!avaliacao) return;
    setLoading(true);
    setErro("");
    try {
      const res = await tentativaAvaliacaoRepository.iniciarTentativa(
        avaliacao.id,
        alunoId,
        "Mariana Oliveira"
      );
      if (res.success && res.data) {
        setTentativaAtiva(res.data);
        setRespostasObjetivas({});
        setTextoPratica("");
        setLinkPratica("");
        await carregarDados();
      } else {
        setErro(res.error || "Erro ao iniciar tentativa.");
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao iniciar tentativa.");
    } finally {
      setLoading(false);
    }
  }

  // Salvar rascunho
  async function handleSalvarRascunho() {
    if (!tentativaAtiva || !avaliacao) return;
    setSalvando(true);
    setAviso("");
    try {
      if (avaliacao.tipo === "objetiva") {
        const payload: RespostaQuestaoObjetiva[] = Object.entries(respostasObjetivas).map(
          ([qId, altId]) => ({
            questaoId: qId,
            alternativaEscolhidaId: altId,
            pontosObtidos: 0,
            respondidaEm: new Date().toISOString(),
          })
        );
        await tentativaAvaliacaoRepository.salvarRascunho(tentativaAtiva.id, alunoId, payload);
      } else {
        await tentativaAvaliacaoRepository.salvarRascunho(
          tentativaAtiva.id,
          alunoId,
          undefined,
          {
            textoResposta: textoPratica.trim() || undefined,
            linkExterno: linkPratica.trim() || undefined,
          }
        );
      }
      setAviso("Rascunho salvo com sucesso.");
      setTimeout(() => setAviso(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar rascunho:", err);
    } finally {
      setSalvando(false);
    }
  }

  // Submeter avaliação objetiva
  async function handleSubmeterObjetiva() {
    if (!tentativaAtiva || !avaliacao) return;
    const questoes = avaliacao.questoes || [];
    const totalRespondidas = Object.keys(respostasObjetivas).length;
    const faltam = questoes.length - totalRespondidas;

    if (faltam > 0) {
      const confirma = window.confirm(
        `Atenção: Você possui ${faltam} questão(ões) sem resposta. Deseja finalizar e submeter mesmo assim?`
      );
      if (!confirma) return;
    } else {
      const confirma = window.confirm(
        "Tem certeza que deseja finalizar a avaliação? Suas respostas serão computadas e corrigidas imediatamente."
      );
      if (!confirma) return;
    }

    setSalvando(true);
    setErro("");
    try {
      const res = await tentativaAvaliacaoRepository.enviarTentativa(
        tentativaAtiva.id,
        alunoId,
        {
          respostasObjetivasMap: respostasObjetivas,
        }
      );
      if (res.success && res.data) {
        await carregarDados();
      } else {
        setErro(res.error || "Erro ao submeter avaliação objetiva.");
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao submeter avaliação objetiva.");
    } finally {
      setSalvando(false);
    }
  }

  // Validar link HTTPS
  function validarLinkHttps(urlStr: string): boolean {
    if (!urlStr.trim()) return true;
    try {
      const url = new URL(urlStr.trim());
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Submeter avaliação prática
  async function handleSubmeterPratica() {
    if (!tentativaAtiva || !avaliacao) return;

    if (!textoPratica.trim() && !linkPratica.trim()) {
      setErro("Insira uma resposta em texto ou informe o link da sua gravação.");
      return;
    }

    if (linkPratica.trim() && !validarLinkHttps(linkPratica.trim())) {
      setLinkErro("O link deve ser uma URL válida com protocolo HTTPS (ex: https://...).");
      return;
    }
    setLinkErro("");

    const confirma = window.confirm(
      "Deseja enviar sua avaliação prática para correção pelo professor? Após o envio, ela entrará na fila pedagógica."
    );
    if (!confirma) return;

    setSalvando(true);
    setErro("");
    try {
      const res = await tentativaAvaliacaoRepository.enviarTentativa(
        tentativaAtiva.id,
        alunoId,
        {
          respostaPratica: {
            textoResposta: textoPratica.trim() || undefined,
            linkExterno: linkPratica.trim() || undefined,
          },
        }
      );
      if (res.success && res.data) {
        await carregarDados();
      } else {
        setErro(res.error || "Erro ao submeter avaliação prática.");
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao submeter avaliação prática.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        Carregando avaliação...
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm max-w-xl mx-auto my-8 space-y-3">
        <p className="text-sm font-bold text-red-700">{pageError}</p>
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

  if (!avaliacao) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-slate-600 font-semibold">Avaliação não encontrada.</p>
        <Link
          href="/aluno/avaliacoes"
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          Voltar para Lista de Avaliações
        </Link>
      </div>
    );
  }

  // Cálculos de tentativas
  const concluidas = tentativas.filter(
    (t) => t.status === "corrigida" || t.status === "aguardando_correcao"
  );
  const estaEmAndamento = tentativaAtiva?.status === "em_andamento";
  const podeIniciarNova =
    !estaEmAndamento && concluidas.length < avaliacao.maxTentativas;

  const totalQuestoes = avaliacao.questoes?.length || 0;
  const respondidasCount = Object.keys(respostasObjetivas).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/aluno/avaliacoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Minhas Avaliações</span>
        </Link>

        {podeIniciarNova && (
          <button
            onClick={handleIniciarTentativa}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nova Tentativa ({concluidas.length + 1} de {avaliacao.maxTentativas})
          </button>
        )}
      </div>

      {/* Header da Avaliação */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <TipoAvaliacaoBadge tipo={avaliacao.tipo} />
              {tentativaAtiva && (
                <StatusTentativaBadge status={tentativaAtiva.status} />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{avaliacao.titulo}</h1>
            <p className="text-xs text-slate-500">
              {modulo?.nome || "Módulo do Método Paulo"}
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-1">
            <div>
              Tentativas:{" "}
              <strong className="text-slate-800">
                {concluidas.length} de {avaliacao.maxTentativas}
              </strong>
            </div>
            {avaliacao.prazo && (
              <div>
                Prazo:{" "}
                <strong className="text-slate-800">
                  {new Date(avaliacao.prazo).toLocaleDateString("pt-BR")}
                </strong>
              </div>
            )}
            <div>
              Média mínima para aprovação:{" "}
              <strong className="text-slate-800">
                {avaliacao.notaMinimaAprovacao ?? 7.0} / {avaliacao.notaMaxima}
              </strong>
            </div>
          </div>
        </div>

        {avaliacao.descricao && (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            {avaliacao.descricao}
          </p>
        )}

        {avaliacao.instrucoes && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Instruções Pedagógicas:
            </span>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">
              {avaliacao.instrucoes}
            </p>
          </div>
        )}
      </div>

      {/* Avisos e Erros */}
      {aviso && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{aviso}</span>
        </div>
      )}
      {erro && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CENÁRIO 1: TENTATIVA EM ANDAMENTO (RESPONDER AVALIAÇÃO) */}
      {/* ==================================================================== */}
      {estaEmAndamento ? (
        <div className="space-y-6">
          {avaliacao.tipo === "objetiva" ? (
            /* Formulário da Avaliação Objetiva */
            <div className="space-y-6">
              {/* Barra de Progresso das Respostas */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Progresso: {respondidasCount} de {totalQuestoes} respondidas
                </span>
                <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${totalQuestoes > 0 ? (respondidasCount / totalQuestoes) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Lista de Questões */}
              {(avaliacao.questoes || []).map((q, idx) => {
                const escolhida = respostasObjetivas[q.id];

                return (
                  <div
                    key={q.id}
                    className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Questão {idx + 1}
                      </span>
                      <span className="text-xs text-slate-400">
                        {q.pontos} ponto(s)
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                      {q.enunciado}
                    </p>

                    <div className="space-y-2 pt-1">
                      {q.alternativas.map((alt, aIdx) => {
                        const isSelecionada = escolhida === alt.id;

                        return (
                          <label
                            key={alt.id}
                            className={`flex items-start gap-3 p-3 rounded-2xl border text-xs cursor-pointer transition ${
                              isSelecionada
                                ? "bg-indigo-50/60 border-indigo-500 text-indigo-950 font-medium"
                                : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100/60"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`resp-${q.id}`}
                              checked={isSelecionada}
                              onChange={() =>
                                setRespostasObjetivas({
                                  ...respostasObjetivas,
                                  [q.id]: alt.id,
                                })
                              }
                              className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <span className="font-bold mr-1.5">
                                {String.fromCharCode(65 + aIdx)})
                              </span>
                              <span>{alt.texto}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Botões de Ação */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSalvarRascunho}
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Rascunho</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmeterObjetiva}
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Finalizar e Enviar Avaliação</span>
                </button>
              </div>
            </div>
          ) : (
            /* Formulário da Avaliação Prática */
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
              {/* Rubrica Informativa */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" />
                  O que seu professor avaliará:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(avaliacao.rubrica || []).map((cr, idx) => (
                    <div
                      key={cr.id}
                      className="p-3 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-purple-950">
                        <span>
                          {idx + 1}. {cr.nome}
                        </span>
                        <span>{cr.pontuacaoMaxima} pts</span>
                      </div>
                      {cr.descricao && (
                        <p className="text-slate-600 text-[11px]">{cr.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resposta em Texto */}
              {avaliacao.permitirTexto && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Sua Resposta em Texto / Redação
                  </label>
                  <textarea
                    rows={6}
                    value={textoPratica}
                    onChange={(e) => setTextoPratica(e.target.value)}
                    placeholder="Digite seu texto, parágrafos ou redação conforme as instruções da atividade prática..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                  <span className="text-[11px] text-slate-400 block text-right">
                    {textoPratica.length} caracteres digitados
                  </span>
                </div>
              )}

              {/* Resposta em Link Externo */}
              {avaliacao.permitirLink && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Link Externo da Gravação (Áudio / Vídeo)
                  </label>
                  <div className="space-y-1">
                    <input
                      type="url"
                      value={linkPratica}
                      onChange={(e) => {
                        setLinkPratica(e.target.value);
                        setLinkErro("");
                      }}
                      placeholder="https://loom.com/... ou https://drive.google.com/..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {linkErro && (
                      <p className="text-xs text-rose-600 font-semibold">{linkErro}</p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Cole o link HTTPS da sua gravação (Loom, YouTube não listado, Google Drive público com visualização liberada).
                    </p>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSalvarRascunho}
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Rascunho</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmeterPratica}
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar para Correção</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==================================================================== */
        /* CENÁRIO 2: VISUALIZAÇÃO DE RESULTADO / SUBMISSÃO CONCLUÍDA */
        /* ==================================================================== */
        <div className="space-y-6">
          {tentativaAtiva ? (
            <div className="space-y-6">
              {/* Card de Desempenho / Status */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                      Tentativa #{tentativaAtiva.numeroTentativa}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      {tentativaAtiva.status === "corrigida"
                        ? "Avaliação Corrigida"
                        : "Submissão Aguardando Correção"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusTentativaBadge status={tentativaAtiva.status} />
                    {tentativaAtiva.resultado && (
                      <ResultadoBadge resultado={tentativaAtiva.resultado} />
                    )}
                  </div>
                </div>

                {/* Nota e Resultados */}
                {tentativaAtiva.status === "corrigida" && tentativaAtiva.nota !== undefined && (
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase block">
                        Sua Nota Final
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-extrabold text-emerald-950">
                          {tentativaAtiva.nota.toFixed(1)}
                        </span>
                        <span className="text-sm font-semibold text-emerald-700">
                          / {tentativaAtiva.notaMaxima ?? avaliacao.notaMaxima}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs text-emerald-800">
                      {tentativaAtiva.nota >= (avaliacao.notaMinimaAprovacao || 7) ? (
                        <span className="font-bold flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Parabéns! Requisito atingido.
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Nota abaixo do mínimo para aprovação ({avaliacao.notaMinimaAprovacao}).
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {tentativaAtiva.status === "aguardando_correcao" && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Submissão enviada com sucesso!</p>
                      <p className="text-amber-800 mt-0.5">
                        Seu professor avaliará cada critério da rubrica e publicará um parecer pedagógico com orientações de evolução.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Se Objetiva: Exibir Questões e Gabarito (respeitando a política de exibição da tentativa) */}
              {avaliacao.tipo === "objetiva" && (() => {
                const politicaUtilizada = tentativaAtiva.politicaGabaritoUtilizada || avaliacao.politicaGabarito || "gabarito_imediato";
                const gabaritoLiberado = isGabaritoLiberado(politicaUtilizada, tentativaAtiva.status, avaliacao.status);

                return (
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          Revisão das Questões
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {politicaUtilizada === "nota_imediata" && "Política: Nota Imediata (somente nota e resultado)"}
                          {politicaUtilizada === "gabarito_imediato" && "Política: Gabarito Imediato (respostas e explicações liberadas)"}
                          {politicaUtilizada === "gabarito_apos_encerramento" && "Política: Gabarito após Encerramento"}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        gabaritoLiberado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {gabaritoLiberado ? "Gabarito e Explicações Liberados" : "Gabarito Restrito"}
                      </span>
                    </div>

                    {gabaritoLiberado ? (
                      <div className="space-y-6">
                        {(avaliacao.questoes || []).map((q, idx) => {
                          const respAluno = (tentativaAtiva.respostasObjetivas || []).find(
                            (r) => r.questaoId === q.id
                          );
                          const foiCorreta = respAluno?.correta ?? false;

                          return (
                            <div
                              key={q.id}
                              className={`p-5 rounded-2xl border space-y-3 ${
                                foiCorreta
                                  ? "bg-emerald-50/20 border-emerald-200"
                                  : "bg-rose-50/20 border-rose-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  Questão {idx + 1}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                  {foiCorreta ? (
                                    <span className="text-emerald-700 flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Acertou (+{q.pontos} pts)
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 flex items-center gap-1">
                                      <XCircle className="w-4 h-4" />
                                      Incorreta (0 pts)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm font-medium text-slate-900">{q.enunciado}</p>

                              <div className="space-y-1.5 pl-2 text-xs">
                                {q.alternativas.map((alt, aIdx) => {
                                  const isEscolhida = respAluno?.alternativaEscolhidaId === alt.id;
                                  const isCorreta = q.alternativaCorretaId === alt.id;

                                  return (
                                    <div
                                      key={alt.id}
                                      className={`flex items-center gap-2 p-2 rounded-xl ${
                                        isCorreta
                                          ? "bg-emerald-100/70 text-emerald-950 font-bold"
                                          : isEscolhida && !isCorreta
                                          ? "bg-rose-100/70 text-rose-950 font-semibold line-through"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      <span className="w-5 font-bold">
                                        {String.fromCharCode(65 + aIdx)})
                                      </span>
                                      <span>{alt.texto}</span>
                                      {isEscolhida && (
                                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-white font-bold text-slate-700 border">
                                          Sua escolha
                                        </span>
                                      )}
                                      {isCorreta && (
                                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                                          Correta
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {q.explicacao && (
                                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-slate-800">Comentário Pedagógico:</strong>{" "}
                                    {q.explicacao}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Gabarito e explicações retidos conforme política pedagógica</span>
                        </div>
                        {politicaUtilizada === "nota_imediata" && (
                          <p className="text-slate-600">
                            Esta avaliação utiliza a política de <strong>Nota Imediata</strong>. Sua nota global e resultado de aprovação foram registrados acima, mas as respostas corretas e explicações pedagógicas não são divulgadas.
                          </p>
                        )}
                        {politicaUtilizada === "gabarito_apos_encerramento" && (
                          <p className="text-slate-600">
                            Esta avaliação utiliza a política de <strong>Gabarito após Encerramento</strong>. Sua nota já está salva. As respostas corretas e as explicações de cada questão serão liberadas assim que o período da avaliação for formalmente encerrado pelo professor.
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Tentativas submetidas preservam a política configurada no momento de sua realização (sem alterações retroativas silenciosas).
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Se Prática: Resposta enviada e Feedback do Professor */}
              {avaliacao.tipo === "pratica" && (
                <div className="space-y-6">
                  {/* Resposta enviada pelo aluno */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Sua Entrega Realizada
                    </h3>

                    {tentativaAtiva.respostaPratica?.textoResposta && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {tentativaAtiva.respostaPratica.textoResposta}
                      </div>
                    )}

                    {tentativaAtiva.respostaPratica?.linkExterno && (
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                        <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                        <a
                          href={tentativaAtiva.respostaPratica.linkExterno}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline truncate"
                        >
                          {tentativaAtiva.respostaPratica.linkExterno}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Feedback do Professor (SANITIZADO: sem observações internas) */}
                  {tentativaAtiva.feedback && (
                    <div className="p-6 rounded-3xl bg-white border border-purple-200/80 shadow-xs space-y-5">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-purple-600" />
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">
                              Parecer Pedagógico do Professor
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Corrigido por {tentativaAtiva.feedback.corrigidoPorProfessorNome} em{" "}
                              {new Date(tentativaAtiva.feedback.corrigidoEm).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>

                        <ResultadoBadge resultado={tentativaAtiva.feedback.resultado} />
                      </div>

                      {/* Rubrica avaliada */}
                      {tentativaAtiva.feedback.itensRubrica && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Detalhamento por Critério
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {tentativaAtiva.feedback.itensRubrica.map((item) => {
                              const cr = (avaliacao.rubrica || []).find(
                                (r) => r.id === item.criterioId
                              );
                              return (
                                <div
                                  key={item.criterioId}
                                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span>{cr?.nome || "Critério"}</span>
                                    <span className="text-purple-700">
                                      {item.pontosAtribuidos} / {cr?.pontuacaoMaxima ?? "—"} pts
                                    </span>
                                  </div>
                                  {item.comentario && (
                                    <p className="text-slate-600 text-[11px] italic">
                                      &quot;{item.comentario}&quot;
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Parecer Qualitativo */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {tentativaAtiva.feedback.pontosFortes && (
                          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1">
                            <span className="font-bold text-emerald-900 uppercase text-[10px] block">
                              Pontos Fortes
                            </span>
                            <p className="text-slate-800 leading-relaxed">
                              {tentativaAtiva.feedback.pontosFortes}
                            </p>
                          </div>
                        )}

                        {tentativaAtiva.feedback.pontosADesenvolver && (
                          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-xs space-y-1">
                            <span className="font-bold text-amber-900 uppercase text-[10px] block">
                              Oportunidades de Melhoria
                            </span>
                            <p className="text-slate-800 leading-relaxed">
                              {tentativaAtiva.feedback.pontosADesenvolver}
                            </p>
                          </div>
                        )}
                      </div>

                      {tentativaAtiva.feedback.orientacoes && (
                        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
                          <span className="font-bold text-indigo-900 uppercase text-[10px] block">
                            Orientações de Estudo
                          </span>
                          <p className="text-slate-800 leading-relaxed">
                            {tentativaAtiva.feedback.orientacoes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <BookOpen className="w-10 h-10 text-indigo-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-800">Pronto para iniciar?</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Você possui {avaliacao.maxTentativas} tentativa(s) para demonstrar seus conhecimentos neste checkpoint.
              </p>
              <button
                onClick={handleIniciarTentativa}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Play className="w-4 h-4" />
                <span>Começar Agora</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
