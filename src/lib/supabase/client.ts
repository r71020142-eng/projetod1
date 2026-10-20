import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";

/**
 * Cliente Supabase para Client Components (navegador).
 *
 * Regras da Etapa 10.1 (Padrão Oficial Supabase):
 * - Utiliza estritamente a URL pública e a Publishable Key pública.
 * - NUNCA recebe ou manipula a SUPABASE_SECRET_KEY.
 * - Se as credenciais estiverem ausentes em modo demonstrativo, retorna cliente desativado
 *   sem quebrar a renderização dos componentes visuais.
 */

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const env = getClientEnv();

  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    if (env.isDemoClient) {
      // Em modo demonstrativo sem variáveis do Supabase, retorna instância segura de noop/aviso
      return null;
    }
    throw new Error(
      "[Supabase Client] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY são obrigatórios."
    );
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(
      env.supabaseUrl,
      env.supabasePublishableKey
    );
  }

  return browserClientInstance;
}
