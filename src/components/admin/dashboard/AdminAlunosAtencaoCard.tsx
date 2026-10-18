"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { AlunoAtencao } from "@/types";

interface AdminAlunosAtencaoCardProps {
  alunos: AlunoAtencao[];
}

export function AdminAlunosAtencaoCard({ alunos }: AdminAlunosAtencaoCardProps) {
  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div>
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Acompanhamento pedagógico
            </span>
            <span className="text-xs font-bold text-slate-900 hidden sm:inline">
              Alunos prioritários
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500">
            {alunos.length} em observação
          </span>
        </div>

        {/* Lista Compacta de Alunos */}
        <div className="space-y-2.5 my-1">
          {alunos.slice(0, 4).map((aluno) => {
            const isAtrasado = aluno.status.toLowerCase().includes("atrasad");
            const isAtencao = aluno.status.toLowerCase().includes("atenç");

            return (
              <Link
                key={aluno.id}
                href="/admin/alunos"
                className="group flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 shadow-2xs"
                    style={{ width: 36, height: 36, position: "relative" }}
                  >
                    <Image
                      src={aluno.avatarUrl || "/ana-clara.png"}
                      alt={aluno.nome}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate group-hover:text-[#5B4DFC] transition-colors">
                      {aluno.nome}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {aluno.modulo}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-800">
                    {aluno.progresso}%
                  </div>
                  <div className="mt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                        isAtrasado
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : isAtencao
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {aluno.status}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">
          Critérios de frequência e entregas
        </span>
        <Link
          href="/admin/alunos"
          className="inline-flex items-center gap-1 font-bold text-[#5B4DFC] hover:text-[#4a3ecc] transition-colors"
        >
          <span>Ver prontuários completos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
