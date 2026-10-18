"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DemoRoleSwitcher } from "@/components/layout/DemoRoleSwitcher";
import { isDemoMode } from "@/lib/demoMode";
import { ModoProducaoAviso } from "@/components/auth/ModoProducaoAviso";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isDemoMode()) {
    return <ModoProducaoAviso area="admin" />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Dark Permanent Admin Sidebar on Desktop / Drawer on Mobile */}
      <AdminSidebar
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          variant="admin"
          userName="Carla Mendes"
          userRoleLabel="Administrador"
          userAvatar="/carla-avatar.png"
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Floating Demo Viewport Switcher */}
      <DemoRoleSwitcher variant="floating" />
    </div>
  );
}
