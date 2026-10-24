"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, BookOpen, AlertCircle, UploadCloud, CheckCircle2, Trash2, Loader2, Paperclip } from "lucide-react";
import {
  Material,
  TipoMaterial,
  NivelMaterial,
  StatusMaterial,
  DestinoTipo,
  Turma,
  Aluno,
  Professor,
} from "@/types";
import { materialRepository } from "@/data/materialRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { alunoRepository } from "@/data/alunoRepository";
import { professorRepository } from "@/data/professorRepository";
import { useAdminIdentity } from "@/app/admin/AdminLayoutClient";

interface MaterialFormModalProps {
  isOpen: boolean;
  materialParaEditar?: Material | null;
  onClose: () => void;
  onSuccess: (materialSalvo: Material) => void;
}

const CATEGORIAS_SUGERIDAS = [
  "Self Presentation",
  "Vocabulário",
  "Pronúncia",
  "Business English",
  "Listening",
  "Gramática Prática",
  "Transcrição",
];

export function MaterialFormModal({
  isOpen,
  materialParaEditar,
  onClose,
  onSuccess,
}: MaterialFormModalProps) {
  const identity = useAdminIdentity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoMaterial>("texto");
  const [categoria, setCategoria] = useState("Vocabulário");
  const [nivelRecomendado, setNivelRecomendado] = useState<NivelMaterial>("todos");
  const [status, setStatus] = useState<StatusMaterial>("publicado");
  const [dataPublicacao, setDataPublicacao] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>("geral");
  const [destinoId, setDestinoId] = useState("");
  const [linkExterno, setLinkExterno] = useState("");
  const [conteudoTexto, setConteudoTexto] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");

  // Arquivo no Supabase Storage
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Responsável / Professor
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [autorId, setAutorId] = useState("");
  const [autorNome, setAutorNome] = useState("");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      turmaRepository.listar().then(setTurmas);
      alunoRepository.listar().then(setAlunos);
      professorRepository.listar().then(setProfessores);

      if (materialParaEditar) {
        setTitulo(materialParaEditar.titulo);
        setDescricao(materialParaEditar.descricao);
        setTipo(materialParaEditar.tipo);
        setCategoria(materialParaEditar.categoria);
        setNivelRecomendado(materialParaEditar.nivelRecomendado);
        setStatus(materialParaEditar.status);
        setDataPublicacao(
          materialParaEditar.dataPublicacao || new Date().toISOString().slice(0, 10)
        );
        setDestinoTipo(materialParaEditar.destinoTipo);
        setDestinoId(materialParaEditar.destinoId || "");
        setLinkExterno(materialParaEditar.linkExterno || "");
        setArquivoUrl(materialParaEditar.arquivoUrl || "");
        setArquivoNome(materialParaEditar.arquivoNome || "");
        setConteudoTexto(materialParaEditar.conteudoTexto || "");
        setTagsInput(materialParaEditar.tags ? materialParaEditar.tags.join(", ") : "");
        setObservacoesInternas(materialParaEditar.observacoesInternas || "");
        setAutorId(materialParaEditar.autorId || "");
        setAutorNome(materialParaEditar.autorNome || "");
      } else {
        setTitulo("");
        setDescricao("");
        setTipo("texto");
        setCategoria("Vocabulário");
        setNivelRecomendado("todos");
        setStatus("publicado");
        setDataPublicacao(new Date().toISOString().slice(0, 10));
        setDestinoTipo("geral");
        setDestinoId("");
        setLinkExterno("");
        setArquivoUrl("");
        setArquivoNome("");
        setConteudoTexto("");
        setTagsInput("");
        setObservacoesInternas("");
        setAutorId(identity?.id || "660640d2-99fc-46e7-8e12-9ef0d67b60ee");
        setAutorNome(identity?.nomeCompleto || "Ray Pires (Coordenação MTD)");
      }
      setError(null);
      setUploadError(null);
      setFieldErrors({});
      setIsSubmitting(false);
      setIsUploading(false);
    }
  }, [isOpen, materialParaEditar, identity]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
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
        throw new Error(data.error || "Falha ao enviar arquivo.");
      }

      setArquivoUrl(data.url);
      setArquivoNome(data.fileName);

      // Auto-seleção amigável de tipo
      const ext = data.fileName.split(".").pop()?.toLowerCase();
      if (ext === "pdf") {
        setTipo("pdf");
      } else if (["mp3", "wav", "aac", "ogg", "m4a"].includes(ext || "")) {
        setTipo("audio");
      } else if (["mp4", "webm", "mov", "avi"].includes(ext || "")) {
        setTipo("video");
      } else if (["ppt", "pptx", "key"].includes(ext || "")) {
        setTipo("documento");
      }
    } catch (err: unknown) {
      console.error("Erro no upload do material:", err);
      setUploadError(err instanceof Error ? err.message : "Erro ao carregar arquivo no storage.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const autorIdFinal = autorId || identity?.id || "660640d2-99fc-46e7-8e12-9ef0d67b60ee";
    const autorNomeFinal = autorNome || identity?.nomeCompleto || "Ray Pires";

    const payload: Partial<Material> = {
      titulo,
      descricao,
      tipo,
      categoria,
      nivelRecomendado,
      status,
      dataPublicacao: status === "agendado" ? dataPublicacao : new Date().toISOString().slice(0, 10),
      destinoTipo,
      destinoId: destinoTipo === "geral" ? undefined : destinoId,
      linkExterno: linkExterno.trim().length > 0 ? linkExterno.trim() : undefined,
      arquivoUrl: arquivoUrl.trim().length > 0 ? arquivoUrl.trim() : undefined,
      arquivoNome: arquivoNome.trim().length > 0 ? arquivoNome.trim() : undefined,
      conteudoTexto: conteudoTexto.trim().length > 0 ? conteudoTexto.trim() : undefined,
      tags,
      observacoesInternas: observacoesInternas.trim().length > 0 ? observacoesInternas.trim() : undefined,
      autorId: autorIdFinal,
      autorNome: autorNomeFinal,
    };

    try {
      const res = materialParaEditar
        ? await materialRepository.atualizar(materialParaEditar.id, payload)
        : await materialRepository.criar(payload);

      if (!res.success) {
        setError(res.error || "Erro ao salvar material.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao salvar material:", err);
      setError("Erro inesperado ao salvar material.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="material-modal-title" className="text-base font-bold text-slate-800">
                {materialParaEditar ? "Editar Material Didático" : "Novo Material Didático"}
              </h2>
              <p className="text-xs text-slate-500">
                Biblioteca de conteúdos, apostilas e exercícios do Método Paulo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="material-titulo" className="block text-xs font-semibold text-slate-700 mb-1">
              Título do Material *
            </label>
            <input
              id="material-titulo"
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Guia Oficial de Self Presentation • Estrutura de 4 Blocos"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                fieldErrors.titulo
                  ? "border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                  : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              }`}
            />
            {fieldErrors.titulo && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.titulo}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="material-descricao" className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição Curta *
            </label>
            <textarea
              id="material-descricao"
              rows={2}
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Explique resumidamente o objetivo pedagógico do material..."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors resize-none ${
                fieldErrors.descricao
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              }`}
            />
            {fieldErrors.descricao && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.descricao}</p>
            )}
          </div>

          {/* Type & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="material-tipo" className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Conteúdo *
              </label>
              <select
                id="material-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoMaterial)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none bg-white"
              >
                <option value="texto">Texto / Artigo</option>
                <option value="pdf">Documento PDF</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio / Podcast</option>
                <option value="link">Link Externo</option>
                <option value="documento">Outro Documento</option>
              </select>
            </div>

            <div>
              <label htmlFor="material-categoria" className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria Pedagógica *
              </label>
              <input
                id="material-categoria"
                type="text"
                list="categorias-list"
                required
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Vocabulário, Pronúncia"
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
              />
              <datalist id="categorias-list">
                {CATEGORIAS_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Level & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="material-nivel" className="block text-xs font-semibold text-slate-700 mb-1">
                Nível Recomendado
              </label>
              <select
                id="material-nivel"
                value={nivelRecomendado}
                onChange={(e) => setNivelRecomendado(e.target.value as NivelMaterial)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none bg-white"
              >
                <option value="todos">Todos os níveis</option>
                <option value="A1">A1 • Iniciante</option>
                <option value="A2">A2 • Básico</option>
                <option value="B1">B1 • Intermediário</option>
                <option value="B2">B2 • Independente</option>
                <option value="C1">C1 • Avançado</option>
                <option value="C2">C2 • Domínio Pleno</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                * Indicação pedagógica (não representa certificação CEFR formal).
              </p>
            </div>

            <div>
              <label htmlFor="material-status" className="block text-xs font-semibold text-slate-700 mb-1">
                Status de Publicação *
              </label>
              <select
                id="material-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusMaterial)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none bg-white"
              >
                <option value="publicado">Publicado (visível imediatamente)</option>
                <option value="agendado">Agendado (visível na data programada)</option>
                <option value="rascunho">Rascunho (oculto para alunos)</option>
              </select>
            </div>
          </div>

          {/* Scheduled Date picker if agendado */}
          {status === "agendado" && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <label htmlFor="material-data-pub" className="block text-xs font-semibold text-indigo-900 mb-1">
                Data Programada de Publicação *
              </label>
              <input
                id="material-data-pub"
                type="date"
                required
                value={dataPublicacao}
                onChange={(e) => setDataPublicacao(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm border border-indigo-200 bg-white text-indigo-950 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-indigo-700 mt-1">
                O material só aparecerá para os alunos no dia ou após a data definida.
              </p>
            </div>
          )}

          {/* Destination */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Destinatários do Material
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  destinoTipo === "geral"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="destinoTipo"
                  value="geral"
                  checked={destinoTipo === "geral"}
                  onChange={() => {
                    setDestinoTipo("geral");
                    setDestinoId("");
                  }}
                  className="sr-only"
                />
                <span>Biblioteca Geral</span>
              </label>

              <label
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  destinoTipo === "turma"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="destinoTipo"
                  value="turma"
                  checked={destinoTipo === "turma"}
                  onChange={() => setDestinoTipo("turma")}
                  className="sr-only"
                />
                <span>Turma Específica</span>
              </label>

              <label
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  destinoTipo === "aluno"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="destinoTipo"
                  value="aluno"
                  checked={destinoTipo === "aluno"}
                  onChange={() => setDestinoTipo("aluno")}
                  className="sr-only"
                />
                <span>Aluno Específico</span>
              </label>
            </div>

            {destinoTipo === "turma" && (
              <div>
                <label htmlFor="material-turma-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione a Turma *
                </label>
                <select
                  id="material-turma-select"
                  required
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Selecione uma turma...</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.nivel} • {t.modalidade})
                    </option>
                  ))}
                </select>
                {fieldErrors.destinoId && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.destinoId}</p>
                )}
              </div>
            )}

            {destinoTipo === "aluno" && (
              <div>
                <label htmlFor="material-aluno-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione o Aluno *
                </label>
                <select
                  id="material-aluno-select"
                  required
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Selecione um aluno...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nomeCompleto} ({a.email})
                    </option>
                  ))}
                </select>
                {fieldErrors.destinoId && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.destinoId}</p>
                )}
              </div>
            )}
          </div>

          {/* Link Externo HTTPS */}
          <div>
            <label htmlFor="material-link" className="block text-xs font-semibold text-slate-700 mb-1">
              Link Externo (URL externa HTTPS)
            </label>
            <input
              id="material-link"
              type="url"
              value={linkExterno}
              onChange={(e) => setLinkExterno(e.target.value)}
              placeholder="https://exemplo.com/material-ou-video"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                fieldErrors.linkExterno
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              }`}
            />
            {fieldErrors.linkExterno && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.linkExterno}</p>
            )}
          </div>

          {/* Autor / Responsável */}
          <div>
            <label htmlFor="material-autor" className="block text-xs font-semibold text-slate-700 mb-1">
              Professor / Responsável pelo Material *
            </label>
            <select
              id="material-autor"
              value={autorId}
              onChange={(e) => {
                const selectedId = e.target.value;
                setAutorId(selectedId);
                if (selectedId === (identity?.id || "660640d2-99fc-46e7-8e12-9ef0d67b60ee")) {
                  setAutorNome(identity?.nomeCompleto || "Ray Pires");
                } else {
                  const prof = professores.find((p) => p.id === selectedId);
                  if (prof) setAutorNome(prof.nomeCompleto);
                }
              }}
              className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
            >
              <option value={identity?.id || "660640d2-99fc-46e7-8e12-9ef0d67b60ee"}>
                {identity?.nomeCompleto || "Ray Pires"} (Administrador / Coordenação)
              </option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto} ({p.email})
                </option>
              ))}
            </select>
          </div>

          {/* Anexo de Arquivo no Supabase Storage */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Arquivo Anexo (PDF, Áudio, Vídeo, Apresentação ou Imagem)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,.ppt,.pptx,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />

            {arquivoUrl ? (
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">{arquivoNome || "Arquivo anexado"}</p>
                    <a
                      href={arquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Paperclip className="h-3 w-3" /> Ver arquivo no Supabase Storage
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArquivoUrl("");
                    setArquivoNome("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                  title="Remover anexo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 ${
                  isUploading
                    ? "border-purple-300 bg-purple-50/40 cursor-wait"
                    : "border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 bg-slate-50/50"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                    <p className="text-xs font-bold text-purple-900">Enviando arquivo para o Supabase Storage...</p>
                    <p className="text-[11px] text-purple-700">Por favor, aguarde o upload ser concluído.</p>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Clique para selecionar um arquivo do seu computador
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PDF, Áudios (MP3/WAV), Vídeos (MP4), Apresentações ou Imagens até 50MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {uploadError && (
              <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {uploadError}
              </p>
            )}
          </div>

          {/* Text Content */}
          <div>
            <label htmlFor="material-conteudo-texto" className="block text-xs font-semibold text-slate-700 mb-1">
              Conteúdo Textual / Roteiro da Aula (opcional)
            </label>
            <textarea
              id="material-conteudo-texto"
              rows={4}
              value={conteudoTexto}
              onChange={(e) => setConteudoTexto(e.target.value)}
              placeholder="Cole aqui o texto didático, transcrição ou notas de estudo..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors font-mono text-xs"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="material-tags" className="block text-xs font-semibold text-slate-700 mb-1">
              Tags (separadas por vírgula)
            </label>
            <input
              id="material-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ex: Speaking, Phrasal Verbs, Fluência, Reuniões"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label htmlFor="material-obs" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Internas (Visíveis apenas para Admin e Professores)
            </label>
            <input
              id="material-obs"
              type="text"
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Notas pedagógicas internas, pontos de atenção para tutores..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{materialParaEditar ? "Salvar Alterações" : "Cadastrar Material"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
