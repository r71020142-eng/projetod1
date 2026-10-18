import React from "react";
import Link from "next/link";
import { ChevronRight, Clock, BarChart3 } from "lucide-react";
import { DiaEvolucao } from "@/types";

interface WeeklyEvolutionCardProps {
  dias: DiaEvolucao[];
  tempoEstudoTexto: string;
  atividadesConcluidasCount: number;
}

export function WeeklyEvolutionCard({
  dias,
  tempoEstudoTexto,
  atividadesConcluidasCount,
}: WeeklyEvolutionCardProps) {
  const maxMinutes = 120;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900">
            Evolução semanal
          </h3>
          <Link
            href="/aluno/conquistas"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Ver histórico de evolução"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Clean CSS-based Bar Chart matching Image 1 */}
        <div className="relative pt-1 pb-2">
          {/* Y Axis Guide lines */}
          <div className="flex flex-col justify-between h-32 text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-5 text-right">120</span>
              <div className="flex-1 border-b border-slate-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-right">90</span>
              <div className="flex-1 border-b border-slate-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-right">60</span>
              <div className="flex-1 border-b border-slate-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-right">30</span>
              <div className="flex-1 border-b border-slate-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 text-right">0</span>
              <div className="flex-1 border-b border-slate-200" />
            </div>
          </div>

          {/* Bars overlay */}
          <div className="absolute inset-x-7 bottom-4 top-1 flex items-end justify-between px-2">
            {dias.map((d) => {
              const heightPct = Math.min(100, Math.round((d.minutos / maxMinutes) * 100));

              return (
                <div key={d.dia} className="flex flex-col items-center gap-1 group">
                  <div
                    className="w-4 bg-[#8CE024] rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%` }}
                    title={`${d.dia}: ${d.minutos} min`}
                  />
                </div>
              );
            })}
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between pl-7 pr-1 pt-1.5 text-[11px] font-medium text-slate-400">
            {dias.map((d) => (
              <span key={d.dia} className="w-6 text-center">
                {d.dia}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Metrics matching Image 1 */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#5B4DFC]">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">
              {tempoEstudoTexto}
            </p>
            <p className="text-[11px] text-slate-400">Tempo de estudo</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#16A34A]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">
              {atividadesConcluidasCount}
            </p>
            <p className="text-[11px] text-slate-400">Atividades concluídas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
