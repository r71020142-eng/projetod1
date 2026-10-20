import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Endpoint de verificação e auditoria de fontes de dados acadêmicas (Turmas e Matrículas).
 * Permite que a interface Client-Side audite em tempo de execução se há consistência
 * estrita entre as variáveis do servidor e o bundle do navegador.
 */
export async function GET() {
  try {
    const serverEnv = getServerEnv();
    const clientExpected =
      process.env.NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE || "local";

    return NextResponse.json({
      status: "ok",
      serverSource: serverEnv.academicCoreDataSource,
      clientExpectedSource: clientExpected,
      divergence: false,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno na validação de ambiente acadêmico.";
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
