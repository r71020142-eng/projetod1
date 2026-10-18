"use client";

import React from "react";
import { Clock, CheckSquare, Calendar, BarChart2 } from "lucide-react";
import { DiaEvolucao } from "@/types";

interface MinhaSemanaCardProps {
  tempoEstudoTexto: string;
  atividadesConcluidasCount: number;
  dias: DiaEvolucao[];
}

export function MinhaSemanaCard({
  tempoEstudoTexto,
  atividadesConcluidasCount,
  dias,
}: MinhaSemanaCardProps) {
  const temDados = dias && dias.length > 0 && dias.some((d) => d.minutos > 0);
  const diasComPratica = dias ? dias.filter((d) => d.minutos > 0).length : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Lado Esquerdo: Métricas Principais da Semana */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0EEFF] text-[#5B4DFC]">
              <BarChart2 className="w-3.5 h-3.5 text-[#5B4DFC]" />
              Minha semana de estudos
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            Dedicação no Método Paulo
          </h2>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-[#5B4DFC]" />
                <span>Tempo dedicado</span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-slate-900">
                {tempoEstudoTexto || "4h 15min"}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Entregas</span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-slate-900">
                {atividadesConcluidasCount} {atividadesConcluidasCount === 1 ? "concluída" : "concluídas"}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Frequência</span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-slate-900">
                {diasComPratica} de 7 dias
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Gráfico de Barras Compacto com Resumo Textual */}
        <div className="lg:w-80 shrink-0 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
            <span>Evolução diária (minutos)</span>
            <span className="text-[11px] font-semibold text-[#5B4DFC]">Meta: 30min/dia</span>
          </div>

          {temDados ? (
            <div>
              {/* Barras dos Dias */}
              <div className="flex items-end justify-between gap-2 h-20 px-1 pb-1 border-b border-slate-200/60">
                {dias.map((d) => {
                  const altura = Math.max(d.alturaPercentual || 10, 8);
                  const isMetaBatida = d.minutos >= 30;

                  return (
                    <div
                      key={d.dia}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap z-10">
                        {d.minutos} min
                      </div>

                      <div
                        className={`w-full rounded-md transition-all duration-300 ${
                          isMetaBatida
                            ? "bg-[#5B4DFC] group-hover:bg-[#4a3ecc]"
                            : d.minutos > 0
                            ? "bg-indigo-300 group-hover:bg-indigo-400"
                            : "bg-slate-200/80"
                        }`}
                        style={{ height: `${altura}%` }}
                      />
                      <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                        {d.dia}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Resumo Textual */}
              <p className="text-[11px] text-slate-600 font-medium mt-2.5 leading-relaxed text-center">
                Você estudou em {diasComPratica} dias nesta semana, mantendo a consistência do seu aprendizado.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              Nenhum registro de estudo registrado nesta semana.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
