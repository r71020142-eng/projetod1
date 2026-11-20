"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  AlertCircle,
  Loader2,
  BookOpen,
  Headphones,
  RotateCcw,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { NivelMaterial, ExercicioInterativo, TipoExercicioInterativo } from "@/types";

interface ExercicioIaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dadosGerados: {
    titulo: string;
    descricao: string;
    instrucoes: string;
    categoria: string;
    tipoExercicio: TipoExercicioInterativo;
    textoConteudo: string;
    questoes: ExercicioInterativo["questoes"];
    nivel: NivelMaterial;
    tipoConteudo: string;
    varianteIngles: "american" | "british";
  }) => void;
  initialNivel?: NivelMaterial;
  initialTipo?: TipoExercicioInterativo;
}

interface ErrorDetails {
  message: string;
  code?: string;
  actionUrl?: string;
  actionLabel?: string;
}

const TEMAS_SUGERIDOS_LEITURA = [
  "My Daily Routine in London",
  "Job Interview at an International Startup",
  "A Weekend Exploring Edinburgh Castle",
  "Ordering Dinner at an Italian Bistro",
  "The Future of Renewable Energy & Electric Cars",
];

const TEMAS_SUGERIDOS_MULTIPLA = [
  "Essential Prepositions of Place & Movement (at, on, in)",
  "Past Simple vs Present Perfect in Daily Conversations",
  "Business Email Vocabulary & Polite Requests",
  "Common Phrasal Verbs for Travel & Transit",
  "Conditionals (First & Second Conditional) Usage",
];

