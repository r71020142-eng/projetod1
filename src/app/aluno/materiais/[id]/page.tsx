"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckSquare,
  Clock,
  Calendar,
  ExternalLink,
  Tag,
  User,
  Award,
  AlertTriangle,
  History,
  Send,
  RotateCcw,
  Info,
  Volume2,
} from "lucide-react";
import {
  Material,
  Atividade,
  Entrega,
} from "@/types";
import { materialRepository } from "@/data/materialRepository";
import { atividadeRepository } from "@/data/atividadeRepository";
import { entregaRepository } from "@/data/entregaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import {
  TipoMaterialBadge,
  TipoAtividadeBadge,
  StatusEntregaBadge,
} from "@/components/common/MaterialBadges";
import { EntregaAtividadeModal } from "@/components/aluno/EntregaAtividadeModal";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

const DEMO_ALUNO_ID = "alu-001";

export default function AlunoMaterialDetalhesPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.alunoId || DEMO_ALUNO_ID;

  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [material, setMaterial] = useState<Material | null>(null);
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [materialRelacionado, setMaterialRelacionado] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);

  const carregarItem = useCallback(async (isMounted = true) => {
    if (!id) return;
    try {
      setError(null);
      const turmas = await turmaRepository.listarPorAluno(alunoId);
      const turmaIds = turmas.map((t) => t.id);

      // Check if it is a Material
      const mat = await materialRepository.obterPorIdParaAluno(id, alunoId, turmaIds);
      if (!isMounted) return;

      if (mat) {
        setMaterial(mat);
        setAtividade(null);
        setEntrega(null);
      } else {
        // Check if it is an Atividade
        const atv = await atividadeRepository.obterPorIdParaAluno(id, alunoId, turmaIds);
        if (!isMounted) return;

        if (atv) {
          setAtividade(atv);
          setMaterial(null);
          const ent = await entregaRepository.obterPorAtividadeEAluno(atv.id, alunoId);
          if (!isMounted) return;
          setEntrega(ent);

          if (atv.materialRelacionadoId) {
            const relMat = await materialRepository.obterPorIdParaAluno(
              atv.materialRelacionadoId,
              alunoId,
              turmaIds
            );
            if (!isMounted) return;
            setMaterialRelacionado(relMat);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes para o aluno:", err);
      if (isMounted) {
        setError("Não foi possível carregar os detalhes do conteúdo.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [id, alunoId]);

  useEffect(() => {
    let isMounted = true;
    carregarItem(isMounted);

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "materiais" ||
        custom.detail.entity === "atividades" ||
        custom.detail.entity === "entregas"
      ) {
        carregarItem(isMounted);
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, [carregarItem]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-28"></div>
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm max-w-xl mx-auto my-8 space-y-3">
        <p className="text-sm font-bold text-red-700">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            carregarItem(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Not found or not permitted
  if (!material && !atividade) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Conteúdo não disponível</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Este material ou atividade não foi encontrado, é um rascunho interno ou não está vinculado à sua turma.
        </p>
        <Link
          href="/aluno/materiais"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Materiais
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // CASE 1: MATERIAL DETALHES
  // ----------------------------------------------------
  if (material) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link
            href="/aluno/materiais"
            className="hover:text-purple-600 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Materiais e Atividades
          </Link>
          <span>/</span>
          <span className="text-slate-400">Biblioteca</span>
          <span>/</span>
          <span className="text-slate-700 font-semibold truncate max-w-xs">{material.titulo}</span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* Header */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <TipoMaterialBadge tipo={material.tipo} />
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                {material.categoria}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                Nível: {material.nivelRecomendado === "todos" ? "Todos os níveis" : material.nivelRecomendado}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {material.titulo}
            </h1>

            <p className="text-base text-slate-600 leading-relaxed font-normal">
              {material.descricao}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Instrutor: {material.autorNome || material.autorId}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Publicado em:{" "}
                {material.dataPublicacao
                  ? new Date(material.dataPublicacao).toLocaleDateString("pt-BR")
                  : new Date(material.criadoEm).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          {/* Audio Disclaimer when type is audio */}
          {material.tipo === "audio" && (
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Volume2 className="h-4 w-4 text-amber-600" />
                  Áudio ainda não disponível
                </div>
                <p className="text-xs text-amber-800 max-w-xl">
                  O streaming direto de áudios e faixas de listening em alta resolução será ativado após a configuração do serviço de armazenamento em nuvem na infraestrutura.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 self-start sm:self-auto">
                Armazenamento em Nuvem Pendente
              </span>
            </div>
          )}

          {/* External Link Section (if exists) */}
          {material.linkExterno && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <ExternalLink className="h-4 w-4 text-purple-600" />
                  Recurso Externo HTTPS
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/70 text-purple-800 uppercase tracking-wider">
                    Conteúdo Externo
                  </span>
                </div>
                <p className="text-xs text-purple-700 max-w-xl">
                  Este material possui conteúdo disponível via link externo HTTPS. Ao clicar abaixo, você abrirá uma página fora da plataforma demonstrativa em uma nova aba.
                </p>
              </div>

              <a
                href={material.linkExterno}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs transition-all shrink-0"
              >
                <span>Acessar Link Externo</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Text Content */}
          {material.conteudoTexto ? (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Conteúdo de Estudo
              </h2>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {material.conteudoTexto}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Este material baseia-se em recursos multimídia ou referências externas listadas acima.
              </p>
            </div>
          )}

          {/* Tags */}
          {material.tags && material.tags.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tópicos de Vocabulário e Gramática
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {material.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600"
                  >
                    <Tag className="h-3 w-3 text-slate-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cloud Storage Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong className="font-semibold text-slate-700">Downloads e anexos:</strong> O download direto de arquivos em PDF/áudio e o armazenamento de documentos locais serão habilitados após a configuração do serviço de armazenamento em nuvem na infraestrutura.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CASE 2: ATIVIDADE DETALHES
  // ----------------------------------------------------
  if (!atividade) return null;

  const prazoData = atividade.prazoEntrega ? new Date(atividade.prazoEntrega) : null;
  const isPrazoVencido = prazoData ? prazoData.getTime() < Date.now() : false;
  const statusEntrega = entrega?.status || "nao_iniciada";

  const podeEntregar =
    statusEntrega === "nao_iniciada" ||
    statusEntrega === "em_andamento" ||
    statusEntrega === "reenviar";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link
          href="/aluno/atividades"
          className="hover:text-purple-600 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Minhas Atividades
        </Link>
        <span>/</span>
        <span className="text-slate-400">Atividades</span>
        <span>/</span>
        <span className="text-slate-700 font-semibold truncate max-w-xs">{atividade.titulo}</span>
      </div>

      {/* Main Activity Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <TipoAtividadeBadge tipo={atividade.tipo} />
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                Nível: {atividade.nivelRecomendado ? (atividade.nivelRecomendado === "todos" ? "Todos os níveis" : atividade.nivelRecomendado) : "Geral"}
              </span>
              {atividade.permitirAtraso ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Aceita envio após o prazo
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                  Bloqueado após prazo
                </span>
              )}
            </div>

            <StatusEntregaBadge status={statusEntrega} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {atividade.titulo}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-purple-600" />
              {prazoData ? (
                <>
                  Prazo de entrega: {prazoData.toLocaleDateString("pt-BR")}{" "}
                  {prazoData.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {isPrazoVencido && <span className="text-rose-600 font-bold ml-1">(Prazo encerrado)</span>}
                </>
              ) : (
                "Sem prazo de entrega fixado"
              )}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Instruções Pedagógicas
          </h2>
          <div className="p-6 rounded-2xl bg-purple-50/40 border border-purple-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {atividade.instrucoes}
          </div>
        </div>

        {/* Related Material (if linked) */}
        {materialRelacionado && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Material de Estudo Recomendado</p>
                <h3 className="text-sm font-bold text-slate-900">{materialRelacionado.titulo}</h3>
              </div>
            </div>
            <Link
              href={`/aluno/materiais/${materialRelacionado.id}`}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-purple-600 hover:text-purple-800 bg-white border border-purple-200 transition-colors shadow-2xs"
            >
              Consultar Material
            </Link>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SUBMISSION / STATUS SECTION                          */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Sua Entrega</h2>
            <StatusEntregaBadge status={statusEntrega} />
          </div>

          {/* Alert: Resubmission requested */}
          {statusEntrega === "reenviar" && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    O professor solicitou o reenvio desta atividade
                  </h4>
                  {entrega?.motivoReenvio && (
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Orientações do professor:</strong> &ldquo;{entrega.motivoReenvio}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setModalEntregaOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  Revisar e Reenviar Agora
                </button>
              </div>
            </div>
          )}

          {/* Graded Feedback Card */}
          {statusEntrega === "corrigida" && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-200/60">
                <div className="flex items-center gap-2.5">
                  <Award className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Feedback e Avaliação do Professor
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Corrigido por {entrega?.professorCorretorNome || entrega?.professorCorretorId || "Professor Responsável"} em{" "}
                      {entrega?.corrigidoEm
                        ? new Date(entrega.corrigidoEm).toLocaleDateString("pt-BR")
                        : "Data recente"}
                    </p>
                  </div>
                </div>

                {entrega?.pontuacao !== undefined && entrega?.pontuacao !== null && (
                  <div className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-center shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                      Nota
                    </span>
                    <span className="text-xl font-black text-emerald-900">
                      {entrega.pontuacao} <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </span>
                  </div>
                )}
              </div>

              {entrega?.feedback && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Comentários Pedagógicos:
                  </span>
                  <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                    {entrega.feedback}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Student Submission Content */}
          {entrega && (entrega.respostaTexto || entrega.respostaLink) ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/60">
                <span className="font-semibold text-slate-700">
                  {statusEntrega === "em_andamento" ? "Rascunho atual" : "Resposta enviada:"}
                </span>
                {entrega.entregueEm && (
                  <span>Enviado em {new Date(entrega.entregueEm).toLocaleString("pt-BR")}</span>
                )}
              </div>

              {entrega.respostaTexto && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Texto:</span>
                  <div className="p-4 rounded-xl bg-white border border-slate-200/60 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {entrega.respostaTexto}
                  </div>
                </div>
              )}

              {entrega.respostaLink && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Link externo HTTPS:</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      Conteúdo Externo
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200/60 flex items-center justify-between gap-3">
                    <span className="text-xs font-mono text-purple-700 truncate">{entrega.respostaLink}</span>
                    <a
                      href={entrega.respostaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                {statusEntrega === "em_andamento" && (
                  <button
                    type="button"
                    onClick={() => setModalEntregaOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Continuar e Enviar Rascunho
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-4">
              <CheckSquare className="h-8 w-8 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Você ainda não entregou esta atividade</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isPrazoVencido && !atividade.permitirAtraso
                    ? "O prazo para entrega encerrou e esta atividade não permite envios com atraso."
                    : "Leia as instruções atentamente e submeta sua resposta textual ou link externo HTTPS."}
                </p>
              </div>

              {podeEntregar && (
                <button
                  type="button"
                  onClick={() => setModalEntregaOpen(true)}
                  disabled={isPrazoVencido && !atividade.permitirAtraso}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-all"
                >
                  <Send className="h-4 w-4" />
                  Realizar Entrega
                </button>
              )}
            </div>
          )}

          {/* Submission History (if any) */}
          {entrega?.historicoEnvios && entrega.historicoEnvios.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <History className="h-3.5 w-3.5" />
                Histórico de Versões e Reenvios
              </div>

              <div className="space-y-2">
                {entrega.historicoEnvios.map((hist, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-600">
                      <span>Versão anterior ({hist.enviadoEm ? new Date(hist.enviadoEm).toLocaleString("pt-BR") : "Data não registrada"})</span>
                      {hist.motivoReenvio && (
                        <span className="text-amber-700 font-normal">Reenvio solicitado</span>
                      )}
                    </div>
                    {hist.respostaTexto && (
                      <p className="text-slate-600 line-clamp-2 italic bg-white p-2 rounded border border-slate-100">
                        &ldquo;{hist.respostaTexto}&rdquo;
                      </p>
                    )}
                    {hist.feedbackAnterior && (
                      <p className="text-emerald-800">
                        <strong>Feedback recebido:</strong> {hist.feedbackAnterior}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submission Modal */}
      <EntregaAtividadeModal
        isOpen={modalEntregaOpen}
        atividade={atividade}
        alunoId={alunoId}
        onClose={() => setModalEntregaOpen(false)}
        onSuccess={() => carregarItem()}
      />
    </div>
  );
}
