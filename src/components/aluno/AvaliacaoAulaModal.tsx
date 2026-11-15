"use client";

import React, { useState, useEffect } from "react";
import { X, Star, CheckCircle2, User, BookOpen } from "lucide-react";
import { Aula, Professor, AvaliacaoAula } from "@/types";
import { avaliacaoAulaRepository } from "@/data/avaliacaoAulaRepository";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AvaliacaoAulaModalProps {
  isOpen: boolean;
  aula: Aula | null;
  alunoId: string;
  professor?: Professor | null;
  avaliacaoExistente?: AvaliacaoAula | null;
  onClose: () => void;
  onSuccess: (avaliacao: AvaliacaoAula) => void;
}

export function AvaliacaoAulaModal({
  isOpen,
  aula,
  alunoId,
  professor,
  avaliacaoExistente,
  onClose,
  onSuccess,
}: AvaliacaoAulaModalProps) {
  const { t, formatDateTime } = useLanguage();

  const [notaAula, setNotaAula] = useState<number>(10);
  const [opiniaoAula, setOpiniaoAula] = useState<string>("");
  const [notaProfessor, setNotaProfessor] = useState<number>(10);
  const [opiniaoProfessor, setOpiniaoProfessor] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      if (avaliacaoExistente) {
        setNotaAula(avaliacaoExistente.notaAula);
        setOpiniaoAula(avaliacaoExistente.opiniaoAula || "");
        setNotaProfessor(avaliacaoExistente.notaProfessor);
        setOpiniaoProfessor(avaliacaoExistente.opiniaoProfessor || "");
      } else {
        setNotaAula(10);
        setOpiniaoAula("");
        setNotaProfessor(10);
        setOpiniaoProfessor("");
      }
    }
  }, [isOpen, avaliacaoExistente]);

  if (!isOpen || !aula) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (notaAula < 0 || notaAula > 10) {
      setError("A nota da aula deve estar entre 0 e 10.");
      return;
    }
    if (notaProfessor < 0 || notaProfessor > 10) {
      setError("A nota do professor deve estar entre 0 e 10.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await avaliacaoAulaRepository.salvar({
        aulaId: aula.id,
        alunoId,
        professorId: professor?.id || aula.professorId,
        notaAula,
        opiniaoAula: opiniaoAula.trim() || undefined,
        notaProfessor,
        opiniaoProfessor: opiniaoProfessor.trim() || undefined,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Não foi possível registrar a avaliação.");
        return;
      }

      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      console.error("Erro ao salvar avaliação da aula:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColorClass = (score: number, isSelected: boolean) => {
    if (!isSelected) {
      return "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50";
    }
    if (score >= 9) {
      return "border-emerald-600 bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/20";
    }
    if (score >= 7) {
      return "border-indigo-600 bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/20";
    }
    if (score >= 5) {
      return "border-amber-500 bg-amber-500 text-white font-black shadow-md shadow-amber-500/20";
    }
    return "border-rose-600 bg-rose-600 text-white font-black shadow-md shadow-rose-500/20";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                <Star className="h-5 w-5 fill-purple-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {t("rateClassTitle", "Avaliar Aula e Professor")}
                </h2>
                <p className="text-xs text-slate-500">
                  {t("rateClassSubtitle", "Compartilhe sua percepção sobre a experiência pedagógica de 0 a 10.")}
                </p>
              </div>
            </div>

            {/* Context Details */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-bold text-slate-900">{aula.titulo}</span>
              <span>•</span>
              <span>{formatDateTime(aula.data, aula.horario)}</span>
              {professor && (
                <>
                  <span>•</span>
                  <span>Prof. {professor.nomeCompleto}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* SEÇÃO 1: AVALIAÇÃO DA AULA */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <span>{t("classRatingScore", "Nota da Aula (0 a 10)")}</span>
              </div>
              <span className="text-sm font-black text-purple-700">{notaAula} / 10</span>
            </div>

            {/* Selector de 0 a 10 */}
            <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = notaAula === score;
                return (
                  <button
                    key={`aula-${score}`}
                    type="button"
                    onClick={() => setNotaAula(score)}
                    className={`h-9 w-full rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${getScoreColorClass(
                      score,
                      isSelected
                    )}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>

            {/* Opinião da Aula */}
            <div className="pt-2">
              <label htmlFor="opiniaoAula" className="block text-[11px] font-semibold text-slate-700 mb-1">
                {t("classOpinionLabel", "Sua opinião sobre a aula")} <span className="text-slate-400 font-normal">({t("optional", "opcional")})</span>
              </label>
              <textarea
                id="opiniaoAula"
                rows={2}
                value={opiniaoAula}
                onChange={(e) => setOpiniaoAula(e.target.value)}
                placeholder={t(
                  "classOpinionPlaceholder",
                  "O que achou do ritmo, clareza, vocabulário e exercícios trabalhados nesta sessão?"
                )}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* SEÇÃO 2: AVALIAÇÃO DO PROFESSOR */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <User className="h-4 w-4 text-indigo-600" />
                <span>{t("teacherRatingScore", "Nota do Professor (0 a 10)")}</span>
              </div>
              <span className="text-sm font-black text-indigo-700">{notaProfessor} / 10</span>
            </div>

            {/* Selector de 0 a 10 */}
            <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = notaProfessor === score;
                return (
                  <button
                    key={`prof-${score}`}
                    type="button"
                    onClick={() => setNotaProfessor(score)}
                    className={`h-9 w-full rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${getScoreColorClass(
                      score,
                      isSelected
                    )}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>

            {/* Opinião sobre o Professor */}
            <div className="pt-2">
              <label htmlFor="opiniaoProfessor" className="block text-[11px] font-semibold text-slate-700 mb-1">
                {t("teacherOpinionLabel", "Sua opinião sobre o professor")} <span className="text-slate-400 font-normal">({t("optional", "opcional")})</span>
              </label>
              <textarea
                id="opiniaoProfessor"
                rows={2}
                value={opiniaoProfessor}
                onChange={(e) => setOpiniaoProfessor(e.target.value)}
                placeholder={t(
                  "teacherOpinionPlaceholder",
                  "Como foi a didática, paciência, feedback e condução do professor?"
                )}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t("cancel", "Cancelar")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t("saving", "Salvando...")}</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t("saveEvaluation", "Enviar Avaliação")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
