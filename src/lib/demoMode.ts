/**
 * Configurações e utilitários do Modo Demonstrativo do DEMOSTRATIVO MTD (Etapa 9).
 *
 * Controlado pela variável de ambiente NEXT_PUBLIC_DEMO_MODE.
 * Por padrão, se não configurado ou explicitamente diferente de "false", opera em modo demonstrativo.
 * Para desativar o modo demonstrativo e preparar a integração com o backend real, defina:
 * NEXT_PUBLIC_DEMO_MODE=false
 */

export function isDemoMode(): boolean {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "false") {
      return false;
    }
  }
  return true;
}

export const DEMO_STUDENT_ID = "alu-001";
export const DEMO_ADMIN_NAME = "Carla Mendes";
export const DEMO_TEACHER_ID = "prof-001";

export const DEFAULT_TIMEZONE =
  (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE) ||
  "America/Sao_Paulo";
