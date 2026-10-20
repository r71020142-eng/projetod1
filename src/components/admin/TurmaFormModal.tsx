"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Info, Users, User } from "lucide-react";
import { Turma, ModalidadeTurma, NivelTurma, StatusTurma, Professor } from "@/types";
import { turmaRepository } from "@/data/turmaRepository";
import { professorRepository } from "@/data/professorRepository";
import { FormPersistenceNotice } from "@/components/common/FormPersistenceNotice";
import { executeWithTimeout } from "@/lib/asyncUtils";

interface TurmaFormModalProps {
  isOpen: boolean;
  turmaParaEditar?: Turma | null;
  onClose: () => void;
  onSuccess: (turma: Turma, isNew: boolean) => void;
}

export function TurmaFormModal({
  isOpen,
  turmaParaEditar,
  onClose,
  onSuccess,
}: TurmaFormModalProps) {
  const isEditing = !!turmaParaEditar;

  const [formData, setFormData] = useState({
    nome: "",
    modalidade: "grupo" as ModalidadeTurma,
    nivel: "nao_definido" as NivelTurma,
    objetivoPrincipal: "",
    professorId: "",
    capacidade: 6,
    status: "formacao" as StatusTurma,
    dataInicio: new Date().toISOString().slice(0, 10),
    observacoes: "",
  });

  const [professores, setProfessores] = useState<Professor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load active professors
  useEffect(() => {
    async function carregarProfessores() {
      try {
        const list = await professorRepository.listar();
        setProfessores(list);
      } catch (e) {
        console.error("Erro ao carregar professores:", e);
      }
    }
    if (isOpen) {
      carregarProfessores();
    }
  }, [isOpen]);

  // Load data when opening or switching turma
  useEffect(() => {
    if (turmaParaEditar) {
      setFormData({
        nome: turmaParaEditar.nome,
        modalidade: turmaParaEditar.modalidade,
        nivel: turmaParaEditar.nivel,
        objetivoPrincipal: turmaParaEditar.objetivoPrincipal,
        professorId: turmaParaEditar.professorId,
        capacidade: turmaParaEditar.capacidade,
        status: turmaParaEditar.status,
        dataInicio: turmaParaEditar.dataInicio || new Date().toISOString().slice(0, 10),
        observacoes: turmaParaEditar.observacoes || "",
      });
    } else {
      setFormData({
        nome: "",
        modalidade: "grupo",
        nivel: "nao_definido",
        objetivoPrincipal: "",
        professorId: "",
        capacidade: 6,
        status: "formacao",
        dataInicio: new Date().toISOString().slice(0, 10),
        observacoes: "",
      });
    }
    setErrors({});
    setGeneralError(null);
    setIsSubmitting(false);
  }, [turmaParaEditar, isOpen]);

  if (!isOpen) return null;

  // Handle modalidade change (if individual, force capacidade to 1)
  const handleModalidadeChange = (mod: ModalidadeTurma) => {
    setFormData((prev) => ({
      ...prev,
      modalidade: mod,
      capacidade: mod === "individual" ? 1 : prev.capacidade === 1 ? 6 : prev.capacidade,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGeneralError(null);

    try {
      if (isEditing && turmaParaEditar) {
        const res = await executeWithTimeout(
          turmaRepository.atualizar(turmaParaEditar.id, {
            nome: formData.nome,
            modalidade: formData.modalidade,
            nivel: formData.nivel,
            objetivoPrincipal: formData.objetivoPrincipal,
            professorId: formData.professorId,
            capacidade: formData.modalidade === "individual" ? 1 : Number(formData.capacidade),
            status: formData.status,
            dataInicio: formData.dataInicio,
            observacoes: formData.observacoes || undefined,
          }),
          15000,
          "Tempo limite excedido ao salvar alterações da turma."
        );

        if (!res.success) {
          if (res.fieldErrors) {
            setErrors(res.fieldErrors);
          }
          setGeneralError(res.error || "Não foi possível atualizar a turma.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data!, false);
        onClose();
      } else {
        const res = await executeWithTimeout(
          turmaRepository.criar({
            nome: formData.nome,
            modalidade: formData.modalidade,
            nivel: formData.nivel,
            objetivoPrincipal: formData.objetivoPrincipal,
            professorId: formData.professorId,
            alunoIds: [],
            capacidade: formData.modalidade === "individual" ? 1 : Number(formData.capacidade),
            status: formData.status,
            dataInicio: formData.dataInicio,
            observacoes: formData.observacoes || undefined,
          }),
          15000,
          "Tempo limite excedido ao cadastrar turma."
        );

        if (!res.success) {
          if (res.fieldErrors) {
            setErrors(res.fieldErrors);
          }
          setGeneralError(res.error || "Não foi possível criar a turma.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data!, true);
        onClose();
      }
    } catch (err: unknown) {
      console.error("Erro ao salvar turma:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Ocorreu um erro inesperado ao salvar a turma.";
      setGeneralError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only active professors can be selected for new assignments
  const professoresDisponiveis = professores.filter((p) => {
    if (isEditing && turmaParaEditar && p.id === turmaParaEditar.professorId) {
      return true; // allow keeping current professor even if inactive
    }
    return p.status === "ativo";
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-turma-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 id="modal-turma-title" className="text-lg font-bold text-slate-800">
              {isEditing ? `Editar Turma: ${turmaParaEditar.nome}` : "Cadastrar Nova Turma"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina modalidade, nível, objetivo e professor responsável pela coorte
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* General Error Banner */}
          {generalError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Não foi possível salvar a turma</p>
                <p className="text-xs mt-0.5">{generalError}</p>
              </div>
            </div>
          )}

          {/* Nome da Turma */}
          <div>
            <label htmlFor="nome" className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Turma <span className="text-rose-500">*</span>
            </label>
            <input
              id="nome"
              type="text"
              required
              placeholder="Ex: Turma Foundation A1 - Manhã"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                errors.nome
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
            />
            {errors.nome && <p className="text-xs text-rose-600 mt-1">{errors.nome}</p>}
          </div>

          {/* Modalidade e Capacidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidade <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleModalidadeChange("grupo")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    formData.modalidade === "grupo"
                      ? "bg-purple-50 border-purple-300 text-purple-700 shadow-sm ring-1 ring-purple-200"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Em Grupo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModalidadeChange("individual")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    formData.modalidade === "individual"
                      ? "bg-purple-50 border-purple-300 text-purple-700 shadow-sm ring-1 ring-purple-200"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Individual</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {formData.modalidade === "individual"
                  ? "Aceita estritamente 1 aluno por sessão."
                  : "Sugestão inicial: 6 alunos por coorte (configurável)."}
              </p>
            </div>

            <div>
              <label htmlFor="capacidade" className="block text-xs font-semibold text-slate-700 mb-1">
                Capacidade Planejada <span className="text-rose-500">*</span>
              </label>
              <input
                id="capacidade"
                type="number"
                min="1"
                max={formData.modalidade === "individual" ? 1 : 50}
                disabled={formData.modalidade === "individual"}
                value={formData.capacidade}
                onChange={(e) => setFormData({ ...formData, capacidade: parseInt(e.target.value, 10) || 1 })}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                  formData.modalidade === "individual"
                    ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                    : errors.capacidade
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                    : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                }`}
              />
              {errors.capacidade && <p className="text-xs text-rose-600 mt-1">{errors.capacidade}</p>}
            </div>
          </div>

          {/* Nível e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nivel" className="block text-xs font-semibold text-slate-700 mb-1">
                Nível Pedagógico <span className="text-rose-500">*</span>
              </label>
              <select
                id="nivel"
                value={formData.nivel}
                onChange={(e) => setFormData({ ...formData, nivel: e.target.value as NivelTurma })}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors"
              >
                <option value="nao_definido">Não definido / Misto</option>
                <option value="A1">A1 — Iniciante (Breakthrough)</option>
                <option value="A2">A2 — Básico (Waystage)</option>
                <option value="B1">B1 — Intermediário (Threshold)</option>
                <option value="B2">B2 — Intermediário Superior (Vantage)</option>
                <option value="C1">C1 — Avançado (Effective Proficiency)</option>
                <option value="C2">C2 — Domínio Pleno (Mastery)</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-slate-700 mb-1">
                Status da Turma <span className="text-rose-500">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusTurma })}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors"
              >
                <option value="formacao">Em formação (aguardando matrículas)</option>
                <option value="ativa">Ativa (em andamento regular)</option>
                <option value="pausada">Pausada (temporariamente suspensa)</option>
                <option value="encerrada">Encerrada (ciclo concluído)</option>
              </select>
            </div>
          </div>

          {/* Professor Responsável */}
          <div>
            <label htmlFor="professorId" className="block text-xs font-semibold text-slate-700 mb-1">
              Professor Responsável <span className="text-rose-500">*</span>
            </label>
            <select
              id="professorId"
              required
              value={formData.professorId}
              onChange={(e) => setFormData({ ...formData, professorId: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 ${
                errors.professorId
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
            >
              <option value="">Selecione um professor ativo...</option>
              {professoresDisponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto} ({p.email}) {p.status === "inativo" ? "— [INATIVO]" : ""}
                </option>
              ))}
            </select>
            {errors.professorId && <p className="text-xs text-rose-600 mt-1">{errors.professorId}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              Apenas professores com cadastro ativo podem ser vinculados a novas turmas.
            </p>
          </div>

          {/* Objetivo Principal */}
          <div>
            <label htmlFor="objetivoPrincipal" className="block text-xs font-semibold text-slate-700 mb-1">
              Objetivo Principal da Turma <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="objetivoPrincipal"
              required
              rows={2}
              placeholder="Ex: Foco no método Paulo para destravar fluência e confiança comunicativa"
              value={formData.objetivoPrincipal}
              onChange={(e) => setFormData({ ...formData, objetivoPrincipal: e.target.value })}
              className={`w-full px-3.5 py-2 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 resize-none ${
                errors.objetivoPrincipal
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/30 text-rose-900"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
            />
            {errors.objetivoPrincipal && (
              <p className="text-xs text-rose-600 mt-1">{errors.objetivoPrincipal}</p>
            )}
          </div>

          {/* Data de Início */}
          <div>
            <label htmlFor="dataInicio" className="block text-xs font-semibold text-slate-700 mb-1">
              Data de Início
            </label>
            <input
              id="dataInicio"
              type="date"
              value={formData.dataInicio}
              onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors"
            />
          </div>

          {/* Observações Internas */}
          <div>
            <label htmlFor="observacoes" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Pedagógicas (opcional)
            </label>
            <textarea
              id="observacoes"
              rows={2}
              placeholder="Anotações internas sobre perfil dos alunos, material complementar, etc."
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Informações demonstrativas */}
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-900 text-xs flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-purple-600" />
            <div className="space-y-0.5">
              <p className="font-semibold">Regras pedagógicas das turmas</p>
              <p className="text-purple-700 leading-relaxed">
                As turmas individuais possuem limite de 1 aluno. Turmas em grupo aceitam matrículas conforme a capacidade planejada. Alunos matriculados poderão ter suas presenças registradas em cada aula.
              </p>
            </div>
          </div>

          {/* Aviso de Persistência Dinâmico (Etapa 10.3A) */}
          <FormPersistenceNotice modulo="academic" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{isEditing ? "Salvar Alterações" : "Criar Turma"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
