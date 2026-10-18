"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Baralho,
  Cartao,
  OperationResult,
  StatusCartao,
  Turma,
  Aluno,
  Professor,
} from "@/types";
import {
  baralhoRepository,
  cartaoRepository,
  turmaRepository,
  alunoRepository,
  professorRepository,
} from "@/data/api";
import {
  BadgeDestinoTipo,
  BadgeStatusBaralho,
  BadgeStatusCartao,
} from "@/components/common/FlashcardBadges";
import { CartaoFormModal } from "@/components/admin/CartaoFormModal";
import { BaralhoFormModal } from "@/components/admin/BaralhoFormModal";
import { ImportarCartoesCSVModal } from "@/components/admin/ImportarCartoesCSVModal";
import {
  ArrowLeft,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Power,
  Volume2,
  VolumeX,
  ExternalLink,
  Search,
  CreditCard,
  AlertCircle,
} from "lucide-react";

export default function AdminBaralhoDetalhesPage() {
  const params = useParams();
  const baralhoId = params.id as string;

  const [baralho, setBaralho] = useState<Baralho | null>(null);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca interna
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusCartao | "todos">("todos");

  // Modais
  const [modalCartaoAberto, setModalCartaoAberto] = useState(false);
  const [cartaoParaEditar, setCartaoParaEditar] = useState<Cartao | null>(null);

  const [modalBaralhoAberto, setModalBaralhoAberto] = useState(false);
  const [modalCSVAberto, setModalCSVAberto] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!baralhoId) return;
    setLoading(true);
    try {
      const [baralhoRes, cartoesRes, turmasRes, alunosRes, profsRes] =
        await Promise.all([
          baralhoRepository.getBaralhoById(baralhoId),
          cartaoRepository.getCartoesPorBaralho(baralhoId),
          turmaRepository.listar(),
          alunoRepository.listar(),
          professorRepository.listar(),
        ]);

      setBaralho(baralhoRes);
      setCartoes(cartoesRes);
      setTurmas(turmasRes);
      setAlunos(alunosRes);
      setProfessores(profsRes);
    } finally {
      setLoading(false);
    }
  }, [baralhoId]);

  useEffect(() => {
    carregarDados();

    const handleStorageUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ entity: string }>;
      if (
        customEvent.detail?.entity === "baralhos" ||
        customEvent.detail?.entity === "cartoes"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
  }, [carregarDados]);

  const handleSalvarCartao = async (dados: Partial<Cartao>): Promise<OperationResult<Cartao>> => {
    const res = await cartaoRepository.salvarCartao(dados);
    if (res.success) {
      await carregarDados();
    }
    return res;
  };

  const handleToggleStatusCartao = async (cartao: Cartao) => {
    const novo = cartao.status === "ativo" ? "suspenso" : "ativo";
    await cartaoRepository.atualizarStatusCartao(cartao.id, novo);
    await carregarDados();
  };

  const handleExcluirCartao = async (cartao: Cartao) => {
    if (confirm(`Deseja realmente remover o cartão "${cartao.frente}"?`)) {
      await cartaoRepository.excluirCartao(cartao.id);
      await carregarDados();
    }
  };

  const handleSalvarBaralho = async (dados: Partial<Baralho>): Promise<OperationResult<Baralho>> => {
    const res = await baralhoRepository.salvarBaralho(dados);
    if (res.success) {
      await carregarDados();
    }
    return res;
  };

  const handleImportarCSV = async (
    itensValidos: Array<{
      frente: string;
      verso: string;
      exemplo?: string;
      traducao?: string;
      dica?: string;
      pronuncia?: string;
      tags?: string[];
    }>
  ): Promise<OperationResult<Cartao[]>> => {
    const res = await cartaoRepository.importarCartoesCSV(baralhoId, itensValidos);
    if (res.success) {
      await carregarDados();
    }
    return res;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-gray-400">
        Carregando detalhes do baralho...
      </div>
    );
  }

  if (!baralho) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Baralho não encontrado</h2>
        <p className="text-sm text-gray-500">
          O baralho solicitado não existe ou foi excluído localmente.
        </p>
        <Link
          href="/admin/flashcards"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Baralhos</span>
        </Link>
      </div>
    );
  }

  const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]));
  const alunoMap = new Map(alunos.map((a) => [a.id, a.nomeCompleto]));
  const destinoNome =
    baralho.destinoTipo === "turma" && baralho.destinoId
      ? turmaMap.get(baralho.destinoId)
      : baralho.destinoTipo === "aluno" && baralho.destinoId
      ? alunoMap.get(baralho.destinoId)
      : undefined;

  // Filtragem dos cartões
  const cartoesFiltrados = cartoes.filter((c) => {
    if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const matchFrente = c.frente.toLowerCase().includes(termo);
      const matchVerso = c.verso.toLowerCase().includes(termo);
      const matchExemplo = c.exemplo?.toLowerCase().includes(termo);
      const matchTags = c.tags?.some((t) => t.toLowerCase().includes(termo));
      if (!matchFrente && !matchVerso && !matchExemplo && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/admin/flashcards"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Baralhos</span>
        </Link>
      </div>

      {/* Cartão de Informações do Baralho */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <BadgeStatusBaralho status={baralho.status} />
              <BadgeDestinoTipo destinoTipo={baralho.destinoTipo} destinoNome={destinoNome} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                {baralho.nivelRecomendado === "todos" ? "Todos os Níveis" : baralho.nivelRecomendado}
              </span>
              <span className="text-xs text-gray-400 font-mono">ID: {baralho.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {baralho.nome}
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              {baralho.descricao}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setModalBaralhoAberto(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Baralho</span>
            </button>
            <button
              onClick={() => setModalCSVAberto(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar CSV</span>
            </button>
            <button
              onClick={() => {
                setCartaoParaEditar(null);
                setModalCartaoAberto(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Cartão</span>
            </button>
          </div>
        </div>

        {/* Metadados e Parâmetros SRS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block mb-0.5">Professor Responsável</span>
            <strong className="text-gray-900 font-semibold">{baralho.professorNome}</strong>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block mb-0.5">Categoria Pedagógica</span>
            <strong className="text-gray-900 font-semibold">{baralho.categoria}</strong>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block mb-0.5">Limite Diário de Novos</span>
            <strong className="text-gray-900 font-semibold">
              {baralho.limiteDiarioNovos} cartões/dia
            </strong>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block mb-0.5">Total de Cartões</span>
            <strong className="text-indigo-600 font-bold text-sm">
              {cartoes.length} cadastrados
            </strong>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca de Cartões */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por frente, verso ou tag..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusCartao | "todos")}
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filtrar cartões por status"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="suspenso">Suspensos</option>
          </select>

          <span className="text-xs text-gray-400 px-2">
            {cartoesFiltrados.length} de {cartoes.length} cartão(ões)
          </span>
        </div>
      </div>

      {/* Lista / Tabela de Cartões */}
      {cartoesFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Nenhum cartão neste baralho</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Adicione cartões manualmente pelo botão &ldquo;Novo Cartão&rdquo; ou faça uma importação em lote
            utilizando o botão &ldquo;Importar CSV&rdquo;.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50/70 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Frente (Pergunta / Expressão)</th>
                  <th className="px-4 py-3 text-left font-semibold">Verso (Significado)</th>
                  <th className="px-4 py-3 text-left font-semibold">Exemplo Contextual</th>
                  <th className="px-4 py-3 text-left font-semibold">Pronúncia & Dica</th>
                  <th className="px-4 py-3 text-center font-semibold">Áudio</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cartoesFiltrados.map((cartao) => {
                  const temAudio =
                    cartao.linkAudio && cartao.linkAudio.trim().startsWith("https://");

                  return (
                    <tr key={cartao.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Frente */}
                      <td className="px-4 py-3.5 font-bold text-gray-900 max-w-[180px]">
                        <div>{cartao.frente}</div>
                        {cartao.tags && cartao.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cartao.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.2 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Verso */}
                      <td className="px-4 py-3.5 text-gray-700 max-w-[200px]">
                        {cartao.verso}
                      </td>

                      {/* Exemplo */}
                      <td className="px-4 py-3.5 text-gray-600 max-w-[220px]">
                        {cartao.exemplo ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-gray-800 italic block">
                              &ldquo;{cartao.exemplo}&rdquo;
                            </span>
                            {cartao.traducao && (
                              <span className="text-[11px] text-gray-400 block">
                                {cartao.traducao}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Pronúncia e Dica */}
                      <td className="px-4 py-3.5 text-gray-600 max-w-[180px]">
                        {cartao.pronuncia && (
                          <div className="font-mono text-[11px] text-indigo-700 bg-indigo-50/60 px-1.5 py-0.5 rounded inline-block mb-1">
                            {cartao.pronuncia}
                          </div>
                        )}
                        {cartao.dica && (
                          <div className="text-[11px] text-amber-700 line-clamp-2">
                            💡 {cartao.dica}
                          </div>
                        )}
                        {!cartao.pronuncia && !cartao.dica && (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Áudio */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {temAudio ? (
                          <a
                            href={cartao.linkAudio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 p-1 rounded-lg hover:bg-indigo-50"
                            title="Ouvir áudio externo de referência (abre em nova aba)"
                          >
                            <Volume2 className="w-4 h-4" />
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span
                            className="text-gray-300 p-1 inline-block"
                            title="Áudio ainda não disponibilizado"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <BadgeStatusCartao status={cartao.status} />
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => {
                            setCartaoParaEditar(cartao);
                            setModalCartaoAberto(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar Cartão"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatusCartao(cartao)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cartao.status === "ativo"
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={cartao.status === "ativo" ? "Suspender cartão" : "Reativar cartão"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExcluirCartao(cartao)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Cartão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cartão */}
      <CartaoFormModal
        isOpen={modalCartaoAberto}
        onClose={() => {
          setModalCartaoAberto(false);
          setCartaoParaEditar(null);
        }}
        baralhoId={baralho.id}
        cartaoParaEditar={cartaoParaEditar}
        onSalvar={handleSalvarCartao}
      />

      {/* Modal Editar Baralho */}
      <BaralhoFormModal
        isOpen={modalBaralhoAberto}
        onClose={() => setModalBaralhoAberto(false)}
        baralhoParaEditar={baralho}
        onSalvar={handleSalvarBaralho}
        turmas={turmas}
        alunos={alunos}
        professores={professores}
      />

      {/* Modal Importar CSV */}
      <ImportarCartoesCSVModal
        isOpen={modalCSVAberto}
        onClose={() => setModalCSVAberto(false)}
        baralhoId={baralho.id}
        baralhoNome={baralho.nome}
        cartoesExistentes={cartoes}
        onImportar={handleImportarCSV}
      />
    </div>
  );
}
