"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";
import { AtividadePendente } from "@/types";
import { cn } from "@/lib/utils";

interface PendingActivitiesCardProps {
  initialAtividades: AtividadePendente[];
}

export function PendingActivitiesCard({ initialAtividades }: PendingActivitiesCardProps) {
  const [atividades, setAtividades] = useState(initialAtividades);

  const toggleAtividade = (id: string) => {
    setAtividades((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, concluida: !item.concluida } : item
      )
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900">
            Atividades pendentes
          </h3>
          <Link
            href="/aluno/atividades"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Ver todas as atividades"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="space-y-4">
          {atividades.map((atv) => (
            <div
              key={atv.id}
              onClick={() => toggleAtividade(atv.id)}
              className="flex items-start gap-3.5 cursor-pointer group select-none"
              role="checkbox"
              aria-checked={atv.concluida}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleAtividade(atv.id);
                }
              }}
            >
              {/* Checkbox matching Image 1: square with rounded-md */}
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  atv.concluida
                    ? "border-[#15803D] bg-[#16A34A] text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                )}
              >
                {atv.concluida && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs sm:text-sm font-semibold leading-snug",
                    atv.concluida
                      ? "line-through text-slate-400"
                      : "text-slate-800"
                  )}
                >
                  {atv.titulo}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {atv.modulo} • {atv.concluida ? "Concluído" : atv.duracaoTexto}
                </p>
              </div>

              <Link
                href={`/aluno/materiais/${atv.id}`}
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-purple-600 self-center"
                title="Abrir detalhes da atividade"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
