"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Programa,
  Etapa,
  Modulo,
  Avaliacao,
  TentativaAvaliacao,
  ProgressoModuloAluno,
  Professor,
  Turma,
  Aluno,
  TipoAvaliacao,
  StatusAvaliacao,
  StatusTentativa,
  StatusProgressoModulo,
  CriteriosConclusaoModulo,
  FeedbackAvaliacao,
  ResultadoAvaliacao,
} from "@/types";
import {
  programaRepository,
  etapaRepository,
  moduloRepository,
  progressoModuloRepository,
  avaliacaoRepository,
  tentativaAvaliacaoRepository,
  professorRepository,
  turmaRepository,
  alunoRepository,
} from "@/data/api";
import {
  TipoAvaliacaoBadge,
  StatusAvaliacaoBadge,
  StatusTentativaBadge,
  ResultadoBadge,
  StatusProgressoModuloBadge,
} from "@/components/admin/AvaliacaoBadges";
import {
  ProgramaFormModal,
  EtapaFormModal,
  ModuloFormModal,
  CriteriosConclusaoModal,
} from "@/components/admin/MetodoEstruturaModals";
import { AvaliacaoFormModal } from "@/components/admin/AvaliacaoFormModal";
import { CorrigirTentativaPraticaModal } from "@/components/admin/CorrigirTentativaPraticaModal";
import {
  ValidarModuloModal,
  ReabrirModuloModal,
  AutorizarTentativaModal,
} from "@/components/admin/ProgressoAcoesModals";
import {
  BookOpen,
  Layers,
  Sliders,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Copy,
  FileText,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  KeyRound,
} from "lucide-react";

type AbaAtiva = "estrutura" | "avaliacoes" | "tentativas" | "progresso";

