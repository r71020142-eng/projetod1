"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, AlertCircle, Info, CheckCircle2, Plus } from "lucide-react";
import { Professor, StatusCadastro } from "@/types";
import { professorRepository } from "@/data/professorRepository";
import { FormPersistenceNotice } from "@/components/common/FormPersistenceNotice";
import { executeWithTimeout } from "@/lib/asyncUtils";

interface ProfessorFormModalProps {
  isOpen: boolean;
  professorParaEditar?: Professor | null;
  onClose: () => void;
  onSuccess: (professor: Professor, isNew: boolean) => void;
}

const IDIOMAS_SUGESTOES = [
  "Inglês (Nativo)",
  "Inglês (Fluente)",
  "Português (Nativo)",
  "Português (Fluente)",
  "Espanhol (Avançado)",
  "Espanhol (Básico)",
  "Francês (Intermediário)",
];

export function ProfessorFormModal({
  isOpen,
  professorParaEditar,
  onClose,
  onSuccess,
}: ProfessorFormModalProps) {
  const isEditing = !!professorParaEditar;

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    email: "",
    telefone: "",
    biografiaCurta: "",
    idiomasFalados: [] as string[],
    status: "ativo" as StatusCadastro,
  });

  const [novoIdiomaInput, setNovoIdiomaInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proteção contra desmontagem e requisições concorrentes defasadas
  const isMountedRef = useRef(true);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset obrigatório de estado ao abrir, fechar ou trocar de professor
  useEffect(() => {
    activeRequestIdRef.current += 1;
    setIsSubmitting(false);
    setNovoIdiomaInput("");
    setErrors({});
    setGeneralError(null);

    if (isOpen) {
      if (professorParaEditar) {
        setFormData({
          nomeCompleto: professorParaEditar.nomeCompleto,
          email: professorParaEditar.email,
          telefone: professorParaEditar.telefone || "",
          biografiaCurta: professorParaEditar.biografiaCurta,
          idiomasFalados: [...professorParaEditar.idiomasFalados],
          status: professorParaEditar.status,
        });
      } else {
        setFormData({
          nomeCompleto: "",
          email: "",
          telefone: "",
          biografiaCurta: "",
          idiomasFalados: ["Inglês (Fluente)", "Português (Nativo)"],
          status: "ativo",
        });
      }
    }
  }, [professorParaEditar, isOpen]);

  const handleClose = () => {
    activeRequestIdRef.current += 1;
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setGeneralError(null);
  };

  const handleAddIdioma = (idiomaToAdd: string) => {
    const trimmed = idiomaToAdd.trim();
    if (!trimmed) return;
    if (formData.idiomasFalados.includes(trimmed)) return;

    const nextList = [...formData.idiomasFalados, trimmed];
    handleChange("idiomasFalados", nextList);
    setNovoIdiomaInput("");
  };

  const handleRemoveIdioma = (indexToRemove: number) => {
    const nextList = formData.idiomasFalados.filter((_, idx) => idx !== indexToRemove);
    handleChange("idiomasFalados", nextList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    activeRequestIdRef.current += 1;
    const currentRequestId = activeRequestIdRef.current;

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      if (isEditing && professorParaEditar) {
        const res = await executeWithTimeout(
          professorRepository.atualizar(professorParaEditar.id, {
            nomeCompleto: formData.nomeCompleto,
            email: formData.email,
            telefone: formData.telefone || undefined,
            biografiaCurta: formData.biografiaCurta,
            idiomasFalados: formData.idiomasFalados,
            status: formData.status,
          })
        );

        if (!isMountedRef.current || currentRequestId !== activeRequestIdRef.current) {
          return;
        }

        if (!res.success) {
          if (res.fieldErrors) setErrors(res.fieldErrors);
          setGeneralError(
            res.error || "Erro ao atualizar dados do professor. Verifique os campos e tente novamente."
          );
          return;
        }

        onSuccess(res.data!, false);
      } else {
        const res = await executeWithTimeout(
          professorRepository.criar({
            nomeCompleto: formData.nomeCompleto,
            email: formData.email,
            telefone: formData.telefone || undefined,
            biografiaCurta: formData.biografiaCurta,
            idiomasFalados: formData.idiomasFalados,
            status: formData.status,
          })
        );

        if (!isMountedRef.current || currentRequestId !== activeRequestIdRef.current) {
          return;
        }

        if (!res.success) {
          if (res.fieldErrors) setErrors(res.fieldErrors);
          setGeneralError(
            res.error || "Erro ao cadastrar novo professor. Verifique os campos e tente novamente."
          );
          return;
        }

        onSuccess(res.data!, true);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || currentRequestId !== activeRequestIdRef.current) {
        return;
      }
      console.error("[ProfessorFormModal] Erro ao salvar:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado ao salvar os dados. Por favor, tente novamente.";
      setGeneralError(msg);
    } finally {
      if (isMountedRef.current && currentRequestId === activeRequestIdRef.current) {
        setIsSubmitting(false);
      }
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
              {isEditing ? "Editar Professor" : "Cadastrar Novo Professor"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? `Atualize a ficha pedagógica do docente (${professorParaEditar?.id}).`
                : "Preencha os dados do instrutor para atuar no Método Paulo."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
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

        {/* Important Notice: Account Linking Deferred */}
        <div className="mt-4 rounded-xl bg-amber-50 p-3.5 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              Diretriz de Acesso e Autenticação:
            </p>
            <p className="mt-0.5 text-amber-900/90 leading-relaxed">
              Cadastrar um professor não cria automaticamente uma conta de acesso ao sistema. O vínculo de login e permissões de segurança será implementado junto com a camada de autenticação (RBAC) nas etapas posteriores.
            </p>
          </div>
        </div>

        {/* Persistence Notice (Supabase / Local) */}
        <div className="mt-3">
          <FormPersistenceNotice />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: ID (if editing) & Nome Completo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID do Docente
                </label>
                <input
                  type="text"
                  value={professorParaEditar?.id}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-mono font-medium text-slate-600"
                />
              </div>
            )}

            <div className={isEditing ? "sm:col-span-2" : "sm:col-span-3"}>
              <label
                htmlFor="profNome"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <input
                id="profNome"
                type="text"
                placeholder="Ex.: Lucas Ferreira"
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
                htmlFor="profEmail"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                E-mail Profissional <span className="text-rose-500">*</span>
              </label>
              <input
                id="profEmail"
                type="email"
                placeholder="professor@mtd.com"
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
                htmlFor="profTelefone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Telefone <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                id="profTelefone"
                type="text"
                placeholder="(11) 98111-2233"
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
            </div>
          </div>

          {/* Row 3: Status */}
          <div>
            <label
              htmlFor="profStatus"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Status de Disponibilidade <span className="text-rose-500">*</span>
            </label>
            <select
              id="profStatus"
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
            >
              <option value="ativo">Ativo (Disponível para turmas e correções)</option>
              <option value="inativo">Inativo (Licença ou afastado temporariamente)</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {errors.status}
              </p>
            )}
          </div>

          {/* Row 4: Biografia Curta */}
          <div>
            <label
              htmlFor="profBio"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Biografia Pedagógica Curta <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="profBio"
              rows={3}
              placeholder="Descreva a formação, áreas de ênfase no Método Paulo e experiência docente."
              value={formData.biografiaCurta}
              onChange={(e) => handleChange("biografiaCurta", e.target.value)}
              className={`w-full rounded-xl border p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5] ${
                errors.biografiaCurta
                  ? "border-rose-400 bg-rose-50/30"
                  : "border-slate-200 bg-white"
              }`}
            />
            {errors.biografiaCurta && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {errors.biografiaCurta}
              </p>
            )}
          </div>

          {/* Row 5: Idiomas Falados */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Idiomas Falados <span className="text-rose-500">*</span>
            </label>

            {/* Current Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 rounded-xl border border-slate-200 bg-slate-50/50">
              {formData.idiomasFalados.map((idioma, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#5046E5] border border-indigo-100 shadow-2xs"
                >
                  <span>{idioma}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIdioma(idx)}
                    aria-label={`Remover idioma ${idioma}`}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {formData.idiomasFalados.length === 0 && (
                <span className="text-[11px] text-slate-400 italic self-center">
                  Nenhum idioma selecionado ainda.
                </span>
              )}
            </div>

            {/* Add Custom Tag */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar outro idioma (ex.: Italiano Fluente)"
                value={novoIdiomaInput}
                onChange={(e) => setNovoIdiomaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddIdioma(novoIdiomaInput);
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
              <button
                type="button"
                onClick={() => handleAddIdioma(novoIdiomaInput)}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-medium">Sugestões rápidas:</span>
              {IDIOMAS_SUGESTOES.map((sugestao) => {
                const isSelected = formData.idiomasFalados.includes(sugestao);
                return (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => handleAddIdioma(sugestao)}
                    disabled={isSelected}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    + {sugestao}
                  </button>
                );
              })}
            </div>

            {errors.idiomasFalados && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                {errors.idiomasFalados}
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
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
