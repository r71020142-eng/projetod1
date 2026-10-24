"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Baralho,
  Cartao,
  CartaoProgressoAluno,
  RespostaSRS,
  SessaoEstudoResumo,
} from "@/types";
import {
  baralhoRepository,
  progressoCartaoRepository,
  sessaoEstudoRepository,
} from "@/data/api";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";
import { FlashcardStudyCard } from "@/components/aluno/FlashcardStudyCard";
import { SessaoEstudoConcluidaCard } from "@/components/aluno/SessaoEstudoConcluidaCard";
import {
  ArrowLeft,
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function EstudarFlashcardsPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || "alu-001");

  const params = useParams();
  const baralhoId = params.id as string;

  const [baralho, setBaralho] = useState<Baralho | null>(null);
  const [filaEstudo, setFilaEstudo] = useState<Cartao[]>([]);
  const [progressosMap, setProgressosMap] = useState<
    Record<string, CartaoProgressoAluno>
  >({});
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estatísticas da Sessão
  const [contadores, setContadores] = useState({
    totalEstudado: 0,
    erros: 0,
    dificeis: 0,
    bons: 0,
    faceis: 0,
    reagendados: 0,
  });

  const [tempoSegundos, setTempoSegundos] = useState(0);
  const [sessaoConcluida, setSessaoConcluida] = useState<SessaoEstudoResumo | null>(
    null
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataInicioRef = useRef<string>(new Date().toISOString());

  const carregarFila = useCallback(async (mounted = true) => {
    if (!baralhoId) return;
    setLoading(true);
    setError(null);
    try {
      const [baralhoRes, filaRes] = await Promise.all([
        baralhoRepository.getBaralhoById(baralhoId),
        progressoCartaoRepository.obterFilaEstudoBaralho(alunoId, baralhoId),
      ]);

      if (!mounted) return;

      if (!baralhoRes) {
        setError("Baralho não encontrado.");
        return;
      }

      setBaralho(baralhoRes);

      if (filaRes.fila.length > 0) {
        setFilaEstudo(filaRes.fila);
        setProgressosMap(filaRes.progressos);
      } else {
        // Se a fila diária regular estiver vazia, carrega todos os cartões ativos para permitir revisão livre
        setFilaEstudo(filaRes.cartoes);
        setProgressosMap(filaRes.progressos);
      }
      setIndiceAtual(0);
      dataInicioRef.current = new Date().toISOString();
    } catch (err: unknown) {
      if (mounted) {
        console.error("Erro ao carregar fila de estudo:", err);
        setError((err as Error)?.message || "Não foi possível carregar os cartões para estudo.");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, [baralhoId, alunoId]);

  useEffect(() => {
    let isMounted = true;
    carregarFila(isMounted);
    return () => {
      isMounted = false;
    };
  }, [carregarFila]);

  // Cronômetro da sessão
  useEffect(() => {
    if (!loading && !sessaoConcluida) {
      timerRef.current = setInterval(() => {
        setTempoSegundos((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, sessaoConcluida]);

  const finalizarSessao = useCallback(
    async (contadoresFinais: typeof contadores, segundosFinais: number) => {
      if (timerRef.current) clearInterval(timerRef.current);

      const dadosSessao: Omit<SessaoEstudoResumo, "id"> = {
        alunoId,
        baralhoId,
        iniciadaEm: dataInicioRef.current,
        concluidaEm: new Date().toISOString(),
        totalEstudado: contadoresFinais.totalEstudado,
        erros: contadoresFinais.erros,
        dificeis: contadoresFinais.dificeis,
        bons: contadoresFinais.bons,
        faceis: contadoresFinais.faceis,
        tempoSegundos: segundosFinais,
        revisoesReagendadas: contadoresFinais.reagendados,
      };

      const salva = await sessaoEstudoRepository.salvarSessaoEstudo(dadosSessao);
      setSessaoConcluida(salva);
    },
    [baralhoId, alunoId]
  );

  const [cartoesErreados, setCartoesErreados] = useState<
    Array<{ cartao: Cartao; proximaRevisaoMs: number }>
  >([]);
  const [avisoReagendamento, setAvisoReagendamento] = useState<string | null>(null);

  const handleResponder = async (resposta: RespostaSRS) => {
    if (filaEstudo.length === 0) return;
    const cartaoAtual = filaEstudo[indiceAtual];
    if (!cartaoAtual) return;

    // 1. Processa resposta e salva nos repositórios locais
    const res = await progressoCartaoRepository.registrarRespostaEstudo(
      alunoId,
      cartaoAtual.id,
      baralhoId,
      resposta
    );

    // Atualiza progresso local
    setProgressosMap((prev) => ({
      ...prev,
      [cartaoAtual.id]: res.progresso,
    }));

    // 2. Atualiza contadores da sessão
    const novosContadores = {
      ...contadores,
      totalEstudado: contadores.totalEstudado + 1,
      erros: resposta === "errei" ? contadores.erros + 1 : contadores.erros,
      dificeis: resposta === "dificil" ? contadores.dificeis + 1 : contadores.dificeis,
      bons: resposta === "bom" ? contadores.bons + 1 : contadores.bons,
      faceis: resposta === "facil" ? contadores.faceis + 1 : contadores.faceis,
      reagendados: resposta === "errei"
        ? contadores.reagendados + 1
        : contadores.reagendados,
    };
    setContadores(novosContadores);

    // 3. Regra Pedagógica Mandatória (Etapa 6/7):
    // Se 'errei', agenda para 10 minutos depois (nextReviewAt).
    // NÃO coloca o cartão imediatamente no final da mesma sessão sem respeitar esse horário.
    let listaErreadosAtualizada = cartoesErreados;
    if (resposta === "errei") {
      const proximaRevisaoMs = Date.now() + 10 * 60 * 1000;
      listaErreadosAtualizada = [
        ...cartoesErreados.filter((item) => item.cartao.id !== cartaoAtual.id),
        { cartao: cartaoAtual, proximaRevisaoMs },
      ];
      setCartoesErreados(listaErreadosAtualizada);
      setAvisoReagendamento("Cartão reagendado para revisão em 10 minutos.");
      setTimeout(() => {
        setAvisoReagendamento(null);
      }, 3500);
    }

    // 4. Continua a sessão com os outros cartões disponíveis
    const proximoIndice = indiceAtual + 1;
    if (proximoIndice < filaEstudo.length) {
      setIndiceAtual(proximoIndice);
    } else {
      // Todos os demais cartões da fila terminaram.
      // O cartão só pode reaparecer se seu nextReviewAt for menor ou igual ao horário atual.
      const agoraMs = Date.now();
      const cartoesAtingiram10Min = listaErreadosAtualizada.filter(
        (item) => item.proximaRevisaoMs <= agoraMs
      );

      if (cartoesAtingiram10Min.length > 0) {
        // Se algum cartão de fato atingiu os 10 minutos durante a sessão, enfileira-o sem duplicar
        const novosParaFila = cartoesAtingiram10Min.map((item) => item.cartao);
        const idsNovos = new Set(novosParaFila.map((c) => c.id));
        setCartoesErreados((prev) => prev.filter((item) => !idsNovos.has(item.cartao.id)));
        setFilaEstudo((prev) => [...prev, ...novosParaFila]);
        setIndiceAtual(proximoIndice);
      } else {
        // Se todos os demais cartões terminaram antes disso, finaliza a sessão normalmente.
        // Não mantém a sessão aberta esperando os 10 minutos nem duplica o cartão.
        await finalizarSessao(novosContadores, tempoSegundos);
      }
    }
  };

  const handleReiniciar = () => {
    setSessaoConcluida(null);
    setContadores({
      totalEstudado: 0,
      erros: 0,
      dificeis: 0,
      bons: 0,
      faceis: 0,
      reagendados: 0,
    });
    setTempoSegundos(0);
    carregarFila();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-400">
        Preparando cartões da sessão...
      </div>
    );
  }

  if (error || !baralho) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">{error || "Baralho não encontrado"}</h2>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => carregarFila()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Tentar novamente
          </button>
          <Link
            href="/aluno/flashcards"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Meus Flashcards</span>
          </Link>
        </div>
      </div>
    );
  }

  // Tela de Conclusão da Sessão
  if (sessaoConcluida) {
    return (
      <div className="py-6">
        <SessaoEstudoConcluidaCard
          sessao={sessaoConcluida}
          baralhoId={baralho.id}
          baralhoNome={baralho.nome}
          onReiniciar={handleReiniciar}
        />
      </div>
    );
  }

  // Fila vazia
  if (filaEstudo.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-4 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Nenhum cartão cadastrado neste baralho
        </h2>
        <p className="text-xs text-gray-500">
          A equipe pedagógica ainda está inserindo os cartões para este módulo.
        </p>
        <Link
          href={`/aluno/flashcards/${baralho.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Baralho</span>
        </Link>
      </div>
    );
  }

  const cartaoAtual = filaEstudo[indiceAtual];
  const progressoAtual =
    progressosMap[cartaoAtual?.id] ||
    ({
      id: `cpa-${alunoId}-${cartaoAtual?.id}`,
      alunoId,
      cartaoId: cartaoAtual?.id,
      baralhoId: baralho.id,
      estado: "novo",
      totalRevisoes: 0,
      totalLapsos: 0,
      fatorFacilidade: 2.5,
      intervaloDias: 0,
      proximaRevisao: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    } as CartaoProgressoAluno);

  const minutosTimer = Math.floor(tempoSegundos / 60);
  const segundosTimer = tempoSegundos % 60;
  const cronometroTexto = `${String(minutosTimer).padStart(2, "0")}:${String(
    segundosTimer
  ).padStart(2, "0")}`;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header com Baralho, Cronômetro e Botão Sair */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
              {baralho.nome}
            </h1>
            <p className="text-xs text-gray-400">
              Modo de Estudo Focado • Método Paulo SRS
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Cronômetro */}
          <div className="px-3 py-1 bg-gray-100 rounded-xl font-mono text-xs text-gray-700 font-bold">
            {cronometroTexto}
          </div>

          <Link
            href={`/aluno/flashcards/${baralho.id}`}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            title="Encerrar sessão e voltar"
            aria-label="Sair"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Aviso de Reagendamento de 10 min */}
      {avisoReagendamento && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-medium animate-fade-in shadow-xs">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{avisoReagendamento} A sessão prossegue com os demais cartões.</span>
        </div>
      )}

      {/* Cartão de Estudo Interativo */}
      <FlashcardStudyCard
        key={`${cartaoAtual.id}-${indiceAtual}`}
        cartao={cartaoAtual}
        progresso={progressoAtual}
        indiceAtual={indiceAtual}
        totalNaFila={filaEstudo.length}
        baralhoNome={baralho.nome}
        onResponder={handleResponder}
      />
    </div>
  );
}
