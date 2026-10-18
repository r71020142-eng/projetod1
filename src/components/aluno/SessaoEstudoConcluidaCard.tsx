"use client";

import React from "react";
import Link from "next/link";
import { SessaoEstudoResumo } from "@/types";
import { CheckCircle2, RotateCcw, ArrowLeft, Clock, Zap, Target } from "lucide-react";

interface SessaoEstudoConcluidaCardProps {
  sessao: SessaoEstudoResumo;
  baralhoId: string;
  baralhoNome: string;
  onReiniciar: () => void;
}

export function SessaoEstudoConcluidaCard({
  sessao,
  baralhoId,
  baralhoNome,
  onReiniciar,
}: SessaoEstudoConcluidaCardProps) {
  const minutos = Math.floor(sessao.tempoSegundos / 60);
  const segundos = sessao.tempoSegundos % 60;
  const tempoTexto = `${minutos > 0 ? `${minutos}m ` : ""}${segundos}s`;

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center space-y-6 animate-fade-in">
      {/* Ícone de Conquista */}
      <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Sessão Concluída!
        </span>
        <h2 className="text-2xl font-extrabold text-gray-900">
          Excelente prática no Método Paulo!
        </h2>
        <p className="text-sm text-gray-500">
          Você revisou todos os cartões programados para hoje no baralho{" "}
          <strong className="text-gray-800">{baralhoNome}</strong>.
        </p>
      </div>

      {/* Grade de Estatísticas da Sessão */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Target className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-gray-900">{sessao.totalEstudado}</div>
          <div className="text-[11px] text-gray-500">Cartões</div>
        </div>

        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-center text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-gray-900">{tempoTexto}</div>
          <div className="text-[11px] text-gray-500">Tempo Total</div>
        </div>

        <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
          <div className="flex items-center justify-center text-emerald-500 mb-1">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700">
            {sessao.bons + sessao.faceis}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Bons / Fáceis</div>
        </div>

        <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-100">
          <div className="flex items-center justify-center text-rose-500 mb-1">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-rose-700">{sessao.erros}</div>
          <div className="text-[11px] text-rose-600 font-medium">Reagendados</div>
        </div>
      </div>

      {/* Explicação de Repetição Espaçada */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-900 text-left">
        <strong className="font-semibold block mb-1">Algoritmo de Retenção Ativo (Inspirado no SM-2):</strong>
        Os cartões marcados como <em>Bom</em> ou <em>Fácil</em> tiveram seus intervalos ampliados para reforçar a memória de longo prazo.
        {sessao.erros > 0 ? (
          <span className="block mt-1 text-rose-800 font-medium">
            Os {sessao.erros} cartões com resposta <em>Errei</em> foram agendados para nova revisão após 10 minutos e estarão disponíveis na sua fila assim que esse intervalo for alcançado.
          </span>
        ) : (
          <span className="block mt-1">
            Nenhum cartão precisou de reagendamento para 10 minutos nesta sessão.
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-gray-100">
        <Link
          href={`/aluno/flashcards/${baralhoId}`}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Baralho</span>
        </Link>
        <button
          type="button"
          onClick={onReiniciar}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Revisar Novamente</span>
        </button>
      </div>
    </div>
  );
}
