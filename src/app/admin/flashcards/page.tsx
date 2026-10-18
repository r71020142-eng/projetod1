"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Baralho,
  BaralhoFilters,
  DestinoTipo,
  FlashcardsMetricasAdmin,
  NivelMaterial,
  OperationResult,
  StatusBaralho,
  Turma,
  Aluno,
  Professor,
  Cartao,
} from "@/types";
import {
  baralhoRepository,
  cartaoRepository,
  turmaRepository,
  alunoRepository,
  professorRepository,
  historicoRevisaoRepository,
} from "@/data/api";
import {
  BadgeDestinoTipo,
  BadgeStatusBaralho,
} from "@/components/common/FlashcardBadges";
import { BaralhoFormModal } from "@/components/admin/BaralhoFormModal";
import { ImportarCartoesCSVModal } from "@/components/admin/ImportarCartoesCSVModal";
import {
  Layers,
  Plus,
  Search,
  Upload,
  BookOpen,
  Users,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";

export default function AdminFlashcardsPage() {
  const [baralhos, setBaralhos] = useState<Baralho[]>([]);
  const [metricas, setMetricas] = useState<FlashcardsMetricasAdmin | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusBaralho | "todos">("todos");
  const [filtroNivel, setFiltroNivel] = useState<NivelMaterial>("todos");
  const [filtroDestino, setFiltroDestino] = useState<DestinoTipo | "todos">("todos");

  // Modais
  const [modalBaralhoAberto, setModalBaralhoAberto] = useState(false);
  const [baralhoParaEditar, setBaralhoParaEditar] = useState<Baralho | null>(null);

  const [modalCSVAberto, setModalCSVAberto] = useState(false);
  const [baralhoParaCSV, setBaralhoParaCSV] = useState<Baralho | null>(null);
  const [cartoesParaCSV, setCartoesParaCSV] = useState<Cartao[]>([]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const filtros: BaralhoFilters = {
        busca: busca.trim() || undefined,
        status: filtroStatus,
        nivel: filtroNivel,
        destinoTipo: filtroDestino,
      };

      const [baralhosRes, metricasRes, turmasRes, alunosRes, profsRes] =
        await Promise.all([
          baralhoRepository.getBaralhos(filtros),
          historicoRevisaoRepository.obterMetricasAdmin(),
          turmaRepository.listar(),
          alunoRepository.listar(),
          professorRepository.listar(),
        ]);

      setBaralhos(baralhosRes);
      setMetricas(metricasRes);
      setTurmas(turmasRes);
      setAlunos(alunosRes);
      setProfessores(profsRes);
    } finally {
      setLoading(false);
    }
  }, [busca, filtroStatus, filtroNivel, filtroDestino]);

  useEffect(() => {
    carregarDados();

    const handleStorageUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ entity: string }>;
      if (
        customEvent.detail?.entity === "baralhos" ||
        customEvent.detail?.entity === "cartoes" ||
        customEvent.detail?.entity === "historico_revisoes"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
  }, [carregarDados]);

  const handleSalvarBaralho = async (dados: Partial<Baralho>): Promise<OperationResult<Baralho>> => {
    const res = await baralhoRepository.salvarBaralho(dados);
    if (res.success) {
      await carregarDados();
    }
    return res;
  };

  const handleAbrirCSV = async (b: Baralho) => {
    setBaralhoParaCSV(b);
    const cards = await cartaoRepository.getCartoesPorBaralho(b.id);
    setCartoesParaCSV(cards);
    setModalCSVAberto(true);
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
    if (!baralhoParaCSV) return { success: false, error: "Baralho não selecionado." };
    const res = await cartaoRepository.importarCartoesCSV(baralhoParaCSV.id, itensValidos);
    if (res.success) {
      await carregarDados();
    }
    return res;
  };

  const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]));
  const alunoMap = new Map(alunos.map((a) => [a.id, a.nomeCompleto]));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
              Etapa 6 • Repetição Espaçada
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Método Paulo SRS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Gestão de Baralhos & Flashcards
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Criação de baralhos, cartões, parâmetros pedagógicos e algoritmo determinístico de revisão.
          </p>
        </div>

        <button
          onClick={() => {
            setBaralhoParaEditar(null);
            setModalBaralhoAberto(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Baralho</span>
        </button>
      </div>

      {/* Disclaimers Informativos */}
      <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>Repetição Espaçada MTD:</strong> O agendamento das revisões é calculado
            automaticamente com base na avaliação do discente (<em>Errei</em>, <em>Difícil</em>,{" "}
            <em>Bom</em> ou <em>Fácil</em>) e fatores de facilidade matemáticos.
          </p>
          <p className="text-blue-700">
            O sistema é inspirado em princípios comprovados de repetição espaçada. Não há e não se declara
            qualquer integração oficial ou dependência com o software Anki. Dados demonstrativos persistidos no navegador.
          </p>
        </div>
      </div>

      {/* Métricas Administrativas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.totalBaralhosPublicados ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Baralhos Publicados</div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.totalCartoesAtivos ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Cartões Ativos</div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.revisoesRealizadas ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Revisões Realizadas</div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {metricas?.alunosAtivosRevisando ?? 0}
            </div>
            <div className="text-xs font-semibold text-gray-500">Alunos Ativos</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, descrição ou tag..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtros em Linha */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusBaralho | "todos")}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho</option>
              <option value="arquivado">Arquivado</option>
            </select>

            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value as NivelMaterial)}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Filtrar por nível"
            >
              <option value="todos">Todos os níveis</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>

            <select
              value={filtroDestino}
              onChange={(e) => setFiltroDestino(e.target.value as DestinoTipo | "todos")}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Filtrar por destino"
            >
              <option value="todos">Todos os destinos</option>
              <option value="geral">Geral (Todos)</option>
              <option value="turma">Turma específica</option>
              <option value="aluno">Individual</option>
            </select>

            {(busca || filtroStatus !== "todos" || filtroNivel !== "todos" || filtroDestino !== "todos") && (
              <button
                onClick={() => {
                  setBusca("");
                  setFiltroStatus("todos");
                  setFiltroNivel("todos");
                  setFiltroDestino("todos");
                }}
                className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Baralhos */}
      {loading ? (
        <div className="p-12 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
          Carregando baralhos pedagógicos...
        </div>
      ) : baralhos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-3">
          <Layers className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Nenhum baralho encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Não há baralhos que correspondam aos filtros selecionados. Tente ajustar os parâmetros
            ou crie um novo baralho.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {baralhos.map((b) => {
            const destinoNome =
              b.destinoTipo === "turma" && b.destinoId
                ? turmaMap.get(b.destinoId)
                : b.destinoTipo === "aluno" && b.destinoId
                ? alunoMap.get(b.destinoId)
                : undefined;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Linha de Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <BadgeStatusBaralho status={b.status} />
                      <BadgeDestinoTipo destinoTipo={b.destinoTipo} destinoNome={destinoNome} />
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                        {b.nivelRecomendado === "todos" ? "Todos os Níveis" : b.nivelRecomendado}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {b.totalCartoes || 0} cartão(ões)
                    </span>
                  </div>

                  {/* Título e Descrição */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {b.nome}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {b.descricao}
                    </p>
                  </div>

                  {/* Metadados pedagógicos */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 pt-1 border-t border-gray-50">
                    <div>
                      <span className="text-gray-400">Categoria:</span>{" "}
                      <strong className="text-gray-700">{b.categoria}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Responsável:</span>{" "}
                      <strong className="text-gray-700">{b.professorNome}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Novos/dia:</span>{" "}
                      <strong className="text-gray-700">{b.limiteDiarioNovos}</strong>
                    </div>
                  </div>

                  {/* Tags */}
                  {b.tags && b.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {b.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[10px] text-gray-500"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setBaralhoParaEditar(b);
                        setModalBaralhoAberto(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleAbrirCSV(b)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Importar lista de cartões via CSV para este baralho"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  <Link
                    href={`/admin/flashcards/${b.id}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <span>Ver Cartões</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Baralho */}
      <BaralhoFormModal
        isOpen={modalBaralhoAberto}
        onClose={() => {
          setModalBaralhoAberto(false);
          setBaralhoParaEditar(null);
        }}
        baralhoParaEditar={baralhoParaEditar}
        onSalvar={handleSalvarBaralho}
        turmas={turmas}
        alunos={alunos}
        professores={professores}
      />

      {/* Modal de Importação CSV */}
      {baralhoParaCSV && (
        <ImportarCartoesCSVModal
          isOpen={modalCSVAberto}
          onClose={() => {
            setModalCSVAberto(false);
            setBaralhoParaCSV(null);
          }}
          baralhoId={baralhoParaCSV.id}
          baralhoNome={baralhoParaCSV.nome}
          cartoesExistentes={cartoesParaCSV}
          onImportar={handleImportarCSV}
        />
      )}
    </div>
  );
}
