"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Aluno, NivelAluno, StatusCadastro } from "@/types";
import { alunoRepository } from "@/data/alunoRepository";

interface AlunoFormModalProps {
  isOpen: boolean;
  alunoParaEditar?: Aluno | null;
  onClose: () => void;
  onSuccess: (aluno: Aluno, isNew: boolean) => void;
}

export function AlunoFormModal({
  isOpen,
  alunoParaEditar,
  onClose,
  onSuccess,
}: AlunoFormModalProps) {
  const isEditing = !!alunoParaEditar;

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    email: "",
    telefone: "",
    objetivoIngles: "",
    nivel: "nao_avaliado" as NivelAluno,
    status: "ativo" as StatusCadastro,
    observacoesPedagogicas: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data when opening or switching student
  useEffect(() => {
    if (alunoParaEditar) {
      setFormData({
        nomeCompleto: alunoParaEditar.nomeCompleto,
        email: alunoParaEditar.email,
        telefone: alunoParaEditar.telefone || "",
        objetivoIngles: alunoParaEditar.objetivoIngles,
        nivel: alunoParaEditar.nivel,
        status: alunoParaEditar.status,
        observacoesPedagogicas: alunoParaEditar.observacoesPedagogicas || "",
      });
    } else {
      setFormData({
        nomeCompleto: "",
        email: "",
        telefone: "",
        objetivoIngles: "",
        nivel: "nao_avaliado",
        status: "ativo",
        observacoesPedagogicas: "",
      });
    }
    setErrors({});
    setGeneralError(null);
  }, [alunoParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      if (isEditing && alunoParaEditar) {
        const res = await alunoRepository.atualizar(alunoParaEditar.id, {
          nomeCompleto: formData.nomeCompleto,
          email: formData.email,
          telefone: formData.telefone || undefined,
          objetivoIngles: formData.objetivoIngles,
          nivel: formData.nivel,
          status: formData.status,
          observacoesPedagogicas: formData.observacoesPedagogicas || undefined,
        });

        if (!res.success) {
          if (res.fieldErrors) {
            setErrors(res.fieldErrors);
          }
          setGeneralError(res.error || "Erro ao salvar alterações do aluno.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data!, false);
      } else {
        const res = await alunoRepository.criar({
          nomeCompleto: formData.nomeCompleto,
          email: formData.email,
          telefone: formData.telefone || undefined,
          objetivoIngles: formData.objetivoIngles,
          nivel: formData.nivel,
          status: formData.status,
          observacoesPedagogicas: formData.observacoesPedagogicas || undefined,
        });

        if (!res.success) {
          if (res.fieldErrors) {
            setErrors(res.fieldErrors);
          }
          setGeneralError(res.error || "Erro ao cadastrar novo aluno.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data!, true);
      }
    } catch (err) {
      console.error(err);
      setGeneralError("Ocorreu um erro inesperado ao processar os dados.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {isEditing ? "Editar Aluno" : "Cadastrar Novo Aluno"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? `Atualize os dados cadastrais do discente (${alunoParaEditar?.id}).`
                : "Preencha as informações para registrar o aluno no Método Paulo."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar formulário"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Error Banner if any */}
        {generalError && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Atenção</p>
              <p>{generalError}</p>
            </div>
          </div>
        )}

        {/* Notice: Demonstrative data */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
          <p>
            <strong>Ambiente Demonstrativo:</strong> Os dados são armazenados localmente no seu navegador para simulação do fluxo operacional. Não utilize dados pessoais sensíveis reais.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: ID (if editing) & Nome Completo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID do Aluno
                </label>
                <input
                  type="text"
                  value={alunoParaEditar?.id}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-mono font-medium text-slate-600"
                />
              </div>
            )}

            <div className={isEditing ? "sm:col-span-2" : "sm:col-span-3"}>
              <label
                htmlFor="nomeCompleto"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <input
                id="nomeCompleto"
                type="text"
                placeholder="Ex.: Mariana Oliveira"
                value={formData.nomeCompleto}
                onChange={(e) => handleChange("nomeCompleto", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5] ${
                  errors.nomeCompleto
                    ? "border-rose-400 bg-rose-50/30"
                    : "border-slate-200 bg-white"
                }`}
              />
              {errors.nomeCompleto && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {errors.nomeCompleto}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: E-mail & Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                E-mail <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="usuario@dominio.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5] ${
                  errors.email
                    ? "border-rose-400 bg-rose-50/30"
                    : "border-slate-200 bg-white"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="telefone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Telefone <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                id="telefone"
                type="text"
                placeholder="(11) 98765-4321"
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
            </div>
          </div>

          {/* Row 3: Nível e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nivel"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nível Pedagógico <span className="text-rose-500">*</span>
              </label>
              <select
                id="nivel"
                value={formData.nivel}
                onChange={(e) => handleChange("nivel", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="nao_avaliado">Não avaliado (Padrão inicial)</option>
                <option value="A1">Iniciante (A1)</option>
                <option value="A2">Básico (A2)</option>
                <option value="B1">Intermediário (B1)</option>
                <option value="B2">Intermediário Superior (B2)</option>
                <option value="C1">Avançado (C1)</option>
                <option value="C2">Proficiente (C2)</option>
              </select>
              {errors.nivel && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {errors.nivel}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Status de Matrícula <span className="text-rose-500">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="ativo">Ativo (Participando de aulas e atividades)</option>
                <option value="inativo">Inativo (Acesso suspenso ou trancado)</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {errors.status}
                </p>
              )}
            </div>
          </div>

          {/* CEFR Disclaimer Box */}
          <div className="rounded-xl bg-indigo-50/60 p-3 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
            <p>
              <strong>Aviso de Nivelamento:</strong> O nível inicial de todo aluno novo é definido como <em>&quot;Não avaliado&quot;</em>. A atribuição manual do nível nesta tela é um parâmetro interno da coordenação e <strong>não representa emissão de certificado formal CEFR</strong>.
            </p>
          </div>

          {/* Row 4: Objetivo com o inglês */}
          <div>
            <label
              htmlFor="objetivoIngles"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Objetivo com o Inglês <span className="text-rose-500">*</span>
            </label>
            <input
              id="objetivoIngles"
              type="text"
              placeholder="Ex.: Fluência para reuniões executivas e viagens internacionais"
              value={formData.objetivoIngles}
              onChange={(e) => handleChange("objetivoIngles", e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5] ${
                errors.objetivoIngles
                  ? "border-rose-400 bg-rose-50/30"
                  : "border-slate-200 bg-white"
              }`}
            />
            {errors.objetivoIngles && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {errors.objetivoIngles}
              </p>
            )}
          </div>

          {/* Row 5: Observações Pedagógicas */}
          <div>
            <label
              htmlFor="observacoesPedagogicas"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Observações Pedagógicas <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="observacoesPedagogicas"
              rows={3}
              placeholder="Anotações internas sobre perfil de aprendizado, pontos de atenção ou histórico prévio."
              value={formData.observacoesPedagogicas}
              onChange={(e) => handleChange("observacoesPedagogicas", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5046E5] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isEditing ? "Salvar Alterações" : "Concluir Cadastro"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
