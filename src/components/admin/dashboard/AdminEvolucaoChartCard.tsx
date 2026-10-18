"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { EvolucaoCrescimentoPonto } from "@/types";

interface AdminEvolucaoChartCardProps {
  pontos: EvolucaoCrescimentoPonto[];
}

export function AdminEvolucaoChartCard({ pontos }: AdminEvolucaoChartCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calcula valores proporcionais do SVG
  const maxAlunos = Math.max(...pontos.map((p) => p.alunos), 500);
  const minAlunos = Math.min(...pontos.map((p) => p.alunos), 100);

  const width = 500;
  const height = 140;
  const paddingX = 35;
  const paddingTop = 25;
  const paddingBottom = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = pontos.map((p, idx) => {
    const x = paddingX + (idx / (pontos.length - 1)) * chartWidth;
    const y =
      paddingTop +
      chartHeight -
      ((p.alunos - minAlunos) / (maxAlunos - minAlunos || 1)) * chartHeight;
    return { x, y, ...p };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[idx - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div>
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0EEFF] text-[#5B4DFC]">
              <TrendingUp className="w-3.5 h-3.5 text-[#5B4DFC]" />
              Evolução e adesão
            </span>
            <span className="text-xs font-bold text-slate-900 hidden sm:inline">
              Alunos matriculados
            </span>
          </div>

          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            +18% este semestre
          </span>
        </div>

        {/* Gráfico SVG Compacto */}
        <div className="relative w-full overflow-hidden mt-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            className="w-full h-36 overflow-visible select-none"
            style={{ maxHeight: 144 }}
          >
            <defs>
              <linearGradient id="adminChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B4DFC" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#5B4DFC" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de grade suaves */}
            <line
              x1={paddingX}
              y1={paddingTop}
              x2={width - paddingX}
              y2={paddingTop}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={paddingTop + chartHeight / 2}
              x2={width - paddingX}
              y2={paddingTop + chartHeight / 2}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={height - paddingBottom}
              x2={width - paddingX}
              y2={height - paddingBottom}
              stroke="#CBD5E1"
            />

            {/* Área com gradiente */}
            <path d={areaD} fill="url(#adminChartGrad)" />

            {/* Linha principal */}
            <path
              d={pathD}
              fill="none"
              stroke="#5B4DFC"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Pontos interativos */}
            {points.map((pt, idx) => (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIdx === idx ? "5.5" : "4"}
                  className="fill-white stroke-[#5B4DFC] stroke-2 transition-all duration-150"
                />

                {/* Rótulo do Mês abaixo */}
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-400 uppercase"
                >
                  {pt.mes.split(" ")[0]}
                </text>
              </g>
            ))}
          </svg>

          {/* Tooltip dinâmico */}
          {hoveredIdx !== null && (
            <div
              className="absolute -top-1 transform -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-md pointer-events-none transition-all z-10"
              style={{ left: `${(points[hoveredIdx].x / width) * 100}%` }}
            >
              {points[hoveredIdx].mes}: {points[hoveredIdx].alunos} alunos
            </div>
          )}
        </div>

        {/* Resumo Textual */}
        <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed text-center">
          Crescimento contínuo de matrículas ativas no Método Paulo com taxa média de retenção superior a 92%.
        </p>
      </div>

      {/* Rodapé */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">
          Histórico semestral consolidado
        </span>
        <Link
          href="/admin/alunos"
          className="inline-flex items-center gap-1 font-bold text-[#5B4DFC] hover:text-[#4a3ecc] transition-colors"
        >
          <span>Ver todos os alunos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
