"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  Headphones,
  BookOpen,
  Award,
  Sparkles,
} from "lucide-react";
import {
  ExercicioInterativo,
  TentativaExercicio,
  Baralho,
} from "@/types";
import { exercicioRepository } from "@/data/exercicioRepository";
import { tentativaExercicioRepository } from "@/data/tentativaExercicioRepository";
import { baralhoRepository } from "@/data/baralhoRepository";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

const DEMO_ALUNO_ID = "alu-001";

export default function ExecutarExercicioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth
    ? identity.alunoId || ""
    : identity?.alunoId || DEMO_ALUNO_ID;
  const alunoNome = identity?.nomeCompleto || "Aluno";

  // Dados do Exercício e Tentativa
  const [exercicio, setExercicio] = useState<ExercicioInterativo | null>(null);
  const [tentativaAtiva, setTentativaAtiva] = useState<TentativaExercicio | null>(null);
  const [tentativaConcluida, setTentativaConcluida] = useState<TentativaExercicio | null>(null);
  const [baralhoVinculado, setBaralhoVinculado] = useState<Baralho | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Respostas em andamento do aluno (armazenadas em sessionStorage para não perder no refresh)
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [questaoAtualIndex, setQuestaoAtualIndex] = useState(0);

  // Cronômetro da tentativa
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Player de Áudio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Carregamento inicial e restauração do draft
  useEffect(() => {
    async function inicializar() {
      if (!id) return;
      try {
        setLoading(true);
        const exData = await exercicioRepository.obterPorId(id);
        if (!exData) {
          alert("Exercício não encontrado.");
          router.push("/aluno/exercicios");
          return;
        }
        setExercicio(exData);

        if (exData.baralhoVocabularioId) {
          const b = await baralhoRepository.obterPorId(exData.baralhoVocabularioId);
          setBaralhoVinculado(b);
        }

        // Inicia ou recupera tentativa ativa
        const resTentativa = await tentativaExercicioRepository.iniciarTentativa({
          exercicioId: exData.id,
          alunoId,
          alunoNome,
        });

        if (resTentativa.success && resTentativa.data) {
          setTentativaAtiva(resTentativa.data);
        }

        // Restaura respostas salvas no sessionStorage se houver
        const draftKey = `mtd_exercicio_draft_${exData.id}_${alunoId}`;
        try {
          const savedDraft = sessionStorage.getItem(draftKey);
          if (savedDraft) {
            setRespostas(JSON.parse(savedDraft));
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error("Erro ao inicializar exercício:", err);
      } finally {
        setLoading(false);
      }
    }
    inicializar();
  }, [id, alunoId, alunoNome, router]);

  // Cronômetro
  useEffect(() => {
    if (tentativaConcluida) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSegundosDecorridos((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tentativaConcluida]);

  // Salva no sessionStorage a cada resposta
  const handleSelectAlternativa = (questaoId: string, altId: string) => {
    if (tentativaConcluida) return;

    setRespostas((prev) => {
      const updated = { ...prev, [questaoId]: altId };
      if (exercicio?.id) {
        try {
          sessionStorage.setItem(
            `mtd_exercicio_draft_${exercicio.id}_${alunoId}`,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  // Funções do Player de Áudio
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.log("Audio play error:", err));
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setAudioCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const restartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Submissão da Tentativa
  const handleFinalizar = async () => {
    if (!exercicio || !tentativaAtiva) return;

    const totalQuestoes = exercicio.questoes?.length || 0;
    const respondidasCount = Object.keys(respostas).length;

    if (respondidasCount < totalQuestoes) {
      const faltam = totalQuestoes - respondidasCount;
      const confirma = confirm(
        `Você ainda não respondeu ${faltam} questão(ões). Deseja finalizar mesmo assim?`
      );
      if (!confirma) return;
    }

    setSubmitting(true);
    try {
      const payloadRespostas = (exercicio.questoes || []).map((q) => ({
        questaoId: q.id,
        alternativaEscolhidaId: respostas[q.id],
      }));

      const res = await tentativaExercicioRepository.concluirTentativa({
        tentativaId: tentativaAtiva.id,
        respostas: payloadRespostas,
        tempoGastoSegundos: segundosDecorridos,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Erro ao computar resultado da tentativa.");
      }

      setTentativaConcluida(res.data);

      // Limpa rascunho temporário
      try {
        sessionStorage.removeItem(`mtd_exercicio_draft_${exercicio.id}_${alunoId}`);
      } catch {
        // ignore
      }

      // Rola para o topo para visualização do resultado
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      alert((err as Error)?.message || "Falha ao enviar tentativa.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePraticarNovamente = async () => {
    if (!exercicio) return;
    setTentativaConcluida(null);
    setRespostas({});
    setSegundosDecorridos(0);
    setQuestaoAtualIndex(0);

    const res = await tentativaExercicioRepository.iniciarTentativa({
      exercicioId: exercicio.id,
      alunoId,
      alunoNome,
    });
    if (res.success && res.data) {
      setTentativaAtiva(res.data);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm">
        Carregando exercício interativo...
      </div>
    );
  }

  if (!exercicio) return null;

  const questoes = exercicio.questoes || [];
  const questaoAtual = questoes[questaoAtualIndex];
  const totalQuestoes = questoes.length;
  const respondidasCount = Object.keys(respostas).length;
  const progressoPct = totalQuestoes > 0 ? Math.round((respondidasCount / totalQuestoes) * 100) : 0;

  const formatTempo = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-5xl pb-20 animate-in fade-in duration-200">
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <Link
          href="/aluno/exercicios"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-purple-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Exercícios
        </Link>

        {/* Cronômetro e Progresso */}
        {!tentativaConcluida && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <Clock className="h-3.5 w-3.5 text-purple-600" />
              <span>{formatTempo(segundosDecorridos)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {respondidasCount} de {totalQuestoes} respondidas
              </span>
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${progressoPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TELA DE RESULTADO (Exibida após a conclusão) */}
      {tentativaConcluida ? (
        <div className="space-y-6">
          {/* Hero Card do Resultado */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6 ${
              tentativaConcluida.aprovado
                ? "bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 border-emerald-500/40 text-white"
                : "bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 border-purple-500/40 text-white"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${
                    tentativaConcluida.aprovado
                      ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                      : "bg-purple-500/30 text-purple-200 border border-purple-400/40"
                  }`}
                >
                  <Award className="h-3.5 w-3.5 text-amber-300" />
                  {tentativaConcluida.aprovado ? "Aprovado com Sucesso" : "Treino Concluído • Reforço Recomendado"}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Resultado do Exercício • {exercicio.titulo}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-normal leading-relaxed">
                  {tentativaConcluida.aprovado
                    ? "Excelente aproveitamento! Suas respostas demonstraram alta compreensão das estruturas e do vocabulário."
                    : "Bom esforço! Revise os pontos destacados abaixo e pratique novamente para fixar o aprendizado."}
                </p>
              </div>

              {/* Nota Grande */}
              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0 min-w-[160px]">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Nota Final
                </p>
                <p className="text-4xl font-black tracking-tight mt-1 text-white">
                  {tentativaConcluida.notaFinal.toFixed(1)}
                  <span className="text-lg font-normal text-slate-400">/10</span>
                </p>
                <p className="text-xs font-bold text-amber-300 mt-1">
                  {tentativaConcluida.percentualAproveitamento}% de acerto
                </p>
              </div>
            </div>

            {/* Grid de Estatísticas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Total de Questões</p>
                <p className="text-base font-bold">{tentativaConcluida.totalQuestoes}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                <p className="text-[11px] text-emerald-300 uppercase font-semibold">Acertos</p>
                <p className="text-base font-bold text-emerald-400">{tentativaConcluida.totalAcertos}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                <p className="text-[11px] text-rose-300 uppercase font-semibold">Erros</p>
                <p className="text-base font-bold text-rose-400">{tentativaConcluida.totalErros}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 space-y-0.5">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Tempo de Estudo</p>
                <p className="text-base font-bold">{formatTempo(tentativaConcluida.tempoGastoSegundos)}</p>
              </div>
            </div>

            {/* Ações pós-resultado */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={handlePraticarNovamente}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <RotateCcw className="h-4 w-4" /> Praticar Novamente (Nova Tentativa)
              </button>

              {baralhoVinculado && (
                <Link
                  href={`/aluno/flashcards/${baralhoVinculado.id}/estudar`}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                >
                  <Layers className="h-4 w-4" /> Estudar Flashcards Deste Tema
                </Link>
              )}

              <Link
                href="/aluno/exercicios"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Voltar à Lista de Exercícios
              </Link>
            </div>
          </div>

          {/* Revisão Questão por Questão com Explicações Pedagógicas */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Gabarito e Revisão Detalhada
              </h2>
              <p className="text-xs text-slate-500">
                Compare suas respostas com o gabarito oficial e leia as explicações de cada questão.
              </p>
            </div>

            <div className="space-y-6">
              {tentativaConcluida.questoesSnapshot?.map((q, idx) => {
                const respAluno = tentativaConcluida.respostas?.find(
                  (r) => r.questaoId === q.id
                );
                const acertou = Boolean(respAluno?.correta);

                return (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        <span className="text-purple-600 mr-2">{idx + 1}.</span>
                        {q.enunciado}
                      </p>
                      {acertou ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Acertou (+{q.pontos} pts)
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 flex items-center gap-1.5 shrink-0">
                          <XCircle className="h-4 w-4 text-rose-600" /> Errou (0 pts)
                        </span>
                      )}
                    </div>

                    {/* Grade das 4 alternativas com indicação visual */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.alternativas?.map((alt, aIdx) => {
                        const letter = ["A", "B", "C", "D"][aIdx] || String(aIdx + 1);
                        const isSelected = respAluno?.alternativaEscolhidaId === alt.id;
                        const isRight = alt.id === q.alternativaCorretaId;

                        let style = "border-slate-200 bg-white text-slate-700";

                        if (isRight) {
                          style =
                            "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20";
                        } else if (isSelected && !isRight) {
                          style =
                            "border-rose-400 bg-rose-50 text-rose-950 line-through ring-1 ring-rose-400";
                        }

                        return (
                          <div
                            key={alt.id || aIdx}
                            className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 ${style}`}
                          >
                            <span className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {letter}
                            </span>
                            <span className="flex-1">{alt.texto}</span>
                            {isRight && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                            {isSelected && !isRight && (
                              <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explicação Pedagógica */}
                    {q.explicacao && (
                      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5 mt-2">
                        <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Por que esta é a resposta correta: </span>
                          {q.explicacao}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* TELA DE EXECUÇÃO DO EXERCÍCIO (Tentativa Ativa) */
        <div className="space-y-6">
          {/* Cabeçalho do Exercício */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                {exercicio.nivel}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                {exercicio.tipo === "leitura_audio" ? (
                  <>
                    <Headphones className="h-3.5 w-3.5" /> Leitura & Compreensão com Áudio
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3.5 w-3.5" /> Múltipla Escolha Pura
                  </>
                )}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {exercicio.categoria}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {exercicio.titulo}
            </h1>

            {exercicio.descricao && (
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {exercicio.descricao}
              </p>
            )}

            {exercicio.instrucoes && (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/70 text-xs text-purple-900">
                <span className="font-bold">Instruções: </span>
                {exercicio.instrucoes}
              </div>
            )}
          </div>

          {/* Player de Áudio Nativo Interativo (se houver áudio e tipo leitura_audio) */}
          {exercicio.tipo === "leitura_audio" && exercicio.audioUrl && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="h-11 w-11 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shrink-0"
                    title={isPlaying ? "Pausar áudio" : "Tocar narração em áudio"}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={restartAudio}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Recomeçar áudio do início"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                        Narração em Inglês
                      </p>
                      {exercicio.audioIsIa && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[10px] font-semibold flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-purple-300" />
                          Narração de Voz com IA
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                      {exercicio.audioNome || "Audio Narration"}
                    </p>
                  </div>
                </div>

                {/* Controles de Volume e Loop */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                      isLooping ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Repetir áudio automaticamente"
                  >
                    <Repeat className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-slate-400 hover:text-white"
                    >
                      {isMuted || audioVolume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : audioVolume}
                      onChange={handleVolumeChange}
                      className="w-16 accent-purple-500 h-1.5 cursor-pointer bg-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Barra de Progresso do Áudio */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 100}
                  step="0.1"
                  value={audioCurrentTime}
                  onChange={handleAudioSeek}
                  className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatTempo(audioCurrentTime)}</span>
                  <span>{formatTempo(audioDuration)}</span>
                </div>
              </div>

              {/* Elemento de áudio oculto */}
              <audio
                ref={audioRef}
                src={exercicio.audioUrl}
                loop={isLooping}
                onTimeUpdate={handleAudioTimeUpdate}
                onLoadedMetadata={handleAudioLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Texto de Leitura (Para Leitura & Áudio) */}
          {exercicio.tipo === "leitura_audio" && exercicio.textoConteudo && (
            <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <span>Reading Passage • Texto em Inglês</span>
              </div>

              <div className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed space-y-4 font-normal">
                {exercicio.textoConteudo.split("\n\n").map((paragrafo, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {paragrafo}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Bloco de Questões Interativas */}
          <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Questões ({totalQuestoes})
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione uma alternativa por questão. O gabarito e a nota serão calculados ao finalizar.
                </p>
              </div>

              {/* Seletor Rápido de Questões */}
              <div className="flex items-center gap-1.5">
                {questoes.map((q, idx) => {
                  const isAnswered = Boolean(respostas[q.id]);
                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setQuestaoAtualIndex(idx)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                        questaoAtualIndex === idx
                          ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30"
                          : isAnswered
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title={`Questão ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Questão Ativa Exibida */}
            {questaoAtual && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    <span className="text-purple-600 font-black mr-2">
                      {questaoAtualIndex + 1}.
                    </span>
                    {questaoAtual.enunciado}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 shrink-0">
                    {questaoAtual.pontos} pontos
                  </span>
                </div>

                {/* 4 Alternativas (A, B, C, D) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {questaoAtual.alternativas?.map((alt, aIdx) => {
                    const letter = ["A", "B", "C", "D"][aIdx] || String(aIdx + 1);
                    const isSelected = respostas[questaoAtual.id] === alt.id;

                    return (
                      <button
                        key={alt.id || aIdx}
                        type="button"
                        onClick={() => handleSelectAlternativa(questaoAtual.id, alt.id)}
                        className={`p-4 rounded-2xl border text-left text-xs sm:text-sm flex items-center gap-3 transition-all ${
                          isSelected
                            ? "border-purple-600 bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-600/20 shadow-sm"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`h-7 w-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : "bg-slate-100 border border-slate-300 text-slate-600"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{alt.texto}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Botões de Navegação entre Questões */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setQuestaoAtualIndex((prev) => Math.max(0, prev - 1))}
                    disabled={questaoAtualIndex === 0}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>

                  {questaoAtualIndex < totalQuestoes - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestaoAtualIndex((prev) => Math.min(totalQuestoes - 1, prev + 1))
                      }
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5"
                    >
                      Próxima <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinalizar}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {submitting ? "Corrigindo..." : "Finalizar e Ver Resultado"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Barra Flutuante de Finalização Rápida no Fim */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-800">{respondidasCount}</span> de{" "}
              <span className="font-bold text-slate-800">{totalQuestoes}</span> questões
              respondidas
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Corrigindo..." : "Finalizar Exercício"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
