"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { NivelMaterial, ExercicioInterativo } from "@/types";

interface ExercicioIaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dadosGerados: {
    titulo: string;
    descricao: string;
    instrucoes: string;
    categoria: string;
    textoConteudo: string;
    questoes: ExercicioInterativo["questoes"];
    nivel: NivelMaterial;
    tipoConteudo: string;
    varianteIngles: "american" | "british";
    autoTriggerAudio?: boolean;
  }) => void;
  initialNivel?: NivelMaterial;
}

const TEMAS_SUGERIDOS = [
  "A Weekend Exploring Edinburgh Castle",
  "Job Interview at an International Startup",
  "Ordering Dinner at an Italian Bistro",
  "Morning Commute & Coffee Shop in London",
  "The Future of Renewable Energy & Electric Cars",
  "Booking a Boutique Hotel in San Francisco",
];

export function ExercicioIaModal({
  isOpen,
  onClose,
  onSuccess,
  initialNivel = "B1",
}: ExercicioIaModalProps) {
  const [tema, setTema] = useState("");
  const [nivel, setNivel] = useState<NivelMaterial>(initialNivel);
  const [tipoConteudo, setTipoConteudo] = useState<
    "historia" | "cotidiano" | "dialogo" | "informativo"
  >("cotidiano");
  const [extensao, setExtensao] = useState<"curto" | "medio" | "longo">("medio");
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState<number>(4);
  const [varianteIngles, setVarianteIngles] = useState<"american" | "british">("american");
  const [autoTriggerAudio, setAutoTriggerAudio] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) {
      setError("Por favor, digite ou selecione um tema para o exercício.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep("Conectando ao modelo pedagógico de IA...");

    const stepTimer1 = setTimeout(() => {
      setLoadingStep("Elaborando texto fluente e vocabulário no nível CEFR...");
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep("Formulando 4 alternativas por questão e gabarito com explicação...");
    }, 3500);

    const stepTimer3 = setTimeout(() => {
      setLoadingStep("Validando conformidade pedagógica do Método Paulo...");
    }, 5500);

    try {
      const res = await fetch("/api/admin/exercicios/gerar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: tema.trim(),
          nivel,
          tipoConteudo,
          extensao,
          quantidadeQuestoes,
          varianteIngles,
          tipoExercicio: "leitura_audio",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar exercício com inteligência artificial.");
      }

      const generated = data.data;

      onSuccess({
        titulo: generated.titulo,
        descricao: generated.descricao,
        instrucoes: generated.instrucoes,
        categoria: generated.categoria || "Reading & Listening",
        textoConteudo: generated.textoConteudo,
        questoes: generated.questoes,
        nivel,
        tipoConteudo,
        varianteIngles,
        autoTriggerAudio,
      });

      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Erro inesperado ao gerar exercício.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Gerar Exercício com IA
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                  Método Paulo
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie automaticamente texto pedagógico e questões com 4 alternativas para revisão manual
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

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Aviso de Configuração</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* 1. Tema ou Assunto */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tema ou Assunto do Exercício *
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Morning routine in New York, Business meeting etiquette, Travel..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50"
            />
            {/* Pílulas de sugestão rápida */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium py-0.5">Sugestões:</span>
              {TEMAS_SUGERIDOS.slice(0, 4).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  disabled={loading}
                  onClick={() => setTema(sug)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-[11px] font-medium text-slate-600 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Grid de Nível CEFR e Quantidade de Questões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Nível CEFR *
              </label>
              <select
                disabled={loading}
                value={nivel}
                onChange={(e) => setNivel(e.target.value as NivelMaterial)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="A1">A1 • Iniciante (Beginner)</option>
                <option value="A2">A2 • Básico (Elementary)</option>
                <option value="B1">B1 • Intermediário (Intermediate)</option>
                <option value="B2">B2 • Independente (Upper Intermediate)</option>
                <option value="C1">C1 • Avançado (Advanced)</option>
                <option value="C2">C2 • Fluente / Proficiente (Proficient)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quantidade de Questões
              </label>
              <select
                disabled={loading}
                value={quantidadeQuestoes}
                onChange={(e) => setQuantidadeQuestoes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value={2}>2 questões (5.0 pontos cada)</option>
                <option value={3}>3 questões (3.33 pontos cada)</option>
                <option value={4}>4 questões (2.5 pontos cada - Padrão Lingua.com)</option>
                <option value={5}>5 questões (2.0 pontos cada)</option>
              </select>
            </div>
          </div>

          {/* 3. Tipo de Conteúdo e Variante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Tipo de Conteúdo
              </label>
              <select
                disabled={loading}
                value={tipoConteudo}
                onChange={(e) =>
                  setTipoConteudo(
                    e.target.value as "historia" | "cotidiano" | "dialogo" | "informativo"
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="cotidiano">Cotidiano, Hábitos e Viagens</option>
                <option value="historia">História / Narrativa Envolvente</option>
                <option value="dialogo">Diálogo entre Personagens</option>
                <option value="informativo">Artigo Informativo / Cultural</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Variante do Inglês
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setVarianteIngles("american")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    varianteIngles === "american"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  🇺🇸 Americano
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setVarianteIngles("british")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    varianteIngles === "british"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  🇬🇧 Britânico
                </button>
              </div>
            </div>
          </div>

          {/* 4. Extensão do Texto */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Extensão da Leitura
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "curto", label: "Curto", desc: "120-160 palavras (~2 parágrafos)" },
                { id: "medio", label: "Médio", desc: "200-280 palavras (~3 parágrafos)" },
                { id: "longo", label: "Longo", desc: "320-420 palavras (~4 parágrafos)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setExtensao(opt.id as "curto" | "medio" | "longo")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    extensao === opt.id
                      ? "border-purple-600 bg-purple-50/60 ring-1 ring-purple-600"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Opção de Narração em Áudio Integrada */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start gap-3">
            <input
              type="checkbox"
              id="chk-auto-audio"
              checked={autoTriggerAudio}
              onChange={(e) => setAutoTriggerAudio(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="chk-auto-audio" className="text-xs text-purple-950 cursor-pointer">
              <span className="font-bold block">Abrir sintetizador de voz após gerar o texto</span>
              <span className="text-purple-700 text-[11px] block mt-0.5">
                Permite aprovar o texto e gerar a narração de voz oficial correspondente de imediato.
              </span>
            </label>
          </div>

          {/* Feedback de Progresso */}
          {loading && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-3 animate-pulse">
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-900">{loadingStep}</p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Isso leva cerca de 4 a 8 segundos para garantir alta precisão pedagógica.
                </p>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-transform active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Conteúdo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
