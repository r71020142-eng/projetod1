import React from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";

interface StreakBannerProps {
  weeks: number;
}

export function StreakBanner({ weeks }: StreakBannerProps) {
  return (
    <Link
      href="/aluno/conquistas"
      className="group flex items-center justify-between gap-4 rounded-2xl border border-[#FFE6D5] bg-[#FFF5EE] px-4 py-2.5 shadow-xs hover:border-[#FFD5BA] transition-all"
    >
      <div className="flex items-center gap-3">
        {/* Star sticker with sunburst dashes matching Image 1 */}
        <div className="relative flex h-8 w-8 items-center justify-center shrink-0">
          {/* Subtle decorative dashes around */}
          <span className="absolute -top-1 -left-1 text-[8px] text-[#F59E0B]">✦</span>
          <span className="absolute -bottom-1 -right-1 text-[8px] text-[#F59E0B]">✦</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-xs">
            <Star className="h-4 w-4 fill-white" />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 font-medium">
          Você está há{" "}
          <span className="font-extrabold text-[#4F46E5]">
            {weeks} semanas
          </span>{" "}
          mantendo sua sequência!
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
