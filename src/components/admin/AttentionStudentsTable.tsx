import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { AlunoAtencao } from "@/types";
import { cn } from "@/lib/utils";

interface AttentionStudentsTableProps {
  alunos: AlunoAtencao[];
}

export function AttentionStudentsTable({ alunos }: AttentionStudentsTableProps) {
  const getStatusBadge = (status: AlunoAtencao["status"]) => {
    switch (status) {
      case "Atrasado":
        return "bg-[#FEE2E2] text-[#DC2626]";
      case "Atenção":
        return "bg-[#FEF3C7] text-[#D97706]";
      case "Em dia":
      default:
        return "bg-[#DCFCE7] text-[#16A34A]";
    }
  };

  const getProgressBarColor = (status: AlunoAtencao["status"]) => {
    switch (status) {
      case "Atrasado":
        return "bg-[#EF4444]";
      case "Atenção":
        return "bg-[#F59E0B]";
      case "Em dia":
      default:
        return "bg-[#22C55E]";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-slate-900">
          Alunos que precisam de atenção
        </h3>
        <Link
          href="/admin/alunos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B4DFC] hover:underline"
        >
          <span>Ver todas</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Table container matching Image 2 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400">
              <th className="pb-3 pl-1 font-medium">Aluno</th>
              <th className="pb-3 px-4 font-medium">Módulo</th>
              <th className="pb-3 px-4 font-medium">Progresso</th>
              <th className="pb-3 px-4 font-medium">Última aula</th>
              <th className="pb-3 px-4 font-medium">Status</th>
              <th className="pb-3 pr-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70 text-xs">
            {alunos.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                {/* Aluno Avatar + Name matching Image 2 */}
                <td className="py-3 pl-1">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-slate-100 shrink-0">
                      <Image
                        src={item.avatarUrl}
                        alt={item.nome}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="font-semibold text-slate-800">
                      {item.nome}
                    </span>
                  </div>
                </td>

                {/* Módulo */}
                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                  {item.modulo}
                </td>

                {/* Progresso with colored progress bar matching Image 2 */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-3 w-40">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", getProgressBarColor(item.status))}
                        style={{ width: `${item.progresso}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 w-8 text-right">
                      {item.progresso}%
                    </span>
                  </div>
                </td>

                {/* Última aula */}
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  {item.ultimaAula}
                </td>

                {/* Status Pill */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold",
                      getStatusBadge(item.status)
                    )}
                  >
                    {item.status}
                  </span>
                </td>

                {/* Three dots action */}
                <td className="py-3 pr-2 text-right">
                  <button
                    type="button"
                    aria-label={`Ações para ${item.nome}`}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
