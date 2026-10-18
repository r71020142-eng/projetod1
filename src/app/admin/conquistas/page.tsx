"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ModeloConquista,
  ConquistaConcedida,
  SolicitacaoPlacaFisica,
  StatusPlacaFisica,
  Aluno,
} from "@/types";
import { gamificacaoRepository, alunoRepository } from "@/data/api";
import { ConquistaBadge } from "@/components/gamificacao/ConquistaBadge";
import { ModeloConquistaFormModal } from "@/components/gamificacao/ModeloConquistaFormModal";
import { ConcederConquistaManualModal } from "@/components/gamificacao/ConcederConquistaManualModal";
import { GerenciarPlacaModal } from "@/components/gamificacao/GerenciarPlacaModal";
import {
  Trophy,
  Award,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Settings,
  UserCheck,
} from "lucide-react";

export default function AdminConquistasPage() {
  const [abaAtiva, setAbaAtiva] = useState<"catalogo" | "placas" | "concessoes">("catalogo");

  const [modelos, setModelos] = useState<ModeloConquista[]>([]);
  const [concedidas, setConcedidas] = useState<ConquistaConcedida[]>([]);
  const [placas, setPlacas] = useState<SolicitacaoPlacaFisica[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busca, setBusca] = useState("");

  // Modais
  const [modalNovoModelo, setModalNovoModelo] = useState(false);
  const [modeloParaEditar, setModeloParaEditar] = useState<ModeloConquista | null>(null);
  const [modalConcederManual, setModalConcederManual] = useState(false);
  const [placaParaGerenciar, setPlacaParaGerenciar] = useState<SolicitacaoPlacaFisica | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [modList, conqList, plkList, aluList] = await Promise.all([
        gamificacaoRepository.listarModelos(),
        gamificacaoRepository.listarTodasConcedidas(),
        gamificacaoRepository.listarSolicitacoesPlacas(),
        alunoRepository.listar(),
      ]);

      setModelos(modList);
      setConcedidas(conqList);
      setPlacas(plkList);
      setAlunos(aluList);
    } catch (err) {
      console.error("Erro ao carregar dados de gamificação:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Filtro de modelos
  const modelosFiltrados = modelos.filter((m) => {
    if (filtroCategoria !== "todas" && m.categoria !== filtroCategoria) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!m.nome.toLowerCase().includes(q) && !m.descricao.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const placasEmProducao = placas.filter((p) => p.status === "em_producao").length;

  async function handleSalvarModelo(dados: Partial<ModeloConquista>) {
    await gamificacaoRepository.salvarModelo(dados as Parameters<typeof gamificacaoRepository.salvarModelo>[0]);
    carregarDados();
  }

  async function handleConcederManual(dados: {
    modeloId: string;
    alunoId: string;
    alunoNome: string;
    justificativaDocente: string;
  }) {
    await gamificacaoRepository.concederConquistaManual({
      modeloId: dados.modeloId,
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      professorId: "prof-001",
      professorNome: "Lucas Ferreira",
      justificativaDocente: dados.justificativaDocente,
    });
    carregarDados();
  }

  async function handleAtualizarPlaca(dados: {
    novoStatus: StatusPlacaFisica;
    observacao?: string;
    codigoRastreio?: string;
    observacoesInternas?: string;
  }) {
    if (!placaParaGerenciar) return;
    await gamificacaoRepository.atualizarStatusPlacaFisica(
      placaParaGerenciar.id,
      dados.novoStatus,
      "Coordenação MTD",
      dados.observacao,
      dados.codigoRastreio,
      dados.observacoesInternas
    );
    carregarDados();
  }

  const statusLabelsPlaca: Record<StatusPlacaFisica, { label: string; bg: string; text: string }> = {
    elegivel: { label: "Elegível", bg: "bg-slate-100 border-slate-200", text: "text-slate-700" },
    interesse_registrado: { label: "Interesse Registrado", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
    solicitada: { label: "Solicitada", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
    em_analise: { label: "Em Análise", bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
    aprovado: { label: "Aprovado", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
    aprovada: { label: "Aprovada", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
    em_producao: { label: "Em Produção (Laser)", bg: "bg-amber-100 border-amber-300", text: "text-amber-900" },
    pronta: { label: "Pronta", bg: "bg-teal-50 border-teal-200", text: "text-teal-700" },
    enviado: { label: "Enviado", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700" },
    enviada: { label: "Enviada", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700" },
    entregue: { label: "Entregue", bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-900" },
    rejeitada: { label: "Rejeitada", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
    cancelado: { label: "Cancelado", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando dados de gamificação...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>Gamificação, Conquistas & Placas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de badges pedagógicas, regras de pontos, marcos operacionais de nível e produção de placas de reconhecimento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalConcederManual(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Conceder Conquista Manual</span>
          </button>

          <button
            onClick={() => {
              setModeloParaEditar(null);
              setModalNovoModelo(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Conquista</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            Modelos de Conquista
          </span>
          <span className="text-xl font-extrabold text-slate-900">{modelos.length}</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Conquistas Desbloqueadas
          </span>
          <span className="text-xl font-extrabold text-slate-900">{concedidas.length}</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Placas em Produção
          </span>
          <span className="text-xl font-extrabold text-amber-600">{placasEmProducao}</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Total de Solicitações
          </span>
          <span className="text-xl font-extrabold text-slate-900">{placas.length}</span>
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setAbaAtiva("catalogo")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "catalogo"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Catálogo de Conquistas ({modelos.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva("placas")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "placas"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>
            Gestão de Placas Físicas ({placas.length})
            {placasEmProducao > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {placasEmProducao}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setAbaAtiva("concessoes")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            abaAtiva === "concessoes"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Histórico de Desbloqueios ({concedidas.length})</span>
        </button>
      </div>

      {/* ABA 1: CATÁLOGO DE CONQUISTAS */}
      {abaAtiva === "catalogo" && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título ou descrição..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todas">Todas as Categorias</option>
                <option value="aulas_frequencia">Aulas & Frequência</option>
                <option value="flashcards_estudo">Flashcards & Hábitos</option>
                <option value="avaliacoes_progresso">Avaliações & Módulos</option>
                <option value="comunidade_engajamento">Comunidade</option>
                <option value="nivel_marco">Marco de Nível Operacional</option>
                <option value="placas_reconhecimento">Placas de Reconhecimento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modelosFiltrados.map((mod) => (
              <div
                key={mod.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <ConquistaBadge icone={mod.icone} tamanho="sm" />
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      +{mod.pontosRecompensa} pts
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{mod.nome}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{mod.descricao}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div>
                      <strong>Critério:</strong> {mod.tipoCriterio}{" "}
                      {mod.nivelRequerido ? `(Nível ${mod.nivelRequerido})` : `(Meta: ${mod.metaValor})`}
                    </div>
                    <div>
                      <strong>Prêmio:</strong> {mod.tipoPremio}
                    </div>
                    {mod.elegivelPlacaFisica && (
                      <span className="text-[10px] font-bold text-amber-700 block">
                        ★ Habilitado para solicitação de Placa Física
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Status: {mod.status}
                  </span>

                  <button
                    onClick={() => {
                      setModeloParaEditar(mod);
                      setModalNovoModelo(true);
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: GESTÃO DE PLACAS FÍSICAS */}
      {abaAtiva === "placas" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-3xl text-xs text-amber-950 space-y-1">
            <h3 className="font-bold flex items-center gap-1.5 text-sm">
              <Trophy className="w-4 h-4 text-amber-600" />
              Fluxo de Produção e Logística das Placas Físicas
            </h3>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              O fluxo compreende 8 estágios: elegível → interesse registrado → em análise → aprovado → em produção (laser) → enviado → entregue (ou cancelado). Atualize o status para que o aluno receba notificações automáticas no seu portal.
            </p>
          </div>

          {placas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              <Trophy className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Nenhuma solicitação de placa física registrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {placas.map((plk) => {
                const st = statusLabelsPlaca[plk.status] || statusLabelsPlaca.elegivel;

                return (
                  <div
                    key={plk.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{plk.alunoNome}</h4>
                          <span className="text-[11px] text-slate-500">{plk.conquistaNome}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>

                        <button
                          onClick={() => setPlacaParaGerenciar(plk)}
                          className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                        >
                          Gerenciar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">
                          Identificador demonstrativo
                        </span>
                        <span className="font-mono font-bold text-indigo-600">{plk.codigoValidacao}</span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">
                          Código de Rastreio
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          {plk.codigoRastreio || "Ainda não postado"}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">
                          Data da Solicitação
                        </span>
                        <span className="text-slate-700">
                          {new Date(plk.dataSolicitacao || plk.dataInteresse || plk.atualizadoEm || 0).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    {plk.observacoesInternas && (
                      <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                        <strong>Nota Interna da Equipe (Sigilosa):</strong> {plk.observacoesInternas}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: CONCESSÕES REALIZADAS */}
      {abaAtiva === "concessoes" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Registro Histórico de Desbloqueios ({concedidas.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {concedidas.map((conq) => (
                <div key={conq.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <ConquistaBadge tamanho="sm" />
                    <div>
                      <h4 className="font-bold text-slate-900">{conq.alunoNome}</h4>
                      <p className="text-slate-500 text-[11px]">{conq.modeloNome}</p>
                      {conq.justificativaDocente && (
                        <p className="text-purple-700 text-[10px] italic mt-0.5">
                          Justificativa: &quot;{conq.justificativaDocente}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-amber-600 block">+{conq.pontosAtribuidos} pts</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(conq.dataConcessao || conq.concedidaEm || 0).toLocaleDateString("pt-BR")} ({conq.concedidoPor})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      {modalNovoModelo && (
        <ModeloConquistaFormModal
          isOpen={modalNovoModelo}
          onClose={() => setModalNovoModelo(false)}
          onSave={handleSalvarModelo}
          modeloParaEditar={modeloParaEditar}
        />
      )}

      {modalConcederManual && (
        <ConcederConquistaManualModal
          isOpen={modalConcederManual}
          onClose={() => setModalConcederManual(false)}
          onSubmit={handleConcederManual}
          modelos={modelos.filter((m) => m.status === "ativa")}
          alunos={alunos.filter((a) => a.status === "ativo")}
        />
      )}

      {placaParaGerenciar && (
        <GerenciarPlacaModal
          isOpen={Boolean(placaParaGerenciar)}
          onClose={() => setPlacaParaGerenciar(null)}
          onSubmit={handleAtualizarPlaca}
          solicitacao={placaParaGerenciar}
          responsavelNome="Coordenação MTD"
        />
      )}
    </div>
  );
}
