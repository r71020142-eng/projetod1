"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckSquare,
  FileCheck,
  CalendarDays,
  Plus,
  Search,
  Eye,
  Edit,
  Archive,
  RotateCcw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Material,
  Atividade,
  Entrega,
  ConteudoDiario,
  Turma,
  Aluno,
  DestinoTipo,
} from "@/types";
import { materialRepository } from "@/data/materialRepository";
import { atividadeRepository } from "@/data/atividadeRepository";
import { entregaRepository } from "@/data/entregaRepository";
import { conteudoDiarioRepository } from "@/data/conteudoDiarioRepository";
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
import { ConteudoDiarioFormModal } from "@/components/admin/ConteudoDiarioFormModal";

type ActiveTab = "biblioteca" | "atividades" | "entregas" | "diarios";

export default function AdminMateriaisPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("biblioteca");

  // Data lists
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [conteudosDiarios, setConteudosDiarios] = useState<ConteudoDiario[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  // Indicators
  const [indicadores, setIndicadores] = useState({
    atividadesPublicadas: 0,
    entregasAguardando: 0,
    entregasAtrasadas: 0,
    conteudosAgendados: 0,
  });

  const [loading, setLoading] = useState(true);

  // Filters
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [filtroTurma, setFiltroTurma] = useState<string>("todos");

  // Modals state
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialEditando, setMaterialEditando] = useState<Material | null>(null);

  const [atividadeModalOpen, setAtividadeModalOpen] = useState(false);
  const [atividadeEditando, setAtividadeEditando] = useState<Atividade | null>(null);

  const [correcaoModalOpen, setCorrecaoModalOpen] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState<Entrega | null>(null);
  const [atividadeParaCorrecao, setAtividadeParaCorrecao] = useState<Atividade | null>(null);
  const [alunoParaCorrecao, setAlunoParaCorrecao] = useState<Aluno | null>(null);

  const [diarioModalOpen, setDiarioModalOpen] = useState(false);
  const [diarioEditando, setDiarioEditando] = useState<ConteudoDiario | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const [
        mats,
        atvs,
        ents,
        cds,
        ts,
        als,
        totalAtvsPub,
        totalEntsAguardando,
        totalEntsAtrasadas,
        totalCdsAgendados,
      ] = await Promise.all([
        materialRepository.listar(),
        atividadeRepository.listar(),
        entregaRepository.listar(),
        conteudoDiarioRepository.listar(),
        turmaRepository.listar(),
        alunoRepository.listar(),
        atividadeRepository.contarPublicadas(),
        entregaRepository.contarAguardandoCorrecao(),
        entregaRepository.contarAtrasadas(),
        conteudoDiarioRepository.contarAgendados(),
      ]);

      setMateriais(mats);
      setAtividades(atvs);
      setEntregas(ents);
      setConteudosDiarios(cds);
      setTurmas(ts);
      setAlunos(als);

      setIndicadores({
        atividadesPublicadas: totalAtvsPub,
        entregasAguardando: totalEntsAguardando,
        entregasAtrasadas: totalEntsAtrasadas,
        conteudosAgendados: totalCdsAgendados,
      });
    } catch (err) {
      console.error("Erro ao carregar dados de materiais e atividades:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "materiais" ||
        custom.detail.entity === "atividades" ||
        custom.detail.entity === "entregas" ||
        custom.detail.entity === "conteudos_diarios"
      ) {
        carregarDados();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, [carregarDados]);

  const turmaMap = new Map(turmas.map((t) => [t.id, t.nome]));
  const alunoMap = new Map(alunos.map((a) => [a.id, a]));
  const atividadeMap = new Map(atividades.map((a) => [a.id, a]));

  const getDestinoLabel = (destinoTipo: DestinoTipo, destinoId?: string) => {
    if (destinoTipo === "geral") return "Geral (Todos)";
    if (destinoTipo === "turma") {
      return destinoId ? turmaMap.get(destinoId) || "Turma" : "Turma";
    }
    if (destinoTipo === "aluno") {
      return destinoId ? alunoMap.get(destinoId)?.nomeCompleto || "Aluno" : "Aluno";
    }
    return "Geral";
  };

  const handleArquivarMaterial = async (id: string) => {
    if (window.confirm("Deseja realmente arquivar este material didático?")) {
      await materialRepository.arquivar(id);
      carregarDados();
    }
  };

  const handleRestaurarMaterial = async (id: string) => {
    await materialRepository.restaurar(id);
    carregarDados();
  };

  const handleArquivarAtividade = async (id: string) => {
    if (window.confirm("Deseja arquivar esta atividade?")) {
      await atividadeRepository.arquivar(id);
      carregarDados();
    }
  };

  const abrirCorrecao = (ent: Entrega) => {
    const atv = atividadeMap.get(ent.atividadeId) || null;
    const alu = alunoMap.get(ent.alunoId) || null;
    setEntregaSelecionada(ent);
    setAtividadeParaCorrecao(atv);
    setAlunoParaCorrecao(alu);
    setCorrecaoModalOpen(true);
  };

  // Filtered views
  const materiaisFiltrados = materiais.filter((m) => {
    if (busca && !m.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
    if (filtroStatus !== "todos" && m.status !== filtroStatus) return false;
    if (filtroNivel !== "todos" && m.nivelRecomendado !== filtroNivel && m.nivelRecomendado !== "todos") return false;
    if (filtroTurma !== "todos" && m.destinoId !== filtroTurma) return false;
    return true;
  });

  const atividadesFiltradas = atividades.filter((a) => {
    if (busca && !a.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
    if (filtroTurma !== "todos" && a.destinoId !== filtroTurma) return false;
    return true;
  });

  const entregasFiltradas = entregas.filter((e) => {
    const atv = atividadeMap.get(e.atividadeId);
    const alu = alunoMap.get(e.alunoId);
    if (
      busca &&
      !atv?.titulo.toLowerCase().includes(busca.toLowerCase()) &&
      !alu?.nomeCompleto.toLowerCase().includes(busca.toLowerCase())
    ) {
      return false;
    }
    if (filtroStatus !== "todos" && e.status !== filtroStatus) return false;
    if (filtroTurma !== "todos" && atv?.destinoId !== filtroTurma) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6">
        <div className="h-8 bg-slate-200 rounded w-64"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Materiais e Atividades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestão do acervo didático, atividades práticas e correções do Método Paulo
          </p>
        </div>

        {/* Action Button based on active tab */}
        <div className="flex items-center gap-2">
          {activeTab === "biblioteca" && (
            <button
              type="button"
              onClick={() => {
                setMaterialEditando(null);
                setMaterialModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Material</span>
            </button>
          )}

          {activeTab === "atividades" && (
            <button
              type="button"
              onClick={() => {
                setAtividadeEditando(null);
                setAtividadeModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Atividade</span>
            </button>
          )}

          {activeTab === "diarios" && (
            <button
              type="button"
              onClick={() => {
                setDiarioEditando(null);
                setDiarioModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Estímulo Diário</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards for Etapa 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Atividades Publicadas</p>
            <p className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              {indicadores.atividadesPublicadas}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Aguardando Correção</p>
            <p className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              {indicadores.entregasAguardando}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Entregas Atrasadas</p>
            <p className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              {indicadores.entregasAtrasadas}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Conteúdos Agendados</p>
            <p className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              {indicadores.conteudosAgendados}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("biblioteca")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "biblioteca"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Biblioteca de Materiais ({materiais.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("atividades")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "atividades"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Atividades ({atividades.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("entregas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "entregas"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Entregas & Avaliações ({entregas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("diarios")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "diarios"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Conteúdos Diários ({conteudosDiarios.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou palavra-chave..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "biblioteca" && (
            <>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white"
              >
                <option value="todos">Todos os tipos</option>
                <option value="texto">Texto</option>
                <option value="pdf">PDF</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="link">Link</option>
                <option value="documento">Documento</option>
              </select>

              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white"
              >
                <option value="todos">Todos os níveis</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </>
          )}

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white"
          >
            <option value="todos">Todos os status</option>
            {activeTab === "entregas" ? (
              <>
                <option value="entregue">Entregue</option>
                <option value="atrasada">Atrasada</option>
                <option value="corrigida">Corrigida</option>
                <option value="em_andamento">Rascunho</option>
                <option value="reenviar">Reenviar</option>
              </>
            ) : (
              <>
                <option value="publicado">Publicado</option>
                <option value="agendado">Agendado</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivado">Arquivado</option>
              </>
            )}
          </select>

          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white"
          >
            <option value="todos">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB CONTENT 1: BIBLIOTECA */}
      {activeTab === "biblioteca" && (
        <div>
          {materiaisFiltrados.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
              <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhum material encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou cadastre um novo conteúdo.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Destino</th>
                      <th className="py-3 px-4">Nível</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materiaisFiltrados.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 min-w-[240px]">
                          <Link
                            href={`/admin/materiais/${m.id}`}
                            className="font-bold text-slate-800 hover:text-purple-600 block transition-colors"
                          >
                            {m.titulo}
                          </Link>
                          <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {m.descricao}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <TipoMaterialBadge tipo={m.tipo} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <DestinoBadge
                            destinoTipo={m.destinoTipo}
                            destinoNome={getDestinoLabel(m.destinoTipo, m.destinoId)}
                          />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-semibold text-xs">
                          {m.nivelRecomendado === "todos" ? "Todos" : m.nivelRecomendado}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusMaterialBadge status={m.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/materiais/${m.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setMaterialEditando(m);
                                setMaterialModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {m.status !== "arquivado" ? (
                              <button
                                type="button"
                                onClick={() => handleArquivarMaterial(m.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Arquivar"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRestaurarMaterial(m.id)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Restaurar"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ATIVIDADES */}
      {activeTab === "atividades" && (
        <div>
          {atividadesFiltradas.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
              <CheckSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhuma atividade encontrada</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Atividade</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Destino</th>
                      <th className="py-3 px-4">Prazo</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {atividadesFiltradas.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 min-w-[240px]">
                          <Link
                            href={`/admin/materiais/${a.id}`}
                            className="font-bold text-slate-800 hover:text-purple-600 block transition-colors"
                          >
                            {a.titulo}
                          </Link>
                          <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {a.instrucoes}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <TipoAtividadeBadge tipo={a.tipo} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <DestinoBadge
                            destinoTipo={a.destinoTipo}
                            destinoNome={getDestinoLabel(a.destinoTipo, a.destinoId)}
                          />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                          {a.prazoEntrega
                            ? new Date(a.prazoEntrega).toLocaleDateString("pt-BR")
                            : "Sem prazo fixo"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusAtividadeBadge status={a.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/materiais/${a.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setAtividadeEditando(a);
                                setAtividadeModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArquivarAtividade(a.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Arquivar"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: ENTREGAS & CORREÇÕES */}
      {activeTab === "entregas" && (
        <div>
          {entregasFiltradas.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
              <FileCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhuma entrega registrada ainda</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Aluno</th>
                      <th className="py-3 px-4">Atividade</th>
                      <th className="py-3 px-4">Enviado em</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Nota</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entregasFiltradas.map((e) => {
                      const alu = alunoMap.get(e.alunoId);
                      const atv = atividadeMap.get(e.atividadeId);

                      return (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-800 block">
                              {alu?.nomeCompleto || e.alunoId}
                            </span>
                            <span className="text-[11px] text-slate-400">{alu?.email}</span>
                          </td>
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <span className="font-semibold text-slate-800 block">
                              {atv?.titulo || e.atividadeId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                            {e.entregueEm
                              ? new Date(e.entregueEm).toLocaleDateString("pt-BR")
                              : new Date(e.atualizadoEm).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusEntregaBadge status={e.status} />
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                            {e.pontuacao !== undefined && e.pontuacao !== null
                              ? `${e.pontuacao} pts`
                              : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => abrirCorrecao(e)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs"
                            >
                              {e.status === "corrigida" ? "Revisar Nota" : "Avaliar"}
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
        </div>
      )}

      {/* TAB CONTENT 4: CONTEÚDOS DIÁRIOS */}
      {activeTab === "diarios" && (
        <div>
          {conteudosDiarios.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-slate-500">
              <CalendarDays className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhum estímulo diário cadastrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conteudosDiarios.map((cd) => (
                <div
                  key={cd.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        {cd.dataProgramada}
                      </span>
                      <StatusMaterialBadge status={cd.status} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{cd.titulo}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{cd.texto}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <DestinoBadge
                      destinoTipo={cd.destinoTipo}
                      destinoNome={getDestinoLabel(cd.destinoTipo, cd.destinoId)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDiarioEditando(cd);
                        setDiarioModalOpen(true);
                      }}
                      className="text-purple-600 hover:text-purple-800 font-bold"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <MaterialFormModal
        isOpen={materialModalOpen}
        materialParaEditar={materialEditando}
        onClose={() => {
          setMaterialModalOpen(false);
          setMaterialEditando(null);
        }}
        onSuccess={() => carregarDados()}
      />

      <AtividadeFormModal
        isOpen={atividadeModalOpen}
        atividadeParaEditar={atividadeEditando}
        onClose={() => {
          setAtividadeModalOpen(false);
          setAtividadeEditando(null);
        }}
        onSuccess={() => carregarDados()}
      />

      <CorrecaoEntregaModal
        isOpen={correcaoModalOpen}
        entrega={entregaSelecionada}
        atividade={atividadeParaCorrecao}
        aluno={alunoParaCorrecao}
        onClose={() => {
          setCorrecaoModalOpen(false);
          setEntregaSelecionada(null);
        }}
        onSuccess={() => carregarDados()}
      />

      <ConteudoDiarioFormModal
        isOpen={diarioModalOpen}
        conteudoParaEditar={diarioEditando}
        onClose={() => {
          setDiarioModalOpen(false);
          setDiarioEditando(null);
        }}
        onSuccess={() => carregarDados()}
      />
    </div>
  );
}
