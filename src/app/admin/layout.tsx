import React from "react";
import { getServerIdentity } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "./AdminLayoutClient";

/**
 * Layout Administrativo Server Component (SSR).
 *
 * Regras da Etapa 10.2B1:
 * - Em AUTH_MODE=supabase: obtém identidade estrita do Supabase (Ray Pires, admin, ativo).
 * - Em AUTH_MODE=demo: provê a identidade demonstrativa (Carla Mendes) com seletores de visão.
 * - Elimina flicker, elimina estado temporário fictício e previne erros de hidratação.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getServerIdentity("admin");

  // Se em modo de autenticação real e a sessão/perfil for inexistente
  if (!identity) {
    redirect("/acesso-negado?motivo=perfil_inexistente");
  }

  // Bloqueio rigoroso de contas inativas ou bloqueadas
  if (identity.isRealAuth && identity.status !== "ativo") {
    redirect(`/acesso-negado?motivo=${identity.status}`);
  }

  // Validação estrita de autorização (apenas admin ou professor têm acesso ao ecossistema /admin)
  if (
    identity.isRealAuth &&
    identity.role !== "admin" &&
    identity.role !== "professor"
  ) {
    redirect("/acesso-negado?motivo=permissao_insuficiente");
  }

  return (
    <AdminLayoutClient identity={identity} isAuthTest={false}>
      {children}
    </AdminLayoutClient>
  );
}
