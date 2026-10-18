"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Cartao,
  CartaoProgressoAluno,
  RespostaSRS,
} from "@/types";
import { estimarProximosIntervalos } from "@/data/srsAlgorithm";
import { BadgeEstadoAprendizagem } from "@/components/common/FlashcardBadges";
import {
  Lightbulb,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCw,
  Sparkles,
} from "lucide-react";

interface FlashcardStudyCardProps {
  cartao: Cartao;
  progresso: CartaoProgressoAluno;
  indiceAtual: number;
  totalNaFila: number;
  baralhoNome?: string;
  onResponder: (resposta: RespostaSRS) => void;
}

export function FlashcardStudyCard({
  cartao,
  progresso,
  indiceAtual,
  totalNaFila,
  onResponder,
}: FlashcardStudyCardProps) {
  const [revelado, setRevelado] = useState(false);
  const [mostrarDica, setMostrarDica] = useState(false);
  const [estimativas, setEstimativas] = useState<
    Record<RespostaSRS, { texto: string; dias: number; minutos?: number }>
  >(() => estimarProximosIntervalos(progresso));

  // Reseta estado ao mudar de cartão
  useEffect(() => {
    setRevelado(false);
    setMostrarDica(false);
    setEstimativas(estimarProximosIntervalos(progresso));
  }, [cartao.id, progresso]);

  const handleRevelar = useCallback(() => {
    if (!revelado) {
      setRevelado(true);
    }
  }, [revelado]);

  const handleResponder = useCallback(
    (resposta: RespostaSRS) => {
      if (!revelado) return; // Bloqueado até virar o cartão
      onResponder(resposta);
    },
    [revelado, onResponder]
  );

  // Atalhos de teclado: Espaço para virar, 1-4 para responder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (!revelado) {
          handleRevelar();
        }
      } else if (revelado) {
        if (e.key === "1") {
          e.preventDefault();
          handleResponder("errei");
        } else if (e.key === "2") {
          e.preventDefault();
          handleResponder("dificil");
        } else if (e.key === "3") {
          e.preventDefault();
          handleResponder("bom");
        } else if (e.key === "4") {
          e.preventDefault();
          handleResponder("facil");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revelado, handleRevelar, handleResponder]);

  const temAudioReal =
    cartao.linkAudio &&
    cartao.linkAudio.trim().startsWith("https://");

  const percentualProgresso = Math.min(
    100,
    Math.round(((indiceAtual + 1) / Math.max(1, totalNaFila)) * 100)
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Barra de Progresso Superior */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
          <span>
            Cartão {indiceAtual + 1} de {totalNaFila}
          </span>
          <div className="flex items-center gap-2">
            <BadgeEstadoAprendizagem estado={progresso.estado} />
            <span className="text-gray-400">|</span>
            <span className="font-semibold text-indigo-600">{percentualProgresso}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${percentualProgresso}%` }}
          />
        </div>
      </div>

      {/* Cartão Interativo Principal */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden min-h-[380px] flex flex-col justify-between transition-all">
        {/* Cabeçalho do Cartão */}
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
              {revelado ? "Verso & Significado" : "Frente do Cartão"}
            </span>
            {cartao.tags && cartao.tags.length > 0 && (
              <span className="text-xs text-gray-400">
                #{cartao.tags[0]}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Botão de Dica */}
            {cartao.dica && (
              <button
                type="button"
                onClick={() => setMostrarDica(!mostrarDica)}
                className={`p-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  mostrarDica
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                }`}
                title="Dica pedagógica"
                aria-label="Alternar dica"
              >
                <Lightbulb className="w-4 h-4" />
                <span>Dica</span>
              </button>
            )}

            {/* Áudio Real (HTTPS) */}
            {temAudioReal ? (
              <a
                href={cartao.linkAudio}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Ouvir áudio externo de referência (abre em nova aba)"
                aria-label="Ouvir pronúncia"
              >
                <Volume2 className="w-4 h-4" />
                <span>Áudio</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ) : (
              <span
                className="p-2 text-gray-300 rounded-xl text-xs flex items-center gap-1"
                title="Áudio ainda não disponibilizado para este cartão"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* Dica Aberta */}
        {mostrarDica && cartao.dica && (
          <div className="mx-6 mt-4 p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5 animate-fade-in">
            <Lightbulb className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="font-semibold">Dica Pedagógica:</strong> {cartao.dica}
            </div>
          </div>
        )}

        {/* Conteúdo Central */}
        <div className="p-8 flex-1 flex flex-col justify-center items-center text-center space-y-6">
          {/* Frente */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              Pergunta / Expressão
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              {cartao.frente}
            </h2>
          </div>

          {/* Verso Revelado */}
          {revelado ? (
            <div className="w-full pt-6 border-t border-gray-100 space-y-5 animate-fade-in">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">
                  Significado / Resposta
                </span>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {cartao.verso}
                </p>
              </div>

              {/* Guia de Pronúncia / Fonética */}
              {cartao.pronuncia && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Pronúncia: {cartao.pronuncia}</span>
                </div>
              )}

              {/* Exemplo Contextualizado */}
              {cartao.exemplo && (
                <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-100 space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Exemplo Prático
                  </span>
                  <p className="text-sm font-semibold text-gray-800 italic">
                    &ldquo;{cartao.exemplo}&rdquo;
                  </p>
                  {cartao.traducao && (
                    <p className="text-xs text-gray-500">
                      {cartao.traducao}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <span>Tente lembrar da resposta antes de virar</span>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-6 bg-gray-50/70 border-t border-gray-100">
          {!revelado ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleRevelar}
                className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
              >
                <RotateCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Mostrar Resposta</span>
                <span className="text-xs bg-indigo-500/80 px-2 py-0.5 rounded-md font-mono ml-2">
                  Espaço
                </span>
              </button>
              <p className="text-center text-[11px] text-gray-400">
                Os botões de repetição espaçada serão liberados após a revelação da resposta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Como foi lembrar desta resposta?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. ERREI */}
                <button
                  type="button"
                  onClick={() => handleResponder("errei")}
                  className="p-3 rounded-2xl bg-white border-2 border-rose-200 hover:bg-rose-50 hover:border-rose-400 text-rose-700 font-semibold transition-all shadow-sm flex flex-col items-center justify-center text-center group active:scale-95"
                >
                  <span className="text-xs font-bold text-rose-600">1. Errei</span>
                  <span className="text-[11px] text-rose-500 font-normal">
                    {estimativas.errei.texto}
                  </span>
                  <span className="text-[10px] text-rose-400 mt-1 font-mono group-hover:underline">
                    Tecla 1
                  </span>
                </button>

                {/* 2. DIFÍCIL */}
                <button
                  type="button"
                  onClick={() => handleResponder("dificil")}
                  className="p-3 rounded-2xl bg-white border-2 border-amber-200 hover:bg-amber-50 hover:border-amber-400 text-amber-700 font-semibold transition-all shadow-sm flex flex-col items-center justify-center text-center group active:scale-95"
                >
                  <span className="text-xs font-bold text-amber-600">2. Difícil</span>
                  <span className="text-[11px] text-amber-500 font-normal">
                    {estimativas.dificil.texto}
                  </span>
                  <span className="text-[10px] text-amber-400 mt-1 font-mono group-hover:underline">
                    Tecla 2
                  </span>
                </button>

                {/* 3. BOM */}
                <button
                  type="button"
                  onClick={() => handleResponder("bom")}
                  className="p-3 rounded-2xl bg-white border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 text-emerald-700 font-semibold transition-all shadow-sm flex flex-col items-center justify-center text-center group active:scale-95"
                >
                  <span className="text-xs font-bold text-emerald-600">3. Bom</span>
                  <span className="text-[11px] text-emerald-500 font-normal">
                    {estimativas.bom.texto}
                  </span>
                  <span className="text-[10px] text-emerald-400 mt-1 font-mono group-hover:underline">
                    Tecla 3
                  </span>
                </button>

                {/* 4. FÁCIL */}
                <button
                  type="button"
                  onClick={() => handleResponder("facil")}
                  className="p-3 rounded-2xl bg-white border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-700 font-semibold transition-all shadow-sm flex flex-col items-center justify-center text-center group active:scale-95"
                >
                  <span className="text-xs font-bold text-blue-600">4. Fácil</span>
                  <span className="text-[11px] text-blue-500 font-normal">
                    {estimativas.facil.texto}
                  </span>
                  <span className="text-[10px] text-blue-400 mt-1 font-mono group-hover:underline">
                    Tecla 4
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
