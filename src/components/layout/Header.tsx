"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, Bell, Menu, X, ChevronDown, LogOut } from "lucide-react";
import { NotificacoesDrawer } from "@/components/notificacoes/NotificacoesDrawer";
import { DemoRoleSwitcher } from "@/components/layout/DemoRoleSwitcher";
import { gamificacaoRepository } from "@/data/api";

interface HeaderProps {
  variant: "aluno" | "admin";
  userName: string;
  userRoleLabel?: string;
  userAvatar?: string | null;
  userInitials?: string;
  userEmail?: string;
  isRealAuth?: boolean;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export function Header({
  variant,
  userName,
  userRoleLabel,
  userAvatar,
  userInitials,
  userEmail,
  isRealAuth = false,
  onToggleMobileMenu,
  isMobileMenuOpen,
}: HeaderProps) {
  const usuarioId = variant === "admin" ? "adm-001" : "alu-001";
  const [isNotificacoesOpen, setIsNotificacoesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkUnread = useCallback(async () => {
    try {
      const lista = await gamificacaoRepository.listarNotificacoes(usuarioId);
      setUnreadCount(lista.filter((n) => !n.lida).length);
    } catch {
      // Fallback em caso de erro
    }
  }, [usuarioId]);

  useEffect(() => {
    checkUnread();
  }, [checkUnread]);

  const placeholderText =
    variant === "aluno"
      ? "Buscar aulas, materiais ou algo específico..."
      : "Buscar alunos, professores, aulas...";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E5E2DA] bg-[#FAF8F3]/95 backdrop-blur-md select-none transition-colors pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-8 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        {/* Left side: Mobile Toggle & Brand (on mobile only, since desktop has persistent sidebar) */}
        <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleMobileMenu}
          type="button"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5 text-slate-800" />
          ) : (
            <Menu className="h-5 w-5 text-slate-800" />
          )}
        </button>

        {/* Logo: Displayed on mobile only when sidebar is closed/in drawer */}
        <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
          <Image
            src="/assets/mtd/mtd-logo-mark.svg"
            alt="Símbolo DEMOSTRATIVO MTD"
            width={24}
            height={24}
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
            unoptimized
          />
          <div className="flex items-center gap-1">
            <span className="font-extrabold tracking-tight text-[#07132E] text-sm sm:text-base">
              DEMOSTRATIVO
            </span>
            <span className="text-[#5B2FE8] font-extrabold text-sm sm:text-base">
              MTD
            </span>
          </div>
        </div>
      </div>

      {/* Center: Search input matching reference */}
      <div className="hidden md:flex flex-1 max-w-lg mx-auto px-4">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#60708F]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            placeholder={placeholderText}
            className="w-full rounded-xl border border-[#DDDDE5] bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-[#07132E] placeholder-[#60708F] focus:border-[#5B2FE8] focus:bg-white focus:outline-none transition-colors shadow-2xs"
          />
        </div>
      </div>

      {/* Right side: Demo Switcher (desktop se não for real auth), Notification Bell & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {!isRealAuth && <DemoRoleSwitcher variant="inline" className="hidden sm:flex" />}

        {/* Notification Bell with red badge dot */}
        <button
          type="button"
          onClick={() => setIsNotificacoesOpen(true)}
          aria-label={
            unreadCount > 0
              ? `Notificações (${unreadCount} não lidas)`
              : "Notificações"
          }
          className="relative text-[#07132E] hover:text-[#5B2FE8] transition-colors p-1.5 rounded-lg hover:bg-black/5"
        >
          <Bell className="h-5 w-5 fill-[#07132E] text-[#07132E]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#EF4444]" />
          )}
        </button>

        {/* User Profile com Dropdown de Sessão */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 cursor-pointer group focus:outline-none"
          >
            {/* Avatar com imagem ou placeholder resiliente de iniciais */}
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden shrink-0 border border-[#DDDDE5] shadow-2xs flex items-center justify-center font-bold text-xs select-none bg-[#1F1B38] text-[#D4AF37] border-[#D4AF37]/30">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  fill
                  className="object-cover object-center"
                  sizes="36px"
                  unoptimized
                />
              ) : (
                <span className="tracking-wider">{userInitials || "RP"}</span>
              )}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-bold text-[#07132E] leading-tight group-hover:text-[#5B2FE8] transition-colors">
                {userName}
              </span>
              {variant === "admin" && userRoleLabel && (
                <span className="text-[11px] text-[#60708F] font-normal leading-tight mt-0.5">
                  {userRoleLabel}
                </span>
              )}
            </div>

            <ChevronDown className="hidden sm:block h-4 w-4 text-[#60708F] group-hover:text-[#07132E] transition-colors" />
          </button>

          {isUserMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 sm:w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-slate-800 animate-in fade-in"
            >
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {userName}
                </p>
                {userEmail && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    {userEmail}
                  </p>
                )}
                <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-md uppercase tracking-wider">
                  {userRoleLabel || (variant === "admin" ? "Administrador" : "Aluno")}
                </span>
              </div>

              <form action="/api/auth/logout" method="POST" className="p-1">
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sair da conta</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Drawer de Notificações Internas */}
      <NotificacoesDrawer
        usuarioId={usuarioId}
        isOpen={isNotificacoesOpen}
        onClose={() => {
          setIsNotificacoesOpen(false);
          checkUnread();
        }}
        onNotificacaoLida={checkUnread}
      />
    </header>
  );
}
