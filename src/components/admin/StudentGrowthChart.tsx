"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EvolucaoCrescimentoPonto } from "@/types";

interface StudentGrowthChartProps {
  pontos: EvolucaoCrescimentoPonto[];
}

export function StudentGrowthChart({ pontos }: StudentGrowthChartProps) {
  const activeRange = "Últimos 6 meses";
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(pontos.length - 1);

  // SVG dimensions
  const height = 210;
  const width = 620;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 32;
  const paddingBottom = 32;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxVal = 500;

  // Calculate coordinates
  const coords = pontos.map((p, i) => {
    const x = paddingLeft + (i / (pontos.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (p.alunos / maxVal) * chartHeight;
    return { x, y, ...p };
  });

  // Construct SVG path for smooth line and area
  const linePath = coords.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = coords[idx - 1];
    const cx = (prev.x + curr.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }, "");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${
    paddingTop + chartHeight
  } L ${coords[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">
          Evolução dos alunos
        </h3>

        {/* Range Selector Dropdown matching Image 2 */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>{activeRange}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Responsive SVG Chart matching Image 2 */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="adminPurpleArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B4DFC" stopOpacity="0.25" />
              <stop offset="90%" stopColor="#5B4DFC" stopOpacity="0.01" />
              <stop offset="100%" stopColor="#5B4DFC" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines & Y labels */}
          {[500, 400, 300, 200, 100, 0].map((val) => {
            const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
            return (
              <g key={val} className="text-[10px] fill-slate-400 font-normal">
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end">
                  {val}
                </text>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#adminPurpleArea)" />

          {/* Smooth line */}
          <path
            d={linePath}
            fill="none"
            stroke="#5B4DFC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Points & Jun 2025 Tooltip matching Image 2 */}
          {coords.map((pt, idx) => {
            const isLast = idx === coords.length - 1;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={pt.mes}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                {/* Point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#5B4DFC"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Jun 2025 active tooltip matching Image 2 */}
                {(isHovered || isLast) && (
                  <g className="animate-in fade-in duration-150">
                    <rect
                      x={pt.x - 38}
                      y={pt.y - 28}
                      width="76"
                      height="22"
                      rx="6"
                      fill="#5B4DFC"
                      className="shadow-sm"
                    />
                    {/* Downward triangle pointer */}
                    <polygon
                      points={`${pt.x - 4},${pt.y - 6} ${pt.x + 4},${pt.y - 6} ${pt.x},${pt.y - 2}`}
                      fill="#5B4DFC"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 14}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {pt.alunos} alunos
                    </text>
                  </g>
                )}

                {/* X Axis month label */}
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="10"
                  fontWeight="normal"
                >
                  {pt.mes}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
