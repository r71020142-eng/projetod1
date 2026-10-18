"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, ShieldAlert, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demoMode";

interface DemoRoleSwitcherProps {
  className?: string;
  variant?: "inline" | "floating";
}

export function DemoRoleSwitcher({ className, variant = "inline" }: DemoRoleSwitcherProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isAluno = pathname.startsWith("/aluno");

  if (!isDemoMode()) {
    return null;
  }

  if (variant === "floating") {
    return (
      <aside
        aria-label="Controle de visualização demonstrativa"
        className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2 rounded-full shadow-2xl border border-slate-700/60 text-xs transition-all hover:scale-105",
          className
        )}
      >
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Ambiente Demonstrativo:</span>
        </span>
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-full border border-slate-700">
          <Link
            href="/aluno"
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
              isAluno
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Alternar para visão do Aluno"
          >
            <UserCheck className="w-3 h-3" />
            Aluno
          </Link>
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
              isAdmin
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Alternar para visão do Administrador"
          >
            <ShieldAlert className="w-3 h-3" />
            Admin
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200 text-xs",
        className
      )}
      title="Seletor de ambiente demonstrativo (não substitui autenticação)"
    >
      <Link
        href="/aluno"
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
          isAluno
            ? "bg-white text-indigo-700 font-semibold shadow-sm"
            : "text-slate-500 hover:text-slate-900"
        )}
      >
        <UserCheck className="w-3 h-3" />
        <span className="hidden sm:inline">Visão</span> Aluno
      </Link>
      <Link
        href="/admin"
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
          isAdmin
            ? "bg-white text-indigo-700 font-semibold shadow-sm"
            : "text-slate-500 hover:text-slate-900"
        )}
      >
        <ShieldAlert className="w-3 h-3" />
        <span className="hidden sm:inline">Visão</span> Admin
      </Link>
    </div>
  );
}
