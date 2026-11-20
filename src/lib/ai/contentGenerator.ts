/**
 * contentGenerator.ts
 * Gerador inteligente de conteúdo pedagógico e exercícios com IA para a Juno Academy.
 * Suporta OpenAI (gpt-4o-mini / gpt-4o) como provedor principal e Google Gemini como fallback.
 * Implementa validação estrita dos critérios pedagógicos do Método Paulo.
 */

import { NivelMaterial, QuestaoObjetiva, IaPromptMetaExercicio } from "@/types";

export interface GerarExercicioIaParams {
  tema: string;
  nivel: NivelMaterial;
  tipoConteudo: "historia" | "cotidiano" | "dialogo" | "informativo";
  extensao: "curto" | "medio" | "longo";
  quantidadeQuestoes: number; // 2 a 5
  varianteIngles: "american" | "british";
  tipoExercicio?: "multipla_escolha" | "leitura_audio";
}

export interface ExercicioIaGerado {
  titulo: string;
  descricao: string;
  instrucoes: string;
  categoria: string;
  textoConteudo: string;
  questoes: QuestaoObjetiva[];
  iaPromptMeta: IaPromptMetaExercicio;
  modeloUtilizado: string;
  provedor: "openai" | "gemini";
}

export interface GerarConteudoResultado {
  success: boolean;
  data?: ExercicioIaGerado;
  error?: string;
  code?: string;
}

const DESCRICAO_EXTENSAO: Record<string, string> = {
  curto: "2 parágrafos, aproximadamente 120 a 160 palavras",
  medio: "3 a 4 parágrafos, aproximadamente 200 a 280 palavras",
  longo: "4 a 5 parágrafos, aproximadamente 320 a 420 palavras",
};

const NOMES_TIPO_CONTEUDO: Record<string, string> = {
  historia: "narrativa envolvente em formato de conto com início, desenvolvimento e desfecho",
  cotidiano: "situação prática do dia a dia, rotinas, hábitos, viagens ou contexto profissional",
  dialogo: "conversa e interação dinâmica entre dois falantes com linguagem natural",
  informativo: "artigo expositivo, curiosidades culturais, fatos históricos ou texto de divulgação",
};

function construirSystemPrompt(params: GerarExercicioIaParams): string {
  const variante = params.varianteIngles === "british" ? "British English (UK)" : "American English (US)";
  const regrasVariante =
    params.varianteIngles === "british"
      ? "Use ortografia e vocabulário britânico (colour, flavour, centre, holiday, flat, underground, etc.)."
      : "Use ortografia e vocabulário americano (color, flavor, center, vacation, apartment, subway, etc.).";

  return `Você é o Especialista Pedagógico e Designer Instrucional da Juno Academy (Método Paulo), referência no ensino imersivo de inglês com foco no Quadro Europeu Comum de Referência para Línguas (CEFR).

Sua missão é gerar um exercício pedagógico completo de interpretação textual em inglês, com áudio opcional e questões de múltipla escolha inspiradas no padrão Lingua.com.

DIRETRIZES FUNDAMENTAIS:
1. Nível CEFR alvo: ${params.nivel}. Ajuste vocabulário, complexidade sintática e estruturas gramaticais estritamente para o nível ${params.nivel}.
2. Variante da língua: ${variante}. ${regrasVariante}
3. Tipo de conteúdo: ${NOMES_TIPO_CONTEUDO[params.tipoConteudo] || params.tipoConteudo}.
4. Extensão: ${DESCRICAO_EXTENSAO[params.extensao] || "3 parágrafos"}. O texto deve ser formatado em parágrafos separados por duas quebras de linha (\\n\\n).
5. O texto em inglês será lido pelo aluno e posteriormente narrado por IA. Portanto, deve soar 100% natural, fluente e foneticamente agradável.
6. Quantidade de questões: exatamente ${params.quantidadeQuestoes}.
7. REGRAS OBRIGATÓRIAS PARA AS QUESTÕES:
   - Cada questão DEVE ter EXATAMENTE 4 alternativas.
   - Cada alternativa DEVE ter um texto claro, plausível e sem ambiguidades.
   - Exatamente UMA alternativa DEVE ser a correta (sem pegadinhas abusivas, mas exigindo interpretação genuína do texto).
   - A explicação pedagógica ('explicacao') DEVE ser em Português, referenciando explicitamente em qual trecho ou parágrafo a resposta correta se fundamenta.
   - Os IDs das questões devem ser sequenciais no formato "q-ia-1", "q-ia-2", etc.
   - Os IDs das alternativas devem seguir o formato "alt-ia-1-a", "alt-ia-1-b", "alt-ia-1-c", "alt-ia-1-d".
   - A soma de pontos de todas as questões DEVE totalizar 10.0 (distribua igualmente: ${(10 / params.quantidadeQuestoes).toFixed(2)} pontos por questão).

RESPONDA EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO COM A SEGUINTE ESTRUTURA:
{
  "titulo": "Título expressivo e conciso em inglês",
  "descricao": "Breve sinopse em português para o aluno (1 a 2 frases)",
  "instrucoes": "Instruções pedagógicas de estudo em português",
  "categoria": "Nome da categoria (ex: Reading & Listening, Daily Life, Business English, Culture)",
  "textoConteudo": "Texto completo em inglês formatado em parágrafos separados por \\n\\n",
  "questoes": [
    {
      "id": "q-ia-1",
      "enunciado": "Pergunta em inglês sobre o texto",
      "pontos": ${(10 / params.quantidadeQuestoes).toFixed(2)},
      "alternativas": [
        { "id": "alt-ia-1-a", "texto": "Opção A", "ordem": 1 },
        { "id": "alt-ia-1-b", "texto": "Opção B", "ordem": 2 },
        { "id": "alt-ia-1-c", "texto": "Opção C", "ordem": 3 },
        { "id": "alt-ia-1-d", "texto": "Opção D", "ordem": 4 }
      ],
      "alternativaCorretaId": "alt-ia-1-b",
      "explicacao": "Explicação em português detalhando a evidência no texto."
    }
  ]
}`;
}

