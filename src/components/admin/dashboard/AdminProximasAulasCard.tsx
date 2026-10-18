"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { AdminProximaAula } from "@/types";

interface AdminProximasAulasCardProps {
  aulas: AdminProximaAula[];
}

export function AdminProximasAulasCard({ aulas }: AdminProximasAulasCardProps) {
  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div>
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Próximas aulas
            </h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#F0EEFF] text-[#5B4DFC]">
              {aulas.length} agendadas
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Agenda do dia
          </span>
        </div>

        {/* Lista de Aulas */}
        {aulas.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 my-2 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              Nenhuma aula síncrona agendada
            </div>
            <div className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Utilize o calendário para marcar novos encontros ou criar turmas.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 my-1">
            {aulas.slice(0, 4).map((aula) => {
              const isConfirmada =
                aula.status.toLowerCase().includes("confirmada") ||
                aula.status.toLowerCase().includes("ok");

              return (
                <div
                  key={aula.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 shadow-2xs"
                      style={{ width: 36, height: 36, position: "relative" }}
                    >
                      <Image
                        src={aula.alunoAvatar || "/ana-clara.png"}
                        alt={aula.alunoNome}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {aula.alunoNome}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {aula.turmaOuModulo}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-xs font-extrabold text-slate-900">
                      <Clock className="w-3 h-3 text-[#5B4DFC]" />
                      <span>{aula.horario}</span>
                    </div>
                    <div className="mt-0.5">
                      {isConfirmada ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Confirmada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Link pendente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé: Link para Agenda */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">
          Links manuais auditados do Zoom
        </span>
        <Link
          href="/admin/agenda"
          className="inline-flex items-center gap-1 font-bold text-[#5B4DFC] hover:text-[#4a3ecc] transition-colors"
        >
          <span>Ver agenda completa</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
