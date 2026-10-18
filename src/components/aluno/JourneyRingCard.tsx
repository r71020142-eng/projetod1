import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface JourneyRingCardProps {
  progressPercentage: number;
  currentModuleName: string;
}

export function JourneyRingCard({
  progressPercentage,
  currentModuleName,
}: JourneyRingCardProps) {
  // SVG circular calculations
  const size = 130;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-bold text-slate-900">
          Sua jornada
        </h3>
        <Link
          href="/aluno/aulas"
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Ver detalhes da jornada"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Circular Progress Gauge matching Image 1 */}
      <div className="flex items-center justify-center my-3">
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated Progress Arc in lime green */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#8CE024"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Centered Percentage Label */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold text-slate-900 leading-tight">
              {progressPercentage}%
            </span>
            <span className="text-[11px] text-slate-400 font-normal">concluído</span>
          </div>
        </div>
      </div>

      {/* Module info footer matching Image 1 */}
      <div className="pt-2 text-left">
        <p className="text-[11px] text-slate-400 font-medium">Módulo atual:</p>
        <p className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">
          {currentModuleName}
        </p>
      </div>
    </div>
  );
}