function validarEstruturaGerada(json: unknown, params: GerarExercicioIaParams): ExercicioIaGerado {
  if (!json || typeof json !== "object") {
    throw new Error("Resposta da IA não é um objeto JSON válido.");
  }

  const obj = json as Record<string, unknown>;

  if (!obj.titulo || typeof obj.titulo !== "string") {
    throw new Error("A IA não gerou um título válido.");
  }
  if (!obj.textoConteudo || typeof obj.textoConteudo !== "string" || obj.textoConteudo.length < 50) {
    throw new Error("O texto pedagógico gerado é muito curto ou inválido.");
  }
  if (!Array.isArray(obj.questoes) || obj.questoes.length === 0) {
    throw new Error("Nenhuma questão foi gerada pela IA.");
  }

  const questoesNormalizadas: QuestaoObjetiva[] = [];
  const totalQuestoes = obj.questoes.length;
  const pontosPorQuestao = Number((10 / totalQuestoes).toFixed(2));

  for (let i = 0; i < totalQuestoes; i++) {
    const rawQ = obj.questoes[i] as Record<string, unknown>;
    const qId = String(rawQ.id || `q-ia-${i + 1}`);
    const enunciado = String(rawQ.enunciado || `Question ${i + 1}`);
    const explicacao = String(rawQ.explicacao || "Resposta fundamentada no texto de leitura.");

    if (!Array.isArray(rawQ.alternativas) || rawQ.alternativas.length < 2) {
      throw new Error(`A questão ${i + 1} não possui alternativas suficientes.`);
    }

    // Garante exatamente 4 alternativas
    const rawAlts = rawQ.alternativas.slice(0, 4);
    while (rawAlts.length < 4) {
      const idx = rawAlts.length;
      const letters = ["a", "b", "c", "d"];
      rawAlts.push({
        id: `alt-ia-${i + 1}-${letters[idx]}`,
        texto: `Additional option ${letters[idx].toUpperCase()}`,
        ordem: idx + 1,
      });
    }

    const alternativasFormatadas = rawAlts.map((alt: unknown, altIdx: number) => {
      const a = (alt || {}) as Record<string, unknown>;
      const letters = ["a", "b", "c", "d"];
      return {
        id: String(a.id || `alt-ia-${i + 1}-${letters[altIdx]}`),
        texto: String(a.texto || `Alternative ${letters[altIdx].toUpperCase()}`),
        ordem: altIdx + 1,
      };
    });

    let alternativaCorretaId = String(rawQ.alternativaCorretaId || alternativasFormatadas[0].id);
    const corretaExiste = alternativasFormatadas.some((a) => a.id === alternativaCorretaId);
    if (!corretaExiste) {
      alternativaCorretaId = alternativasFormatadas[0].id;
    }

    questoesNormalizadas.push({
      id: qId,
      enunciado,
      pontos: pontosPorQuestao,
      alternativas: alternativasFormatadas,
      alternativaCorretaId,
      explicacao,
      ordem: i + 1,
    });
  }

  return {
    titulo: String(obj.titulo).trim(),
    descricao: String(obj.descricao || "Exercício de interpretação e fixação pedagógica.").trim(),
    instrucoes: String(
      obj.instrucoes || "Leia o texto com atenção, ouça a narração se desejar e selecione a alternativa correta para cada pergunta."
    ).trim(),
    categoria: String(obj.categoria || "Reading & Listening").trim(),
    textoConteudo: String(obj.textoConteudo).trim(),
    questoes: questoesNormalizadas,
    iaPromptMeta: {
      tema: params.tema,
      nivel: params.nivel,
      tipoConteudo: params.tipoConteudo,
      extensao: params.extensao,
      varianteIngles: params.varianteIngles,
      geradoEm: new Date().toISOString(),
    },
    modeloUtilizado: "gpt-4o-mini",
    provedor: "openai",
  };
}

