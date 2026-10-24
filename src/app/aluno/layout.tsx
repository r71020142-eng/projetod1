import React from "react";
import { getServerIdentity } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AlunoLayoutClient } from "./AlunoLayoutClient";

/**
 * Layout do Aluno Server Component (SSR).
 *
 * Regras da Etapa 10.2B1:
 * - Em AUTH_MODE=supabase:
 *   - Obtém identidade estrita do Supabase.
 *   - Administrador ou Professor tentando acessar diretamente /aluno sem impersonação formal é bloqueado.
 *   - Aluno inativo ou bloqueado é bloqueado imediatamente.
 * - Em AUTH_MODE=demo: provê a identidade demonstrativa (Mariana Silva) com seletores de visão.
 */
export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getServerIdentity("aluno");

  if (!identity) {
    redirect("/acesso-negado?motivo=perfil_inexistente");
  }

  if (identity.isRealAuth) {
    if (identity.status !== "ativo") {
      redirect(`/acesso-negado?motivo=${identity.status}`);
    }
    // Administrador ou professor tentando acessar o portal do aluno sem impersonação formal
    if (identity.role !== "aluno") {
      redirect("/acesso-negado?motivo=permissao_insuficiente");
    }
  }

  return (
    <AlunoLayoutClient identity={identity} isAuthTest={false}>
      {children}
    </AlunoLayoutClient>
  );
}
