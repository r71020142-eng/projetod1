"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  PlaySquare,
  CheckSquare,
  FileText,
  BarChart3,
  MessageSquare,
  Award,
  HelpCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Exact menu items from Image 1:
// Início, Minha jornada, Aulas, Atividades, Materiais, Progresso, Mensagens (2), Certificados, Suporte
const ALUNO_NAV_ITEMS = [
  { title: "Início", href: "/aluno", icon: Home, exact: true },
  { title: "Minha jornada", href: "/aluno/jornada", icon: TrendingUp },
  { title: "Aulas", href: "/aluno/aulas", icon: PlaySquare },
  { title: "Atividades", href: "/aluno/atividades", icon: CheckSquare },
  { title: "Materiais", href: "/aluno/materiais", icon: FileText },
  { title: "Progresso", href: "/aluno/avaliacoes", icon: BarChart3 },
  { title: "Mensagens", href: "/aluno/comunidade", icon: MessageSquare, badge: 2 },
  { title: "Certificados", href: "/aluno/conquistas", icon: Award },
  { title: "Suporte", href: "/aluno/perfil", icon: HelpCircle },
];

interface AlunoSidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function AlunoSidebar({ isOpenMobile, onCloseMobile }: AlunoSidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <div className="flex h-full flex-col justify-between py-4">
      <div className="space-y-4">
        {/* Mobile Header with Close button */}
        <div className="flex items-center justify-between px-6 lg:hidden">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-900 text-lg">
            <span>DEMOSTRATIVO</span>
            <span className="text-[#5B4DFC] font-extrabold">MTD</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items matching Image 1 */}
        <nav className="space-y-1 px-3" aria-label="Navegação do Aluno">
          {ALUNO_NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || (item.href !== "/aluno" && pathname.startsWith(item.href + "/"));
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-[#F0EEFF] text-[#5B4DFC] font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={cn(
                      "h-5 w-5 stroke-[2] transition-colors",
                      active ? "text-[#5B4DFC]" : "text-slate-500 group-hover:text-slate-700"
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[11px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="hidden lg:flex lg:w-56 lg:flex-col min-h-[calc(100vh-4.5rem)] pt-2 select-none shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden animate-in fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </div>
    </>
  );
}
