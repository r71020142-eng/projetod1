import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { PageHeader } from "./PageHeader";

interface InternalPagePlaceholderProps {
  title: string;
  description: string;
  area: "admin" | "aluno";
  etapaPrevista: string;
  funcionalidadesPrevistas: string[];
}

export function InternalPagePlaceholder({
  title,
  description,
  area,
  etapaPrevista,
  funcionalidadesPrevistas,
}: InternalPagePlaceholderProps) {
  const backHref = area === "admin" ? "/admin" : "/aluno";
  const backLabel = area === "admin" ? "Voltar ao Painel Administrativo" : "Voltar ao Meu Painel";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href={backHref} className="hover:text-indigo-600 transition-colors">
          {area === "admin" ? "Administrador" : "Aluno"}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{title}</span>
      </div>

      <PageHeader
        title={title}
        subtitle={description}
        badge={etapaPrevista}
      >
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/60">
                <Sparkles className="h-3.5 w-3.5" />
                Estrutura visual preparada • {etapaPrevista}
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Módulo em Fase de Planejamento de Dados e Regras
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                A rota <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-indigo-600 font-medium">{title}</code> já possui navegação, URL dedicada e integração ao menu demonstrativo. As regras de negócio e a persistência definitiva serão integradas conforme o cronograma do projeto DEMOSTRATIVO MTD.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Recursos mapeados para este módulo
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {funcionalidadesPrevistas.map((func, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 rounded-xl bg-slate-50/70 p-3 border border-slate-100 text-xs text-slate-700 font-medium"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>{func}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Info Card */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-6 shadow-card flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Método Paulo de Ensino
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada funcionalidade deste módulo é desenhada especificamente para reforçar os pilares de escuta ativa, imersão prática em conversação e repetição espaçada.
            </p>
            <div className="rounded-xl bg-white p-3.5 border border-indigo-100/80 text-xs text-slate-600 space-y-1.5 shadow-xs">
              <p className="font-semibold text-indigo-900">Diretriz da Etapa 1:</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                As interfaces internas nesta etapa cumprem a função de validação de rotas, layouts e consistência tipográfica sem interações simuladas ou mensagens fictícias de sucesso.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60">
            <Link
              href={backHref}
              className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Retornar ao Dashboard Principal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
