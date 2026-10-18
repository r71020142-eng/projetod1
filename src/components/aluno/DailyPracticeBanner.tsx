"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { ConteudoDiario } from "@/types";

interface DailyPracticeBannerProps {
  pratica?: ConteudoDiario;
}

export function DailyPracticeBanner({ pratica }: DailyPracticeBannerProps) {
  if (!pratica) return null;

  return (
    <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Prática de hoje • Método Paulo
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
            {pratica.titulo}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-1 max-w-2xl font-normal">
            {pratica.texto}
          </p>
        </div>
      </div>

      <Link
        href="/aluno/materiais"
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs transition-all shrink-0 self-start sm:self-auto"
      >
        <span>Praticar Agora</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
