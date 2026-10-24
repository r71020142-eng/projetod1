"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EspacoComunidade, PublicacaoComunidade, Aluno } from "@/types";
import {
  comunidadeRepository,
  alunoRepository,
  turmaRepository,
} from "@/data/api";
import { alunoTemAcessoAoEspaco, alunoPodePublicarNoEspaco } from "@/data/comunidadeRegras";
import { TipoEspacoBadge } from "@/components/comunidade/EspacoBadges";
import { PublicacaoCard } from "@/components/comunidade/PublicacaoCard";
import { PublicacaoFormModal } from "@/components/comunidade/PublicacaoFormModal";
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  Lock,
} from "lucide-react";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

export default function AlunoEspacoDetalhePage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.alunoId || "alu-001";
  const params = useParams();
  const id = params?.id as string;

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaIds, setTurmaIds] = useState<string[]>([]);
  const [espaco, setEspaco] = useState<EspacoComunidade | null>(null);
  const [publicacoes, setPublicacoes] = useState<PublicacaoComunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalNovaPublicacao, setModalNovaPublicacao] = useState(false);

  const carregar = useCallback(async (mounted = true) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [alu, turmas, esp] = await Promise.all([
        alunoRepository.obterPorId(alunoId),
        turmaRepository.listarPorAluno(alunoId),
        comunidadeRepository.obterEspacoPorId(id),
      ]);

      if (!mounted) return;
      setAluno(alu || null);

      const tIds = turmas.map((t) => t.id);
      setTurmaIds(tIds);
      setEspaco(esp || null);

      if (esp && alu && alunoTemAcessoAoEspaco(esp, alu, tIds)) {
        const pubs = await comunidadeRepository.listarPublicacoes(id, true);
        if (mounted) setPublicacoes(pubs);
      }
    } catch (err: unknown) {
      if (mounted) {
        console.error("Erro ao carregar detalhes do espaço:", err);
        setError((err as Error)?.message || "Não foi possível carregar os detalhes do canal.");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, [id, alunoId]);

  useEffect(() => {
    let isMounted = true;
    if (id) carregar(isMounted);
    return () => {
      isMounted = false;
    };
  }, [id, carregar]);

  async function handleCriarPublicacao(dados: {
    espacoId: string;
    tipo: import("@/types").TipoPublicacaoComunidade;
    titulo?: string;
    conteudo: string;
    linkExternoUrl?: string;
    linkExternoTitulo?: string;
  }) {
    if (!aluno) return;
    await comunidadeRepository.criarPublicacao(
      {
        espacoId: dados.espacoId,
        autorId: aluno.id,
        autorNome: aluno.nomeCompleto,
        autorAvatar: (aluno.avatarUrl || identity?.avatarUrl) || undefined,
        autorPapel: "aluno",
        tipo: dados.tipo,
        titulo: dados.titulo,
        conteudo: dados.conteudo,
        linkExternoUrl: dados.linkExternoUrl,
        linkExternoTitulo: dados.linkExternoTitulo,
      },
      aluno,
      turmaIds
    );
    carregar();
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando canal...</div>;
  }

  if (error || !espaco) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <p className="text-sm font-semibold text-slate-700">{error || "Espaço da comunidade não encontrado."}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => carregar()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Tentar novamente
          </button>
          <Link href="/aluno/comunidade" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">
            Voltar para a comunidade
          </Link>
        </div>
      </div>
    );
  }

  // Verificação de permissão do aluno
  const temAcesso = aluno ? alunoTemAcessoAoEspaco(espaco, aluno, turmaIds) : false;
  if (!temAcesso) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-bold text-slate-900 text-base">Espaço Restrito</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Este espaço é exclusivo para alunos matriculados na turma ou nível correspondente. Você não possui os requisitos necessários para visualizá-lo.
          </p>
        </div>
        <Link
          href="/aluno/comunidade"
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
        >
          <span>Voltar para a Comunidade</span>
        </Link>
      </div>
    );
  }

  const podePublicar = aluno ? alunoPodePublicarNoEspaco(espaco, aluno, turmaIds) : false;

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/aluno/comunidade"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Comunidade</span>
        </Link>

        {podePublicar && (
          <button
            onClick={() => setModalNovaPublicacao(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Publicação neste Canal</span>
          </button>
        )}
      </div>

      {/* Hero do Espaço */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TipoEspacoBadge tipo={espaco.tipo} />
          <span className="text-xs text-slate-400">
            Responsável: {espaco.responsavelNome}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{espaco.nome}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{espaco.descricao}</p>

        <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs space-y-1">
          <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
            Diretrizes do Canal:
          </span>
          <p className="text-slate-600 leading-relaxed">{espaco.regras}</p>
        </div>
      </div>

      {/* Feed do Espaço */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Publicações no Canal ({publicacoes.length})</span>
        </h2>

        {publicacoes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">Nenhuma publicação ainda neste canal.</p>
            {podePublicar && (
              <p className="text-[11px] text-slate-400">
                Compartilhe sua primeira mensagem ou dúvida com o grupo!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {publicacoes.map((pub) => (
              <PublicacaoCard
                key={pub.id}
                publicacao={pub}
                usuarioAtualId={alunoId}
                usuarioAtualNome={aluno?.nomeCompleto || identity?.nomeCompleto || "Aluno MTD"}
                usuarioAtualAvatar={(aluno?.avatarUrl || identity?.avatarUrl) || undefined}
                usuarioAtualPapel="aluno"
                permitirComentarios={espaco.permitirComentarios}
                isAdmin={false}
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
