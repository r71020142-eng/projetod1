"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Headphones,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { ExercicioInterativo } from "@/types";

interface ExercicioPreviewModalProps {
  exercicio: ExercicioInterativo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExercicioPreviewModal({
  exercicio,
  isOpen,
  onClose,
}: ExercicioPreviewModalProps) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [verificado, setVerificado] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!isOpen || !exercicio) return null;

  const handleSelect = (questaoId: string, altId: string) => {
    if (verificado) return;
    setRespostas((prev) => ({ ...prev, [questaoId]: altId }));
  };

  const handleVerificar = () => {
    setVerificado(true);
  };

  const handleReset = () => {
    setRespostas({});
    setVerificado(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const totalQuestoes = exercicio.questoes?.length || 0;
  const acertos = verificado
    ? exercicio.questoes.filter(
        (q) => respostas[q.id] === q.alternativaCorretaId
      ).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              {exercicio.tipo === "leitura_audio" ? (
                <Headphones className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {exercicio.nivel}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {exercicio.categoria}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Prévia do Aluno
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {exercicio.titulo}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Instruções */}
          {exercicio.instrucoes && (
            <div className="p-3.5 bg-purple-50/60 border border-purple-200/60 rounded-xl text-xs sm:text-sm text-purple-900">
              <span className="font-bold">Instruções: </span>
              {exercicio.instrucoes}
            </div>
          )}

          {/* Área de Leitura & Áudio (se aplicável) */}
          {exercicio.tipo === "leitura_audio" && (
            <div className="space-y-4">
              {/* Player de Áudio */}
              {exercicio.audioUrl && (
                <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </button>
                    <div>
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Narração em Áudio
                      </p>
                      <p className="text-sm font-medium text-white truncate max-w-xs">
                        {exercicio.audioNome || "Audio Narration.mp3"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-xs">
                      {exercicio.audioDuracaoSegundos
                        ? `${Math.floor(exercicio.audioDuracaoSegundos / 60)}:${String(
                            exercicio.audioDuracaoSegundos % 60
                          ).padStart(2, "0")}`
                        : "Áudio nativo"}
                    </span>
                  </div>
                  <audio
                    ref={audioRef}
                    src={exercicio.audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}

              {/* Texto de Leitura */}
              {exercicio.textoConteudo && (
                <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Reading Passage
                  </h3>
                  <div className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed space-y-3 font-normal">
                    {exercicio.textoConteudo.split("\n\n").map((paragrafo, idx) => (
                      <p key={idx} className="leading-relaxed">
                        {paragrafo}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bloco de Questões com 4 Alternativas */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Questões ({totalQuestoes})
              </h3>
              {verificado && (
                <div className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                  Pontuação: {acertos} de {totalQuestoes} (
                  {Math.round((acertos / totalQuestoes) * 100)}%)
                </div>
              )}
            </div>

            {exercicio.questoes?.map((q, qIndex) => {
              const respEscolhida = respostas[q.id];

              return (
                <div
                  key={q.id || qIndex}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm sm:text-base font-semibold text-slate-900">
                      <span className="text-purple-600 font-bold mr-1.5">
                        {qIndex + 1}.
                      </span>
                      {q.enunciado}
                    </p>
                    <span className="text-xs font-medium text-slate-400 shrink-0">
                      {q.pontos} pts
                    </span>
                  </div>

                  {/* 4 Alternativas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.alternativas?.map((alt, aIdx) => {
                      const letter = ["A", "B", "C", "D"][aIdx] || String(aIdx + 1);
                      const isSelected = respEscolhida === alt.id;
                      const isRightAnswer = alt.id === q.alternativaCorretaId;

                      let style =
                        "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700";

                      if (isSelected) {
                        style = "border-purple-600 bg-purple-50 text-purple-900 font-medium";
                      }

                      if (verificado) {
                        if (isRightAnswer) {
                          style =
                            "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500";
                        } else if (isSelected && !isRightAnswer) {
                          style =
                            "border-rose-500 bg-rose-50 text-rose-900 line-through ring-1 ring-rose-500";
                        }
                      }

                      return (
                        <button
                          key={alt.id || aIdx}
                          type="button"
                          disabled={verificado}
                          onClick={() => handleSelect(q.id, alt.id)}
                          className={`p-3 rounded-xl border text-left text-xs sm:text-sm flex items-center gap-2.5 transition-all ${style}`}
                        >
                          <span className="h-6 w-6 rounded-lg bg-white border border-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {letter}
                          </span>
                          <span className="flex-1">{alt.texto}</span>
                          {verificado && isRightAnswer && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                          {verificado && isSelected && !isRightAnswer && (
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explicação pedagógica quando verificado */}
                  {verificado && q.explicacao && (
                    <div className="mt-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Explicação Pedagógica: </span>
                        {q.explicacao}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {Object.keys(respostas).length} de {totalQuestoes} respondidas
          </div>
          <div className="flex items-center gap-2">
            {verificado ? (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Tentar Novamente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerificar}
                disabled={Object.keys(respostas).length === 0}
                className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Verificar Respostas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