async function gerarComOpenAI(params: GerarExercicioIaParams, apiKey: string): Promise<ExercicioIaGerado> {
  const systemPrompt = construirSystemPrompt(params);
  const userPrompt = `Gere agora um exercício completo sobre o tema "${params.tema}". Responda estritamente em JSON válido conforme as especificações.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na API OpenAI (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("A OpenAI retornou uma resposta vazia.");
  }

  const parsed = JSON.parse(rawContent);
  const exercicio = validarEstruturaGerada(parsed, params);
  exercicio.modeloUtilizado = "gpt-4o-mini";
  exercicio.provedor = "openai";
  return exercicio;
}

async function gerarComGemini(params: GerarExercicioIaParams, apiKey: string): Promise<ExercicioIaGerado> {
  const systemPrompt = construirSystemPrompt(params);
  const userPrompt = `Gere agora um exercício completo sobre o tema "${params.tema}". Responda estritamente em JSON válido sem blocos markdown adicionais.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na API Gemini (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) {
    throw new Error("A API Gemini retornou uma resposta vazia.");
  }

  const parsed = JSON.parse(rawContent);
  const exercicio = validarEstruturaGerada(parsed, params);
  exercicio.modeloUtilizado = "gemini-1.5-flash";
  exercicio.provedor = "gemini";
  return exercicio;
}

export async function gerarConteudoExercicioIa(
  params: GerarExercicioIaParams
): Promise<GerarConteudoResultado> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!openaiKey && !geminiKey) {
      return {
        success: false,
        error:
          "Nenhuma chave de IA configurada no servidor (OPENAI_API_KEY ou GEMINI_API_KEY ausente). Configure uma das chaves nas variáveis de ambiente para utilizar a geração inteligente de conteúdo.",
        code: "AI_KEYS_NOT_CONFIGURED",
      };
    }

    if (openaiKey) {
      try {
        const resultado = await gerarComOpenAI(params, openaiKey);
        return { success: true, data: resultado };
      } catch (err: unknown) {
        console.warn("[Gerador IA] Falha na OpenAI, tentando fallback se disponível:", err);
        if (!geminiKey) {
          throw err;
        }
      }
    }

    if (geminiKey) {
      const resultado = await gerarComGemini(params, geminiKey);
      return { success: true, data: resultado };
    }

    return {
      success: false,
      error: "Não foi possível concluir a geração de conteúdo com nenhum dos provedores de IA.",
    };
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "Erro desconhecido ao gerar exercício com IA.";
    return {
      success: false,
      error: msg,
    };
  }
}
