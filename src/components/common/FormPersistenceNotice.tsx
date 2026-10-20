"use client";

import React from "react";
import { Database, Info } from "lucide-react";
import { getCoreUsersDataSource } from "@/data/repositoryFactory";
import { DataSource } from "@/lib/env";
import { cn } from "@/lib/utils";

export interface PersistenceNoticeContent {
  title: string;
  text: string;
  isSupabase: boolean;
}

/**
 * Retorna os dados oficiais de aviso de persistência com base na fonte ativa
 * ou fonte explicitamente fornecida.
 */
export function getPersistenceNoticeData(
  dataSourceOverride?: DataSource
): PersistenceNoticeContent {
  const source = dataSourceOverride || getCoreUsersDataSource();
  const isSupabase = source === "supabase";

  if (isSupabase) {
    return {
      title: "Dados reais no Supabase",
      text: "Este cadastro será armazenado no banco de dados da plataforma com as políticas de segurança e acesso aplicáveis.",
      isSupabase: true,
    };
  }

  return {
    title: "Ambiente Demonstrativo",
    text: "Os dados são armazenados localmente no seu navegador para simulação do fluxo operacional. Não utilize dados pessoais sensíveis reais.",
    isSupabase: false,
  };
}

interface FormPersistenceNoticeProps {
  className?: string;
  customText?: string;
  dataSourceOverride?: DataSource;
}

/**
 * Componente unificado de aviso de persistência para formulários e confirmações
 * dos módulos de Alunos e Professores.
 *
 * Regras da Etapa 10.2B2:
 * - Supabase: Título "Dados reais no Supabase" e texto de banco de dados.
 * - Local: Título "Ambiente Demonstrativo" e texto de navegador/localStorage.
 */
export function FormPersistenceNotice({
  className,
  customText,
  dataSourceOverride,
}: FormPersistenceNoticeProps) {
  const content = getPersistenceNoticeData(dataSourceOverride);

  if (content.isSupabase) {
    return (
      <div
        data-testid="form-persistence-notice-supabase"
        className={cn(
          "rounded-xl bg-emerald-50 p-3 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-2.5 shadow-2xs",
          className
        )}
      >
        <Database className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-950">{content.title}</p>
          <p className="mt-0.5 text-emerald-800/90 leading-relaxed">
            {customText || content.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="form-persistence-notice-local"
      className={cn(
        "rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5 shadow-2xs",
        className
      )}
    >
      <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
      <div>
        <p className="font-semibold text-slate-800">{content.title}</p>
        <p className="mt-0.5 text-slate-600 leading-relaxed">
          {customText || content.text}
        </p>
      </div>
    </div>
  );
}
