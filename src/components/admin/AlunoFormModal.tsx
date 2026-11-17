"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, AlertCircle, CheckCircle2, Key, Eye, EyeOff, GraduationCap } from "lucide-react";
import { Aluno, NivelAluno, StatusCadastro } from "@/types";
import { alunoRepository } from "@/data/alunoRepository";
import { FormPersistenceNotice } from "@/components/common/FormPersistenceNotice";
import { executeWithTimeout } from "@/lib/asyncUtils";
import { InternationalPhoneInput } from "@/components/common/InternationalPhoneInput";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
  const { locale, t, translateNivel, translateStatus } = useLanguage();

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    email: "",
    telefone: "",
    objetivoIngles: "",
    nivel: "nao_avaliado" as NivelAluno,
    status: "ativo" as StatusCadastro,
    observacoesPedagogicas: "",
    idade: "",
    dataNascimento: "",
    nivelEscolar: "",
    profissao: "",
    nacionalidade: "",
    sobreAluno: "",
    interesses: "",
    biografia: "",
  });

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

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

  // Reset obrigatório de estado ao abrir, fechar ou trocar de aluno
  useEffect(() => {
    activeRequestIdRef.current += 1;
    setIsSubmitting(false);
    setErrors({});
    setGeneralError(null);
    setSenha("");
    setConfirmarSenha("");
    setMostrarSenha(false);

    if (isOpen) {
      if (alunoParaEditar) {
        setFormData({
          nomeCompleto: alunoParaEditar.nomeCompleto,
          email: alunoParaEditar.email,
          telefone: alunoParaEditar.telefone || "",
          objetivoIngles: alunoParaEditar.objetivoIngles,
          nivel: alunoParaEditar.nivel,
          status: alunoParaEditar.status,
          observacoesPedagogicas: alunoParaEditar.observacoesPedagogicas || "",
          idade: alunoParaEditar.idade !== undefined && alunoParaEditar.idade !== null ? String(alunoParaEditar.idade) : "",
          dataNascimento: alunoParaEditar.dataNascimento || "",
          nivelEscolar: alunoParaEditar.nivelEscolar || "",
          profissao: alunoParaEditar.profissao || "",
          nacionalidade: alunoParaEditar.nacionalidade || "",
          sobreAluno: alunoParaEditar.sobreAluno || "",
          interesses: alunoParaEditar.interesses || "",
          biografia: alunoParaEditar.biografia || "",
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
          idade: "",
          dataNascimento: "",
          nivelEscolar: "",
          profissao: "",
          nacionalidade: "",
          sobreAluno: "",
          interesses: "",
          biografia: "",
        });
      }
    }
  }, [isOpen, alunoParaEditar]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = locale === "en" ? "Full name is required." : "Nome completo é obrigatório.";
    }

    if (!formData.email.trim()) {
      newErrors.email = locale === "en" ? "Email is required." : "E-mail é obrigatório.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = locale === "en" ? "Enter a valid email address." : "Informe um e-mail válido.";
      }
    }

    if (!formData.objetivoIngles.trim()) {
      newErrors.objetivoIngles = locale === "en" ? "English learning goal is required." : "Objetivo com o inglês é obrigatório.";
    }

    // Validação de senha: obrigatória no cadastro, opcional na edição
    if (!isEditing) {
      if (!senha) {
        newErrors.senha = locale === "en" ? "Password is required for registration." : "A senha de acesso é obrigatória no cadastro.";
      } else if (senha.length < 6) {
        newErrors.senha = locale === "en" ? "Password must be at least 6 characters long." : "A senha deve ter pelo menos 6 caracteres.";
      }

      if (senha && senha !== confirmarSenha) {
        newErrors.confirmarSenha = locale === "en" ? "Passwords do not match." : "As senhas não coincidem.";
      }
    } else {
      // Se preencheu nova senha ao editar
      if (senha) {
        if (senha.length < 6) {
          newErrors.senha = locale === "en" ? "New password must be at least 6 characters long." : "A nova senha deve ter pelo menos 6 caracteres.";
        }
        if (senha !== confirmarSenha) {
          newErrors.confirmarSenha = locale === "en" ? "Passwords do not match." : "As senhas não coincidem.";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    field: string,
    value: string | NivelAluno | StatusCadastro
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError(null);
    const requestId = ++activeRequestIdRef.current;

    try {
      if (isEditing && alunoParaEditar) {
        const payloadAtualizacao = {
          nomeCompleto: formData.nomeCompleto.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          objetivoIngles: formData.objetivoIngles.trim(),
          nivel: formData.nivel,
          status: formData.status,
          observacoesPedagogicas: formData.observacoesPedagogicas.trim(),
          idade: formData.idade ? parseInt(formData.idade, 10) : undefined,
          dataNascimento: formData.dataNascimento || undefined,
          nivelEscolar: formData.nivelEscolar.trim() || undefined,
          profissao: formData.profissao.trim() || undefined,
          nacionalidade: formData.nacionalidade.trim() || undefined,
          sobreAluno: formData.sobreAluno.trim() || undefined,
          interesses: formData.interesses.trim() || undefined,
          biografia: formData.biografia.trim() || undefined,
          senha: senha ? senha : undefined,
        };

        const res = await executeWithTimeout(
          alunoRepository.atualizar(alunoParaEditar.id, payloadAtualizacao),
          15000,
          locale === "en" ? "Timeout updating student. Please try again." : "Tempo limite excedido ao atualizar discente. Tente novamente."
        );

        if (!isMountedRef.current || requestId !== activeRequestIdRef.current) return;

        if (res.success && res.data) {
          onSuccess(res.data, false);
          onClose();
        } else {
          setGeneralError(res.error || (locale === "en" ? "Error updating student." : "Erro ao atualizar dados do discente."));
        }
      } else {
        const novoDiscenteData = {
          nomeCompleto: formData.nomeCompleto.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          objetivoIngles: formData.objetivoIngles.trim(),
          nivel: formData.nivel,
          status: formData.status,
          observacoesPedagogicas: formData.observacoesPedagogicas.trim(),
          idade: formData.idade ? parseInt(formData.idade, 10) : undefined,
          dataNascimento: formData.dataNascimento || undefined,
          nivelEscolar: formData.nivelEscolar.trim() || undefined,
          profissao: formData.profissao.trim() || undefined,
          nacionalidade: formData.nacionalidade.trim() || undefined,
          sobreAluno: formData.sobreAluno.trim() || undefined,
          interesses: formData.interesses.trim() || undefined,
          biografia: formData.biografia.trim() || undefined,
          senha: senha,
        };

        const res = await executeWithTimeout(
          alunoRepository.criar(novoDiscenteData),
          15000,
          locale === "en" ? "Timeout creating student. Please try again." : "Tempo limite excedido ao cadastrar discente. Tente novamente."
        );

        if (!isMountedRef.current || requestId !== activeRequestIdRef.current) return;

        if (res.success && res.data) {
          onSuccess(res.data, true);
          onClose();
        } else {
          setGeneralError(res.error || (locale === "en" ? "Error creating student." : "Erro ao cadastrar novo discente."));
        }
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || requestId !== activeRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : (locale === "en" ? "Unexpected error processing request." : "Erro inesperado ao processar requisição.");
      setGeneralError(msg);
    } finally {
      if (isMountedRef.current && requestId === activeRequestIdRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // Textos traduzidos para todos os 6 idiomas
  const tModal = {
    title: isEditing
      ? {
          pt: "Editar Aluno",
          en: "Edit Student",
          fr: "Modifier l'élève",
          es: "Editar alumno",
          it: "Modifica studente",
          zh: "编辑学员",
        }[locale] || "Editar Aluno"
      : {
          pt: "Cadastrar Novo Aluno",
          en: "Register New Student",
          fr: "Inscrire un nouvel élève",
          es: "Registrar nuevo alumno",
          it: "Registra nuovo studente",
          zh: "注册新学员",
        }[locale] || "Cadastrar Novo Aluno",

    subtitle: isEditing
      ? {
          pt: `Atualize os dados cadastrais do discente (${alunoParaEditar?.id}).`,
          en: `Update registration records for student (${alunoParaEditar?.id}).`,
          fr: `Mettez à jour les données de l'élève (${alunoParaEditar?.id}).`,
          es: `Actualice los datos del alumno (${alunoParaEditar?.id}).`,
          it: `Aggiorna i dati dello studente (${alunoParaEditar?.id}).`,
          zh: `更新学员档案 (${alunoParaEditar?.id})。`,
        }[locale] || `Editar discente`
      : {
          pt: "Preencha as informações para registrar o aluno no Método Paulo.",
          en: "Fill in the information to register the student in Paulo Method.",
          fr: "Remplissez les informations pour inscrire l'élève à la Méthode Paulo.",
          es: "Complete la información para registrar al alumno en el Método Paulo.",
          it: "Inserisci le informazioni per registrare lo studente nel Metodo Paulo.",
          zh: "填写信息以在保罗教学法中注册新学员。",
        }[locale] || "Registrar aluno",

    fullName: {
      pt: "Nome Completo",
      en: "Full Name",
      fr: "Nom complet",
      es: "Nombre completo",
      it: "Nome completo",
      zh: "全名",
    }[locale] || "Nome Completo",

    email: {
      pt: "E-mail",
      en: "Email Address",
      fr: "Adresse e-mail",
      es: "Correo electrónico",
      it: "Indirizzo e-mail",
      zh: "电子邮箱",
    }[locale] || "E-mail",

    phone: {
      pt: "Telefone com Código de País",
      en: "Phone with Country Code",
      fr: "Téléphone avec indicatif",
      es: "Teléfono con código de país",
      it: "Telefono con prefisso",
      zh: "带国家代码的电话号码",
    }[locale] || "Telefone com Código de País",

    accessHeader: isEditing
      ? {
          pt: "Acesso à Plataforma (Redefinição Opcional de Senha)",
          en: "Platform Access (Optional Password Reset)",
          fr: "Accès à la plateforme (Réinitialisation facultative du mot de passe)",
          es: "Acceso a la plataforma (Restablecimiento opcional de contraseña)",
          it: "Accesso alla piattaforma (Reimpostazione facoltativa della password)",
          zh: "平台访问 (可选重置密码)",
        }[locale] || "Acesso à Plataforma"
      : {
          pt: "Credenciais de Acesso à Plataforma",
          en: "Platform Access Credentials",
          fr: "Identifiants d'accès à la plateforme",
          es: "Credenciales de acceso a la plataforma",
          it: "Credenziali di accesso alla piattaforma",
          zh: "平台访问凭据",
        }[locale] || "Credenciais de Acesso",

    accessSubtitle: isEditing
      ? {
          pt: "Preencha apenas se desejar redefinir a senha do discente.",
          en: "Fill only if you wish to reset the student's password.",
          fr: "Remplissez uniquement si vous souhaitez réinitialiser le mot de passe.",
          es: "Complete solo si desea restablecer la contraseña del alumno.",
          it: "Compila solo se desideri reimpostare la password dello studente.",
          zh: "仅在需要重置学员密码时填写。",
        }[locale] || "Redefinição de senha"
      : {
          pt: "A senha será utilizada pelo discente para entrar na área do aluno.",
          en: "This password will be used by the student to access the student portal.",
          fr: "Ce mot de passe sera utilisé par l'élève pour accéder au portail étudiant.",
          es: "Esta contraseña será utilizada por el alumno para ingresar al portal del estudiante.",
          it: "Questa password sarà utilizzata dallo studente per accedere all'area studenti.",
          zh: "该密码用于学员登录学员端系统。",
        }[locale] || "Credenciais de acesso",

    password: isEditing
      ? {
          pt: "Nova Senha",
          en: "New Password",
          fr: "Nouveau mot de passe",
          es: "Nueva contraseña",
          it: "Nuova password",
          zh: "新密码",
        }[locale] || "Nova Senha"
      : {
          pt: "Senha de Acesso",
          en: "Access Password",
          fr: "Mot de passe d'accès",
          es: "Contraseña de acceso",
          it: "Password di accesso",
          zh: "访问密码",
        }[locale] || "Senha de Acesso",

    confirmPassword: {
      pt: "Confirmar Senha",
      en: "Confirm Password",
      fr: "Confirmer le mot de passe",
      es: "Confirmar contraseña",
      it: "Conferma password",
      zh: "确认密码",
    }[locale] || "Confirmar Senha",

    pedagogicalLevel: {
      pt: "Nível Pedagógico",
      en: "Pedagogical Level",
      fr: "Niveau pédagogique",
      es: "Nivel pedagógico",
      it: "Livello pedagogico",
      zh: "教学级别",
    }[locale] || "Nível Pedagógico",

    enrollmentStatus: {
      pt: "Status de Matrícula",
      en: "Enrollment Status",
      fr: "Statut de l'inscription",
      es: "Estado de la matrícula",
      it: "Stato dell'iscrizione",
      zh: "学籍状态",
    }[locale] || "Status de Matrícula",

    goal: {
      pt: "Objetivo com o Inglês",
      en: "English Learning Goal",
      fr: "Objectif d'apprentissage de l'anglais",
      es: "Objetivo con el inglés",
      it: "Obiettivo con l'inglese",
      zh: "英语学习目标",
    }[locale] || "Objetivo com o Inglês",

    notes: {
      pt: "Observações Pedagógicas",
      en: "Pedagogical Notes",
      fr: "Notes pédagogiques",
      es: "Observaciones pedagógicas",
      it: "Note pedagogiche",
      zh: "教学备注",
    }[locale] || "Observações Pedagógicas",

    bgTitle: {
      pt: "Background do Aluno",
      en: "Student Background",
      fr: "Parcours de l'élève",
      es: "Antecedentes del alumno",
      it: "Background dello studente",
      zh: "学员背景",
    }[locale] || "Background do Aluno",

    bgOptional: {
      pt: "(Campos Opcionais)",
      en: "(Optional Fields)",
      fr: "(Champs optionnels)",
      es: "(Campos opcionales)",
      it: "(Campi facoltativi)",
      zh: "(选填字段)",
    }[locale] || "(Campos Opcionais)",

    bgDesc: {
      pt: "Informações contextuais que ficarão visíveis para os professores para personalizar as aulas.",
      en: "Contextual information visible to teachers to personalize classes.",
      fr: "Informations contextuelles visibles par les professeurs pour personnaliser les cours.",
      es: "Información contextual visible para los profesores para personalizar las clases.",
      it: "Informazioni contestuali visibili ai docenti per personalizzare le lezioni.",
      zh: "供授课教师查阅的背景信息，以便进行个性化教学。",
    }[locale] || "",

    age: {
      pt: "Idade",
      en: "Age",
      fr: "Âge",
      es: "Edad",
      it: "Età",
      zh: "年龄",
    }[locale] || "Idade",

    dob: {
      pt: "Data de Nascimento",
      en: "Date of Birth",
      fr: "Date de naissance",
      es: "Fecha de nacimiento",
      it: "Data di nascita",
      zh: "出生日期",
    }[locale] || "Data de Nascimento",

    nationality: {
      pt: "Nacionalidade",
      en: "Nationality",
      fr: "Nationalité",
      es: "Nacionalidad",
      it: "Nazionalità",
      zh: "国籍",
    }[locale] || "Nacionalidade",

    profession: {
      pt: "Profissão",
      en: "Profession",
      fr: "Profession",
      es: "Profesión",
      it: "Professione",
      zh: "职业",
    }[locale] || "Profissão",

    educationLevel: {
      pt: "Nível Escolar",
      en: "Education Level",
      fr: "Niveau d'études",
      es: "Nivel educativo",
      it: "Livello di istruzione",
      zh: "文化程度",
    }[locale] || "Nível Escolar",

    aboutStudent: {
      pt: "Sobre o Aluno",
      en: "About the Student",
      fr: "À propos de l'élève",
      es: "Sobre el alumno",
      it: "Informazioni sullo studente",
      zh: "关于学员",
    }[locale] || "Sobre o Aluno",

    interests: {
      pt: "Interesses do Aluno",
      en: "Student's Interests",
      fr: "Centres d'intérêt de l'élève",
      es: "Intereses del alumno",
      it: "Interessi dello studente",
      zh: "学员兴趣",
    }[locale] || "Interesses do Aluno",

    biography: {
      pt: "Biografia",
      en: "Biography",
      fr: "Biographie",
      es: "Biografía",
      it: "Biografia",
      zh: "个人传记",
    }[locale] || "Biografia",

    saveBtn: isEditing
      ? {
          pt: "Salvar Alterações",
          en: "Save Changes",
          fr: "Enregistrer les modifications",
          es: "Guardar cambios",
          it: "Salva modifiche",
          zh: "保存修改",
        }[locale] || "Salvar Alterações"
      : {
          pt: "Concluir Cadastro",
          en: "Complete Registration",
          fr: "Finaliser l'inscription",
          es: "Completar registro",
          it: "Completa registrazione",
          zh: "完成注册",
        }[locale] || "Concluir Cadastro",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {tModal.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tModal.subtitle}
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

        {/* Persistence Notice (Supabase / Local) */}
        <div className="mt-4">
          <FormPersistenceNotice />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: ID (if editing) & Nome Completo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID
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
                {tModal.fullName} <span className="text-rose-500">*</span>
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

          {/* Row 2: E-mail & Telefone Internacional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {tModal.email} <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="mariana@exemplo.com"
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
              <InternationalPhoneInput
                value={formData.telefone}
                onChange={(val) => handleChange("telefone", val)}
                label={tModal.phone}
                placeholder="Ex: +55 11 98765-4321"
                error={errors.telefone}
              />
            </div>
          </div>

          {/* Seção de Credenciais de Acesso (Senha) */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-xs">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {tModal.accessHeader}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {tModal.accessSubtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="senha"
                    className="block text-[11px] font-semibold text-slate-700"
                  >
                    {tModal.password} {!isEditing && <span className="text-rose-500">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                    className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {mostrarSenha ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        <span>{t("cancel", "Ocultar")}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        <span>{t("details", "Ver")}</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder={isEditing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (errors.senha) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.senha;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5] ${
                    errors.senha
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-200 bg-white"
                  }`}
                />
                {errors.senha && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {errors.senha}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmarSenha"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  {tModal.confirmPassword} {!isEditing && <span className="text-rose-500">*</span>}
                </label>
                <input
                  id="confirmarSenha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder={isEditing ? "Confirme se for alterar" : "Repita a senha"}
                  value={confirmarSenha}
                  onChange={(e) => {
                    setConfirmarSenha(e.target.value);
                    if (errors.confirmarSenha) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.confirmarSenha;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5] ${
                    errors.confirmarSenha
                      ? "border-rose-400 bg-rose-50/30"
                      : "border-slate-200 bg-white"
                  }`}
                />
                {errors.confirmarSenha && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">
                    {errors.confirmarSenha}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Nível e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nivel"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {tModal.pedagogicalLevel} <span className="text-rose-500">*</span>
              </label>
              <select
                id="nivel"
                value={formData.nivel}
                onChange={(e) => handleChange("nivel", e.target.value as NivelAluno)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="nao_avaliado">{translateNivel("nao_avaliado")}</option>
                <option value="A1">A1 - Iniciante</option>
                <option value="A2">A2 - Básico</option>
                <option value="B1">B1 - Intermediário</option>
                <option value="B2">B2 - Intermediário Superior</option>
                <option value="C1">C1 - Avançado</option>
                <option value="C2">C2 - Proficiente</option>
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
                {tModal.enrollmentStatus} <span className="text-rose-500">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as StatusCadastro)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="ativo">{translateStatus("ativo")}</option>
                <option value="inativo">{translateStatus("inativo")}</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {errors.status}
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Objetivo com o inglês */}
          <div>
            <label
              htmlFor="objetivoIngles"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {tModal.goal} <span className="text-rose-500">*</span>
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
              {tModal.notes} <span className="text-slate-400 font-normal">({t("optional", "opcional")})</span>
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

          {/* Seção: Background do Aluno (Campos Opcionais) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-xs">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {tModal.bgTitle}{" "}
                  <span className="text-slate-400 font-normal text-[11px]">
                    {tModal.bgOptional}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {tModal.bgDesc}
                </p>
              </div>
            </div>

            {/* Grid 1: Idade, Data de Nascimento e Nacionalidade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="idade" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tModal.age}
                </label>
                <input
                  id="idade"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Ex.: 28"
                  value={formData.idade}
                  onChange={(e) => handleChange("idade", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>

              <div>
                <label htmlFor="dataNascimento" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tModal.dob}
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={(e) => handleChange("dataNascimento", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>

              <div>
                <label htmlFor="nacionalidade" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tModal.nationality}
                </label>
                <input
                  id="nacionalidade"
                  type="text"
                  placeholder="Ex.: Brasileira"
                  value={formData.nacionalidade}
                  onChange={(e) => handleChange("nacionalidade", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>
            </div>

            {/* Grid 2: Profissão e Nível Escolar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profissao" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tModal.profession}
                </label>
                <input
                  id="profissao"
                  type="text"
                  placeholder="Ex.: Engenheiro de Software, Médico..."
                  value={formData.profissao}
                  onChange={(e) => handleChange("profissao", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>

              <div>
                <label htmlFor="nivelEscolar" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tModal.educationLevel}
                </label>
                <input
                  id="nivelEscolar"
                  type="text"
                  placeholder="Ex.: Ensino Superior, Pós-graduação..."
                  value={formData.nivelEscolar}
                  onChange={(e) => handleChange("nivelEscolar", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>
            </div>

            {/* Sobre o Aluno */}
            <div>
              <label htmlFor="sobreAluno" className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tModal.aboutStudent}
              </label>
              <textarea
                id="sobreAluno"
                rows={2}
                placeholder="Resumo geral sobre o momento de vida, rotina de estudos ou histórico do aluno."
                value={formData.sobreAluno}
                onChange={(e) => handleChange("sobreAluno", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
            </div>

            {/* Interesses do Aluno */}
            <div>
              <label htmlFor="interesses" className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tModal.interests}
              </label>
              <input
                id="interesses"
                type="text"
                placeholder="Ex.: Viagens, tecnologia, música, negócios, culinária..."
                value={formData.interesses}
                onChange={(e) => handleChange("interesses", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
            </div>

            {/* Biografia */}
            <div>
              <label htmlFor="biografia" className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tModal.biography}
              </label>
              <textarea
                id="biografia"
                rows={2}
                placeholder="Breve biografia ou trajetória pessoal do aluno."
                value={formData.biografia}
                onChange={(e) => handleChange("biografia", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {t("cancel", "Cancelar")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5046E5] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t("saving", "Salvando...")}</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{tModal.saveBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
