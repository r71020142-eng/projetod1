import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";

/**
 * Cliente Supabase para Client Components (navegador).
 *
 * Regras da Etapa 10.1:
 * - Utiliza estritamente a URL pública e a chave anon pública.
 * - NUNCA recebe ou manipula SUPABASE_SERVICE_ROLE_KEY.
 * - Se as credenciais estiverem ausentes em modo demonstrativo, retorna cliente desativado
 *   sem quebrar a renderização dos componentes visuais.
 */

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const env = getClientEnv();

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    if (env.isDemoClient) {
      // Em modo demonstrativo sem variáveis do Supabase, retorna instância segura de noop/aviso
      return null;
    }
    throw new Error(
      "[Supabase Client] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios."
    );
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(
      env.supabaseUrl,
      env.supabaseAnonKey
    );
  }

  return browserClientInstance;
}
