"use client";

import React from "react";
import Link from "next/link";
import { ModeloConquista, ConquistaConcedida } from "@/types";
import { ConquistaBadge } from "./ConquistaBadge";
import { CheckCircle2, Lock, Award, Trophy, ExternalLink } from "lucide-react";

interface ConquistaCardProps {
  modelo: ModeloConquista;
  concedida?: ConquistaConcedida;
  progressoAtual?: number;
  progressoMeta?: number;
  isAdmin?: boolean;
  onVerPlacaDigital?: (concedida: ConquistaConcedida, modelo: ModeloConquista) => void;
}

export function ConquistaCard({
  modelo,
  concedida,
  progressoAtual,
  progressoMeta,
  isAdmin = false,
  onVerPlacaDigital,
}: ConquistaCardProps) {
  const isDesbloqueada = Boolean(concedida);
  const meta = progressoMeta ?? modelo.metaValor ?? 1;
  const atual = progressoAtual ?? (isDesbloqueada ? meta : 0);
  const percentual = Math.min(100, Math.round((atual / meta) * 100));

  const categoriasLabels: Record<string, string> = {
    aulas_frequencia: "Aulas & Presença",
    flashcards_estudo: "Flashcards & Hábitos",
    avaliacoes_progresso: "Avaliações & Módulos",
    comunidade_engajamento: "Comunidade",
    nivel_marco: "Marco de Nível Operacional",
    placas_reconhecimento: "Placas de Reconhecimento",
  };

  return (
    <div
      className={`p-5 rounded-3xl border transition flex flex-col justify-between shadow-xs ${
        isDesbloqueada
          ? "bg-white border-amber-300/80 ring-1 ring-amber-300/30"
          : "bg-slate-50/60 border-slate-200/80 opacity-80"
      }`}
    >
      <div className="space-y-3">
        {/* Topo: Badge e Pontos */}
        <div className="flex items-start justify-between gap-3">
          <ConquistaBadge
            icone={modelo.icone}
            desbloqueada={isDesbloqueada}
            tamanho="md"
          />

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Award className="w-3 h-3 text-amber-600" />
              +{modelo.pontosRecompensa} pts
            </span>

            {modelo.tipoPremio === "placa_digital" && (
              <span className="block text-[10px] font-semibold text-purple-700 mt-1">
                Placa Digital
              </span>
            )}
            {modelo.tipoPremio === "placa_fisica" && (
              <span className="block text-[10px] font-semibold text-amber-800 mt-1">
                Placa Física
              </span>
            )}
          </div>
        </div>

        {/* Título e Categoria */}
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
            {categoriasLabels[modelo.categoria] || modelo.categoria}
          </span>
          <h3 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">
            {modelo.nome}
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {modelo.descricao}
          </p>
        </div>
      </div>

      {/* Rodapé: Progresso ou Status Desbloqueado */}
      <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
        {concedida ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Desbloqueada!
              </span>
              <span className="text-[11px] text-slate-400">
                {new Date(concedida.dataConcessao || concedida.concedidaEm || 0).toLocaleDateString("pt-BR")}
              </span>
            </div>

            {concedida.codigoValidacaoDigital && (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Identificador demonstrativo:</span>
                <span className="font-mono font-bold text-indigo-600 text-[10px]">
                  {concedida.codigoValidacaoDigital}
                </span>
              </div>
            )}

            {/* Ação de visualização da Placa Digital */}
            {modelo.tipoPremio === "placa_digital" && onVerPlacaDigital && (
              <button
                onClick={() => onVerPlacaDigital(concedida, modelo)}
                className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Visualizar Placa Digital</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500 font-medium text-[11px]">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Progresso
              </span>
              <span>
                {atual} / {meta} ({percentual}%)
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="pt-2 flex justify-end">
            <Link
              href={`/admin/conquistas/${modelo.id}`}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              <span>Gerenciar modelo</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
