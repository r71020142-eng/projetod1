"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, Bell, Menu, X, ChevronDown } from "lucide-react";
import { NotificacoesDrawer } from "@/components/notificacoes/NotificacoesDrawer";
import { gamificacaoRepository } from "@/data/api";

interface HeaderProps {
  variant: "aluno" | "admin";
  userName: string;
  userRoleLabel?: string;
  userAvatar: string;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export function Header({
  variant,
  userName,
  userRoleLabel,
  userAvatar,
  onToggleMobileMenu,
  isMobileMenuOpen,
}: HeaderProps) {
  const usuarioId = variant === "admin" ? "adm-001" : "alu-001";
  const [isNotificacoesOpen, setIsNotificacoesOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-[#DDDDE5]/80 bg-white/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 select-none transition-colors">
      {/* Left side: Mobile Toggle & Brand (on mobile only, since desktop has persistent sidebar) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          type="button"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-slate-800" />
          ) : (
            <Menu className="h-6 w-6 text-slate-800" />
          )}
        </button>

        {/* Logo: Displayed on mobile only when sidebar is closed/in drawer */}
        <div className="flex lg:hidden items-center gap-2">
          <Image
            src="/assets/mtd/mtd-logo-mark.svg"
            alt="Símbolo DEMOSTRATIVO MTD"
            width={24}
            height={24}
            className="w-6 h-6 object-contain shrink-0"
            unoptimized
          />
          <div className="flex items-center gap-1">
            <span className="font-extrabold tracking-tight text-[#07132E] text-base sm:text-lg">
              DEMOSTRATIVO
            </span>
            <span className="text-[#5B2FE8] font-extrabold text-base sm:text-lg">
              MTD
            </span>
          </div>
        </div>
      </div>

      {/* Center: Search input matching reference */}
      <div className="hidden md:flex flex-1 max-w-xl mx-4 lg:mx-8">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#60708F]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            placeholder={placeholderText}
            className="w-full rounded-xl border border-[#DDDDE5] bg-white/70 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#07132E] placeholder-[#60708F] focus:border-[#5B2FE8] focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Right side: Notification Bell & User Profile matching reference */}
      <div className="flex items-center gap-4 sm:gap-6">
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

        {/* User Profile */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div
            className="relative h-9 w-9 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-[#DDDDE5] shadow-2xs"
            style={{ width: 36, height: 36, position: "relative" }}
          >
            <Image
              src={userAvatar}
              alt={userName}
              fill
              className="object-cover object-center"
              sizes="36px"
              unoptimized
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-[#07132E] leading-tight group-hover:text-[#5B2FE8] transition-colors">
              {userName}
            </span>
            {userRoleLabel && (
              <span className="text-[11px] text-[#60708F] font-normal leading-tight mt-0.5">
                {userRoleLabel}
              </span>
            )}
          </div>

          {/* Chevron down */}
          <ChevronDown className="h-4 w-4 text-[#60708F] group-hover:text-[#07132E] transition-colors" />
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
