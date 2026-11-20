"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Search,
  BookOpen,
  Headphones,
  Edit2,
  Copy,
  Trash2,
  Eye,
  Users,
  Layers,
  Sparkles,
  FileAudio,
} from "lucide-react";
import {
  ExercicioInterativo,
  TipoExercicioInterativo,
  NivelMaterial,
  TentativaExercicio,
} from "@/types";
import { exercicioRepository } from "@/data/exercicioRepository";
import { tentativaExercicioRepository } from "@/data/tentativaExercicioRepository";
import { ExercicioPreviewModal } from "@/components/admin/ExercicioPreviewModal";

export default function AdminExerciciosPage() {
  const [exercicios, setExercicios] = useState<ExercicioInterativo[]>([]);
  const [tentativasMap, setTentativasMap] = useState<Record<string, TentativaExercicio[]>>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoExercicioInterativo | "todos">("todos");
  const [filtroNivel, setFiltroNivel] = useState<NivelMaterial | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "publicado" | "rascunho">("todos");

  // Modal de Prévia
  const [exercicioPreview, setExercicioPreview] = useState<ExercicioInterativo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await exercicioRepository.listar();
      setExercicios(lista);

      // Carrega tentativas para exibir contadores
      const map: Record<string, TentativaExercicio[]> = {};
      await Promise.all(
        lista.map(async (ex) => {
          const tList = await tentativaExercicioRepository.listarPorExercicio(ex.id);
          map[ex.id] = tList;
        })
      );
      setTentativasMap(map);
    } catch (e) {
      console.error("Erro ao carregar exercícios:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const handleStorage = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.entity === "exercicios" || detail?.entity === "tentativas_exercicios") {
        carregarDados();
      }
    };
    window.addEventListener("mtd_storage_updated", handleStorage);
    return () => window.removeEventListener("mtd_storage_updated", handleStorage);
  }, [carregarDados]);

  const handleDuplicar = async (id: string) => {
    if (!confirm("Deseja criar uma cópia deste exercício?")) return;
    const res = await exercicioRepository.duplicar(id);
    if (res.success) {
      carregarDados();
    } else {
      alert(res.error || "Erro ao duplicar exercício.");
    }
  };

  const handleExcluir = async (id: string, titulo: string) => {
    if (!confirm(`Tem certeza que deseja excluir o exercício "${titulo}"?`)) return;
    const res = await exercicioRepository.excluir(id);
    if (res.success) {
      carregarDados();
    } else {
      alert(res.error || "Erro ao excluir exercício.");
    }
  };

  const abrirPreview = (ex: ExercicioInterativo) => {
    setExercicioPreview(ex);
    setPreviewOpen(true);
  };

  // Filtragem
  const filtrados = exercicios.filter((e) => {
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const match =
        e.titulo.toLowerCase().includes(q) ||
        e.descricao.toLowerCase().includes(q) ||
        e.categoria.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filtroTipo !== "todos" && e.tipo !== filtroTipo) return false;
    if (filtroNivel !== "todos" && e.nivel !== filtroNivel) return false;
    if (filtroStatus !== "todos" && e.status !== filtroStatus) return false;
    return true;
  });

  // Métricas
  const totalExercicios = exercicios.length;
  const totalPublicados = exercicios.filter((e) => e.status === "publicado").length;
  const totalLeituraAudio = exercicios.filter((e) => e.tipo === "leitura_audio").length;
  const totalMultiplaEscolha = exercicios.filter((e) => e.tipo === "multipla_escolha").length;
  const totalTentativasGlobal = Object.values(tentativasMap).reduce(
    (acc, list) => acc + list.length,
    0
  );

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Padrão Lingua.com
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Exercícios Interativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerencie questionários de múltipla escolha com 4 alternativas e leituras com áudio integrado
          </p>
        </div>

        <Link
          href="/admin/exercicios/novo"
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-md self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" /> Novo Exercício
        </Link>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total de Exercícios
          </p>
          <p className="text-2xl font-black text-slate-900">{totalExercicios}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {totalPublicados} publicados no portal
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Múltipla Escolha Pura
          </p>
          <p className="text-2xl font-black text-purple-700">{totalMultiplaEscolha}</p>
          <p className="text-[11px] text-slate-400">4 alternativas por questão</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Leitura & Áudio
          </p>
          <p className="text-2xl font-black text-purple-700">{totalLeituraAudio}</p>
          <p className="text-[11px] text-slate-400">Texto + Narração + Quiz</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tentativas de Alunos
          </p>
          <p className="text-2xl font-black text-slate-900">{totalTentativasGlobal}</p>
          <p className="text-[11px] text-purple-600 font-semibold">
            Correção e notas automáticas
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoExercicioInterativo | "todos")}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="multipla_escolha">Múltipla Escolha</option>
            <option value="leitura_audio">Leitura & Áudio</option>
          </select>

          {/* Nível */}
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value as NivelMaterial | "todos")}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="todos">Todos os Níveis</option>
            <option value="A1">Nível A1</option>
            <option value="A2">Nível A2</option>
            <option value="B1">Nível B1</option>
            <option value="B2">Nível B2</option>
            <option value="C1">Nível C1</option>
            <option value="C2">Nível C2</option>
          </select>

          {/* Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as "todos" | "publicado" | "rascunho")}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="publicado">Publicados</option>
            <option value="rascunho">Rascunhos</option>
          </select>
        </div>
      </div>

      {/* Lista de Exercícios */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Carregando exercícios interativos...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhum exercício encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não há exercícios cadastrados com os filtros atuais. Crie um novo exercício de múltipla escolha ou leitura com áudio.
          </p>
          <Link
            href="/admin/exercicios/novo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Cadastrar Primeiro Exercício
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtrados.map((ex) => {
            const tentativas = tentativasMap[ex.id] || [];
            const concluidas = tentativas.filter((t) => t.status === "concluida");
            const mediaNotas =
              concluidas.length > 0
                ? (
                    concluidas.reduce((acc, t) => acc + (t.notaFinal || 0), 0) /
                    concluidas.length
                  ).toFixed(1)
                : null;

            return (
              <div
                key={ex.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-purple-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Lado Esquerdo: Identificação e Dados */}
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      ex.tipo === "leitura_audio"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {ex.tipo === "leitura_audio" ? (
                      <Headphones className="h-6 w-6" />
                    ) : (
                      <BookOpen className="h-6 w-6" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                        {ex.nivel}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        {ex.tipo === "leitura_audio"
                          ? "Leitura & Compreensão com Áudio"
                          : "Múltipla Escolha Pura"}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {ex.categoria}
                      </span>
                      {ex.status === "publicado" ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Publicado
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          Rascunho
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {ex.titulo}
                    </h3>

                    {ex.descricao && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {ex.descricao}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
                        {ex.questoes?.length || 0} questões (4 alternativas cada)
                      </span>

                      {ex.tipo === "leitura_audio" && ex.audioUrl && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <FileAudio className="h-3.5 w-3.5 text-emerald-600" />
                          Narração em áudio ativa
                        </span>
                      )}

                      {ex.baralhoVocabularioId && (
                        <span className="flex items-center gap-1 text-purple-700 font-medium">
                          <Layers className="h-3.5 w-3.5" />
                          Flashcards vinculados
                        </span>
                      )}

                      <span className="text-slate-400">
                        Versão {ex.versao || 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Métricas de Tentativas e Ações */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Bloco de Desempenho dos Alunos */}
                  <Link
                    href={`/admin/exercicios/${ex.id}/tentativas`}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition-colors border border-slate-200 shrink-0"
                    title="Ver tentativas de alunos"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span>{tentativas.length} tentativas</span>
                    </div>
                    {mediaNotas ? (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        Média: {mediaNotas}/10
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">Sem envios</p>
                    )}
                  </Link>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirPreview(ex)}
                      className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                      title="Prévia do Aluno"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <Link
                      href={`/admin/exercicios/${ex.id}/editar`}
                      className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                      title="Editar exercício"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicar(ex.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Duplicar exercício"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(ex.id, ex.titulo)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir exercício"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Prévia Interativa */}
      <ExercicioPreviewModal
        exercicio={exercicioPreview}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
