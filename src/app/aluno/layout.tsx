"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AlunoSidebar } from "@/components/layout/AlunoSidebar";
import { DemoRoleSwitcher } from "@/components/layout/DemoRoleSwitcher";
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Header */}
      <Header
        variant="aluno"
        userName="Mariana"
        userAvatar="/mariana-avatar.png"
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Container */}
      <div className="flex flex-1">
        {/* Aluno Sidebar */}
        <AlunoSidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Page Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Floating Demo Viewport Switcher */}
      <DemoRoleSwitcher variant="floating" />
    </div>
  );
}