export function ExercicioIaModal({
  isOpen,
  onClose,
  onSuccess,
  initialNivel = "B1",
  initialTipo = "leitura_audio",
}: ExercicioIaModalProps) {
  const [tipoExercicio, setTipoExercicio] = useState<TipoExercicioInterativo>(initialTipo);
  const [tema, setTema] = useState("");
  const [nivel, setNivel] = useState<NivelMaterial>(initialNivel);
  const [tipoConteudo, setTipoConteudo] = useState<
    "historia" | "cotidiano" | "dialogo" | "informativo"
  >("cotidiano");
  const [extensao, setExtensao] = useState<"curto" | "medio" | "longo">("medio");
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState<number>(4);
  const [varianteIngles, setVarianteIngles] = useState<"american" | "british">("american");

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!tema.trim() || tema.trim().length < 3) {
      setErrorDetails({
        message: "Por favor, digite ou selecione um tema para o exercício (mínimo 3 caracteres).",
      });
      return;
    }

    setLoading(true);
    setErrorDetails(null);
    setLoadingStep("Conectando à API da OpenAI (gpt-4o-mini)...");

    const stepTimer1 = setTimeout(() => {
      setLoadingStep(
        tipoExercicio === "leitura_audio"
          ? "Elaborando texto fluente e vocabulário no nível CEFR..."
          : "Elaborando questões gramaticais e de vocabulário no nível CEFR..."
      );
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep("Formulando 4 alternativas por questão e gabarito com explicação pedagógica...");
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
          tipoExercicio,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw {
          message: data?.error || `Falha ao gerar exercício com a OpenAI (Status ${res.status}).`,
          code: data?.code || `HTTP_${res.status}`,
          actionUrl: data?.actionUrl,
          actionLabel: data?.actionLabel,
        };
      }

      const generated = data.data;

      onSuccess({
        titulo: generated.titulo,
        descricao: generated.descricao,
        instrucoes: generated.instrucoes,
        categoria: generated.categoria || (tipoExercicio === "leitura_audio" ? "Reading & Listening" : "Gramática Aplicada"),
        tipoExercicio,
        textoConteudo: generated.textoConteudo || "",
        questoes: generated.questoes,
        nivel,
        tipoConteudo,
        varianteIngles,
      });

      onClose();
    } catch (err: unknown) {
      const e = err as ErrorDetails;
      setErrorDetails({
        message: e.message || "Erro inesperado ao gerar exercício com inteligência artificial.",
        code: e.code,
        actionUrl: e.actionUrl,
        actionLabel: e.actionLabel,
      });
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setLoading(false);
      setLoadingStep("");
    }
  };

  const sugestoesAtuais =
    tipoExercicio === "leitura_audio" ? TEMAS_SUGERIDOS_LEITURA : TEMAS_SUGERIDOS_MULTIPLA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-purple-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Gerar Exercício com IA
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                  OpenAI gpt-4o-mini
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie automaticamente histórias, textos de leitura e questões com 4 alternativas
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

        {/* Corpo com Scroll (sem tag <form> para evitar colisões com o formulário principal) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerta de Erro e Ação Específica (ex: Créditos Esgotados 429) */}
          {errorDetails && (
            <div
              className={`p-4 rounded-xl border flex flex-col gap-3 text-xs sm:text-sm animate-in fade-in ${
                errorDetails.code === "OPENAI_CREDITS_EXHAUSTED"
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {errorDetails.code === "OPENAI_CREDITS_EXHAUSTED" ? (
                  <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {errorDetails.code === "OPENAI_CREDITS_EXHAUSTED"
                      ? "Saldo de Créditos Esgotado na OpenAI (Erro 429)"
                      : errorDetails.code === "OPENAI_INVALID_KEY"
                      ? "Chave da OpenAI Inválida (Erro 401)"
                      : errorDetails.code === "AI_KEYS_NOT_CONFIGURED"
                      ? "Chave da OpenAI Não Configurada"
                      : "Erro na Comunicação com a OpenAI"}
                  </p>
                  <p className="mt-1 leading-relaxed text-xs">{errorDetails.message}</p>
                </div>
              </div>

              {/* Botões de Ação no Erro */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                {errorDetails.actionUrl && (
                  <a
                    href={errorDetails.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {errorDetails.actionLabel || "Acessar Painel da OpenAI ↗"}
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {/* 1. Seleção do Formato Pedagógico */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Formato do Exercício
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setTipoExercicio("leitura_audio")}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  tipoExercicio === "leitura_audio"
                    ? "border-purple-600 bg-purple-50/60 ring-1 ring-purple-600 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/60"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    tipoExercicio === "leitura_audio"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Headphones className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Leitura & Interpretação</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Texto em inglês formatado em parágrafos + questões de interpretação.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setTipoExercicio("multipla_escolha")}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  tipoExercicio === "multipla_escolha"
                    ? "border-purple-600 bg-purple-50/60 ring-1 ring-purple-600 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/60"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    tipoExercicio === "multipla_escolha"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Múltipla Escolha Pura</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Questões rápidas de gramática e vocabulário sem texto longo.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Tema ou Assunto */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tema ou Tópico Gramatical *
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder={
                tipoExercicio === "leitura_audio"
                  ? "Ex: Morning routine in New York, Business meeting, A trip to London..."
                  : "Ex: Preposições de tempo (in, on, at), Simple Past vs Present Perfect..."
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50"
            />
            {/* Pílulas de sugestão rápida */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium py-0.5">Sugestões:</span>
              {sugestoesAtuais.slice(0, 3).map((sug) => (
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

          {/* 3. Grid de Nível CEFR e Quantidade de Questões */}
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

          {/* 4. Tipo de Conteúdo e Variante (se leitura_audio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tipoExercicio === "leitura_audio" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Estilo da Narrativa
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
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Foco do Exercício
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
                  <option value="cotidiano">Uso Prático em Frases</option>
                  <option value="informativo">Gramática Conceitual & Regras</option>
                </select>
              </div>
            )}

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

          {/* 5. Extensão da Leitura (apenas para leitura_audio) */}
          {tipoExercicio === "leitura_audio" && (
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
          )}

          {/* Feedback de Progresso */}
          {loading && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-3 animate-pulse">
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-900">{loadingStep}</p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Processando via Structured Outputs na OpenAI...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé / Ações (sem submit de form) */}
        <div className="p-5 sm:p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
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
                Gerar Exercício Completo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
