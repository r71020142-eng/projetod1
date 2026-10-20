"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
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
 */
export async function resetPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return {
      error: "Preencha a nova senha e a confirmação.",
    };
  }

  if (password.length < 8) {
    return {
      error: "A nova senha deve possuir pelo menos 8 caracteres.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "As senhas informadas não coincidem.",
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      error: "Sessão inválida ou expirada. Solicite uma nova recuperação.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error:
        "Não foi possível redefinir a senha. O link pode ter expirado. Solicite uma nova recuperação.",
    };
  }

  redirect("/login?mensagem=senha_redefinida");
}
