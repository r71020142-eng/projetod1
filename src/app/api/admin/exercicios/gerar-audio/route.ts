import { NextRequest, NextResponse } from "next/server";
import { sintetizarAudioExercicio, SintetizarAudioIaParams } from "@/lib/ai/ttsService";

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
      texto,
      vozGenero = "feminina",
      sotaque = "american",
      velocidade = 1.0,
      tituloExercicio,
    } = body;

    if (!texto || typeof texto !== "string" || texto.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "O texto pedagógico é obrigatório para síntese e deve ter pelo menos 10 caracteres.",
        },
        { status: 400 }
      );
    }

    const params: SintetizarAudioIaParams = {
      texto: texto.trim(),
      vozGenero: vozGenero === "masculina" ? "masculina" : "feminina",
      sotaque: sotaque === "british" ? "british" : "american",
      velocidade: Math.min(Math.max(Number(velocidade) || 1.0, 0.7), 1.3),
      tituloExercicio,
    };

    const resultado = await sintetizarAudioExercicio(params);

    if (!resultado.success) {
      const statusCode = resultado.code === "TTS_KEYS_NOT_CONFIGURED" ? 503 : 500;
      return NextResponse.json(resultado, { status: statusCode });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (err: unknown) {
    console.error("[API Gerar Áudio] Erro interno:", err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Erro inesperado ao sintetizar narração de voz.",
      },
      { status: 500 }
    );
  }
}
