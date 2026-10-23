"use client";

import React, { createContext, useContext, useState } from "react";
import { Header } from "@/components/layout/Header";
import { AlunoSidebar } from "@/components/layout/AlunoSidebar";
import { UserIdentity } from "@/lib/auth/session";

const AlunoIdentityContext = createContext<UserIdentity | null>(null);

export function useAlunoIdentity(): UserIdentity | null {
  return useContext(AlunoIdentityContext);
}

interface AlunoLayoutClientProps {
  children: React.ReactNode;
  identity: UserIdentity;
  isAuthTest?: boolean;
}

export function AlunoLayoutClient({
  children,
  identity,
  isAuthTest = false,
}: AlunoLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AlunoIdentityContext.Provider value={identity}>
      <div className="student-main min-h-screen bg-[#F5F3EE] text-[#07132E] relative selection:bg-[#5B2FE8] selection:text-white">
        {/* Decoupled Fixed Background Layer */}
        <div
          className="student-main-background fixed inset-0 pointer-events-none z-0 bg-[#F8F6F1] bg-[url('/assets/mtd/mtd-main-background.webp')] bg-cover bg-top bg-no-repeat"
          aria-hidden="true"
        />

        {/* Aluno Sidebar - Fixed full-height on desktop (294px), drawer on mobile */}
        <AlunoSidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isRealAuth={identity.isRealAuth}
        />

        {/* Main Content Column offset by desktop sidebar width (294px) */}
        <div className="relative z-10 flex flex-col min-h-screen min-w-0 lg:pl-[294px]">
          {/* Top Header */}
          <Header
            variant="aluno"
            userName={identity.nomeCompleto}
            userRoleLabel={identity.roleLabel}
            userAvatar={identity.avatarUrl}
            userInitials={identity.initials}
            userEmail={identity.email}
            isRealAuth={identity.isRealAuth}
            isAuthTest={isAuthTest}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
          />

          {/* Page Content */}
          <main className="student-page-content relative z-10 flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-clip">
            <div className="w-full max-w-[1360px] mx-auto min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </AlunoIdentityContext.Provider>
  );
}
