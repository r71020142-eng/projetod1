"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ModeloConquista, ConquistaConcedida, Aluno } from "@/types";
import { gamificacaoRepository, alunoRepository } from "@/data/api";
import { ConquistaBadge } from "@/components/gamificacao/ConquistaBadge";
import { PlacaDigitalView } from "@/components/gamificacao/PlacaDigitalView";
import { SolicitarPlacaModal } from "@/components/gamificacao/SolicitarPlacaModal";
import {
  ArrowLeft,
  Trophy,
  Award,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";

export default function AlunoConquistaDetalhePage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.alunoId || "alu-001";
  const params = useParams();
  const id = params?.id as string;

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [modelo, setModelo] = useState<ModeloConquista | null>(null);
  const [concedida, setConcedida] = useState<ConquistaConcedida | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalSolicitarPlaca, setModalSolicitarPlaca] = useState(false);

  const carregar = useCallback(async (mounted = true) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [alu, mod, conqs] = await Promise.all([
        alunoRepository.obterPorId(alunoId),
        gamificacaoRepository.obterModeloPorId(id),
        gamificacaoRepository.listarConquistasAluno(alunoId),
      ]);

      if (!mounted) return;

      setAluno(alu || null);
      setModelo(mod || null);
      const ach = conqs.find((c) => c.modeloId === id);
      setConcedida(ach || null);
    } catch (err: unknown) {
      if (mounted) {
        console.error("Erro ao carregar detalhes da conquista:", err);
        setError((err as Error)?.message || "Não foi possível carregar os detalhes da conquista.");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, [id, alunoId]);

  useEffect(() => {
    let isMounted = true;
    if (id) carregar(isMounted);
    return () => {
      isMounted = false;
    };
  }, [id, carregar]);

  async function handleSolicitarPlacaFisica() {
    if (!aluno || !modelo) return;
    await gamificacaoRepository.registrarInteressePlacaFisica({
      alunoId: aluno.id,
      alunoNome: aluno.nomeCompleto,
      conquistaId: modelo.id,
      conquistaNome: modelo.nome,
      nivelMarco: modelo.nivelRequerido,
    });
    setModalSolicitarPlaca(false);
    carregar();
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando conquista...</div>;
  }

  if (error || !modelo) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <p className="text-sm font-semibold text-slate-700">{error || "Conquista não encontrada."}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => carregar()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Tentar novamente
          </button>
          <Link href="/aluno/conquistas" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">
            Voltar para minhas conquistas
          </Link>
        </div>
      </div>
    );
  }

  const isDesbloqueada = Boolean(concedida);

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/aluno/conquistas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Minhas Conquistas</span>
        </Link>
      </div>

      {/* Hero do Modelo */}
      <div
        className={`p-6 rounded-3xl border shadow-xs space-y-4 ${
          isDesbloqueada
            ? "bg-white border-amber-300/80 ring-1 ring-amber-300/20"
            : "bg-slate-50/70 border-slate-200/80"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ConquistaBadge icone={modelo.icone} desbloqueada={isDesbloqueada} tamanho="lg" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {modelo.categoria.replace("_", " ").toUpperCase()}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{modelo.nome}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{modelo.descricao}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Award className="w-3 h-3 text-amber-600" />
              +{modelo.pontosRecompensa} pts
            </span>

            <span className="block text-xs font-semibold mt-1">
              {isDesbloqueada ? (
                <span className="text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Desbloqueada
                </span>
              ) : (
                <span className="text-slate-400 inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Bloqueada
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Detalhes do Critério */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
            Requisito de Conquista:
          </span>
          <p className="leading-relaxed">
            {modelo.tipoCriterio === "horas_aulas" && `Completar ${modelo.metaValor} horas de aula com presença confirmada pelo professor.`}
            {modelo.tipoCriterio === "streak_dias" && `Manter uma sequência ininterrupta de ${modelo.metaValor} dias revisando flashcards.`}
            {modelo.tipoCriterio === "flashcards_revisados" && `Revisar um total acumulado de ${modelo.metaValor} cartões no sistema SRS.`}
            {modelo.tipoCriterio === "modulos_concluidos" && `Completar e ter validado pelo docente ${modelo.metaValor} módulo(s) pedagógico(s).`}
            {modelo.tipoCriterio === "avaliacoes_aprovadas" && `Obter aprovação em ${modelo.metaValor} avaliação(ões) prática(s) com rubrica.`}
            {modelo.tipoCriterio === "nivel_alcancado" && `Ter o nível operacional ${modelo.nivelRequerido} oficializado pelo professor.`}
            {modelo.tipoCriterio === "participacao_comunidade" && `Realizar ${modelo.metaValor} participações construtivas na comunidade MTD.`}
            {modelo.tipoCriterio === "manual" && "Reconhecimento pedagógico especial atribuído manualmente pelo docente."}
          </p>
        </div>
      </div>

      {/* Visualização de Placa Digital se Desbloqueada */}
      {concedida && modelo.tipoPremio === "placa_digital" && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Sua Placa Digital Comemorativa</span>
          </h2>

          <PlacaDigitalView
            alunoNome={aluno?.nomeCompleto || "Mariana Oliveira"}
            marcoNome={modelo.nome}
            dataConcessao={concedida.dataConcessao || concedida.concedidaEm || new Date().toISOString()}
            codigoValidacao={concedida.codigoValidacaoDigital || "MTD-PLK-8421-B1"}
            professorNome={concedida.professorNome}
            elegivelPlacaFisica={modelo.elegivelPlacaFisica}
            onSolicitarPlacaFisica={() => setModalSolicitarPlaca(true)}
          />
        </div>
      )}

      {/* Modal Solicitar Placa Física */}
      {modalSolicitarPlaca && (
        <SolicitarPlacaModal
          isOpen={modalSolicitarPlaca}
          onClose={() => setModalSolicitarPlaca(false)}
          onSubmit={handleSolicitarPlacaFisica}
          alunoNome={aluno?.nomeCompleto || "Mariana Oliveira"}
          marcoNome={modelo.nome}
        />
      )}
    </div>
  );
}
