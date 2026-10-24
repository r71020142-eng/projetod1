"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Edit,
  AlertTriangle,
  Paperclip,
  Download,
} from "lucide-react";
import {
  Material,
  Atividade,
  Entrega,
  Turma,
  Aluno,
} from "@/types";
import { materialRepository } from "@/data/materialRepository";
import { atividadeRepository } from "@/data/atividadeRepository";
import { entregaRepository } from "@/data/entregaRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { alunoRepository } from "@/data/alunoRepository";
import {
  TipoMaterialBadge,
  StatusMaterialBadge,
  TipoAtividadeBadge,
  StatusAtividadeBadge,
  StatusEntregaBadge,
  DestinoBadge,
} from "@/components/common/MaterialBadges";
import { MaterialFormModal } from "@/components/admin/MaterialFormModal";
import { AtividadeFormModal } from "@/components/admin/AtividadeFormModal";
import { CorrecaoEntregaModal } from "@/components/admin/CorrecaoEntregaModal";

export default function AdminMaterialDetalhesPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [material, setMaterial] = useState<Material | null>(null);
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [atividadeModalOpen, setAtividadeModalOpen] = useState(false);
  const [correcaoModalOpen, setCorrecaoModalOpen] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState<Entrega | null>(null);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      setLoading(true);

      try {
        const [ts, als] = await Promise.all([
          turmaRepository.listar(),
          alunoRepository.listar(),
        ]);
        setTurmas(ts);
        setAlunos(als);

        // Try material first
        const mat = await materialRepository.obterPorId(id);
        if (mat) {
          setMaterial(mat);
        } else {
          // Try activity
          const atv = await atividadeRepository.obterPorId(id);
          if (atv) {
            setAtividade(atv);
            const ents = await entregaRepository.listar({ atividadeId: atv.id });
            setEntregas(ents);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes:", err);
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [id]);

  const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]));
  const alunoMap = new Map(alunos.map((a) => [a.id, a]));

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-slate-400">
        Carregando informações detalhadas...
      </div>
    );
  }

  if (!material && !atividade) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Item não encontrado</h2>
        <p className="text-xs text-slate-500">
          O material ou atividade de código &quot;{id}&quot; não existe no acervo.
        </p>
        <Link
          href="/admin/materiais"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Materiais</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/materiais"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Materiais e Atividades</span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {material ? material.titulo : atividade?.titulo}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {material && (
            <button
              type="button"
              onClick={() => setMaterialModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              <span>Editar Material</span>
            </button>
          )}

          {atividade && (
            <button
              type="button"
              onClick={() => setAtividadeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              <span>Editar Atividade</span>
            </button>
          )}
        </div>
      </div>

      {/* MATERIAL DETAILS */}
      {material && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Content */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição Pedagógica
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed">{material.descricao}</p>
              </div>

              {material.conteudoTexto && (
                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Conteúdo Textual Cadastrado
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {material.conteudoTexto}
                  </div>
                </div>
              )}

              {material.linkExterno && (
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">Link de Acesso Externo:</span>
                    <a
                      href={material.linkExterno}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-purple-700 underline font-medium hover:text-purple-900"
                    >
                      {material.linkExterno}
                    </a>
                  </div>
                  <a
                    href={material.linkExterno}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <span>Acessar</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {material.arquivoUrl && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Paperclip className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">Arquivo Anexo (Armazenamento Supabase):</span>
                      <p className="text-xs text-emerald-800 font-medium">{material.arquivoNome || "Baixar arquivo"}</p>
                    </div>
                  </div>
                  <a
                    href={material.arquivoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    download
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <span>Baixar Arquivo</span>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {material.observacoesInternas && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <span className="font-bold block">Observações Internas (apenas coordenação):</span>
                  <p>{material.observacoesInternas}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Ficha Técnica
              </h3>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status:</span>
                <StatusMaterialBadge status={material.status} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tipo:</span>
                <TipoMaterialBadge tipo={material.tipo} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Categoria:</span>
                <span className="font-semibold text-slate-800">{material.categoria}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Nível Recomendado:</span>
                <span className="font-semibold text-slate-800">
                  {material.nivelRecomendado === "todos" ? "Todos os níveis" : material.nivelRecomendado}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Destino:</span>
                <DestinoBadge
                  destinoTipo={material.destinoTipo}
                  destinoNome={
                    material.destinoTipo === "turma"
                      ? turmaMap.get(material.destinoId || "")
                      : material.destinoId
                  }
                />
              </div>

              {material.tags && material.tags.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1.5">Tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {material.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ATIVIDADE DETAILS */}
      {atividade && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Enunciado e Instruções
                </h3>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {atividade.instrucoes}
                </p>
              </div>

              {atividade.observacoesInternas && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <span className="font-bold block">Observações Pedagógicas Internas:</span>
                  <p>{atividade.observacoesInternas}</p>
                </div>
              )}
            </div>

            {/* Submissions List */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Entregas dos Alunos ({entregas.length})
                </h3>
              </div>

              {entregas.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhum discente submeteu resposta para esta atividade ainda.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {entregas.map((ent) => {
                    const alu = alunoMap.get(ent.alunoId);
                    return (
                      <div
                        key={ent.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            {alu?.nomeCompleto || ent.alunoId}
                          </p>
                          <p className="text-slate-400 text-[11px]">{alu?.email}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <StatusEntregaBadge status={ent.status} />
                          <button
                            type="button"
                            onClick={() => {
                              setEntregaSelecionada(ent);
                              setCorrecaoModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                          >
                            {ent.status === "corrigida" ? "Ver Avaliação" : "Avaliar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Configurações da Atividade
              </h3>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status:</span>
                <StatusAtividadeBadge status={atividade.status} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tipo de Resposta:</span>
                <TipoAtividadeBadge tipo={atividade.tipo} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Prazo de Entrega:</span>
                <span className="font-semibold text-slate-800">
                  {atividade.prazoEntrega
                    ? new Date(atividade.prazoEntrega).toLocaleDateString("pt-BR")
                    : "Sem prazo fixo"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Pontuação Máxima:</span>
                <span className="font-semibold text-slate-800">
                  {atividade.pontuacaoMaxima ? `${atividade.pontuacaoMaxima} pontos` : "Não pontuada"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Aceita Atraso:</span>
                <span className={`font-semibold ${atividade.permitirAtraso ? "text-emerald-700" : "text-rose-700"}`}>
                  {atividade.permitirAtraso ? "Sim" : "Não"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modals */}
      {material && (
        <MaterialFormModal
          isOpen={materialModalOpen}
          materialParaEditar={material}
          onClose={() => setMaterialModalOpen(false)}
          onSuccess={(atualizado) => setMaterial(atualizado)}
        />
      )}

      {atividade && (
        <>
          <AtividadeFormModal
            isOpen={atividadeModalOpen}
            atividadeParaEditar={atividade}
            onClose={() => setAtividadeModalOpen(false)}
            onSuccess={(atualizada) => setAtividade(atualizada)}
          />

          <CorrecaoEntregaModal
            isOpen={correcaoModalOpen}
            entrega={entregaSelecionada}
            atividade={atividade}
            aluno={alunoMap.get(entregaSelecionada?.alunoId || "") || null}
            onClose={() => {
              setCorrecaoModalOpen(false);
              setEntregaSelecionada(null);
            }}
            onSuccess={async () => {
              const ents = await entregaRepository.listar({ atividadeId: atividade.id });
              setEntregas(ents);
            }}
          />
        </>
      )}
    </div>
  );
}
