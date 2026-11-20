import { NextRequest, NextResponse } from "next/server";
import { gerarConteudoExercicioIa, GerarExercicioIaParams } from "@/lib/ai/contentGenerator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Corpo da requisição inválido. Envie um payload JSON." },
        { status: 400 }
      );
    }

    const {
      tema,
      nivel = "B1",
      tipoConteudo = "cotidiano",
      extensao = "medio",
      quantidadeQuestoes = 4,
      varianteIngles = "american",
      tipoExercicio = "leitura_audio",
    } = body;

    if (!tema || typeof tema !== "string" || tema.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "O tema do exercício é obrigatório e deve conter pelo menos 3 caracteres.",
        },
        { status: 400 }
      );
    }

    const niveisValidos = ["A1", "A2", "B1", "B2", "C1", "C2"];
    if (!niveisValidos.includes(nivel)) {
      return NextResponse.json(
        { success: false, error: `Nível CEFR inválido: ${nivel}. Use A1, A2, B1, B2, C1 ou C2.` },
        { status: 400 }
      );
    }

    const qtd = Math.min(Math.max(Number(quantidadeQuestoes) || 4, 2), 5);

    const params: GerarExercicioIaParams = {
      tema: tema.trim(),
      nivel,
      tipoConteudo,
      extensao,
      quantidadeQuestoes: qtd,
      varianteIngles: varianteIngles === "british" ? "british" : "american",
      tipoExercicio,
    };

    const resultado = await gerarConteudoExercicioIa(params);

    if (!resultado.success) {
      const statusCode = resultado.code === "AI_KEYS_NOT_CONFIGURED" ? 503 : 500;
      return NextResponse.json(resultado, { status: statusCode });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (err: unknown) {
    console.error("[API Gerar Conteúdo] Erro interno:", err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Erro inesperado ao gerar conteúdo do exercício.",
      },
      { status: 500 }
    );
  }
}
