import React from "react";
import Link from "next/link";
import {
  UserCheck,
  ShieldAlert,
  ArrowRight,
  GraduationCap,
  FileCode,
  CheckCircle2,
} from "lucide-react";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold tracking-tight text-slate-900 text-xl">
            <span>MÉTODO PAULO</span>
            <span className="text-indigo-600 font-extrabold">MTD</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
              Etapa 1 Concluída
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Escola Exclusiva de Inglês • Método Paulo</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          Plataforma Educacional <br />
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Método Paulo • MTD
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Estrutura completa com identidade visual de alta fidelidade, navegação responsiva e dashboards demonstrativos para Alunos e Administradores.
        </p>

        {/* 2 Main Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-12 text-left">
          {/* Card 1: Aluno */}
          <Link
            href="/aluno"
            className="group relative flex flex-col justify-between rounded-3xl border-2 border-indigo-100 bg-white p-7 sm:p-8 shadow-card hover:border-indigo-400 hover:shadow-card-hover transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
                  <UserCheck className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Visão do Estudante
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Dashboard do Aluno
              </h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Experiência personalizada para o aluno com visualização da próxima aula, evolução semanal, atividades pendentes, anel de progresso e flashcards.
              </p>

              <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Card de Próxima Aula & Sala Virtual com professor</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Checklist interativo de atividades do Módulo 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Gráfico de barras de evolução semanal de estudos</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-sm font-bold text-indigo-600">
              <span>Acessar Painel do Aluno</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: Admin */}
          <Link
            href="/admin"
            className="group relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-[#0D0A2C] text-white p-7 sm:p-8 shadow-card hover:border-indigo-500 hover:shadow-card-hover transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white group-hover:scale-105 transition-transform">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-indigo-300 border border-white/10">
                  Visão da Coordenação
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                Dashboard Administrativo
              </h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Controle integral da escola de inglês com métricas consolidadas, gráfico de evolução de matrículas, agenda do dia e tabela de acompanhamento.
              </p>

              <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>4 Cards de indicadores-chave (Alunos, Professores, Aulas, Conclusão)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Gráfico de área com tooltip interativo de crescimento</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Acompanhamento de atenção pedagógica e Self Presentations</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-sm font-bold text-indigo-300">
              <span>Acessar Painel Administrativo</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Documentation Section */}
        <div className="mt-16 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-600" />
                Documentação Técnica da ETAPA 1
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Arquivos normativos criados na raiz do repositório para orientar o projeto.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              Diretrizes Oficiais
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1.5">
              <span className="font-mono text-xs font-bold text-indigo-700">
                ESCOPO.md
              </span>
              <p className="text-xs text-slate-600">
                Decisões já estabelecidas, diferenciação de indicadores, regras pedagógicas e planejamento de escopo futuro.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1.5">
              <span className="font-mono text-xs font-bold text-indigo-700">
                ARQUITETURA.md
              </span>
              <p className="text-xs text-slate-600">
                Estrutura Next.js App Router, componentes, contratos TypeScript e camada de isolamento assíncrona.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1.5">
              <span className="font-mono text-xs font-bold text-indigo-700">
                PLANO_DE_DESENVOLVIMENTO.md
              </span>
              <p className="text-xs text-slate-600">
                7 etapas sequenciais com a Etapa 1 identificada e critérios de aceite detalhados para cada fase.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <p className="max-w-7xl mx-auto px-6">
          DEMOSTRATIVO MTD • Plataforma Educacional de Inglês • Método Paulo • ETAPA 1 (Demonstrativa)
        </p>
      </footer>
    </div>
  );
}
