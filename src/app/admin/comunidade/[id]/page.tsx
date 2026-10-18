"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EspacoComunidade, PublicacaoComunidade } from "@/types";
import { comunidadeRepository } from "@/data/api";
import { TipoEspacoBadge, StatusEspacoBadge } from "@/components/comunidade/EspacoBadges";
import { PublicacaoCard } from "@/components/comunidade/PublicacaoCard";
import { PublicacaoFormModal } from "@/components/comunidade/PublicacaoFormModal";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Archive,
  CheckCircle,
} from "lucide-react";

export default function AdminEspacoDetalhePage() {
  const params = useParams();
  const id = params?.id as string;

  const [espaco, setEspaco] = useState<EspacoComunidade | null>(null);
  const [publicacoes, setPublicacoes] = useState<PublicacaoComunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaPublicacao, setModalNovaPublicacao] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [esp, pubs] = await Promise.all([
        comunidadeRepository.obterEspacoPorId(id),
        comunidadeRepository.listarPublicacoes(id, false),
      ]);
      setEspaco(esp);
      setPublicacoes(pubs);
    } catch (err) {
      console.error("Erro ao carregar detalhes do espaço:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) carregar();
  }, [id, carregar]);

  async function handleCriarPublicacao(dados: {
    espacoId: string;
    tipo: import("@/types").TipoPublicacaoComunidade;
    titulo?: string;
    conteudo: string;
    linkExternoUrl?: string;
    linkExternoTitulo?: string;
  }) {
    await comunidadeRepository.criarPublicacao({
      espacoId: dados.espacoId,
      autorId: "adm-001",
      autorNome: "Coordenação MTD",
      autorPapel: "admin",
      tipo: dados.tipo,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      linkExternoUrl: dados.linkExternoUrl,
      linkExternoTitulo: dados.linkExternoTitulo,
    });
    carregar();
  }

  async function handleToggleStatus() {
    if (!espaco) return;
    const novoStatus = espaco.status === "ativo" ? "arquivado" : "ativo";
    await comunidadeRepository.salvarEspaco({
      ...espaco,
      status: novoStatus,
    });
    carregar();
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando espaço...</div>;
  }

  if (!espaco) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Espaço da comunidade não encontrado.</p>
        <Link href="/admin/comunidade" className="text-xs text-indigo-600 hover:underline">
          ← Voltar para a gestão de espaços
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/comunidade"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Espaços da Comunidade</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 transition ${
              espaco.status === "ativo"
                ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            }`}
          >
            {espaco.status === "ativo" ? (
              <>
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>Arquivar Espaço</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reativar Espaço</span>
              </>
            )}
          </button>

          <button
            onClick={() => setModalNovaPublicacao(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar Comunicado</span>
          </button>
        </div>
      </div>

      {/* Hero do Espaço */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TipoEspacoBadge tipo={espaco.tipo} />
            <StatusEspacoBadge status={espaco.status} />
          </div>
          <span className="text-xs text-slate-400">
            Criado em {new Date(espaco.criadoEm).toLocaleDateString("pt-BR")} por {espaco.responsavelNome}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{espaco.nome}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{espaco.descricao}</p>

        <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs space-y-1">
          <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
            Diretrizes e Regras do Canal:
          </span>
          <p className="text-slate-600 leading-relaxed">{espaco.regras}</p>
        </div>
      </div>

      {/* Feed de Publicações do Espaço */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Tópicos e Publicações no Espaço ({publicacoes.length})</span>
          </h2>
        </div>

        {publicacoes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">Nenhuma publicação cadastrada neste espaço.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {publicacoes.map((pub) => (
              <PublicacaoCard
                key={pub.id}
                publicacao={pub}
                usuarioAtualId="adm-001"
                usuarioAtualNome="Coordenação MTD"
                usuarioAtualPapel="admin"
                isAdmin={true}
                onAtualizar={carregar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova Publicação */}
      {modalNovaPublicacao && (
        <PublicacaoFormModal
          isOpen={modalNovaPublicacao}
          onClose={() => setModalNovaPublicacao(false)}
          onSubmit={handleCriarPublicacao}
          espacosDisponiveis={[espaco]}
          espacoPreSelecionadoId={espaco.id}
        />
      )}
    </div>
  );
}
