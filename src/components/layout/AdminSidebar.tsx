"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  BarChart2,
  FileText,
  Video,
  Layers,
  MessageSquare,
  Award,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  title: string;
  href: string;
  icon: import("lucide-react").LucideIcon;
  exact?: boolean;
  badge?: number | string;
}

// Navegação oficial administrativa e pedagógica
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { title: "Visão geral", href: "/admin", icon: Home, exact: true },
  { title: "Alunos", href: "/admin/alunos", icon: Users },
  { title: "Professores", href: "/admin/professores", icon: GraduationCap },
  { title: "Turmas", href: "/admin/turmas", icon: BookOpen },
  { title: "Agenda", href: "/admin/agenda", icon: Calendar },
  { title: "Materiais", href: "/admin/materiais", icon: FileText },
  { title: "Avaliações", href: "/admin/avaliacoes", icon: BarChart2 },
  { title: "Self Presentation", href: "/admin/self-presentation", icon: Video },
  { title: "Flashcards", href: "/admin/flashcards", icon: Layers },
  { title: "Comunidade", href: "/admin/comunidade", icon: MessageSquare },
  { title: "Conquistas", href: "/admin/conquistas", icon: Award },
  { title: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

interface AdminSidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({ isOpenMobile, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4 text-white bg-[#0D0B2E]">
      <div className="space-y-6">
        {/* Brand Header matching Image 2 */}
        <div className="flex items-center justify-between px-3 pt-2">
          <Link href="/admin" className="flex items-center gap-2.5">
            {/* Logo icon matching Image 2: butterfly / abstract double wing icon */}
            <svg
              className="w-7 h-7 text-[#6366F1]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3c-1.5 2-4 3.5-7 4 0 5 2.5 9 7 14 4.5-5 7-9 7-14-3-.5-5.5-2-7-4z" />
              <path d="M12 7v8" />
            </svg>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-base">
                DEMOSTRATIVO
              </span>
              <span className="text-[#6366F1] font-extrabold text-base">
                MTD
              </span>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items matching Image 2 */}
        <nav className="space-y-1" aria-label="Navegação Administrativa">
          {ADMIN_NAV_ITEMS.map((item, idx) => {
            // "Visão geral" is active when on /admin
            const active = idx === 0 && pathname === "/admin";
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-[#5B4DFC] text-white font-semibold shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
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

      {/* Bottom promotional card matching Image 2 with illustration of person with laptop */}
      <div className="mt-6 pt-2">
        <div className="relative overflow-hidden rounded-2xl bg-[#161347] p-4 border border-indigo-500/10 flex items-center justify-between">
          <div className="z-10 max-w-[125px]">
            <p className="text-xs font-semibold text-slate-200 leading-snug">
              Educação <br />
              que transforma <br />
              <span className="text-slate-400 font-normal">com o Método Paulo.</span>
            </p>
          </div>

          {/* Clean Vector Character with Laptop matching Image 2 */}
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full">
              {/* Person head */}
              <circle cx="50" cy="28" r="9" fill="#FFC999" />
              {/* Hair */}
              <path d="M42 26 C42 18, 56 16, 58 24 C54 22, 45 22, 42 26 Z" fill="#241E38" />
              {/* Body in purple */}
              <path d="M38 42 C40 36, 60 36, 62 42 L66 65 L34 65 Z" fill="#8B5CF6" />
              {/* Arms and Laptop */}
              <path d="M34 50 L20 60 L36 60 Z" fill="#FFC999" />
              {/* Laptop screen */}
              <polygon points="12,48 34,48 30,62 8,62" fill="#C7D2FE" />
              <polygon points="14,50 32,50 29,60 11,60" fill="#E0E7FF" />
              <circle cx="21" cy="55" r="2" fill="#8B5CF6" />
              {/* Laptop base */}
              <polygon points="6,62 32,62 36,66 10,66" fill="#94A3B8" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent dark sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col sticky top-0 h-screen overflow-y-auto bg-[#0D0B2E] border-r border-indigo-950/40 shrink-0 select-none">
        {navContent}
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#0D0B2E] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </div>
    </>
  );
}
