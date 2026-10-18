"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CalendarDays,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { atividadeRepository } from "@/data/atividadeRepository";
import { entregaRepository } from "@/data/entregaRepository";
import { conteudoDiarioRepository } from "@/data/conteudoDiarioRepository";

interface PedagogicalIndicatorsProps {
  initialData?: {
    atividadesPublicadas: number;
    entregasAguardando: number;
    entregasAtrasadas: number;
    conteudosAgendados: number;
  };
}

export function PedagogicalIndicatorsCard({ initialData }: PedagogicalIndicatorsProps) {
  const [data, setData] = useState(
    initialData || {
      atividadesPublicadas: 0,
      entregasAguardando: 0,
      entregasAtrasadas: 0,
      conteudosAgendados: 0,
    }
  );

  useEffect(() => {
    const syncIndicators = async () => {
      try {
        const [pub, aguard, atras, agend] = await Promise.all([
          atividadeRepository.contarPublicadas(),
          entregaRepository.contarAguardandoCorrecao(),
          entregaRepository.contarAtrasadas(),
          conteudoDiarioRepository.contarAgendados(),
        ]);

        setData({
          atividadesPublicadas: pub,
          entregasAguardando: aguard,
          entregasAtrasadas: atras,
          conteudosAgendados: agend,
        });
      } catch (err) {
        console.warn("Aviso ao sincronizar indicadores pedagógicos:", err);
      }
    };

    syncIndicators();

    const handleStorageUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "atividades" ||
        custom.detail.entity === "entregas" ||
        custom.detail.entity === "conteudos_diarios"
      ) {
        syncIndicators();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdate);
    };
  }, []);

  const cards = [
    {
      label: "Atividades publicadas",
      value: data.atividadesPublicadas,
      subtext: "Disponíveis para turmas",
      icon: CheckSquare,
      color: "text-purple-600 bg-purple-50 border-purple-100",
      badgeColor: "bg-purple-100 text-purple-700",
      href: "/admin/materiais",
    },
    {
      label: "Aguardando correção",
      value: data.entregasAguardando,
      subtext: "Pendentes de feedback",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      badgeColor: "bg-amber-100 text-amber-800",
      href: "/admin/materiais",
      highlight: data.entregasAguardando > 0,
    },
    {
      label: "Entregas atrasadas",
      value: data.entregasAtrasadas,
      subtext: "Enviadas após o prazo",
      icon: AlertCircle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      badgeColor: "bg-rose-100 text-rose-700",
      href: "/admin/materiais",
    },
    {
      label: "Conteúdos agendados",
      value: data.conteudosAgendados,
      subtext: "Estímulos diários futuros",
      icon: CalendarDays,
      color: "text-sky-600 bg-sky-50 border-sky-100",
      badgeColor: "bg-sky-100 text-sky-700",
      href: "/admin/materiais",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Operação Pedagógica • Materiais, Atividades & Feedback
            </h3>
            <p className="text-xs text-slate-500">
              Indicadores da esteira de aprendizagem e entregas dos alunos
            </p>
          </div>
        </div>

        <Link
          href="/admin/materiais"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors self-start sm:self-auto"
        >
          <span>Gerenciar na Biblioteca</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <Link
              key={idx}
              href={c.href}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                  {c.label}
                </span>
                <div className={`p-1.5 rounded-lg border ${c.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {c.value}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{c.subtext}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
