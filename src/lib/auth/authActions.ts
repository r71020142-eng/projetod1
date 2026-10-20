"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sanitizeNextPath,
  getDefaultDashboardForRole,
  isRouteAllowedForRole,
  type UserRole,
} from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export interface AuthActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Server Action para autenticação por e-mail e senha.
 */
export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const rawNext = formData.get("next") as string;

  if (!email || !password) {
    return {
      error: "Por favor, preencha todos os campos obrigatórios.",
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      error:
        "O serviço de autenticação não está disponível no momento. Tente novamente mais tarde.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      error: "E-mail ou senha incorretos. Verifique os dados e tente novamente.",
    };
  }

  // Consulta o perfil para validar role e status no banco de dados
  const { data: profile } = await supabase
    .from("perfis")
    .select("role, status")
    .eq("id", data.user.id)
    .single();

  if (profile?.status !== "ativo") {
    // Encerra a sessão imediatamente em caso de conta inativa/bloqueada
    await supabase.auth.signOut();
    return {
      error:
        "Sua conta está inativa ou bloqueada. Entre em contato com a coordenação pedagógica.",
    };
  }

  const role = (profile?.role as UserRole) || "aluno";
  const safeNext = sanitizeNextPath(rawNext);

  let targetUrl = getDefaultDashboardForRole(role);
  if (safeNext && isRouteAllowedForRole(safeNext, role)) {
    targetUrl = safeNext;
  }

  redirect(targetUrl);
}

/**
 * Server Action para solicitação de recuperação de senha via PKCE.
 * Proteção de privacidade: sempre retorna mensagem neutra e genérica.
 */
export async function requestPasswordResetAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    return {
      error: "Informe o endereço de e-mail cadastrado.",
    };
  }

  const headerList = headers();
  const host = headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || "http";
  const origin = `${proto}://${host}`;

  const supabase = createServerSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
      });
    } catch {
      // Falha silenciosa para não expor erros internos de envio
    }
  }

  return {
    success: true,
    message:
      "Se existir uma conta associada a este e-mail, enviaremos as instruções de recuperação em instantes.",
  };
}

/**
 * Server Action para definição de nova senha pós-callback PKCE.
 *
 * Fluxo de Segurança Obrigatório (Etapa 10.2C1 — Correção Final):
 * 1. Valida a sessão com supabase.auth.getUser() — nunca confia em UID enviado pelo formulário.
 * 2. Valida os campos de senha no servidor.
 * 3. Executa supabase.auth.updateUser({ password }) — a senha é efetivamente alterada.
 * 4. SOMENTE após o sucesso do updateUser(), verifica se há convite pendente consultando
 *    acessos_usuarios via cliente admin (service_role) com busca por perfil_id = uid.
 * 5. Se houver convite pendente, chama ativar_acesso_pos_senha(uid) via service_role.
 *    A Secret Key NUNCA é exposta ao navegador e o UID é extraído exclusivamente de getUser().
 * 6. Se não houver convite (recuperação de senha comum), segue o fluxo padrão de redirecionamento.
 * 7. Em caso de falha na ativação pós-senha, o perfil permanece inativo e é apresentada
 *    mensagem controlada — o acesso ao portal nunca é liberado parcialmente.
 */
export async function resetPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // 1. Validação de campos no servidor (nunca confia em dados do formulário para lógica de autenticação)
  if (!password || !confirmPassword) {
    return { error: "Preencha a nova senha e a confirmação." };
  }

  if (password.length < 8) {
    return { error: "A nova senha deve possuir pelo menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas informadas não coincidem." };
  }

  // 2. Obtém o cliente autenticado e valida a sessão via getUser() — fonte de verdade do UID
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { error: "Sessão inválida ou expirada. Solicite uma nova recuperação." };
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    return { error: "Sessão inválida ou expirada. Solicite uma nova recuperação." };
  }

  // O UID é exclusivamente derivado da sessão autenticada — nunca de parâmetro de URL ou formulário
  const authUid = user.id;

  // 3. Atualiza a senha via Auth (PKCE). Somente após este passo bem-sucedido, prosseguimos.
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return {
      error:
        "Não foi possível redefinir a senha. O link pode ter expirado. Solicite uma nova recuperação.",
    };
  }

  // 4. Verifica se existe convite pendente para este usuário.
  //    Esta etapa usa o cliente admin (service_role) — server-only, nunca exposto ao navegador.
  //    Consulta por perfil_id = authUid para identificar convites pendentes.
  const adminClient = createAdminClient();

  let role: UserRole = "aluno";
  let hasInvitePending = false;

  if (adminClient) {
    try {
      const { data: acessoData } = await adminClient
        .from("acessos_usuarios")
        .select("id, status, perfil_id")
        .eq("perfil_id", authUid)
        .eq("status", "convite_pendente")
        .maybeSingle();

      hasInvitePending = !!acessoData;
    } catch {
      // Falha silenciosa na verificação — prossegue como redefinição comum
      hasInvitePending = false;
    }
  }

  // 5. Se houver convite pendente, ativa via RPC privilegiada (service_role → banco).
  //    O UID passado é exclusivamente o obtido de getUser() no passo 2.
  if (hasInvitePending && adminClient) {
    const { data: activationResult, error: activationError } = await adminClient.rpc(
      "ativar_acesso_pos_senha",
      { p_auth_user_id: authUid }
    );

    if (activationError) {
      // Ativação falhou: perfil e acesso permanecem inativos. Nunca libera parcialmente.
      return {
        error:
          "A senha foi definida, mas a ativação da conta falhou. Entre em contato com a coordenação pedagógica para regularizar o acesso.",
      };
    }

    if (
      activationResult &&
      typeof activationResult === "object" &&
      "role" in activationResult
    ) {
      role = (activationResult as { role: UserRole }).role || "aluno";
    }

    redirect(getDefaultDashboardForRole(role));
  }

  // 6. Fluxo comum: recuperação de senha de administradores e usuários já ativos.
  //    Consulta o perfil para obter o papel atual e redirecionar corretamente.
  if (adminClient) {
    try {
      const { data: profile } = await adminClient
        .from("perfis")
        .select("role, status")
        .eq("id", authUid)
        .single();

      if (profile?.status === "ativo" && profile?.role) {
        role = profile.role as UserRole;
      }
    } catch {
      // Fallback seguro para aluno
    }
  }

  redirect(getDefaultDashboardForRole(role));
}
