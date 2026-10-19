"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { AcaoPlanoDiario } from "@/data/planoDiarioMotor";

interface MobileNextActionCardProps {
  acoes: AcaoPlanoDiario[];
}

export function MobileNextActionCard({ acoes }: MobileNextActionCardProps) {
  const acoesPendentes = acoes
    .filter((a) => a.tipo !== "feedback" && a.tipo !== "conquista");

  const primeiraAcao = acoesPendentes[0];
  const restantes = acoesPendentes.length - 1;

  if (!primeiraAcao) {
    return (
      <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-4 shadow-xs text-center">
        <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-[#ECFDF5] text-[#16A879] flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-sm font-bold text-[#07132E]">
          Tudo concluído por hoje!
        </h2>
        <p className="text-xs text-[#60708F] mt-0.5 font-sans">
          Você está em dia com seu plano de estudos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-4 shadow-xs space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-[#60708F] uppercase tracking-wider">
          SEU PRÓXIMO PASSO
        </h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE9FE] text-[#5B2FE8]">
          Prioridade
        </span>
      </div>

      <div>
        <h3 className="font-serif text-base font-bold text-[#07132E]">
          {primeiraAcao.titulo}
        </h3>
        <p className="text-xs text-[#60708F] mt-0.5">
          {primeiraAcao.prazoOuTempo || primeiraAcao.contexto}
        </p>
      </div>

      <Link
        href={primeiraAcao.href}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#5B2FE8] hover:bg-[#7047F5] text-white text-xs font-bold transition-colors shadow-xs"
      >
        <span>Começar agora</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>

      {restantes > 0 && (
        <div className="pt-2 border-t border-[#DDDDE5]/60 text-center">
          <Link
            href="/aluno/atividades"
            className="text-xs font-semibold text-[#5B2FE8] hover:underline"
          >
            Mais {restantes} {restantes === 1 ? "ação" : "ações"} para hoje — Ver plano completo
          </Link>
        </div>
      )}
    </div>
  );
}
