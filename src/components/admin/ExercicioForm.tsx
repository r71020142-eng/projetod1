"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  UploadCloud,
  FileAudio,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  MoveUp,
  MoveDown,
  Headphones,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import {
  ExercicioInterativo,
  TipoExercicioInterativo,
  NivelMaterial,
  DestinoTipo,
  QuestaoObjetiva,
  Baralho,
  Turma,
  AudioStatusExercicio,
  AudioProvedorIa,
  IaPromptMetaExercicio,
} from "@/types";
import { exercicioRepository } from "@/data/exercicioRepository";
import { baralhoRepository } from "@/data/baralhoRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { validarQuestaoExercicioInterativo } from "@/data/pedagogicoCalculos";
import { ExercicioPreviewModal } from "./ExercicioPreviewModal";
import { ExercicioIaModal } from "./ExercicioIaModal";
import { ExercicioAudioIaModal } from "./ExercicioAudioIaModal";
import { computeTextHash, checkAudioFidelity } from "@/lib/audioFidelity";
import { AudioIaResultado } from "@/lib/ai/ttsService";

interface ExercicioFormProps {
  initialData?: ExercicioInterativo | null;
  isEditing?: boolean;
}

export function ExercicioForm({ initialData, isEditing = false }: ExercicioFormProps) {
  const router = useRouter();

  // Estados do formulário
  const [tipo, setTipo] = useState<TipoExercicioInterativo>(
    initialData?.tipo || "multipla_escolha"
  );
  const [titulo, setTitulo] = useState(initialData?.titulo || "");
  const [descricao, setDescricao] = useState(initialData?.descricao || "");
  const [instrucoes, setInstrucoes] = useState(
    initialData?.instrucoes ||
      "Selecione a alternativa correta para cada uma das questões apresentadas."
  );
  const [nivel, setNivel] = useState<NivelMaterial>(initialData?.nivel || "A2");
  const [categoria, setCategoria] = useState(initialData?.categoria || "Gramática Aplicada");
  const [textoConteudo, setTextoConteudo] = useState(initialData?.textoConteudo || "");
  const [audioUrl, setAudioUrl] = useState(initialData?.audioUrl || "");
  const [audioNome, setAudioNome] = useState(initialData?.audioNome || "");
  const [audioDuracaoSegundos, setAudioDuracaoSegundos] = useState<number | undefined>(
    initialData?.audioDuracaoSegundos
  );
  const [audioTextoHash, setAudioTextoHash] = useState<string>(
    initialData?.audioTextoHash || ""
  );
  const [audioStatus, setAudioStatus] = useState<AudioStatusExercicio>(
    initialData?.audioStatus || (initialData?.audioUrl ? "sincronizado" : "pendente")
  );
  const [audioProvedor, setAudioProvedor] = useState<AudioProvedorIa | undefined>(
    initialData?.audioProvedor
  );
  const [audioVozId, setAudioVozId] = useState<string>(initialData?.audioVozId || "");
  const [audioVozNome, setAudioVozNome] = useState<string>(initialData?.audioVozNome || "");
  const [audioVelocidade, setAudioVelocidade] = useState<number>(
    initialData?.audioVelocidade || 1.0
  );
  const [audioGeradoEm, setAudioGeradoEm] = useState<string>(
    initialData?.audioGeradoEm || ""
  );
  const [audioIsIa, setAudioIsIa] = useState<boolean>(Boolean(initialData?.audioIsIa));
  const [conteudoGeradoPorIa, setConteudoGeradoPorIa] = useState<boolean>(
    Boolean(initialData?.conteudoGeradoPorIa)
  );
  const [iaPromptMeta, setIaPromptMeta] = useState<IaPromptMetaExercicio | undefined>(
    initialData?.iaPromptMeta
  );

  const [showIaContentModal, setShowIaContentModal] = useState(false);
  const [showIaAudioModal, setShowIaAudioModal] = useState(false);
  const [baralhoVocabularioId, setBaralhoVocabularioId] = useState(
    initialData?.baralhoVocabularioId || ""
  );
  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>(
    initialData?.destinoTipo || "geral"
  );
  const [destinoTurmaId, setDestinoTurmaId] = useState(
    initialData?.destinoTurmaId || ""
  );
  const [status, setStatus] = useState<"rascunho" | "publicado">(
    initialData?.status === "publicado" ? "publicado" : "rascunho"
  );

  // Questões (cada questão tem exatamente 4 alternativas)
  const [questoes, setQuestoes] = useState<QuestaoObjetiva[]>(
    initialData?.questoes || [
      {
        id: "q-1",
        enunciado: "",
        ordem: 1,
        pontos: 2.5,
        alternativaCorretaId: "alt-1-a",
        explicacao: "",
        alternativas: [
          { id: "alt-1-a", texto: "", ordem: 1 },
          { id: "alt-1-b", texto: "", ordem: 2 },
          { id: "alt-1-c", texto: "", ordem: 3 },
          { id: "alt-1-d", texto: "", ordem: 4 },
        ],
      },
    ]
  );

  // Dependências auxiliares
  const [baralhos, setBaralhos] = useState<Baralho[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  // Feedback e Upload
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function loadAux() {
      try {
        const [bList, tList] = await Promise.all([
          baralhoRepository.listar(),
          turmaRepository.listar(),
        ]);
        setBaralhos(bList);
        setTurmas(tList);
      } catch (e) {
        console.error("Erro ao carregar dados auxiliares:", e);
      }
    }
    loadAux();
  }, []);

  // Upload de Áudio reutilizando /api/materiais/upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/materiais/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao enviar arquivo de áudio.");
      }

      setAudioUrl(data.url);
      setAudioNome(file.name);
      setAudioStatus("manual");
      setAudioIsIa(false);
      setAudioTextoHash(computeTextHash(textoConteudo));
    } catch (err: unknown) {
      setUploadError((err as Error)?.message || "Erro no upload do áudio.");
    } finally {
      setUploadingAudio(false);
    }
  };

  // Monitoramento de alterações no texto da leitura para garantia de fidelidade do áudio
  const handleTextoConteudoChange = (novoTexto: string) => {
    setTextoConteudo(novoTexto);
    if (audioUrl) {
      const fidelity = checkAudioFidelity(novoTexto, audioTextoHash, true, audioIsIa);
      setAudioStatus(fidelity.status);
    }
  };

  // Integração de Conteúdo Gerado pela IA
  const handleApplyIaContent = (dados: {
    titulo: string;
    descricao: string;
    instrucoes: string;
    categoria: string;
    tipoExercicio: TipoExercicioInterativo;
    textoConteudo: string;
    questoes: QuestaoObjetiva[];
    nivel: NivelMaterial;
    tipoConteudo: string;
    varianteIngles: "american" | "british";
  }) => {
    setTitulo(dados.titulo);
    setDescricao(dados.descricao);
    setInstrucoes(dados.instrucoes);
    setCategoria(dados.categoria);
    setTipo(dados.tipoExercicio);
    setTextoConteudo(dados.textoConteudo);
    setQuestoes(dados.questoes);
    setNivel(dados.nivel);
    setConteudoGeradoPorIa(true);
    setIaPromptMeta({
      tema: dados.titulo,
      nivel: dados.nivel,
      tipoConteudo: dados.tipoConteudo,
      varianteIngles: dados.varianteIngles,
      geradoEm: new Date().toISOString(),
      modelo: "gpt-4o-mini",
    });

    if (dados.tipoExercicio === "leitura_audio") {
      if (audioUrl) {
        const fidelity = checkAudioFidelity(dados.textoConteudo, audioTextoHash, true, audioIsIa);
        setAudioStatus(fidelity.status);
      } else {
        setAudioStatus("pendente");
      }
    } else {
      setAudioUrl("");
      setAudioNome("");
      setAudioTextoHash("");
      setAudioStatus("pendente");
      setAudioIsIa(false);
    }

    setFormSuccess("✨ Conteúdo gerado com IA carregado para revisão e edição do professor!");
  };

  // Integração de Narração em Áudio Gerada por TTS
  const handleApplyIaAudio = (resultado: AudioIaResultado) => {
    setAudioUrl(resultado.audioUrl);
    setAudioNome(resultado.audioNome);
    setAudioDuracaoSegundos(resultado.audioDuracaoSegundos);
    setAudioTextoHash(resultado.audioTextoHash);
    setAudioStatus("sincronizado");
    setAudioProvedor(resultado.audioProvedor);
    setAudioVozId(resultado.audioVozId);
    setAudioVozNome(resultado.audioVozNome);
    setAudioVelocidade(resultado.audioVelocidade);
    setAudioGeradoEm(resultado.geradoEm);
    setAudioIsIa(true);
    setFormSuccess("🎙️ Narração de voz com IA vinculada com sucesso ao exercício!");
  };

  // Gerenciamento de Questões
  const adicionarQuestao = () => {
    const nextIdx = questoes.length + 1;
    const qId = `q-${Date.now().toString(36)}-${nextIdx}`;
    const nova: QuestaoObjetiva = {
      id: qId,
      enunciado: "",
      ordem: nextIdx,
      pontos: 2.5,
      alternativaCorretaId: `alt-${qId}-a`,
      explicacao: "",
      alternativas: [
        { id: `alt-${qId}-a`, texto: "", ordem: 1 },
        { id: `alt-${qId}-b`, texto: "", ordem: 2 },
        { id: `alt-${qId}-c`, texto: "", ordem: 3 },
        { id: `alt-${qId}-d`, texto: "", ordem: 4 },
      ],
    };
    setQuestoes([...questoes, nova]);
  };

  const removerQuestao = (index: number) => {
    if (questoes.length <= 1) {
      alert("O exercício precisa ter pelo menos uma questão.");
      return;
    }
    const filtered = questoes.filter((_, i) => i !== index);
    // Reajusta ordens
    const reordered = filtered.map((q, i) => ({ ...q, ordem: i + 1 }));
    setQuestoes(reordered);
  };

  const moverQuestao = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questoes.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const clone = [...questoes];
    const temp = clone[index];
    clone[index] = clone[targetIdx];
    clone[targetIdx] = temp;
    setQuestoes(clone.map((q, i) => ({ ...q, ordem: i + 1 })));
  };

  const atualizarEnunciado = (index: number, val: string) => {
    const clone = [...questoes];
    clone[index].enunciado = val;
    setQuestoes(clone);
  };

  const atualizarExplicacao = (index: number, val: string) => {
    const clone = [...questoes];
    clone[index].explicacao = val;
    setQuestoes(clone);
  };

  const atualizarPontos = (index: number, val: number) => {
    const clone = [...questoes];
    clone[index].pontos = val;
    setQuestoes(clone);
  };

  const atualizarAlternativaTexto = (
    qIndex: number,
    altIndex: number,
    val: string
  ) => {
    const clone = [...questoes];
    clone[qIndex].alternativas[altIndex].texto = val;
    setQuestoes(clone);
  };

  const definirAlternativaCorreta = (qIndex: number, altId: string) => {
    const clone = [...questoes];
    clone[qIndex].alternativaCorretaId = altId;
    setQuestoes(clone);
  };

  // Submissão do Exercício
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Validação de cabeçalho
    if (!titulo.trim() || titulo.trim().length < 3) {
      setFormError("Informe um título com no mínimo 3 caracteres.");
      return;
    }

    if (tipo === "leitura_audio" && (!textoConteudo || textoConteudo.trim().length < 20)) {
      setFormError("Para exercícios de Leitura com Áudio, insira o texto em inglês com pelo menos 20 caracteres.");
      return;
    }

    // Validação estrita de cada questão com 4 alternativas
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];
      const val = validarQuestaoExercicioInterativo(q);
      if (!val.isValid) {
        setFormError(`Erro na Questão ${i + 1}: ${val.errors.join("; ")}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Omit<ExercicioInterativo, "id" | "criadoEm" | "atualizadoEm" | "versao"> = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        instrucoes: instrucoes.trim(),
        tipo,
        nivel,
        categoria: categoria.trim() || "Geral",
        textoConteudo: tipo === "leitura_audio" ? textoConteudo.trim() : undefined,
        audioUrl: tipo === "leitura_audio" && audioUrl ? audioUrl : undefined,
        audioNome: tipo === "leitura_audio" && audioNome ? audioNome : undefined,
        audioDuracaoSegundos: tipo === "leitura_audio" && audioDuracaoSegundos ? audioDuracaoSegundos : undefined,
        audioTextoHash: tipo === "leitura_audio" && audioTextoHash ? audioTextoHash : undefined,
        audioStatus: tipo === "leitura_audio" ? audioStatus : undefined,
        audioProvedor: tipo === "leitura_audio" && audioProvedor ? audioProvedor : undefined,
        audioVozId: tipo === "leitura_audio" && audioVozId ? audioVozId : undefined,
        audioVozNome: tipo === "leitura_audio" && audioVozNome ? audioVozNome : undefined,
        audioVelocidade: tipo === "leitura_audio" ? audioVelocidade : undefined,
        audioGeradoEm: tipo === "leitura_audio" && audioGeradoEm ? audioGeradoEm : undefined,
        audioIsIa: tipo === "leitura_audio" ? audioIsIa : false,
        conteudoGeradoPorIa,
        iaPromptMeta,
        questoes,
        baralhoVocabularioId: baralhoVocabularioId || undefined,
        destinoTipo,
        destinoTurmaId: destinoTipo === "turma" ? destinoTurmaId : undefined,
        professorId: initialData?.professorId || "prof-001",
        professorNome: initialData?.professorNome || "Lucas Ferreira",
        status,
        notaMaxima: 10,
        notaMinimaAprovacao: 7.0,
        politicaGabarito: "apos_tentativa",
      };

      let res;
      if (isEditing && initialData?.id) {
        res = await exercicioRepository.atualizar(initialData.id, payload);
      } else {
        res = await exercicioRepository.criar(payload);
      }

      if (!res.success || !res.data) {
        throw new Error(res.error || "Erro ao salvar exercício.");
      }

      setFormSuccess(
        isEditing
          ? "Exercício atualizado com sucesso!"
          : "Exercício cadastrado com sucesso!"
      );

      setTimeout(() => {
        router.push("/admin/exercicios");
      }, 1000);
    } catch (err: unknown) {
      setFormError((err as Error)?.message || "Falha na comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  // Objeto temporário para prévia ao vivo
  const exercicioParaPreview: ExercicioInterativo = {
    id: initialData?.id || "preview-temp",
    titulo: titulo || "Título do Exercício",
    descricao,
    instrucoes,
    tipo,
    nivel,
    categoria,
    textoConteudo,
    audioUrl,
    audioNome,
    audioDuracaoSegundos,
    audioTextoHash,
    audioStatus,
    audioProvedor,
    audioVozId,
    audioVozNome,
    audioVelocidade,
    audioGeradoEm,
    audioIsIa,
    conteudoGeradoPorIa,
    iaPromptMeta,
    questoes,
    baralhoVocabularioId,
    destinoTipo,
    professorId: "prof-001",
    status,
    notaMaxima: 10,
    politicaGabarito: "apos_tentativa",
    versao: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl pb-16">
      {/* Barra de Ações Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/exercicios")}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? "Editar Exercício Interativo" : "Novo Exercício Interativo"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Crie exercícios de múltipla escolha com 4 alternativas ou leitura com áudio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowIaContentModal(true)}
            className="px-4 py-2.5 rounded-xl border border-purple-300 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-purple-600/20"
          >
            <Sparkles className="h-4 w-4" /> ✨ Gerar com IA
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Eye className="h-4 w-4" /> Prévia do Aluno
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-md disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Publicar / Salvar"}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>{formError}</div>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>{formSuccess}</div>
        </div>
      )}

      {/* 1. Escolha do Tipo de Exercício */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
          Tipo de Exercício
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTipo("multipla_escolha")}
            className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
              tipo === "multipla_escolha"
                ? "border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-600"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                tipo === "multipla_escolha"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Múltipla Escolha Pura
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Conjunto de questões rápidas de gramática ou vocabulário com 4 alternativas por questão.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTipo("leitura_audio")}
            className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
              tipo === "leitura_audio"
                ? "border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-600"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                tipo === "leitura_audio"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Leitura & Compreensão com Áudio
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Texto em inglês, narração em áudio opcional e perguntas de interpretação com 4 alternativas.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Dados Gerais */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Informações Gerais
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Título do Exercício *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: My Daily Routine in New York"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Nível CEFR *
            </label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as NivelMaterial)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="A1">A1 • Iniciante</option>
              <option value="A2">A2 • Básico</option>
              <option value="B1">B1 • Intermediário</option>
              <option value="B2">B2 • Independente</option>
              <option value="C1">C1 • Avançado</option>
              <option value="C2">C2 • Fluente / Proficiente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Categoria Pedagógica
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Gramática, Viagens, Negócios"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Vínculo com Flashcards SRS (Opcional)
            </label>
            <select
              value={baralhoVocabularioId}
              onChange={(e) => setBaralhoVocabularioId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">Nenhum baralho vinculado</option>
              {baralhos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome} ({b.nivelRecomendado})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Status de Publicação
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "rascunho" | "publicado")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="publicado">Publicado (Visível aos alunos)</option>
              <option value="rascunho">Rascunho (Apenas professores/admin)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Destinatários *
            </label>
            <select
              value={destinoTipo}
              onChange={(e) => setDestinoTipo(e.target.value as DestinoTipo)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="geral">Geral (Todos os alunos do nível)</option>
              <option value="turma">Turma específica</option>
            </select>
          </div>

          {destinoTipo === "turma" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Selecionar Turma *
              </label>
              <select
                value={destinoTurmaId}
                onChange={(e) => setDestinoTurmaId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Selecione uma turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.nivel})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Descrição Breve
          </label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Pratique leitura sobre rotinas diárias e responda 4 perguntas de interpretação."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Instruções aos Alunos
          </label>
          <textarea
            rows={2}
            value={instrucoes}
            onChange={(e) => setInstrucoes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* 3. Seção Específica para Leitura & Áudio */}
      {tipo === "leitura_audio" && (
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Conteúdo de Leitura e Áudio
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowIaAudioModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 self-start sm:self-auto"
            >
              <Sparkles className="h-3.5 w-3.5" /> 🎙️ Gerar narração com IA
            </button>
          </div>

          {/* Banner de Status de Fidelidade Texto-Áudio */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              audioStatus === "sincronizado"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : audioStatus === "desatualizado"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : audioStatus === "manual"
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {audioStatus === "sincronizado" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : audioStatus === "desatualizado" ? (
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Headphones className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {audioStatus === "sincronizado"
                      ? "🟢 Narração 100% Sincronizada"
                      : audioStatus === "desatualizado"
                      ? "🟡 Narração Desatualizada"
                      : audioStatus === "manual"
                      ? "🔵 Áudio Manual do Professor"
                      : "⚪ Narração Pendente"}
                  </span>
                  {audioIsIa && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                      Voz IA ({audioProvedor || "TTS"})
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {audioStatus === "sincronizado"
                    ? "O áudio cadastrado corresponde fielmente ao texto de leitura aprovado."
                    : audioStatus === "desatualizado"
                    ? "O texto de leitura foi alterado após a gravação deste áudio. Regere a narração para evitar discrepâncias entre o que o aluno lê e ouve."
                    : audioStatus === "manual"
                    ? "Arquivo enviado manualmente via upload ou URL externa."
                    : "Nenhum arquivo de áudio vinculado. O texto pode ser lido sem áudio ou narrado por IA."}
                </p>
              </div>
            </div>

            {audioStatus === "desatualizado" && (
              <button
                type="button"
                onClick={() => setShowIaAudioModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Regerar Narração Agora
              </button>
            )}
          </div>

          {/* Player & Informações de Áudio Atual */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Áudio de Narração do Exercício
            </label>

            {audioUrl ? (
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileAudio className="h-5 w-5 text-purple-600 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {audioNome || "audio_narracao.mp3"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {audioVozNome ? `Voz: ${audioVozNome} • ` : ""}
                        {audioVelocidade ? `Velocidade: ${audioVelocidade}x • ` : ""}
                        {audioDuracaoSegundos ? `~${audioDuracaoSegundos}s • ` : ""}
                        Hash: {audioTextoHash ? `${audioTextoHash.slice(0, 10)}...` : "não calculado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowIaAudioModal(true)}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      Ajustar Voz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioUrl("");
                        setAudioNome("");
                        setAudioTextoHash("");
                        setAudioStatus("pendente");
                        setAudioIsIa(false);
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                {/* Player nativo para verificação do professor */}
                <audio controls src={audioUrl} className="w-full h-8" preload="metadata" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowIaAudioModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
                >
                  <Sparkles className="h-4 w-4" /> Sintetizar com IA
                </button>
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-purple-400 text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto">
                  <UploadCloud className="h-4 w-4 text-purple-600" />
                  {uploadingAudio ? "Enviando arquivo..." : "Upload Manual"}
                  <input
                    type="file"
                    accept="audio/*, .mp3, .wav, .aac, .m4a, .ogg"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400 hidden sm:inline">ou URL:</span>
                <input
                  type="url"
                  placeholder="https://exemplo.com/audio.mp3"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setAudioNome("audio_externo.mp3");
                    setAudioStatus("manual");
                    setAudioTextoHash(computeTextHash(textoConteudo));
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 w-full"
                />
              </div>
            )}

            {uploadError && (
              <p className="text-xs font-medium text-rose-600">{uploadError}</p>
            )}
          </div>

          {/* Texto de Leitura */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Texto Completo em Inglês (Reading Passage) *
              </label>
              <span className="text-xs text-slate-400">
                Separe os parágrafos com linha em branco
              </span>
            </div>
            <textarea
              rows={8}
              required={tipo === "leitura_audio"}
              value={textoConteudo}
              onChange={(e) => handleTextoConteudoChange(e.target.value)}
              placeholder="Paste or write the reading text here in clear paragraphs..."
              className="w-full p-4 rounded-xl border border-slate-300 text-sm text-slate-900 leading-relaxed font-normal focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      )}

      {/* 4. Editor de Questões com 4 Alternativas */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Questões do Exercício ({questoes.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada questão deve ter enunciado e exatamente 4 alternativas (A, B, C, D) com uma única correta.
            </p>
          </div>
          <button
            type="button"
            onClick={adicionarQuestao}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors border border-purple-200"
          >
            <Plus className="h-4 w-4" /> Adicionar Questão
          </button>
        </div>

        <div className="space-y-6">
          {questoes.map((q, qIndex) => (
            <div
              key={q.id || qIndex}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 relative"
            >
              {/* Barra superior da questão */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">
                  Questão {qIndex + 1}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moverQuestao(qIndex, "up")}
                    disabled={qIndex === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <MoveUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moverQuestao(qIndex, "down")}
                    disabled={qIndex === questoes.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <MoveDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removerQuestao(qIndex)}
                    className="p-1 text-rose-500 hover:text-rose-700 ml-2"
                    title="Excluir questão"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Enunciado e Pontos */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Enunciado da Questão *
                  </label>
                  <input
                    type="text"
                    required
                    value={q.enunciado}
                    onChange={(e) => atualizarEnunciado(qIndex, e.target.value)}
                    placeholder="Ex: What does Lucas do right before going to bed?"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Pontos
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={q.pontos}
                    onChange={(e) =>
                      atualizarPontos(qIndex, parseFloat(e.target.value) || 2.5)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>

              {/* 4 Alternativas com Rádio de Gabarito */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4 Alternativas (Selecione a única correta no botão redondo)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.alternativas.map((alt, aIdx) => {
                    const letter = ["A", "B", "C", "D"][aIdx];
                    const isCorrect = q.alternativaCorretaId === alt.id;

                    return (
                      <div
                        key={alt.id || aIdx}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 bg-white transition-all ${
                          isCorrect
                            ? "border-emerald-500 ring-2 ring-emerald-500/30"
                            : "border-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => definirAlternativaCorreta(qIndex, alt.id)}
                          className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-all ${
                            isCorrect
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title={isCorrect ? "Alternativa Correta (Gabarito)" : "Clique para marcar como correta"}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          required
                          value={alt.texto}
                          onChange={(e) =>
                            atualizarAlternativaTexto(qIndex, aIdx, e.target.value)
                          }
                          placeholder={`Texto da alternativa ${letter}`}
                          className="flex-1 px-2.5 py-1.5 text-xs sm:text-sm border-0 focus:outline-none focus:ring-0 text-slate-800"
                        />
                        {isCorrect && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            Correta
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explicação Pedagógica Opcional */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  Explicação Pedagógica (exibida após conclusão da tentativa)
                </label>
                <input
                  type="text"
                  value={q.explicacao || ""}
                  onChange={(e) => atualizarExplicacao(qIndex, e.target.value)}
                  placeholder="Ex: O texto afirma explicitamente no terceiro parágrafo..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={adicionarQuestao}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 text-slate-600 hover:text-purple-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Adicionar Outra Questão ao Exercício
        </button>
      </div>

      {/* Botões de Salvar Inferiores */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => router.push("/admin/exercicios")}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-md disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Publicar Exercício"}
        </button>
      </div>
    </form>

    {/* Modais independentes renderizados fora da tag <form> */}
    <ExercicioPreviewModal
      exercicio={exercicioParaPreview}
      isOpen={showPreview}
      onClose={() => setShowPreview(false)}
    />

    <ExercicioIaModal
      isOpen={showIaContentModal}
      onClose={() => setShowIaContentModal(false)}
      onSuccess={handleApplyIaContent}
      initialNivel={nivel}
      initialTipo={tipo}
    />

    <ExercicioAudioIaModal
      isOpen={showIaAudioModal}
      onClose={() => setShowIaAudioModal(false)}
      textoConteudo={textoConteudo}
      tituloExercicio={titulo}
      onAudioSynthesized={handleApplyIaAudio}
    />
  </>
  );
}
