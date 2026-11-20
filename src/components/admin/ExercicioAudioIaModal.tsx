"use client";

import React, { useState } from "react";
import {
  Headphones,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
  ShieldCheck,
} from "lucide-react";
import { AudioIaResultado } from "@/lib/ai/ttsService";

interface ExercicioAudioIaModalProps {
  isOpen: boolean;
  onClose: () => void;
  textoConteudo: string;
  tituloExercicio?: string;
  onAudioSynthesized: (resultado: AudioIaResultado) => void;
}

export function ExercicioAudioIaModal({
  isOpen,
  onClose,
  textoConteudo,
  tituloExercicio,
  onAudioSynthesized,
}: ExercicioAudioIaModalProps) {
  const [vozGenero, setVozGenero] = useState<"feminina" | "masculina">("feminina");
  const [sotaque, setSotaque] = useState<"american" | "british">("american");
  const [velocidade, setVelocidade] = useState<number>(1.0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultadoPreview, setResultadoPreview] = useState<AudioIaResultado | null>(null);

  // Player local para prévia antes de vincular
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const palavrasCount = textoConteudo.trim().split(/\s+/).filter(Boolean).length;
  const tempoEstimadoSegundos = Math.max(5, Math.round(palavrasCount / (2.33 * velocidade)));

  const handleSynthesize = async () => {
    if (!textoConteudo || textoConteudo.trim().length < 10) {
      setError("O texto de leitura é muito curto para gerar áudio. Digite pelo menos 10 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultadoPreview(null);
    setIsPlaying(false);

    try {
      const res = await fetch("/api/admin/exercicios/gerar-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: textoConteudo,
          vozGenero,
          sotaque,
          velocidade,
          tituloExercicio,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha na síntese de narração por IA.");
      }

      setResultadoPreview(data.data);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Erro inesperado ao sintetizar voz.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!resultadoPreview) return;
    onAudioSynthesized(resultadoPreview);
    onClose();
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Narração de Voz com IA
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                  TTS Oficial
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Síntese oficial a partir do texto exato aprovado pelo professor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Aviso de Configuração de Voz</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Regra de Ouro: Fidelidade Estrita */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Regra Central de Fidelidade</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                O áudio gerado corresponde <strong>estritamente</strong> ao texto abaixo. Caso o texto
                seja editado posteriormente, o áudio será marcado como <em>Desatualizado</em> para
                evitar divergências pedagógicas.
              </p>
            </div>
          </div>

          {/* Prévia do Texto Oficial */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Texto Oficial de Narração
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {palavrasCount} palavras • ~{tempoEstimadoSegundos}s estimados
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-serif leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-none">
              {textoConteudo ? (
                textoConteudo
              ) : (
                <span className="text-slate-400 italic">
                  Nenhum texto preenchido no formulário. Preencha o texto de leitura antes de gerar o
                  áudio.
                </span>
              )}
            </div>
          </div>

          {/* Configuração de Voz e Sotaque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Gênero da Voz
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setVozGenero("feminina")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                    vozGenero === "feminina"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Feminina
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setVozGenero("masculina")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                    vozGenero === "masculina"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Masculina
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sotaque / Variante
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setSotaque("american")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                    sotaque === "american"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  🇺🇸 Americano
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setSotaque("british")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                    sotaque === "british"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  🇬🇧 Britânico
                </button>
              </div>
            </div>
          </div>

          {/* Velocidade de Narração */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Velocidade de Fala
              </label>
              <span className="text-xs font-bold text-purple-700">{velocidade.toFixed(2)}x</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0.9, label: "0.90x", desc: "Pausada (A1/A2)" },
                { val: 1.0, label: "1.00x", desc: "Normal (B1/B2)" },
                { val: 1.1, label: "1.10x", desc: "Fluente (C1/C2)" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  disabled={loading}
                  onClick={() => setVelocidade(opt.val)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    velocidade === opt.val
                      ? "border-purple-600 bg-purple-50 text-purple-800 ring-1 ring-purple-600"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Player de Prévia do Áudio Gerado */}
          {resultadoPreview && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">
                    Narração Sintetizada com Sucesso!
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {resultadoPreview.audioProvedor.toUpperCase()} • {resultadoPreview.audioVozNome}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow shrink-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <div className="flex-1 truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {resultadoPreview.audioNome}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Duração: ~{resultadoPreview.audioDuracaoSegundos}s • Hash:{" "}
                    {resultadoPreview.audioTextoHash.slice(0, 10)}...
                  </p>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={resultadoPreview.audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="p-5 sm:p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={loading || !textoConteudo || textoConteudo.length < 10}
              onClick={handleSynthesize}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sintetizando Voz...
                </>
              ) : (
                <>
                  <Headphones className="h-4 w-4" />
                  {resultadoPreview ? "Regerar Narração" : "Sintetizar Narração"}
                </>
              )}
            </button>

            {resultadoPreview && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                Vincular ao Exercício
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
