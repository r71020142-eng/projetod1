import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Endpoint de verificação e auditoria de fontes de dados de agenda, aulas e presenças.
 * Permite que a interface Client-Side audite em tempo de execução se há consistência
 * estrita entre as variáveis do servidor e o bundle do navegador.
 */
export async function GET() {
  try {
    const serverEnv = getServerEnv();
    const defaultClient = process.env.NEXT_PUBLIC_DATA_SOURCE || "local";
    const clientExpected =
      process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE || defaultClient;

    const divergence = serverEnv.academicAgendaDataSource !== clientExpected;

    return NextResponse.json({
      status: "ok",
      serverSource: serverEnv.academicAgendaDataSource,
      clientExpectedSource: clientExpected,
      divergence,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno na validação de ambiente de agenda acadêmica.";
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
