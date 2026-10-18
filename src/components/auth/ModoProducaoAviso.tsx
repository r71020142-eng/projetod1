"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, Lock, ArrowLeft, KeyRound, Server } from "lucide-react";

interface ModoProducaoAvisoProps {
  area?: "admin" | "aluno";
}

export function ModoProducaoAviso({ area = "aluno" }: ModoProducaoAvisoProps) {
  const isAreaAdmin = area === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 text-white flex flex-col justify-between p-6 sm:p-12">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 font-bold tracking-tight text-xl">
          <span>DEMOSTRATIVO</span>
          <span className="text-indigo-400 font-extrabold">MTD</span>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Modo Produção Ativo
        </span>
      </header>

      <main className="max-w-2xl mx-auto my-auto w-full py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 mx-auto flex items-center justify-center shadow-xl shadow-indigo-950/50">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            {isAreaAdmin ? "Área Administrativa Restrita" : "Portal do Estudante"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Autenticação Real Necessária
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xl mx-auto">
            O modo demonstrativo está desativado (<code className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs">NEXT_PUBLIC_DEMO_MODE=false</code>).
            Em produção, o acesso exige autenticação segura integrada ao backend.
          </p>
        </div>

        {/* Diretrizes de Segurança */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 text-left space-y-3 shadow-lg">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            Integridade e Segurança Arquitetural (Método Paulo):
          </h3>
          <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
            <li>
              <strong>Sem troca de URL sem auth:</strong> O acesso a rotas privadas não pode ser concedido apenas navegando para <code className="text-slate-300">/admin</code> ou <code className="text-slate-300">/aluno</code>.
            </li>
            <li>
              <strong>Sem logins fictícios:</strong> Não simulamos telas com senhas falsas em modo estático.
            </li>
            <li>
              <strong>Sem dados semente automáticos:</strong> Em produção, nenhuma informação mock é gravada silenciosamente no armazenamento local.
            </li>
            <li>
              <strong>Próximo passo técnico:</strong> Conectar o repositório à camada de autenticação do backend com controle RBAC (ver <code className="text-slate-300">MATRIZ_DE_PERMISSOES.md</code>).
            </li>
          </ul>
        </div>

        {/* Como reativar o modo de teste */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200/90 text-left flex items-start gap-3">
          <KeyRound className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-indigo-300">Deseja explorar a demonstração interativa?</span>
            <p className="text-[11px] leading-relaxed">
              Defina <code className="font-mono bg-indigo-950 px-1 py-0.5 rounded text-indigo-300">NEXT_PUBLIC_DEMO_MODE=true</code> no seu arquivo <code className="font-mono">.env.local</code> para reativar o seletor de papéis e os dados semente.
            </p>
          </div>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Página Inicial</span>
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full border-t border-slate-800/80 pt-4 text-center text-xs text-slate-500">
        DEMOSTRATIVO MTD • Arquitetura Segura &amp; Método Paulo
      </footer>
    </div>
  );
}
