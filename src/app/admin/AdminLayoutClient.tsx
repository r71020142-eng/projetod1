"use client";

import React, { createContext, useContext, useState } from "react";
import { Header } from "@/components/layout/Header";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DemoRoleSwitcher } from "@/components/layout/DemoRoleSwitcher";
import { UserIdentity } from "@/lib/auth/session";

const AdminIdentityContext = createContext<UserIdentity | null>(null);

export function useAdminIdentity(): UserIdentity | null {
  return useContext(AdminIdentityContext);
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
  identity: UserIdentity;
}

export function AdminLayoutClient({
  children,
  identity,
}: AdminLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AdminIdentityContext.Provider value={identity}>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex overflow-x-hidden relative">
        {/* Dark Permanent Admin Sidebar on Desktop / Drawer on Mobile */}
        <AdminSidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          userRole={identity.role}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header com Identidade Real Autenticada */}
          <Header
            variant="admin"
            userName={identity.nomeCompleto}
            userRoleLabel={identity.roleLabel}
            userAvatar={identity.avatarUrl}
            userInitials={identity.initials}
            userEmail={identity.email}
            isRealAuth={identity.isRealAuth}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
          />

          {/* Page Body */}
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto min-w-0">{children}</div>
          </main>
        </div>

        {/* Floating Demo Viewport Switcher - Exibido EXCLUSIVAMENTE em modo demo */}
        {!identity.isRealAuth && <DemoRoleSwitcher variant="floating" />}
      </div>
    </AdminIdentityContext.Provider>
  );
}
