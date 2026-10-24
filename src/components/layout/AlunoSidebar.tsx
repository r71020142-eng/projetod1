"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  PlaySquare,
  CheckSquare,
  FileText,
  BarChart3,
  Video,
  Layers,
  MessageSquare,
  Award,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoRoleSwitcher } from "@/components/layout/DemoRoleSwitcher";

// Navegação oficial do aluno preservada
const ALUNO_NAV_ITEMS = [
  { title: "Início", href: "/aluno", icon: Home, exact: true },
  { title: "Minha jornada", href: "/aluno/jornada", icon: TrendingUp },
  { title: "Aulas", href: "/aluno/aulas", icon: PlaySquare },
  { title: "Atividades", href: "/aluno/atividades", icon: CheckSquare },
  { title: "Materiais", href: "/aluno/materiais", icon: FileText },
  { title: "Avaliações", href: "/aluno/avaliacoes", icon: BarChart3 },
  { title: "Self Presentation", href: "/aluno/self-presentation", icon: Video },
  { title: "Flashcards", href: "/aluno/flashcards", icon: Layers },
  { title: "Comunidade", href: "/aluno/comunidade", icon: MessageSquare, badge: 2 },
  { title: "Conquistas", href: "/aluno/conquistas", icon: Award },
  { title: "Meu perfil", href: "/aluno/perfil", icon: User },
];

interface AlunoSidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isRealAuth?: boolean;
}

export function AlunoSidebar({ isOpenMobile, onCloseMobile, isRealAuth = false }: AlunoSidebarProps) {
  const pathname = usePathname();

  const sidebarInner = (
    <div className="relative h-full w-full overflow-hidden bg-[#06142C] text-white select-none flex flex-col justify-between">
      {/* Decorative background in its own dedicated layer */}
      <div
        className="sidebar-decoration absolute inset-0 z-0 pointer-events-none bg-[url('/assets/mtd/mtd-sidebar-background.webp')] bg-cover bg-right bg-no-repeat"
        aria-hidden="true"
      />

      {/* Main interactive content (relative z-1, h-full, flex-col) */}
      <div className="sidebar-content relative z-1 h-full flex flex-col justify-between overflow-hidden">
        {/* Top: Brand Header */}
        <div className="p-5 pb-3 shrink-0">
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/aluno" className="flex items-center gap-3 group">
              {/* Símbolo Dourado Oficial MTD */}
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/mtd/mtd-logo-mark.svg"
                  alt="Símbolo DEMOSTRATIVO MTD"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain transform transition-transform group-hover:scale-105"
                  unoptimized
                  priority
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold tracking-tight text-white text-[15px]">
                    MÉTODO PAULO
                  </span>
                  <span className="font-extrabold text-[15px] text-white">
                    MTD
                  </span>
                </div>
                <span className="text-[9.5px] font-semibold text-[#EDB84E] tracking-[0.25em] uppercase mt-1">
                  Language Academy
                </span>
              </div>
            </Link>

            {/* Close button for mobile */}
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 lg:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Menu (sidebar-nav: flex-1 overflow-y-auto) */}
        <div className="sidebar-nav flex-1 overflow-y-auto px-5 py-2 space-y-1">
          <nav aria-label="Navegação do Aluno" className="space-y-1">
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
                    "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150",
                    active
                      ? "bg-gradient-to-r from-[#5B2FE8] to-[#7047F5] text-white font-semibold shadow-md shadow-[#5B2FE8]/25"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 stroke-[2.2] shrink-0 transition-colors",
                        active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.title}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Seletor Demonstrativo no Menu Mobile (sem sobrepor conteúdo) - Exclusivo do modo demo */}
        {!isRealAuth && (
          <div className="px-5 py-2 lg:hidden shrink-0">
            <DemoRoleSwitcher variant="inline" className="w-full justify-center bg-slate-900 border-slate-700 text-white" />
          </div>
        )}

        {/* Slogan Oficial: direto sobre a sidebar, alinhado à esquerda com linha dourada */}
        <div className="sidebar-signature relative z-10 shrink-0 px-7 pb-8 pt-4">
          <div className="w-6 h-0.5 bg-[#D79A24] mb-3" aria-hidden="true" />
          <div className="text-[10px] font-bold tracking-[0.24em] text-[#EDB84E] uppercase leading-tight font-sans">
            FLUÊNCIA
          </div>
          <div className="text-[10px] font-bold tracking-[0.24em] text-white uppercase leading-tight font-sans mt-0.5">
            TRANSFORMA
          </div>
          <div className="text-[10px] font-bold tracking-[0.24em] text-white uppercase leading-tight font-sans mt-0.5">
            HISTÓRIAS
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent dark sidebar (FASE 4 - position: fixed; inset: 0 auto 0 0; 100dvh; w-[294px]) */}
      <aside className="sidebar hidden lg:block fixed inset-y-0 left-0 w-[294px] h-[100dvh] overflow-hidden z-30 shadow-xl border-r border-[#0A1A38]">
        {sidebarInner}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-in fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden overflow-hidden",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarInner}
      </div>
    </>
  );
}