export default function AdminAvaliacoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("avaliacoes");
  const [loading, setLoading] = useState(true);

  // Dados
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [tentativas, setTentativas] = useState<TentativaAvaliacao[]>([]);
  const [progressos, setProgressos] = useState<ProgressoModuloAluno[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  // Modais de Estrutura
  const [isProgramaModalOpen, setIsProgramaModalOpen] = useState(false);
  const [programaParaEditar, setProgramaParaEditar] = useState<Programa | null>(null);

  const [isEtapaModalOpen, setIsEtapaModalOpen] = useState(false);
  const [etapaParaEditar, setEtapaParaEditar] = useState<Etapa | null>(null);

  const [isModuloModalOpen, setIsModuloModalOpen] = useState(false);
  const [moduloParaEditar, setModuloParaEditar] = useState<Modulo | null>(null);
  const [etapaSelecionadaParaNovoModulo, setEtapaSelecionadaParaNovoModulo] = useState<string>("");

  const [isCriteriosModalOpen, setIsCriteriosModalOpen] = useState(false);
  const [moduloParaCriterios, setModuloParaCriterios] = useState<Modulo | null>(null);

  // Modais de Avaliação & Correção
  const [isAvaliacaoModalOpen, setIsAvaliacaoModalOpen] = useState(false);
  const [avaliacaoParaEditar, setAvaliacaoParaEditar] = useState<Avaliacao | null>(null);

  const [isCorrigirModalOpen, setIsCorrigirModalOpen] = useState(false);
  const [tentativaParaCorrigir, setTentativaParaCorrigir] = useState<TentativaAvaliacao | null>(null);
  const [avaliacaoDaTentativa, setAvaliacaoDaTentativa] = useState<Avaliacao | null>(null);

  // Modais de Ações de Progresso
  const [isValidarModalOpen, setIsValidarModalOpen] = useState(false);
  const [progressoParaValidar, setProgressoParaValidar] = useState<ProgressoModuloAluno | null>(null);

  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [progressoParaReabrir, setProgressoParaReabrir] = useState<ProgressoModuloAluno | null>(null);

  const [isAutorizarModalOpen, setIsAutorizarModalOpen] = useState(false);
  const [tentativaParaAutorizar, setTentativaParaAutorizar] = useState<{
    avaliacao: Avaliacao;
    aluno: Aluno;
  } | null>(null);

  // Filtros
  const [buscaAvaliacao, setBuscaAvaliacao] = useState("");
  const [filtroTipoAvaliacao, setFiltroTipoAvaliacao] = useState<TipoAvaliacao | "todos">("todos");
  const [filtroStatusAvaliacao, setFiltroStatusAvaliacao] = useState<StatusAvaliacao | "todos">("todos");
  const [filtroModuloAvaliacao, setFiltroModuloAvaliacao] = useState<string>("todos");

  const [buscaTentativa, setBuscaTentativa] = useState("");
  const [filtroStatusTentativa, setFiltroStatusTentativa] = useState<StatusTentativa | "todos">("todos");
  const [filtroTipoTentativa, setFiltroTipoTentativa] = useState<TipoAvaliacao | "todos">("todos");

  const [filtroStatusProgresso, setFiltroStatusProgresso] = useState<StatusProgressoModulo | "todos">("todos");
  const [filtroModuloProgresso, setFiltroModuloProgresso] = useState<string>("todos");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [
        progs,
        etps,
        mods,
        avals,
        tents,
        progsMod,
        profs,
        trms,
        alns,
      ] = await Promise.all([
        programaRepository.listar(),
        etapaRepository.listar(),
        moduloRepository.listar(),
        avaliacaoRepository.listar(),
        tentativaAvaliacaoRepository.listar(),
        progressoModuloRepository.listar(),
        professorRepository.listar(),
        turmaRepository.listar(),
        alunoRepository.listar(),
      ]);

      setProgramas(progs);
      setEtapas(etps);
      setModulos(mods);
      setAvaliacoes(avals);
      setTentativas(tents);
      setProgressos(progsMod);
      setProfessores(profs);
      setTurmas(trms);
      setAlunos(alns);
    } catch (err) {
      console.error("Erro ao carregar dados pedagógicos:", err);
    } finally {
      setLoading(false);
    }
  }

  // Operações de Programa / Etapa / Módulo
  async function handleSalvarPrograma(data: Partial<Programa>) {
    await programaRepository.salvar(data as unknown as Parameters<typeof programaRepository.salvar>[0]);
    await carregarDados();
  }

  async function handleSalvarEtapa(data: Partial<Etapa>) {
    await etapaRepository.salvar(data as unknown as Parameters<typeof etapaRepository.salvar>[0]);
    await carregarDados();
  }

  async function handleMoverEtapa(id: string, direcao: "cima" | "baixo") {
    await etapaRepository.moverOrdem(id, direcao);
    await carregarDados();
  }

  async function handleSalvarModulo(data: Partial<Modulo>) {
    await moduloRepository.salvar(data as unknown as Parameters<typeof moduloRepository.salvar>[0]);
    await carregarDados();
  }

  async function handleMoverModulo(id: string, direcao: "cima" | "baixo") {
    await moduloRepository.moverOrdem(id, direcao);
    await carregarDados();
  }

  async function handleSalvarCriterios(moduloId: string, criterios: CriteriosConclusaoModulo) {
    await moduloRepository.atualizarCriteriosConclusao(moduloId, criterios);
    await carregarDados();
  }

  // Operações de Avaliação
  async function handleSalvarAvaliacao(data: Partial<Avaliacao>) {
    await avaliacaoRepository.salvar(data as unknown as Parameters<typeof avaliacaoRepository.salvar>[0]);
    await carregarDados();
  }

  async function handleDuplicarVersao(id: string) {
    const confirm = window.confirm(
      "Deseja criar uma nova versão (v+1) desta avaliação? Ela herdará as questões/rubrica e permitirá ajustes sem afetar o histórico de tentativas anteriores."
    );
    if (!confirm) return;
    await avaliacaoRepository.duplicarComoNovaVersao(id);
    await carregarDados();
  }

  async function handleAlterarStatusAvaliacao(id: string, novoStatus: StatusAvaliacao) {
    await avaliacaoRepository.alterarStatus(id, novoStatus);
    await carregarDados();
  }

  // Operações de Correção
  async function handleSalvarCorrecao(
    tentativaId: string,
    _nota: number,
    resultado: ResultadoAvaliacao,
    feedback: FeedbackAvaliacao
  ) {
    await tentativaAvaliacaoRepository.corrigirTentativaPratica(
      tentativaId,
      feedback.corrigidoPorProfessorId,
      feedback.corrigidoPorProfessorNome,
      {
        itensRubrica: (feedback.itensRubrica || []).map((it) => ({
          criterioId: it.criterioId,
          pontosAtribuidos: it.pontosAtribuidos,
          comentario: it.comentario,
        })),
        pontosFortes: feedback.pontosFortes || "",
        pontosADesenvolver: feedback.pontosADesenvolver || "",
        orientacoes: feedback.orientacoes || "",
        observacoesInternas: feedback.observacoesInternas,
        resultado,
      }
    );
    await carregarDados();
  }

  // Operações de Progresso e Validação
  async function handleConfirmarValidacao(
    alunoId: string,
    moduloId: string,
    profId: string,
    profNome: string,
    observacao?: string
  ) {
    await progressoModuloRepository.validarConclusaoProfessor(
      alunoId,
      moduloId,
      profId,
      profNome,
      observacao
    );
    await carregarDados();
  }

  async function handleConfirmarReabertura(
    alunoId: string,
    moduloId: string,
    profId: string,
    profNome: string,
    justificativa: string
  ) {
    await progressoModuloRepository.reabrirModulo(
      alunoId,
      moduloId,
      profId,
      profNome,
      justificativa
    );
    await carregarDados();
  }

  async function handleConfirmarAutorizacao(
    avaliacaoId: string,
    alunoId: string,
    profId: string,
    profNome: string,
    justificativa: string
  ) {
    await tentativaAvaliacaoRepository.autorizarTentativaExtra(
      avaliacaoId,
      alunoId,
      profId,
      profNome,
      justificativa
    );
    await carregarDados();
  }

  // Métricas rápidas
  const totalAguardandoCorrecao = tentativas.filter(
    (t) => t.status === "aguardando_correcao"
  ).length;

  const totalAguardandoValidacao = progressos.filter(
    (p) => p.status === "aguardando_validacao"
  ).length;

  // Filtragem Avaliações
  const avaliacoesFiltradas = avaliacoes.filter((a) => {
    if (buscaAvaliacao) {
      const termo = buscaAvaliacao.toLowerCase();
      const matchTitulo = a.titulo.toLowerCase().includes(termo);
      const matchDesc = (a.descricao || "").toLowerCase().includes(termo);
      if (!matchTitulo && !matchDesc) return false;
    }
    if (filtroTipoAvaliacao !== "todos" && a.tipo !== filtroTipoAvaliacao) return false;
    if (filtroStatusAvaliacao !== "todos" && a.status !== filtroStatusAvaliacao) return false;
    if (filtroModuloAvaliacao !== "todos" && a.moduloId !== filtroModuloAvaliacao) return false;
    return true;
  });

  // Filtragem Tentativas
  const tentativasFiltradas = tentativas.filter((t) => {
    const aval = avaliacoes.find((a) => a.id === t.avaliacaoId);
    if (buscaTentativa) {
      const termo = buscaTentativa.toLowerCase();
      const matchAluno = (t.alunoNome || "").toLowerCase().includes(termo);
      const matchAval = (aval?.titulo || "").toLowerCase().includes(termo);
      if (!matchAluno && !matchAval) return false;
    }
    if (filtroStatusTentativa !== "todos" && t.status !== filtroStatusTentativa) return false;
    if (filtroTipoTentativa !== "todos" && aval?.tipo !== filtroTipoTentativa) return false;
    return true;
  });

  // Filtragem Progressos
  const progressosFiltrados = progressos.filter((p) => {
    if (filtroStatusProgresso !== "todos" && p.status !== filtroStatusProgresso) return false;
    if (filtroModuloProgresso !== "todos" && p.moduloId !== filtroModuloProgresso) return false;
    return true;
  });

  const professorAtivo = professores[0] || {
    id: "prof-001",
    nomeCompleto: "Lucas Ferreira",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Método Paulo • Gestão Curricular & Avaliativa</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Estrutura do Método & Avaliações
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configuração de etapas, módulos pedagógicos, critérios de conclusão, testes objetivos e práticas.
            {loading && " (Atualizando dados pedagógicos...)"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {abaAtiva === "estrutura" && (
            <button
              onClick={() => {
                setProgramaParaEditar(null);
                setIsProgramaModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Novo Programa
            </button>
          )}

          {abaAtiva === "avaliacoes" && (
            <button
              onClick={() => {
                setAvaliacaoParaEditar(null);
                setIsAvaliacaoModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Nova Avaliação
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setAbaAtiva("avaliacoes")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
              abaAtiva === "avaliacoes"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Avaliações ({avaliacoes.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva("tentativas")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 relative ${
              abaAtiva === "tentativas"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Tentativas & Correção ({tentativas.length})</span>
            {totalAguardandoCorrecao > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {totalAguardandoCorrecao}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva("progresso")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
              abaAtiva === "progresso"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Progresso dos Alunos ({progressos.length})</span>
            {totalAguardandoValidacao > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                {totalAguardandoValidacao}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva("estrutura")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
              abaAtiva === "estrutura"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Estrutura do Método Paulo</span>
          </button>
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: AVALIAÇÕES */}
      {/* ==================================================================== */}
      {abaAtiva === "avaliacoes" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar avaliação por título ou descrição..."
                value={buscaAvaliacao}
                onChange={(e) => setBuscaAvaliacao(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filtroTipoAvaliacao}
                onChange={(e) => setFiltroTipoAvaliacao(e.target.value as TipoAvaliacao | "todos")}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="objetiva">Objetiva</option>
                <option value="pratica">Prática</option>
              </select>

              <select
                value={filtroStatusAvaliacao}
                onChange={(e) => setFiltroStatusAvaliacao(e.target.value as StatusAvaliacao | "todos")}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
              >
                <option value="todos">Todos os Status</option>
                <option value="publicada">Publicada</option>
                <option value="rascunho">Rascunho</option>
                <option value="agendada">Agendada</option>
                <option value="encerrada">Encerrada</option>
                <option value="arquivada">Arquivada</option>
              </select>

              <select
                value={filtroModuloAvaliacao}
                onChange={(e) => setFiltroModuloAvaliacao(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
              >
                <option value="todos">Todos os Módulos</option>
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Avaliações */}
          {avaliacoesFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação encontrada.</p>
              <p className="text-xs text-slate-400">Ajuste os filtros ou crie uma nova avaliação.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {avaliacoesFiltradas.map((a) => {
                const mod = modulos.find((m) => m.id === a.moduloId);
                const etp = etapas.find((e) => e.id === a.etapaId);
                const tentsCount = tentativas.filter((t) => t.avaliacaoId === a.id).length;

                return (
                  <div
                    key={a.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-200 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TipoAvaliacaoBadge tipo={a.tipo} />
                          <StatusAvaliacaoBadge status={a.status} />
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                            v{a.versao}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {a.titulo}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {etp?.nome || "Etapa"} • {mod?.nome || "Módulo"}
                        </p>
                      </div>
                    </div>

                    {a.descricao && (
                      <p className="text-xs text-slate-600 line-clamp-2">{a.descricao}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Tentativas</span>
                        <span className="font-semibold text-slate-800">
                          {a.maxTentativas} por aluno
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Nota Máx / Mín</span>
                        <span className="font-semibold text-slate-800">
                          {a.notaMaxima} / {a.notaMinimaAprovacao ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Submissões</span>
                        <span className="font-semibold text-indigo-600">
                          {tentsCount} realizadas
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setAvaliacaoParaEditar(a);
                            setIsAvaliacaoModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDuplicarVersao(a.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition"
                          title="Duplicar para uma nova versão sem quebrar histórico de tentativas"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicar v{a.versao + 1}
                        </button>
                        <select
                          value={a.status}
                          onChange={(e) =>
                            handleAlterarStatusAvaliacao(a.id, e.target.value as StatusAvaliacao)
                          }
                          className="text-[11px] font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          aria-label={`Alterar status de ${a.titulo}`}
                        >
                          <option value="rascunho">Rascunho</option>
                          <option value="publicada">Publicada</option>
                          <option value="arquivada">Arquivada</option>
                        </select>
                      </div>

                      <Link
                        href={`/admin/avaliacoes/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        <span>Ver Detalhes</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: TENTATIVAS & FILA DE CORREÇÃO */}
      {/* ==================================================================== */}
      {abaAtiva === "tentativas" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por aluno ou avaliação..."
                value={buscaTentativa}
                onChange={(e) => setBuscaTentativa(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() =>
                setFiltroStatusTentativa(
                  filtroStatusTentativa === "aguardando_correcao" ? "todos" : "aguardando_correcao"
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filtroStatusTentativa === "aguardando_correcao"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Fila de Correção ({totalAguardandoCorrecao})
            </button>

            <select
              value={filtroStatusTentativa}
              onChange={(e) => setFiltroStatusTentativa(e.target.value as StatusTentativa | "todos")}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
            >
              <option value="todos">Todos os Status</option>
              <option value="aguardando_correcao">Aguardando Correção</option>
              <option value="corrigida">Corrigida</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="reaberta">Reaberta</option>
            </select>

            <select
              value={filtroTipoTentativa}
              onChange={(e) => setFiltroTipoTentativa(e.target.value as TipoAvaliacao | "todos")}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="pratica">Prática (Correção Humana)</option>
              <option value="objetiva">Objetiva</option>
            </select>
          </div>

          {/* Tabela de Tentativas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Aluno</th>
                    <th className="py-3 px-4 font-semibold">Avaliação & Tipo</th>
                    <th className="py-3 px-4 font-semibold text-center">Tentativa</th>
                    <th className="py-3 px-4 font-semibold">Data Envio</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Nota</th>
                    <th className="py-3 px-4 font-semibold">Resultado</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tentativasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhuma tentativa encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    tentativasFiltradas.map((t) => {
                      const aval = avaliacoes.find((a) => a.id === t.avaliacaoId);
                      const isAguardando = t.status === "aguardando_correcao";

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50/70 transition ${
                            isAguardando ? "bg-amber-50/30 font-medium" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {t.alunoNome || t.alunoId}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-900">{aval?.titulo || "Avaliação"}</div>
                            <div className="text-[10px] text-slate-400">
                              {aval?.tipo === "objetiva" ? "Objetiva (Automática)" : "Prática (Humana)"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                              #{t.numeroTentativa}
                            </span>
                            {t.autorizacaoTentativaExtra && (
                              <span
                                className="block text-[10px] text-indigo-600 mt-0.5"
                                title={t.autorizacaoTentativaExtra.justificativa}
                              >
                                (Extra)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {t.enviadaEm
                              ? new Date(t.enviadaEm).toLocaleDateString("pt-BR")
                              : new Date(t.iniciadaEm).toLocaleDateString("pt-BR")}
                            {t.atrasada && (
                              <span className="block text-[10px] text-rose-600 font-semibold">
                                Atrasada
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusTentativaBadge status={t.status} />
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            {t.nota !== undefined ? (
                              <span className={t.nota >= (aval?.notaMinimaAprovacao || 7) ? "text-emerald-700" : "text-rose-600"}>
                                {t.nota.toFixed(1)} / {t.notaMaxima ?? 10}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <ResultadoBadge resultado={t.resultado} />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {aval?.tipo === "pratica" && (
                              <button
                                onClick={() => {
                                  setTentativaParaCorrigir(t);
                                  setAvaliacaoDaTentativa(aval || null);
                                  setIsCorrigirModalOpen(true);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition ${
                                  isAguardando
                                    ? "bg-purple-600 text-white hover:bg-purple-700"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {isAguardando ? "Corrigir Agora" : "Ver / Editar Correção"}
                              </button>
                            )}

                            {aval && (
                              <button
                                onClick={() => {
                                  const aln = alunos.find((a) => a.id === t.alunoId) || {
                                    id: t.alunoId,
                                    nomeCompleto: t.alunoNome || "Aluno",
                                  } as Aluno;
                                  setTentativaParaAutorizar({ avaliacao: aval, aluno: aln });
                                  setIsAutorizarModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Autorizar tentativa adicional para este aluno"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: PROGRESSO DOS ALUNOS */}
      {/* ==================================================================== */}
      {abaAtiva === "progresso" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                setFiltroStatusProgresso(
                  filtroStatusProgresso === "aguardando_validacao" ? "todos" : "aguardando_validacao"
                )
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filtroStatusProgresso === "aguardando_validacao"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Aguardando Validação do Professor ({totalAguardandoValidacao})
            </button>

            <select
              value={filtroStatusProgresso}
              onChange={(e) => setFiltroStatusProgresso(e.target.value as StatusProgressoModulo | "todos")}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
            >
              <option value="todos">Todos os Status</option>
              <option value="aguardando_validacao">Aguardando Validação</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="reaberto">Reaberto</option>
              <option value="nao_iniciado">Não Iniciado</option>
            </select>

            <select
              value={filtroModuloProgresso}
              onChange={(e) => setFiltroModuloProgresso(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
            >
              <option value="todos">Todos os Módulos</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Tabela de Progresso */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Aluno</th>
                    <th className="py-3 px-4 font-semibold">Módulo</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Critérios & Progresso</th>
                    <th className="py-3 px-4 font-semibold text-center">Presença</th>
                    <th className="py-3 px-4 font-semibold text-center">Média Obj.</th>
                    <th className="py-3 px-4 font-semibold text-center">Prática</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação Pedagógica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {progressosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum registro de progresso encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    progressosFiltrados.map((p) => {
                      const aln = alunos.find((a) => a.id === p.alunoId);
                      const mod = modulos.find((m) => m.id === p.moduloId);
                      const ind = p.indicadoresCalculados;
                      const isAguardando = p.status === "aguardando_validacao";

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/70 transition ${
                            isAguardando ? "bg-amber-50/30 font-medium" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {aln?.nomeCompleto || p.alunoId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800">{mod?.nome || p.moduloId}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusProgressoModuloBadge status={p.status} />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-slate-800">
                                {ind.criteriosCumpridos} / {ind.totalCriteriosAplicaveis} (
                                {ind.percentualConclusao.toFixed(0)}%)
                              </span>
                              <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{ width: `${ind.percentualConclusao}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ind.presencaPercentual !== null && ind.presencaPercentual !== undefined ? (
                              <span
                                className={`font-semibold ${
                                  ind.presencaCumprida ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {ind.presencaPercentual.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ind.mediaAvaliacoesObjetivas !== null && ind.mediaAvaliacoesObjetivas !== undefined ? (
                              <span
                                className={`font-semibold ${
                                  ind.objetivasCumpridas ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {ind.mediaAvaliacoesObjetivas.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ind.avaliacaoPraticaConcluida ? (
                              ind.avaliacaoPraticaAprovada ? (
                                <span className="text-emerald-700 font-semibold">Aprovada</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">Pendente</span>
                              )
                            ) : (
                              <span className="text-slate-400">Não enviada</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {isAguardando && (
                              <button
                                onClick={() => {
                                  setProgressoParaValidar(p);
                                  setIsValidarModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-xs transition"
                              >
                                Validar Conclusão
                              </button>
                            )}

                            {p.status === "concluido" && (
                              <button
                                onClick={() => {
                                  setProgressoParaReabrir(p);
                                  setIsReabrirModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium transition"
                              >
                                Reabrir Módulo
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 4: ESTRUTURA DO MÉTODO PAULO */}
      {/* ==================================================================== */}
      {abaAtiva === "estrutura" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Estrutura Curricular Configurável</p>
              <p className="text-indigo-900 leading-relaxed">
                O Método Paulo organiza a evolução do aluno em <strong>Programas</strong>, <strong>Etapas</strong> e <strong>Módulos</strong>. Os nomes apresentados são demonstrativos e podem ser ajustados ou ampliados conforme a metodologia evolui.
              </p>
            </div>
          </div>

          {programas.map((prog) => {
            const etapasDoProg = etapas
              .filter((e) => e.programaId === prog.id)
              .sort((a, b) => a.ordem - b.ordem);

            return (
              <div
                key={prog.id}
                className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6"
              >
                {/* Header do Programa */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{prog.nome}</h2>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {prog.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{prog.descricao}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span>Idioma: {prog.idioma}</span>
                      <span>•</span>
                      <span>Duração estimada: {prog.duracaoMesesEstimada} meses</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setProgramaParaEditar(prog);
                        setIsProgramaModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
                    >
                      Editar Programa
                    </button>
                    <button
                      onClick={() => {
                        setEtapaParaEditar(null);
                        setIsEtapaModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Etapa
                    </button>
                  </div>
                </div>

                {/* Etapas do Programa */}
                <div className="space-y-4">
                  {etapasDoProg.map((etp, eIdx) => {
                    const modulosDaEtapa = modulos
                      .filter((m) => m.etapaId === etp.id)
                      .sort((a, b) => a.ordem - b.ordem);

                    return (
                      <div
                        key={etp.id}
                        className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                              {eIdx + 1}
                            </span>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{etp.nome}</h3>
                              <p className="text-xs text-slate-500">{etp.descricao}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoverEtapa(etp.id, "cima")}
                              disabled={eIdx === 0}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoverEtapa(etp.id, "baixo")}
                              disabled={eIdx === etapasDoProg.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEtapaParaEditar(etp);
                                setIsEtapaModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setEtapaSelecionadaParaNovoModulo(etp.id);
                                setModuloParaEditar(null);
                                setIsModuloModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Novo Módulo
                            </button>
                          </div>
                        </div>

                        {/* Módulos da Etapa */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                          {modulosDaEtapa.map((m, mIdx) => (
                            <div
                              key={m.id}
                              className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-400">
                                      #{mIdx + 1}
                                    </span>
                                    <h4 className="font-bold text-slate-900 text-xs">{m.nome}</h4>
                                  </div>
                                  {m.nivelReferenciaCEFR && (
                                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                                      Ref: {m.nivelReferenciaCEFR}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleMoverModulo(m.id, "cima")}
                                    disabled={mIdx === 0}
                                    className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                    title="Mover para cima"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoverModulo(m.id, "baixo")}
                                    disabled={mIdx === modulosDaEtapa.length - 1}
                                    className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {m.descricao && (
                                <p className="text-xs text-slate-500 line-clamp-2">{m.descricao}</p>
                              )}

                              {/* Critérios Resumo */}
                              <div className="p-2 rounded-lg bg-slate-50 text-[11px] text-slate-600 space-y-1">
                                <div className="font-semibold text-slate-700 flex items-center justify-between">
                                  <span>Critérios de Conclusão</span>
                                  <button
                                    onClick={() => {
                                      setModuloParaCriterios(m);
                                      setIsCriteriosModalOpen(true);
                                    }}
                                    className="text-indigo-600 hover:underline flex items-center gap-1 text-[10px]"
                                  >
                                    <Sliders className="w-3 h-3" />
                                    Configurar
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Presença: {m.criteriosConclusao.presencaMinimaPercentual ?? "—"}% • Atividades: {m.criteriosConclusao.atividadesMinimasConcluidas ?? "—"} • Nota Mín: {m.criteriosConclusao.notaMinimaObjetivas ?? "—"}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Prática: {m.criteriosConclusao.avaliacaoPraticaObrigatoria ? "Sim" : "Não"} • Validação Humana: {m.criteriosConclusao.exigeValidacaoHumana ? "Exigida" : "Opcional"}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setModuloParaEditar(m);
                                    setIsModuloModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                                >
                                  Editar Módulo
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAIS */}
      {/* ==================================================================== */}
      <ProgramaFormModal
        isOpen={isProgramaModalOpen}
        onClose={() => setIsProgramaModalOpen(false)}
        onSave={handleSalvarPrograma}
        programaParaEditar={programaParaEditar}
      />

      <EtapaFormModal
        isOpen={isEtapaModalOpen}
        onClose={() => setIsEtapaModalOpen(false)}
        onSave={handleSalvarEtapa}
        programaId={programas[0]?.id || "prog-mtd-01"}
        etapaParaEditar={etapaParaEditar}
      />

      <ModuloFormModal
        isOpen={isModuloModalOpen}
        onClose={() => setIsModuloModalOpen(false)}
        onSave={handleSalvarModulo}
        etapaId={etapaSelecionadaParaNovoModulo || etapas[0]?.id || "etp-001"}
        moduloParaEditar={moduloParaEditar}
      />

      <CriteriosConclusaoModal
        isOpen={isCriteriosModalOpen}
        onClose={() => setIsCriteriosModalOpen(false)}
        modulo={moduloParaCriterios}
        onSalvarCriterios={handleSalvarCriterios}
      />

      <AvaliacaoFormModal
        isOpen={isAvaliacaoModalOpen}
        onClose={() => setIsAvaliacaoModalOpen(false)}
        onSave={handleSalvarAvaliacao}
        avaliacaoParaEditar={avaliacaoParaEditar}
        temTentativasRegistradas={
          avaliacaoParaEditar
            ? tentativas.some((t) => t.avaliacaoId === avaliacaoParaEditar.id)
            : false
        }
        programas={programas}
        etapas={etapas}
        modulos={modulos}
        professores={professores}
        turmas={turmas}
        alunos={alunos}
      />

      <CorrigirTentativaPraticaModal
        isOpen={isCorrigirModalOpen}
        onClose={() => setIsCorrigirModalOpen(false)}
        tentativa={tentativaParaCorrigir}
        avaliacao={avaliacaoDaTentativa}
        professorId={professorAtivo.id}
        professorNome={professorAtivo.nomeCompleto}
        onSalvarCorrecao={handleSalvarCorrecao}
      />

      <ValidarModuloModal
        isOpen={isValidarModalOpen}
        onClose={() => setIsValidarModalOpen(false)}
        progresso={progressoParaValidar}
        modulo={modulos.find((m) => m.id === progressoParaValidar?.moduloId) || null}
        aluno={alunos.find((a) => a.id === progressoParaValidar?.alunoId) || null}
        professorId={professorAtivo.id}
        professorNome={professorAtivo.nomeCompleto}
        onConfirmar={handleConfirmarValidacao}
      />

      <ReabrirModuloModal
        isOpen={isReabrirModalOpen}
        onClose={() => setIsReabrirModalOpen(false)}
        progresso={progressoParaReabrir}
        modulo={modulos.find((m) => m.id === progressoParaReabrir?.moduloId) || null}
        aluno={alunos.find((a) => a.id === progressoParaReabrir?.alunoId) || null}
        professorId={professorAtivo.id}
        professorNome={professorAtivo.nomeCompleto}
        onConfirmar={handleConfirmarReabertura}
      />

      {tentativaParaAutorizar && (
        <AutorizarTentativaModal
          isOpen={isAutorizarModalOpen}
          onClose={() => setIsAutorizarModalOpen(false)}
          avaliacao={tentativaParaAutorizar.avaliacao}
          aluno={tentativaParaAutorizar.aluno}
          professorId={professorAtivo.id}
          professorNome={professorAtivo.nomeCompleto}
          onConfirmar={handleConfirmarAutorizacao}
        />
      )}
    </div>
  );
}
