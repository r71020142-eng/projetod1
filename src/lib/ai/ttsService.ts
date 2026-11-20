/**
 * ttsService.ts
 * Serviço de síntese de voz (TTS) para narração pedagógica de exercícios interativos.
 *
 * Regra central: O texto final aprovado pelo professor é a fonte ÚNICA e OFICIAL do conteúdo narrado.
 * Provedores suportados: ElevenLabs (principal) e OpenAI Audio Speech (fallback).
 * Armazenamento: Supabase Storage (bucket público 'materiais').
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import { normalizeAudioText, computeTextHash } from "@/lib/audioFidelity";

export interface SintetizarAudioIaParams {
  texto: string;
  vozGenero: "feminina" | "masculina";
  sotaque: "american" | "british";
  velocidade?: number; // 0.85 a 1.15 (padrão: 1.0)
  tituloExercicio?: string;
}

export interface AudioIaResultado {
  audioUrl: string;
  audioNome: string;
  audioDuracaoSegundos: number;
  audioTextoHash: string;
  audioProvedor: "elevenlabs" | "openai";
  audioVozId: string;
  audioVozNome: string;
  audioVelocidade: number;
  geradoEm: string;
}

export interface SintetizarAudioResultado {
  success: boolean;
  data?: AudioIaResultado;
  error?: string;
  code?: string;
}

// Mapeamento de vozes ElevenLabs de alta fidelidade
const VOZES_ELEVENLABS: Record<string, { id: string; nome: string }> = {
  "american_feminina": { id: "21m00Tcm4TlvDq8ikWAM", nome: "Rachel (US Female)" },
  "american_masculina": { id: "VR6AewLTigWG4xSOukaG", nome: "Arnold (US Male)" },
  "british_feminina": { id: "XB0fDUnXU5powFXDhCwa", nome: "Charlotte (UK Female)" },
  "british_masculina": { id: "onwK4e9ZLuTAKqWW03F9", nome: "Daniel (UK Male)" },
};

// Mapeamento de vozes OpenAI Audio Speech
const VOZES_OPENAI: Record<string, { id: string; nome: string }> = {
  "american_feminina": { id: "nova", nome: "Nova (US Female)" },
  "american_masculina": { id: "onyx", nome: "Onyx (US Male)" },
  "british_feminina": { id: "shimmer", nome: "Shimmer (UK Female)" },
  "british_masculina": { id: "fable", nome: "Fable (UK Male)" },
};

function estimarDuracaoSegundos(texto: string, velocidade: number): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  // Média de leitura didática em inglês: ~140 palavras/minuto = ~2.33 palavras/segundo
  const taxaPalavrasPorSegundo = 2.33 * (velocidade || 1.0);
  return Math.max(5, Math.round(palavras / taxaPalavrasPorSegundo));
}

async function sintetizarComElevenLabs(
  texto: string,
  voiceId: string,
  velocidade: number,
  apiKey: string
): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texto,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: Math.min(Math.max(velocidade, 0.7), 1.2),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS falhou (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function sintetizarComOpenAI(
  texto: string,
  voiceId: string,
  velocidade: number,
  apiKey: string
): Promise<Buffer> {
  const url = "https://api.openai.com/v1/audio/speech";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: texto,
      voice: voiceId,
      speed: Math.min(Math.max(velocidade, 0.8), 1.2),
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS falhou (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function sintetizarAudioExercicio(
  params: SintetizarAudioIaParams
): Promise<SintetizarAudioResultado> {
  try {
    const textoLimpo = normalizeAudioText(params.texto);
    if (!textoLimpo || textoLimpo.length < 10) {
      return {
        success: false,
        error: "O texto para síntese de áudio deve conter pelo menos 10 caracteres.",
      };
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (!elevenLabsKey && !openaiKey) {
      return {
        success: false,
        error:
          "Nenhuma credencial de voz configurada no servidor (ELEVENLABS_API_KEY ou OPENAI_API_KEY ausente). Configure uma das variáveis no ambiente para sintetizar narrações oficiais.",
        code: "TTS_KEYS_NOT_CONFIGURED",
      };
    }

    const chaveVoz = `${params.sotaque}_${params.vozGenero}`;
    const velocidade = Number(params.velocidade || 1.0);
    const audioTextoHash = computeTextHash(textoLimpo);

    let audioBuffer: Buffer | null = null;
    let provedor: "elevenlabs" | "openai" = "elevenlabs";
    let vozId = "";
    let vozNome = "";

    // Tenta ElevenLabs primeiro
    if (elevenLabsKey) {
      try {
        const voz = VOZES_ELEVENLABS[chaveVoz] || VOZES_ELEVENLABS["american_feminina"];
        vozId = voz.id;
        vozNome = voz.nome;
        provedor = "elevenlabs";
        audioBuffer = await sintetizarComElevenLabs(textoLimpo, vozId, velocidade, elevenLabsKey);
      } catch (err: unknown) {
        console.warn("[TTS] Falha na ElevenLabs, avaliando fallback OpenAI:", err);
        if (!openaiKey) {
          throw err;
        }
      }
    }

    // Fallback para OpenAI TTS se ElevenLabs não estava configurada ou falhou
    if (!audioBuffer && openaiKey) {
      const voz = VOZES_OPENAI[chaveVoz] || VOZES_OPENAI["american_feminina"];
      vozId = voz.id;
      vozNome = voz.nome;
      provedor = "openai";
      audioBuffer = await sintetizarComOpenAI(textoLimpo, vozId, velocidade, openaiKey);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        success: false,
        error: "Falha ao gerar o arquivo binário de áudio com os provedores disponíveis.",
      };
    }

    // Salva no Supabase Storage (bucket 'materiais')
    const env = getServerEnv();
    const supabaseUrl = env.supabaseUrl;
    const secretKey = env.supabaseSecretKey;

    if (!supabaseUrl || !secretKey) {
      return {
        success: false,
        error: "Supabase Storage não configurado para persistência do áudio.",
      };
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const timestamp = Date.now();
    const hashShort = audioTextoHash.slice(0, 12);
    const fileName = `exercicio_narracao_${timestamp}_${hashShort}.mp3`;
    const storagePath = `exercicios_ia_audio/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("materiais")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro ao enviar áudio para o bucket materiais: ${uploadError.message}`);
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("materiais")
      .getPublicUrl(storagePath);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      throw new Error("Não foi possível obter a URL pública do áudio gerado.");
    }

    const duracaoSegundos = estimarDuracaoSegundos(textoLimpo, velocidade);

    return {
      success: true,
      data: {
        audioUrl: publicUrl,
        audioNome: fileName,
        audioDuracaoSegundos: duracaoSegundos,
        audioTextoHash,
        audioProvedor: provedor,
        audioVozId: vozId,
        audioVozNome: vozNome,
        audioVelocidade: velocidade,
        geradoEm: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "Erro desconhecido ao sintetizar áudio.";
    return {
      success: false,
      error: msg,
    };
  }
}
