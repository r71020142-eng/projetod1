"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AlunoSidebar } from "@/components/layout/AlunoSidebar";
import { isDemoMode } from "@/lib/demoMode";
import { ModoProducaoAviso } from "@/components/auth/ModoProducaoAviso";

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isDemoMode()) {
    return <ModoProducaoAviso area="aluno" />;
  }

  return (
    <div className="student-main min-h-[100dvh] bg-[#F5F3EE] text-[#07132E] relative overflow-x-hidden selection:bg-[#5B2FE8] selection:text-white">
      {/* Decoupled Fixed Background Layer (FASE 3 - pointer-events: none, z-index: 0, aria-hidden) */}
      <div
        className="student-main-background fixed inset-0 pointer-events-none z-0 bg-[#F8F6F1] bg-[url('/assets/mtd/mtd-main-background.webp')] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />

      {/* Aluno Sidebar - Fixed full-height on desktop (294px), drawer on mobile */}
      <AlunoSidebar
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Column offset by desktop sidebar width (294px) */}
      <div className="relative z-10 flex flex-col min-h-[100dvh] min-w-0 lg:pl-[294px]">
        {/* Top Header */}
        <Header
          variant="aluno"
          userName="Mariana"
          userAvatar="/mariana-avatar.png"
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Page Content: .student-page-content (relative z-10, min-w-0, padding horizontal de 32px) */}
        <main className="student-page-content relative z-10 flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
          <div className="w-full max-w-[1360px] mx-auto min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
