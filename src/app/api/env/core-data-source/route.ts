import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Endpoint de verificação e auditoria de fontes de dados ativas.
 * Permite que a interface Client-Side audite em tempo de execução se há consistência
 * estrita entre as variáveis do servidor e o bundle do navegador.
 */
export async function GET() {
  try {
    const serverEnv = getServerEnv();
    const clientExpected = process.env.NEXT_PUBLIC_CORE_USERS_DATA_SOURCE || "local";

    return NextResponse.json({
      status: "ok",
      serverSource: serverEnv.coreUsersDataSource,
      clientExpectedSource: clientExpected,
      divergence: false,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno na validação de ambiente.";
    return NextResponse.json(
      {
        status: "error",
        message,
        divergence: true,
      },
      { status: 500 }
    );
  }
}
