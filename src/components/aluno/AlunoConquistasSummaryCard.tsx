"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ConquistaConcedida, SolicitacaoPlacaFisica } from "@/types";
import { gamificacaoRepository } from "@/data/api";
import { Trophy, Award, Star, ArrowRight, ShieldCheck } from "lucide-react";

interface AlunoConquistasSummaryCardProps {
  alunoId?: string;
}

export function AlunoConquistasSummaryCard({
  alunoId = "alu-001",
}: AlunoConquistasSummaryCardProps) {
  const [pontos, setPontos] = useState(0);
  const [conquistas, setConquistas] = useState<ConquistaConcedida[]>([]);
  const [placas, setPlacas] = useState<SolicitacaoPlacaFisica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [ptsRes, conqList, plkList] = await Promise.all([
          gamificacaoRepository.obterPontosAluno(alunoId),
          gamificacaoRepository.listarConquistasAluno(alunoId),
          gamificacaoRepository.listarSolicitacoesPlacas(alunoId),
        ]);
        setPontos(ptsRes.pontosTotais);
        setConquistas(conqList);
        setPlacas(plkList);
      } catch (err) {
        console.error("Erro ao carregar resumo de conquistas do aluno:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [alunoId]);

  const placaAtiva = placas.find((p) => p.status !== "cancelado");

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Minhas Conquistas & Placas</h3>
            <p className="text-[11px] text-slate-300">Marcos de dedicação e fluência</p>
          </div>
        </div>

        <Link
          href="/aluno/conquistas"
          className="text-xs font-semibold text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
        >
          <span>Ver todas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Carregando conquistas...</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
              <span className="text-[11px] text-slate-300 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                Pontos de Estudo
              </span>
              <span className="text-xl font-extrabold text-amber-300">{pontos}</span>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
              <span className="text-[11px] text-slate-300 flex items-center gap-1">
                <Award className="w-3 h-3 text-purple-400" />
                Conquistas
              </span>
              <span className="text-xl font-extrabold text-white">
                {conquistas.length} desbloqueadas
              </span>
            </div>
          </div>

          {/* Destaque de Placa Física ou Digital */}
          {placaAtiva ? (
            <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
                  <Trophy className="w-3.5 h-3.5" />
                  Placa Física em Andamento
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-200">
                  {placaAtiva.status === "em_producao"
                    ? "Em Gravação a Laser"
                    : placaAtiva.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Código: <strong className="font-mono text-amber-300">{placaAtiva.codigoValidacao}</strong>
              </p>
            </div>
          ) : (
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] text-slate-200">
                  Marco Operacional B1 Desbloqueado!
                </span>
              </div>
              <Link
                href="/aluno/conquistas"
                className="text-[11px] font-bold text-amber-300 hover:underline"
              >
                Ver Placa →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
