"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  EspacoComunidade,
  PublicacaoComunidade,
  DenunciaConteudo,
  OportunidadeIntercambio,
  Turma,
} from "@/types";
import { comunidadeRepository, turmaRepository } from "@/data/api";
import { TipoEspacoBadge, StatusEspacoBadge } from "@/components/comunidade/EspacoBadges";
import { PublicacaoCard } from "@/components/comunidade/PublicacaoCard";
import { PublicacaoFormModal } from "@/components/comunidade/PublicacaoFormModal";
import { OportunidadeCard } from "@/components/comunidade/OportunidadeCard";
import {
  MessageSquare,
  Globe,
  Plus,
  AlertTriangle,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  Plane,
  ShieldCheck,
  Send,
} from "lucide-react";
import { useAdminIdentity } from "@/app/admin/AdminLayoutClient";

export default function AdminComunidadePage() {
  const identity = useAdminIdentity();
  const adminId = identity?.id || "660640d2-99fc-46e7-8e12-9ef0d67b60ee";
  const adminNome = identity?.nomeCompleto || "Ray Pires";
  const adminAvatar = identity?.avatarUrl || undefined;

  const [abaAtiva, setAbaAtiva] = useState<"espacos" | "feed" | "moderacao" | "oportunidades">("espacos");

  const [espacos, setEspacos] = useState<EspacoComunidade[]>([]);
  const [publicacoes, setPublicacoes] = useState<PublicacaoComunidade[]>([]);
  const [denuncias, setDenuncias] = useState<DenunciaConteudo[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadeIntercambio[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroEspaco, setFiltroEspaco] = useState("todos");

  // Modais
  const [modalNovoEspaco, setModalNovoEspaco] = useState(false);
  const [modalNovaPublicacao, setModalNovaPublicacao] = useState(false);

  // Form de novo espaço
  const [nomeEspaco, setNomeEspaco] = useState("");
  const [descricaoEspaco, setDescricaoEspaco] = useState("");
  const [tipoEspaco, setTipoEspaco] = useState<import("@/types").TipoEspacoComunidade>("geral");
  const [turmaEspacoId, setTurmaEspacoId] = useState("");
  const [regrasEspaco, setRegrasEspaco] = useState("Respeito mútuo e incentivo ao aprendizado.");
  const [permitirPublicacaoAluno, setPermitirPublicacaoAluno] = useState(true);
  const [permitirComentarios, setPermitirComentarios] = useState(true);
  const [salvandoEspaco, setSalvandoEspaco] = useState(false);
  const [erroEspaco, setErroEspaco] = useState("");

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [espList, pubList, denList, opList, turmList] = await Promise.all([
        comunidadeRepository.listarEspacos(true),
        comunidadeRepository.listarPublicacoes(undefined, false),
        comunidadeRepository.listarDenuncias(),
        comunidadeRepository.listarOportunidades(),
        turmaRepository.listar(),
      ]);

      setEspacos(espList);
      setPublicacoes(pubList);
      setDenuncias(denList);
      setOportunidades(opList);
      setTurmas(turmList);
    } catch (err) {
      console.error("Erro ao carregar dados da comunidade:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Filtragem de publicações
  const publicacoesFiltradas = publicacoes.filter((p) => {
    if (filtroEspaco !== "todos" && p.espacoId !== filtroEspaco) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const matchTitulo = p.titulo?.toLowerCase().includes(q);
      const matchConteudo = (p.conteudo || p.texto || "").toLowerCase().includes(q);
      const matchAutor = p.autorNome.toLowerCase().includes(q);
      if (!matchTitulo && !matchConteudo && !matchAutor) return false;
    }
    return true;
  });

  const denunciasPendentes = denuncias.filter((d) => d.status === "pendente");

  async function handleCriarEspaco(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeEspaco.trim()) {
      setErroEspaco("Informe o nome do espaço.");
      return;
    }

    setSalvandoEspaco(true);
    setErroEspaco("");
    try {
      const turma = turmas.find((t) => t.id === turmaEspacoId);
      const res = await comunidadeRepository.salvarEspaco({
        nome: nomeEspaco.trim(),
        descricao: descricaoEspaco.trim(),
        tipo: tipoEspaco,
        turmaId: tipoEspaco === "turma" ? turmaEspacoId : undefined,
        turmaNome: tipoEspaco === "turma" ? turma?.nome : undefined,
        regras: regrasEspaco.trim(),
        permitirPublicacaoAluno,
        permitirComentarios,
        status: "ativo",
        responsavelNome: adminNome,
        criadoPorId: adminId,
        criadoPorNome: adminNome,
      });

      if (res.success) {
        setNomeEspaco("");
        setDescricaoEspaco("");
        setModalNovoEspaco(false);
        carregarDados();
      } else {
        setErroEspaco(res.error || "Erro ao criar espaço.");
      }
    } catch {
      setErroEspaco("Erro ao salvar espaço.");
    } finally {
      setSalvandoEspaco(false);
    }
  }

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
      autorId: adminId,
      autorNome: adminNome,
      autorPapel: "admin",
      autorAvatar: adminAvatar,
      tipo: dados.tipo,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      linkExternoUrl: dados.linkExternoUrl,
      linkExternoTitulo: dados.linkExternoTitulo,
    });
    carregarDados();
  }

  async function handleResolverDenuncia(
    denunciaId: string,
    decisao: "procedente" | "rejeitada"
  ) {
    const den = denuncias.find((d) => d.id === denunciaId);
    if (!den) return;

    if (decisao === "procedente") {
      // Oculta a publicação correspondente
      await comunidadeRepository.moderarPublicacao(
        den.publicacaoId,
        "ocultar",
        `Denúncia confirmada: ${den.motivo}`,
        adminId,
        adminNome
      );
    }

    den.status = decisao;
    carregarDados();
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            <span>Gestão da Comunidade & Moderação</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Espaços temáticos, comunicados oficiais, oportunidades de intercâmbio e fila de moderação pedagógica.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalNovaPublicacao(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Novo Comunicado Oficial</span>
          </button>

          <button
            onClick={() => setModalNovoEspaco(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Criar Espaço</span>
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setAbaAtiva("espacos")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "espacos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Espaços da Comunidade ({espacos.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva("feed")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "feed"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Feed de Publicações ({publicacoes.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva("moderacao")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "moderacao"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>
            Fila de Denúncias
            {denunciasPendentes.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {denunciasPendentes.length}
              </span>
            )}
          </span>
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

      {/* ABA 1: ESPAÇOS */}
      {abaAtiva === "espacos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {espacos.map((esp) => (
              <div
                key={esp.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <TipoEspacoBadge tipo={esp.tipo} />
                    <StatusEspacoBadge status={esp.status} />
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {esp.nome}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {esp.descricao}
                  </p>

                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div>
                      <strong>Regras:</strong> {esp.regras}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>Publicações de alunos: {esp.permitirPublicacaoAluno ? "Sim" : "Não"}</span>
                      <span>Total: {esp.totalPublicacoes || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {esp.responsavelNome}
                  </span>

                  <Link
                    href={`/admin/comunidade/${esp.id}`}
                    className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <span>Ver Espaço</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: FEED COMPLETO COM MODERAÇÃO */}
      {abaAtiva === "feed" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por texto, título ou autor..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filtroEspaco}
                onChange={(e) => setFiltroEspaco(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos">Todos os Espaços</option>
                {espacos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Publicações */}
          {loading ? (
            <p className="text-xs text-slate-400">Carregando feed...</p>
          ) : publicacoesFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Nenhuma publicação encontrada para os filtros atuais.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicacoesFiltradas.map((pub) => (
                <PublicacaoCard
                  key={pub.id}
                  publicacao={pub}
                  usuarioAtualId={adminId}
                  usuarioAtualNome={adminNome}
                  usuarioAtualAvatar={adminAvatar}
                  usuarioAtualPapel="admin"
                  isAdmin={true}
                  onAtualizar={carregarDados}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: FILA DE DENÚNCIAS */}
      {abaAtiva === "moderacao" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Denúncias ativas aguardando análise pedagógica
            </span>
            <span className="font-bold">{denunciasPendentes.length} pendente(s)</span>
          </div>

          {denuncias.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Tudo limpo na moderação!</p>
              <p className="text-[11px] text-slate-400">Nenhum conteúdo reportado no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {denuncias.map((den) => (
                <div
                  key={den.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {den.motivo.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        Reportado por: <strong>{den.denuncianteNome}</strong>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        em {new Date(den.criadoEm).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        den.status === "pendente"
                          ? "bg-amber-100 text-amber-800"
                          : den.status === "procedente"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {den.status.toUpperCase()}
                    </span>
                  </div>

                  {den.descricao && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                      &quot;{den.descricao}&quot;
                    </p>
                  )}

                  {den.status === "pendente" && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResolverDenuncia(den.id, "rejeitada")}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5 text-slate-400" />
                        <span>Rejeitar Denúncia</span>
                      </button>

                      <button
                        onClick={() => handleResolverDenuncia(den.id, "procedente")}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar e Ocultar Publicação</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 4: OPORTUNIDADES DE INTERCÂMBIO */}
      {abaAtiva === "oportunidades" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {oportunidades.map((op) => (
              <OportunidadeCard key={op.id} oportunidade={op} />
            ))}
          </div>
        </div>
      )}

      {/* Modal Novo Espaço */}
      {modalNovoEspaco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-sm">Criar Novo Espaço na Comunidade</h2>
              <button
                onClick={() => setModalNovoEspaco(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarEspaco} className="p-6 space-y-4">
              {erroEspaco && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {erroEspaco}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Espaço *
                </label>
                <input
                  type="text"
                  value={nomeEspaco}
                  onChange={(e) => setNomeEspaco(e.target.value)}
                  placeholder="Ex: Conversação Avançada • Debates e Notícias"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição do Espaço *
                </label>
                <textarea
                  rows={2}
                  value={descricaoEspaco}
                  onChange={(e) => setDescricaoEspaco(e.target.value)}
                  placeholder="Finalidade do canal e orientação para os alunos..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Espaço *
                  </label>
                  <select
                    value={tipoEspaco}
                    onChange={(e) => setTipoEspaco(e.target.value as import("@/types").TipoEspacoComunidade)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="geral">Geral (Aberto a todos)</option>
                    <option value="turma">Turma Específica</option>
                    <option value="nivel">Nível Operacional</option>
                    <option value="objetivo">Objetivo Específico</option>
                    <option value="oportunidades">Mural de Oportunidades</option>
                  </select>
                </div>

                {tipoEspaco === "turma" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Turma Vinculada *
                    </label>
                    <select
                      value={turmaEspacoId}
                      onChange={(e) => setTurmaEspacoId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs"
                      required
                    >
                      <option value="">Selecione...</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Regras do Espaço
                </label>
                <input
                  type="text"
                  value={regrasEspaco}
                  onChange={(e) => setRegrasEspaco(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={permitirPublicacaoAluno}
                    onChange={(e) => setPermitirPublicacaoAluno(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Permitir que alunos publiquem tópicos neste espaço
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={permitirComentarios}
                    onChange={(e) => setPermitirComentarios(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Permitir comentários em publicações deste espaço
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoEspaco(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEspaco}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {salvandoEspaco ? "Criando..." : "Criar Espaço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Publicação */}
      {modalNovaPublicacao && (
        <PublicacaoFormModal
          isOpen={modalNovaPublicacao}
          onClose={() => setModalNovaPublicacao(false)}
          onSubmit={handleCriarPublicacao}
          espacosDisponiveis={espacos}
        />
      )}
    </div>
  );
}
