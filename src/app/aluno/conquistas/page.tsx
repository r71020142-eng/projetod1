"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ModeloConquista,
  ConquistaConcedida,
  SolicitacaoPlacaFisica,
  Aluno,
} from "@/types";
import {
  gamificacaoRepository,
  alunoRepository,
  aulaRepository,
  historicoRevisaoRepository,
  baralhoRepository,
  tentativaAvaliacaoRepository,
} from "@/data/api";
import {
  calcularHorasAulasPresenca,
  ContextoAvaliacaoConquistas,
} from "@/data/gamificacaoMotor";
import { ConquistaCard } from "@/components/gamificacao/ConquistaCard";
import { PlacaDigitalView } from "@/components/gamificacao/PlacaDigitalView";
import { SolicitarPlacaModal } from "@/components/gamificacao/SolicitarPlacaModal";
import {
  Trophy,
  Award,
  Sparkles,
  Flame,
  Clock,
  X,
} from "lucide-react";

export default function AlunoConquistasPage() {
  const alunoId = "alu-001"; // Aluno demonstrativo fixo
  const [aluno, setAluno] = useState<Aluno | null>(null);

  const [modelos, setModelos] = useState<ModeloConquista[]>([]);
  const [concedidas, setConcedidas] = useState<ConquistaConcedida[]>([]);
  const [placas, setPlacas] = useState<SolicitacaoPlacaFisica[]>([]);
  const [pontos, setPontos] = useState(0);

  // Métricas calculadas para progresso
  const [totalHoras, setTotalHoras] = useState(0);
  const [streakDias, setStreakDias] = useState(0);
  const [totalRevisoes, setTotalRevisoes] = useState(0);
  const [modulosConcluidos, setModulosConcluidos] = useState(0);
  const [avaliacoesAprovadas, setAvaliacoesAprovadas] = useState(0);

  const [filtro, setFiltro] = useState<"todas" | "desbloqueadas" | "bloqueadas">("todas");
  const [loading, setLoading] = useState(true);

  // Modais de Placa
  const [placaDigitalAberta, setPlacaDigitalAberta] = useState<ConquistaConcedida | null>(null);
  const [modalSolicitarPlaca, setModalSolicitarPlaca] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [alu, mods, conqs, plks, ptsRes, todasAulas, tentativasAluno] = await Promise.all([
        alunoRepository.obterPorId(alunoId),
        gamificacaoRepository.listarModelos("ativa"),
        gamificacaoRepository.listarConquistasAluno(alunoId),
        gamificacaoRepository.listarSolicitacoesPlacas(alunoId),
        gamificacaoRepository.obterPontosAluno(alunoId),
        aulaRepository.listar(),
        tentativaAvaliacaoRepository.listar({ alunoId }),
      ]);

      setAluno(alu);
      setModelos(mods);
      setConcedidas(conqs);
      setPlacas(plks);
      setPontos(ptsRes.pontosTotais);

      // 1. Calcula horas reais de presença
      const horasRes = calcularHorasAulasPresenca(todasAulas, alunoId);
      setTotalHoras(horasRes.totalHoras);

      // 2. Calcula streak e revisões de flashcards
      try {
        const baralhos = await baralhoRepository.getBaralhos();
        const metricasSRS = await historicoRevisaoRepository.obterMetricasAluno(alunoId, baralhos);
        setStreakDias(metricasSRS.sequenciaDias || 7);
        setTotalRevisoes(metricasSRS.totalEstudadosHistorico || 105);
      } catch {
        setStreakDias(7);
        setTotalRevisoes(105);
      }

      // 3. Módulos concluídos e avaliações práticas aprovadas
      const aprovadas = tentativasAluno.filter(
        (t) => t.status === "corrigida" && t.resultado === "aprovado"
      ).length;
      setAvaliacoesAprovadas(aprovadas);
      setModulosConcluidos(1); // Módulo 1 validado em Etapa 7

      // 4. Executa avaliação de conquistas automáticas
      if (alu) {
        const ctx: ContextoAvaliacaoConquistas = {
          alunoId,
          totalHorasAulas: horasRes.totalHoras,
          totalAulasPresente: horasRes.aulasPresentesCount,
          streakFlashcards: 7,
          totalFlashcardsRevisados: 105,
          modulosConcluidosCount: 1,
          avaliacoesPraticasAprovadasCount: aprovadas,
          nivelOperacionalAtual: alu.nivel || "B1",
          publicacoesComunidadeCount: 1,
          comentariosComunidadeCount: 2,
        };

        const recemDesbloqueadas = await gamificacaoRepository.verificarEConcederAutomaticas(
          ctx,
          alu.nomeCompleto
        );

        if (recemDesbloqueadas.length > 0) {
          const conqsAtualizadas = await gamificacaoRepository.listarConquistasAluno(alunoId);
          setConcedidas(conqsAtualizadas);
          const ptsAtualizados = await gamificacaoRepository.obterPontosAluno(alunoId);
          setPontos(ptsAtualizados.pontosTotais);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar conquistas do aluno:", err);
    } finally {
      setLoading(false);
    }
  }, [alunoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Mapa de conquistas concedidas por modeloId
  const mapaConcedidas = new Map<string, ConquistaConcedida>();
  concedidas.forEach((c) => mapaConcedidas.set(c.modeloId, c));

  // Conquista de Marco B1 com Placa Digital
  const conquistaMarcoB1 = concedidas.find((c) => c.codigoValidacaoDigital);
  const placaSolicitada = placas.find((p) => p.status !== "cancelado");

  // Filtro
  const modelosFiltrados = modelos.filter((m) => {
    const isDesbloqueada = mapaConcedidas.has(m.id);
    if (filtro === "desbloqueadas" && !isDesbloqueada) return false;
    if (filtro === "bloqueadas" && isDesbloqueada) return false;
    return true;
  });

  async function handleSolicitarPlacaFisica() {
    if (!aluno) return;
    await gamificacaoRepository.registrarInteressePlacaFisica({
      alunoId: aluno.id,
      alunoNome: aluno.nomeCompleto,
      conquistaId: "mod-conq-009",
      conquistaNome: "Placa Física de Reconhecimento B1 • Método Paulo",
      nivelMarco: "B1",
    });
    setPlacaDigitalAberta(null);
    carregarDados();
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>Minhas Conquistas & Placas de Reconhecimento</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Celebre cada marco pedagógico alcançado no Método Paulo com badges digitais, pontuação e placas comemorativas.
          </p>
        </div>

        {conquistaMarcoB1 && (
          <button
            onClick={() => setPlacaDigitalAberta(conquistaMarcoB1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition whitespace-nowrap"
          >
            <Trophy className="w-4 h-4 text-amber-100" />
            <span>Visualizar Minha Placa Digital (B1)</span>
          </button>
        )}
      </div>

      {/* Cards de Métricas em Destaque */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-linear-to-br from-indigo-950 to-slate-900 text-white rounded-3xl shadow-xs space-y-1">
          <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Pontos de Dedicação
          </span>
          <span className="text-2xl font-extrabold text-amber-300">{pontos}</span>
          <span className="text-[10px] text-slate-400 block">Acumulados nas práticas</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Horas de Aula Cumpridas
          </span>
          <span className="text-2xl font-extrabold text-slate-900">{totalHoras}h</span>
          <span className="text-[10px] text-slate-400 block">Com presença confirmada</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Sequência de Flashcards
          </span>
          <span className="text-2xl font-extrabold text-slate-900">{streakDias} dias</span>
          <span className="text-[10px] text-slate-400 block">Sequência ininterrupta</span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            Conquistas Desbloqueadas
          </span>
          <span className="text-2xl font-extrabold text-purple-700">
            {concedidas.length} / {modelos.length}
          </span>
          <span className="text-[10px] text-slate-400 block">No Método Paulo</span>
        </div>
      </div>

      {/* Card de Status da Placa Física */}
      {placaSolicitada && (
        <div className="p-5 rounded-3xl bg-linear-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950 text-sm">
                  Placa Física em Processo: {placaSolicitada.nivelMarco}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                  {placaSolicitada.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Identificador demonstrativo: <strong className="font-mono text-indigo-700">{placaSolicitada.codigoValidacao}</strong>
                {placaSolicitada.codigoRastreio && (
                  <> • Rastreio: <strong className="font-mono text-slate-800">{placaSolicitada.codigoRastreio}</strong></>
                )}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-500 block">
              Solicitada em {new Date(placaSolicitada.dataSolicitacao || placaSolicitada.dataInteresse || placaSolicitada.atualizadoEm || 0).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      )}

      {/* Filtros de Conquistas */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setFiltro("todas")}
            className={`px-3 py-1.5 rounded-xl transition ${
              filtro === "todas"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas ({modelos.length})
          </button>
          <button
            onClick={() => setFiltro("desbloqueadas")}
            className={`px-3 py-1.5 rounded-xl transition ${
              filtro === "desbloqueadas"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Desbloqueadas ({concedidas.length})
          </button>
          <button
            onClick={() => setFiltro("bloqueadas")}
            className={`px-3 py-1.5 rounded-xl transition ${
              filtro === "bloqueadas"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Em Progresso ({modelos.length - concedidas.length})
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Pontos acumulados por dedicação não alteram diretamente o nível CEFR (avaliação 100% humana).
        </p>
      </div>

      {/* Grid de Conquistas */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-12">Carregando catálogo de conquistas...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelosFiltrados.map((mod) => {
            const concedida = mapaConcedidas.get(mod.id);

            // Determina progresso atual para a barra
            let atual = 0;
            if (mod.tipoCriterio === "horas_aulas") atual = totalHoras;
            else if (mod.tipoCriterio === "streak_dias") atual = streakDias;
            else if (mod.tipoCriterio === "flashcards_revisados") atual = totalRevisoes;
            else if (mod.tipoCriterio === "modulos_concluidos") atual = modulosConcluidos;
            else if (mod.tipoCriterio === "avaliacoes_aprovadas") atual = avaliacoesAprovadas;

            return (
              <ConquistaCard
                key={mod.id}
                modelo={mod}
                concedida={concedida}
                progressoAtual={atual}
                progressoMeta={mod.metaValor}
                onVerPlacaDigital={(conq) => setPlacaDigitalAberta(conq)}
              />
            );
          })}
        </div>
      )}

      {/* Modal Visualizador de Placa Digital */}
      {placaDigitalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-amber-500/40 max-w-2xl w-full p-6 space-y-4 overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-bold text-amber-300 text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Certificado Digital de Reconhecimento
              </span>
              <button
                onClick={() => setPlacaDigitalAberta(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PlacaDigitalView
              alunoNome={aluno?.nomeCompleto || "Mariana Oliveira"}
              marcoNome={placaDigitalAberta.modeloNome}
              dataConcessao={placaDigitalAberta.dataConcessao || placaDigitalAberta.concedidaEm || new Date().toISOString()}
              codigoValidacao={placaDigitalAberta.codigoValidacaoDigital || "MTD-PLK-8421-B1"}
              professorNome={placaDigitalAberta.professorNome}
              elegivelPlacaFisica={true}
              statusPlacaFisica={placaSolicitada?.status}
              onSolicitarPlacaFisica={() => setModalSolicitarPlaca(true)}
            />
          </div>
        </div>
      )}

      {/* Modal Solicitar Placa Física */}
      {modalSolicitarPlaca && (
        <SolicitarPlacaModal
          isOpen={modalSolicitarPlaca}
          onClose={() => setModalSolicitarPlaca(false)}
          onSubmit={handleSolicitarPlacaFisica}
          alunoNome={aluno?.nomeCompleto || "Mariana Oliveira"}
          marcoNome="Marco Operacional B1 • Independência Comunicativa"
        />
      )}
    </div>
  );
}
