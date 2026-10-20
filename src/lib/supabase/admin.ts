import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Cliente Supabase Administrativo Privilegiado (Secret Key).
 *
 * REGRAS DE SEGURANÇA MANDATÓRIAS:
 * 1. O import 'server-only' garante que o Next.js falhe em tempo de compilação caso este arquivo
 *    seja importado em qualquer Client Component ou código do navegador.
 * 2. A Secret Key ignora completamente as políticas de RLS e NUNCA pode ser utilizada
 *    para operações rotineiras de usuários ou exposta no cliente.
 * 3. Utilização estrita: rotinas de migração administrativa, webhooks de autenticação do sistema
 *    ou processos de auditoria backend controlados.
 */
export function createAdminClient() {
  const env = getServerEnv();

  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    if (env.appMode === "demo") {
      return null;
    }
    throw new Error(
      "[Supabase Admin] SUPABASE_SECRET_KEY e NEXT_PUBLIC_SUPABASE_URL são obrigatórios para o cliente administrativo."
    );
  }

  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Alias para createAdminClient(), garantindo conformidade com o padrão getAdminSupabaseClient().
 */
export const getAdminSupabaseClient = createAdminClient;

