import React from "react";
import { Target } from "lucide-react";

export function MotivationalBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100/50 bg-gradient-to-r from-[#F6F4FF] via-[#F8F5FF] to-[#FFF0F4] p-5 sm:p-6 shadow-xs flex items-center justify-between">
      <div className="flex items-center gap-4 z-10">
        {/* Red Bullseye Target Icon matching Image 1 */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF1F2] text-[#EF4444] border border-[#FFE4E6]">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
            Você está no caminho certo!
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Mantenha sua rotina de estudos e continue evoluindo no Método Paulo.
          </p>
        </div>
      </div>

      {/* Mountain Illustration with red flag on summit matching Image 1 */}
      <div className="relative w-44 h-16 shrink-0 hidden sm:block">
        <svg viewBox="0 0 180 70" className="w-full h-full">
          {/* Background hills */}
          <path
            d="M50 70 L110 20 L160 70 Z"
            fill="#E0E7FF"
            opacity="0.6"
          />
          {/* Foreground mountain */}
          <path
            d="M80 70 L135 15 L190 70 Z"
            fill="#C7D2FE"
          />
          {/* Mountain shading */}
          <path
            d="M135 15 L190 70 L135 70 Z"
            fill="#A5B4FC"
          />
          {/* Summit flag pole */}
          <line
            x1="135"
            y1="15"
            x2="135"
            y2="5"
            stroke="#1E1B4B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Red flag */}
          <polygon
            points="135,5 147,9 135,13"
            fill="#EF4444"
          />
        </svg>
      </div>
    </div>
  );
}
