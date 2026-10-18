"use client";

import React from "react";
import Link from "next/link";
import { FlashcardsMetricasAdmin } from "@/types";
import { Layers, ArrowRight, AlertTriangle } from "lucide-react";

interface FlashcardsAdminCardProps {
  metricas?: FlashcardsMetricasAdmin;
}

export function FlashcardsAdminCard({ metricas }: FlashcardsAdminCardProps) {
  const baralhos = metricas?.totalBaralhosPublicados ?? 0;
  const cartoes = metricas?.totalCartoesAtivos ?? 0;
  const revisoes = metricas?.revisoesRealizadas ?? 0;
  const alunos = metricas?.alunosAtivosRevisando ?? 0;
  const maisErros = metricas?.cartoesMaisErros ?? [];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Flashcards & Repetição Espaçada</h3>
            <p className="text-xs text-gray-500">Métricas gerais de retenção e estudo</p>
          </div>
        </div>

        <Link
          href="/admin/flashcards"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>Gerenciar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
          <span className="text-xl font-extrabold text-gray-900">{baralhos}</span>
          <p className="text-[11px] font-medium text-gray-500 mt-0.5">Baralhos</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center">
          <span className="text-xl font-extrabold text-gray-900">{cartoes}</span>
          <p className="text-[11px] font-medium text-gray-500 mt-0.5">Cartões Ativos</p>
        </div>
        <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
          <span className="text-xl font-extrabold text-indigo-700">{revisoes}</span>
          <p className="text-[11px] font-medium text-indigo-900/70 mt-0.5">Revisões</p>
        </div>
        <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
          <span className="text-xl font-extrabold text-emerald-700">{alunos}</span>
          <p className="text-[11px] font-medium text-emerald-900/70 mt-0.5">Alunos Ativos</p>
        </div>
      </div>

      {maisErros.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1 text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cartões com Mais Dificuldades</span>
            </span>
            <span className="text-[11px] text-gray-400">Total Lapsos</span>
          </div>

          <div className="space-y-1.5">
            {maisErros.slice(0, 3).map((item) => (
              <div
                key={item.cartaoId}
                className="flex items-center justify-between p-2 rounded-xl bg-gray-50/70 text-xs border border-gray-100"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-gray-900 block truncate">
                    {item.frente}
                  </span>
                  <span className="text-[11px] text-gray-400 block truncate">
                    {item.baralhoNome}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] shrink-0">
                  {item.totalLapsos} erro{item.totalLapsos > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
