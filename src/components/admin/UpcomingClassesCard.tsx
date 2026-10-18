import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminProximaAula } from "@/types";
import { cn } from "@/lib/utils";

interface UpcomingClassesCardProps {
  aulas: AdminProximaAula[];
}

export function UpcomingClassesCard({ aulas }: UpcomingClassesCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Próximas aulas
          </h3>
          <Link
            href="/admin/agenda"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B4DFC] hover:underline"
          >
            <span>Ver todas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          {aulas.map((aula) => (
            <div
              key={aula.id}
              className="flex items-center justify-between gap-3"
            >
              {/* Left: Time box matching Image 2 */}
              <div className="flex flex-col text-left shrink-0 w-12">
                <span className="text-xs font-extrabold text-slate-800 leading-tight">
                  {aula.horario}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {aula.dataLabel}
                </span>
              </div>

              {/* Middle: Student Avatar + Info matching Image 2 */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative h-9 w-9 rounded-full overflow-hidden bg-slate-100 shrink-0">
                  <Image
                    src={aula.alunoAvatar}
                    alt={aula.alunoNome}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {aula.alunoNome}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {aula.turmaOuModulo}
                  </p>
                </div>
              </div>

              {/* Right: Status Pill matching Image 2 */}
              <div className="shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    aula.status === "Confirmada"
                      ? "bg-[#DCFCE7] text-[#16A34A]"
                      : "bg-[#EEF2FF] text-[#5B4DFC]"
                  )}
                >
                  {aula.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
