"use client";

import React from "react";
import { Award, ShieldCheck, CheckCircle2, Trophy } from "lucide-react";

interface PlacaDigitalViewProps {
  alunoNome: string;
  marcoNome: string;
  dataConcessao: string;
  codigoValidacao: string;
  professorNome?: string;
  elegivelPlacaFisica?: boolean;
  onSolicitarPlacaFisica?: () => void;
  statusPlacaFisica?: string;
}

export function PlacaDigitalView({
  alunoNome,
  marcoNome,
  dataConcessao,
  codigoValidacao,
  professorNome,
  elegivelPlacaFisica = false,
  onSolicitarPlacaFisica,
  statusPlacaFisica,
}: PlacaDigitalViewProps) {
  return (
    <div className="space-y-4">
      {/* Moldura da Placa Digital */}
      <div className="relative p-8 sm:p-12 rounded-3xl bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 text-white shadow-2xl border-4 border-amber-400/80 ring-8 ring-amber-500/20 overflow-hidden text-center flex flex-col items-center justify-between min-h-[380px]">
        {/* Detalhes de Cantos Metálicos Decorativos */}
        <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400/60" />
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400/60" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400/60" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400/60" />

        {/* Marca d'água de fundo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0,transparent_70%)] pointer-events-none" />

        {/* Topo da Placa */}
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Método Paulo • Reconhecimento de Fluência</span>
          </div>

          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold pt-2">
            Placa de Reconhecimento de Marco Operacional
          </h3>
        </div>

        {/* Centro da Placa: Nome e Marco */}
        <div className="relative my-6 space-y-3 max-w-lg">
          <p className="text-xs text-amber-200/80 italic font-serif">
            Homenagem conferida a:
          </p>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 tracking-tight">
            {alunoNome}
          </h2>

          <div className="h-0.5 w-24 bg-linear-to-r from-transparent via-amber-400 to-transparent mx-auto my-2" />

          <p className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            {marcoNome}
          </p>

          <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
            Em reconhecimento à autonomia comunicativa, dedicação nas práticas orais e consolidação pedagógica das estruturas do idioma.
          </p>
        </div>

        {/* Rodapé da Placa: Identificador Demonstrativo e Data */}
        <div className="relative w-full pt-4 border-t border-amber-400/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="text-left">
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Data da Concessão
            </span>
            <span className="text-slate-300 font-medium">
              {new Date(dataConcessao).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            {professorNome && (
              <span className="block text-[10px] text-slate-400">
                Avaliador: {professorNome}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Identificador Demonstrativo
            </span>
            <span className="font-mono text-amber-300 font-bold tracking-widest text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {codigoValidacao}
            </span>
          </div>
        </div>

        {/* Disclaimer de Validação em Modo Demonstrativo */}
        <p className="text-[10px] text-slate-500 text-center italic">
          * Identificador demonstrativo para visualização. A comprovação pública dependerá de backend, identificador único e página de verificação oficial.
        </p>
      </div>

      {/* Aviso de Não-Certificação Oficial CEFR (Exigência Pedagógica) */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
        <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Aviso Pedagógico:</strong> Esta placa digital celebra o marco operacional de fluência e autonomia comunicativa alcançado no <em>Método Paulo</em>. Não substitui e não constitui certificado oficial CEFR expedido por entidade internacional independente de testagem.
        </p>
      </div>

      {/* Ação de Solicitação de Placa Física */}
      {elegivelPlacaFisica && onSolicitarPlacaFisica && (
        <div className="p-5 rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-600" />
              Você é elegível à Placa Física de Reconhecimento!
            </h4>
            <p className="text-[11px] text-amber-800">
              {statusPlacaFisica
                ? `Sua placa já está solicitada (Status: ${statusPlacaFisica}).`
                : "Receba uma peça exclusiva gravada a laser com seu nome e identificador de registro para celebrar sua conquista."}
            </p>
          </div>

          {!statusPlacaFisica ? (
            <button
              onClick={onSolicitarPlacaFisica}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition whitespace-nowrap"
            >
              Tenho interesse em receber a placa física
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-white text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Solicitação em Andamento
            </span>
          )}
        </div>
      )}
    </div>
  );
}
