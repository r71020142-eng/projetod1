"use client";

import React, { useState } from "react";
import { OportunidadeIntercambio } from "@/types";
import { comunidadeRepository } from "@/data/api";
import {
  Plane,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Compass,
} from "lucide-react";

interface OportunidadeCardProps {
  oportunidade: OportunidadeIntercambio;
  alunoId?: string;
  alunoNome?: string;
  alunoEmail?: string;
  alunoNivel?: string;
  jaRegistrouInteresse?: boolean;
  onInteresseRegistrado?: () => void;
}

export function OportunidadeCard({
  oportunidade,
  alunoId,
  alunoNome,
  alunoEmail,
  alunoNivel,
  jaRegistrouInteresse = false,
  onInteresseRegistrado,
}: OportunidadeCardProps) {
  const [registrado, setRegistrado] = useState(jaRegistrouInteresse);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  async function handleConfirmarInteresse() {
    if (!alunoId || !alunoNome) return;
    setSalvando(true);
    try {
      const res = await comunidadeRepository.registrarInteresseOportunidade({
        oportunidadeId: oportunidade.id,
        alunoId,
        alunoNome,
        alunoEmail: alunoEmail || "aluno@email.com",
        alunoNivelAtual: alunoNivel,
        observacoesAluno: observacoes.trim() || undefined,
      });

      if (res.success) {
        setRegistrado(true);
        setModalAberto(false);
        if (onInteresseRegistrado) onInteresseRegistrado();
      } else {
        alert(res.error || "Erro ao registrar interesse.");
      }
    } catch {
      alert("Erro ao registrar interesse.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-300 transition flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Plane className="w-3.5 h-3.5" />
            {oportunidade.destinoPais} • {oportunidade.destinoCidade}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Nível mínimo: {oportunidade.nivelOperacionalMinimo}
          </span>
        </div>

        {/* Título e Instituição */}
        <div>
          <h3 className="font-bold text-slate-900 text-lg leading-tight">
            {oportunidade.titulo}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{oportunidade.instituicaoParceira}</span>
          </p>
        </div>

        {/* Detalhes de Período e Vagas */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 p-3 bg-slate-50 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{oportunidade.periodo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{oportunidade.vagas ? `${oportunidade.vagas} vagas subsidiadas` : "Vagas limitadas"}</span>
          </div>
        </div>

        {/* Descrição */}
        <p className="text-xs text-slate-700 leading-relaxed">
          {oportunidade.descricao}
        </p>
      </div>

      {/* Ações */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
        {oportunidade.linkOficial && (
          <a
            href={oportunidade.linkOficial}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            <span>Edital e Detalhes (Link externo HTTPS)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {alunoId && (
          <div>
            {registrado ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Interesse Registrado
              </span>
            ) : (
              <button
                onClick={() => setModalAberto(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Demonstrar Interesse</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Interesse */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Confirmar Interesse no Intercâmbio
              </h3>
              <p className="text-xs text-slate-500">
                {oportunidade.titulo} ({oportunidade.destinoPais})
              </p>
            </div>

            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-900 space-y-1">
              <p className="font-semibold">Como funciona a seleção?</p>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Ao registrar seu interesse, nossa equipe pedagógica verificará seus marcos de nível e entrará em contato para orientar sobre o edital e a candidatura.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Conte-nos sobre sua motivação (Opcional):
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Quero aprimorar minha apresentação para reuniões corporativas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarInteresse}
                disabled={salvando}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
              >
                {salvando ? "Registrando..." : "Confirmar Interesse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
