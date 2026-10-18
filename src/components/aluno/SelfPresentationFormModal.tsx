"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Video,
  Send,
  Save,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  SelfPresentation,
  TipoSelfPresentation,
  ConsentimentoUsoVideo,
} from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import {
  isValidHttpsUrl,
  TEXTO_CONSENTIMENTO_OFICIAL,
  VERSAO_CONSENTIMENTO_ATUAL,
} from "@/data/validators";

interface SelfPresentationFormModalProps {
  isOpen: boolean;
  alunoId: string;
  alunoNome: string;
  presentation?: SelfPresentation | null;
  tipo?: TipoSelfPresentation;
  onClose: () => void;
  onSuccess: (sp: SelfPresentation) => void;
}

export function SelfPresentationFormModal({
  isOpen,
  alunoId,
  alunoNome,
  presentation,
  tipo = "nivelamento_inicial",
  onClose,
  onSuccess,
}: SelfPresentationFormModalProps) {
  const [titulo, setTitulo] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [dataGravacao, setDataGravacao] = useState("");
  const [observacaoAluno, setObservacaoAluno] = useState("");
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    const hoje = new Date().toISOString().slice(0, 10);

    if (presentation) {
      setTitulo(presentation.titulo || "");
      setLinkVideo(presentation.linkVideo || "");
      setDataGravacao(
        presentation.dataGravacao
          ? presentation.dataGravacao.slice(0, 10)
          : hoje
      );
      setObservacaoAluno(presentation.observacaoAluno || "");
      setConsentimentoAceito(Boolean(presentation.consentimento?.aceito));
    } else {
      setTitulo(
        tipo === "nivelamento_inicial"
          ? `Self Presentation Inicial • ${alunoNome}`
          : `Self Presentation de Reavaliação • ${alunoNome}`
      );
      setLinkVideo("");
      setDataGravacao(hoje);
      setObservacaoAluno("");
      setConsentimentoAceito(false); // NÃO previamente marcada!
    }
  }, [isOpen, presentation, tipo, alunoNome]);

  if (!isOpen) return null;

  const isReenvio = presentation?.status === "reenvio_solicitado";

  const handleSalvarRascunho = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const consentimentoObj: ConsentimentoUsoVideo = {
        aceito: consentimentoAceito,
        dataHora: new Date().toISOString(),
        versaoTexto: VERSAO_CONSENTIMENTO_ATUAL,
      };

      const res = await selfPresentationRepository.salvarRascunho({
        id: presentation?.id,
        alunoId,
        alunoNome,
        tipo,
        titulo,
        linkVideo,
        dataGravacao: dataGravacao ? `${dataGravacao}T12:00:00.000Z` : undefined,
        observacaoAluno,
        consentimento: consentimentoObj,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Falha ao salvar rascunho.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar rascunho.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validação de consentimento obrigatória
    if (!consentimentoAceito) {
      setError("É obrigatório marcar o consentimento pedagógico antes de enviar sua apresentação.");
      setIsSubmitting(false);
      return;
    }

    // Validação de link com parser nativo
    if (!linkVideo || !linkVideo.trim()) {
      setError("Informe o link externo HTTPS do seu vídeo.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidHttpsUrl(linkVideo.trim())) {
      setError("O link do vídeo deve ser uma URL externa HTTPS válida (ex.: YouTube, Google Drive, Loom, Vimeo).");
      setIsSubmitting(false);
      return;
    }

    try {
      const consentimentoObj: ConsentimentoUsoVideo = {
        aceito: true,
        dataHora: new Date().toISOString(),
        versaoTexto: VERSAO_CONSENTIMENTO_ATUAL,
      };

      if (isReenvio && presentation) {
        // Criar nova versão após reenvio solicitado
        const res = await selfPresentationRepository.criarNovaVersao(presentation.id, {
          linkVideo: linkVideo.trim(),
          dataGravacao: `${dataGravacao}T12:00:00.000Z`,
          observacaoAluno,
          consentimento: consentimentoObj,
        });

        if (!res.success || !res.data) {
          setError(res.error || "Falha ao enviar nova versão da apresentação.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
        onClose();
        return;
      }

      // Se já era rascunho salvo, apenas chama enviar
      let spId = presentation?.id;

      if (!spId) {
        // Salva rascunho inicial antes de enviar
        const resRascunho = await selfPresentationRepository.salvarRascunho({
          alunoId,
          alunoNome,
          tipo,
          titulo,
          linkVideo: linkVideo.trim(),
          dataGravacao: `${dataGravacao}T12:00:00.000Z`,
          observacaoAluno,
          consentimento: consentimentoObj,
        });

        if (!resRascunho.success || !resRascunho.data) {
          setError(resRascunho.error || "Falha ao preparar envio da apresentação.");
          setIsSubmitting(false);
          return;
        }
        spId = resRascunho.data.id;
      }

      const resEnvio = await selfPresentationRepository.enviar(spId, {
        linkVideo: linkVideo.trim(),
        dataGravacao: `${dataGravacao}T12:00:00.000Z`,
        observacaoAluno,
        consentimento: consentimentoObj,
      });

      if (!resEnvio.success || !resEnvio.data) {
        setError(resEnvio.error || "Falha ao enviar apresentação.");
        setIsSubmitting(false);
        return;
      }

      onSuccess(resEnvio.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao submeter apresentação.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {isReenvio
                  ? "Enviar Nova Versão • Self Presentation"
                  : presentation
                  ? "Editar Rascunho da Self Presentation"
                  : "Nova Self Presentation"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Método Paulo • Avaliação personalizada da sua produção oral
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleEnviar} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Roteiro Sugerido (Accordion / Box) */}
          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <HelpCircle className="h-4 w-4 text-purple-600" />
                <span>Roteiro Sugerido para o Vídeo (2 a 3 minutos)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptGuide(!showScriptGuide)}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 underline"
              >
                {showScriptGuide ? "Ocultar" : "Ver roteiro"}
              </button>
            </div>

            {showScriptGuide && (
              <div className="text-xs text-purple-900 space-y-2 pt-1 border-t border-purple-200/60 leading-relaxed font-sans">
                <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium">
                  <li>Diga seu nome e fale brevemente sobre você.</li>
                  <li>Conte como é sua rotina de vida e trabalho.</li>
                  <li>Explique por que deseja aprender ou aperfeiçoar seu inglês.</li>
                  <li>Fale sobre suas experiências anteriores com o idioma.</li>
                  <li>Conte algo que gostaria de fazer quando se comunicar com total naturalidade.</li>
                  <li>Tente falar naturalmente, sem ler um texto pronto.</li>
                </ol>
                <div className="p-2.5 rounded-xl bg-white/80 border border-purple-200 text-[11px] text-purple-800 space-y-1">
                  <p className="font-bold">Lembre-se:</p>
                  <p>
                    • Não existe problema em cometer erros; o objetivo é compreender seu nível operacional atual.
                  </p>
                  <p>
                    • O vídeo será avaliado pela equipe pedagógica. Esta avaliação interna orienta seus estudos e <strong>não representa certificação oficial CEFR</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título da Apresentação *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Self Presentation Inicial • Mariana Oliveira"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500 font-medium text-slate-800"
              required
            />
          </div>

          {/* Video External HTTPS Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Link Externo do Vídeo (URL HTTPS) *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                YouTube, Drive, Loom, Vimeo
              </span>
            </div>
            <div className="relative">
              <input
                type="url"
                value={linkVideo}
                onChange={(e) => setLinkVideo(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://drive.google.com/..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500 font-mono text-purple-700"
              />
              <ExternalLink className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* Cloud Storage Disclaimer */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <UploadCloud className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">
                  Infraestrutura de Armazenamento:
                </p>
                <p>
                  O envio direto de arquivo de vídeo será habilitado após a configuração do armazenamento em nuvem. Nesta etapa demonstrativa, insira o link externo HTTPS de onde sua gravação está hospedada.
                </p>
              </div>
            </div>
          </div>

          {/* Recording Date & Observation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Gravação *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dataGravacao}
                  onChange={(e) => setDataGravacao(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500 text-slate-800"
                  required
                />
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Idioma Avaliado
              </label>
              <input
                type="text"
                disabled
                value="Inglês (Método Paulo)"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-500 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {/* Student Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observação ou Reflexão Pessoal (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacaoAluno}
              onChange={(e) => setObservacaoAluno(e.target.value)}
              placeholder="Ex: Como se sentiu gravando? Notou alguma palavra que travou ou que gostaria de aprender a pronunciar melhor?"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Mandatory Consent Checkbox */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="consentimento-check"
                type="checkbox"
                checked={consentimentoAceito}
                onChange={(e) => setConsentimentoAceito(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                required
              />
              <label
                htmlFor="consentimento-check"
                className="text-xs text-indigo-950 leading-relaxed font-medium cursor-pointer"
              >
                &ldquo;{TEXTO_CONSENTIMENTO_OFICIAL}&rdquo;
              </label>
            </div>
            <p className="text-[10px] text-indigo-700/80 pl-7">
              * Registro de consentimento com data e horário em conformidade com as diretrizes de privacidade pedagógica.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSalvarRascunho}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-slate-500" />
              <span>Salvar como Rascunho</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Enviando..." : isReenvio ? "Enviar Nova Versão" : "Enviar Apresentação"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
