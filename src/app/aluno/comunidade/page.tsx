"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  EspacoComunidade,
  PublicacaoComunidade,
  OportunidadeIntercambio,
  Aluno,
} from "@/types";
import {
  comunidadeRepository,
  alunoRepository,
  turmaRepository,
} from "@/data/api";
import { TipoEspacoBadge } from "@/components/comunidade/EspacoBadges";
import { PublicacaoCard } from "@/components/comunidade/PublicacaoCard";
import { PublicacaoFormModal } from "@/components/comunidade/PublicacaoFormModal";
import { OportunidadeCard } from "@/components/comunidade/OportunidadeCard";
import {
  MessageSquare,
  Globe,
  Plus,
  Plane,
  Search,
  Filter,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

export default function AlunoComunidadePage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || "alu-001");
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaIds, setTurmaIds] = useState<string[]>([]);
  const [espacos, setEspacos] = useState<EspacoComunidade[]>([]);
  const [publicacoes, setPublicacoes] = useState<PublicacaoComunidade[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadeIntercambio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [abaAtiva, setAbaAtiva] = useState<"feed" | "espacos" | "oportunidades">("feed");
  const [filtroEspacoId, setFiltroEspacoId] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalNovaPublicacao, setModalNovaPublicacao] = useState(false);

  const carregarDados = useCallback(async (isInitial = false, mounted = true) => {
    if (isInitial) {
      setLoading(true);
    }
    setError(null);
    try {
      const [alu, turmas] = await Promise.all([
        alunoRepository.obterPorId(alunoId),
        turmaRepository.listarPorAluno(alunoId),
      ]);

      if (!mounted) return;
      setAluno(alu || null);

      const tIds = turmas.map((t) => t.id);
      setTurmaIds(tIds);

      const [espList, pubList, opList] = await Promise.all([
        comunidadeRepository.listarEspacos(false, alu || undefined, tIds),
        comunidadeRepository.listarPublicacoes(undefined, true),
        comunidadeRepository.listarOportunidades(),
      ]);

      if (!mounted) return;
      setEspacos(espList);
      setPublicacoes(pubList);
      setOportunidades(opList);
    } catch (err: unknown) {
      if (mounted) {
        console.error("Erro ao carregar comunidade do aluno:", err);
        setError((err as Error)?.message || "Não foi possível carregar a comunidade.");
      }
    } finally {
      if (mounted && isInitial) {
        setLoading(false);
      }
    }
  }, [alunoId]);

  useEffect(() => {
    let isMounted = true;
    carregarDados(true, isMounted);

    const handleStorage = () => {
      if (isMounted) carregarDados(false, isMounted);
    };
    window.addEventListener("mtd_storage_updated", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("mtd_storage_updated", handleStorage);
    };
  }, [carregarDados]);

  // Espaços onde o aluno tem permissão para publicar
  const espacosOndePodePublicar = espacos.filter(
    (e) => e.status === "ativo" && e.permitirPublicacaoAluno
  );

  // Filtragem de publicações
  const publicacoesFiltradas = publicacoes.filter((p) => {
    if (filtroEspacoId !== "todos" && p.espacoId !== filtroEspacoId) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const matchTitulo = p.titulo?.toLowerCase().includes(q);
      const matchConteudo = (p.conteudo || p.texto || "").toLowerCase().includes(q);
      const matchAutor = p.autorNome.toLowerCase().includes(q);
      if (!matchTitulo && !matchConteudo && !matchAutor) return false;
    }
    return true;
  });

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
    carregarDados(false);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            <span>Comunidade MTD</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conecte-se com seus colegas de turma, compartilhe vitórias com flashcards e acesse oportunidades de intercâmbio.
          </p>
        </div>

        {espacosOndePodePublicar.length > 0 && (
          <button
            onClick={() => setModalNovaPublicacao(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Publicação</span>
          </button>
        )}
      </div>

      {/* Alerta de Erro com Retry */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => carregarDados()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setAbaAtiva("feed")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "feed"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Feed da Comunidade</span>
        </button>

        <button
          onClick={() => setAbaAtiva("espacos")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "espacos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Meus Espaços ({espacos.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva("oportunidades")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "oportunidades"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plane className="w-4 h-4" />
          <span>Oportunidades de Intercâmbio ({oportunidades.length})</span>
        </button>
      </div>

      {/* ABA 1: FEED CONSOLIDADO */}
      {abaAtiva === "feed" && (
        <div className="space-y-4">
          {/* Filtros rápidos */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar publicações..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filtroEspacoId}
                onChange={(e) => setFiltroEspacoId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos" className="bg-white text-slate-900">Todos os meus canais</option>
                {espacos.map((esp) => (
                  <option key={esp.id} value={esp.id} className="bg-white text-slate-900">
                    {esp.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Publicações */}
          {loading ? (
            <p className="text-xs text-slate-400">Carregando feed da comunidade...</p>
          ) : publicacoesFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Nenhuma publicação encontrada.</p>
              <p className="text-[11px] text-slate-400">
                Seja o primeiro a compartilhar uma dúvida ou conquista com seus colegas!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicacoesFiltradas.map((pub) => (
                <PublicacaoCard
                  key={pub.id}
                  publicacao={pub}
                  usuarioAtualId={alunoId}
                  usuarioAtualNome={aluno?.nomeCompleto || identity?.nomeCompleto || "Aluno MTD"}
                  usuarioAtualAvatar={(aluno?.avatarUrl || identity?.avatarUrl) || undefined}
                  usuarioAtualPapel="aluno"
                  isAdmin={false}
                  onAtualizar={() => carregarDados(false)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LISTAGEM DE ESPAÇOS */}
      {abaAtiva === "espacos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {espacos.map((esp) => (
            <div
              key={esp.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-indigo-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <TipoEspacoBadge tipo={esp.tipo} />
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {esp.totalPublicacoes || 0} publicações
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {esp.nome}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {esp.descricao}
                </p>

                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500">
                  <strong>Regras:</strong> {esp.regras}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {esp.permitirPublicacaoAluno ? "Publicações liberadas" : "Somente avisos"}
                </span>

                <Link
                  href={`/aluno/comunidade/${esp.id}`}
                  className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <span>Entrar no Canal</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA 3: OPORTUNIDADES DE INTERCÂMBIO */}
      {abaAtiva === "oportunidades" && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-3xl text-xs space-y-1">
            <h3 className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-600" />
              Programas de Imersão e Intercâmbio MTD
            </h3>
            <p className="text-indigo-800 leading-relaxed text-[11px]">
              Alunos com marcos operacionais ativos têm acesso prioritário a vagas subsidiadas em instituições internacionais parceiras. Clique em &quot;Demonstrar Interesse&quot; em qualquer oportunidade para ser orientado pela nossa equipe pedagógica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {oportunidades.map((op) => (
              <OportunidadeCard
                key={op.id}
                oportunidade={op}
                alunoId={alunoId}
                alunoNome={aluno?.nomeCompleto}
                alunoEmail={aluno?.email}
                alunoNivel={aluno?.nivel}
                onInteresseRegistrado={carregarDados}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal Nova Publicação */}
      {modalNovaPublicacao && (
        <PublicacaoFormModal
          isOpen={modalNovaPublicacao}
          onClose={() => setModalNovaPublicacao(false)}
          onSubmit={handleCriarPublicacao}
          espacosDisponiveis={espacosOndePodePublicar}
        />
      )}
    </div>
  );
}
