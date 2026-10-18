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
    <div className="bg-white rounded-[14px] border border-[#DDDDE5] p-5 sm:p-6 shadow-xs relative overflow-hidden group">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Lado Esquerdo: Métricas Principais da Semana */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F3] text-[#D79A24] border border-[#D79A24]/30">
              <BarChart2 className="w-3.5 h-3.5 text-[#D79A24]" />
              Minha semana de estudos
            </span>
          </div>

          <h2 className="font-serif text-base sm:text-lg font-bold text-[#07132E] leading-snug">
            Dedicação no Método Paulo
          </h2>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-[10px] bg-[#FAF8F3] border border-[#DDDDE5]">
              <div className="flex items-center gap-1.5 text-xs text-[#60708F] font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-[#5B2FE8]" />
                <span>Tempo dedicado</span>
              </div>
              <div className="font-serif text-base sm:text-lg font-bold text-[#07132E]">
                {tempoEstudoTexto || "4h 15min"}
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-[#FAF8F3] border border-[#DDDDE5]">
              <div className="flex items-center gap-1.5 text-xs text-[#60708F] font-semibold mb-1">
                <CheckSquare className="w-3.5 h-3.5 text-[#16A879]" />
                <span>Entregas</span>
              </div>
              <div className="font-serif text-base sm:text-lg font-bold text-[#07132E]">
                {atividadesConcluidasCount} {atividadesConcluidasCount === 1 ? "concluída" : "concluídas"}
              </div>
            </div>

            <div className="p-3 rounded-[10px] bg-[#FAF8F3] border border-[#DDDDE5]">
              <div className="flex items-center gap-1.5 text-xs text-[#60708F] font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#D79A24]" />
                <span>Frequência</span>
              </div>
              <div className="font-serif text-base sm:text-lg font-bold text-[#07132E]">
                {diasComPratica} de 7 dias
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Gráfico de Barras Compacto com Resumo Textual */}
        <div className="lg:w-80 shrink-0 bg-[#FAF8F3] border border-[#DDDDE5] p-4 rounded-[10px]">
          <div className="text-xs font-bold text-[#07132E] mb-3 flex items-center justify-between font-sans">
            <span>Evolução diária (minutos)</span>
            <span className="text-[11px] font-semibold text-[#5B2FE8]">Meta: 30min/dia</span>
          </div>

          {temDados ? (
            <div>
              {/* Barras dos Dias */}
              <div className="flex items-end justify-between gap-2 h-20 px-1 pb-1 border-b border-[#DDDDE5]">
                {dias.map((d) => {
                  const altura = Math.max(d.alturaPercentual || 10, 8);
                  const isMetaBatida = d.minutos >= 30;

                  return (
                    <div
                      key={d.dia}
                      className="flex-1 flex flex-col items-center gap-1 group/bar relative h-full justify-end"
                    >
                      {/* Tooltip hover */}
                      <div className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-[#06142C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap z-10">
                        {d.minutos} min
                      </div>

                      <div
                        className={`w-full rounded-xs transition-all duration-300 ${
                          isMetaBatida
                            ? "bg-[#5B2FE8] group-hover/bar:bg-[#7047F5]"
                            : d.minutos > 0
                            ? "bg-[#EDB84E] group-hover/bar:bg-[#D79A24]"
                            : "bg-slate-200"
                        }`}
                        style={{ height: `${altura}%` }}
                      />
                      <span className="text-[10px] font-bold text-[#60708F] uppercase mt-1">
                        {d.dia}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Resumo Textual */}
              <p className="text-[11px] text-[#60708F] font-medium mt-2.5 leading-relaxed text-center">
                Você estudou em {diasComPratica} dias nesta semana, mantendo a consistência do seu aprendizado.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-[#60708F] text-xs">
              Nenhum registro de estudo registrado nesta semana.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
