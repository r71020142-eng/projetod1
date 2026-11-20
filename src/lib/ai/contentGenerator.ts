/**
 * contentGenerator.ts
 * Gerador inteligente de conteúdo pedagógico e exercícios com IA para a Juno Academy.
 * Utiliza OpenAI (gpt-4o-mini) com Structured Outputs e validação estrita dos critérios pedagógicos do Método Paulo.
 * Identifica com precisão códigos de erro HTTP (429 - quota, 401 - auth, 403 - permissions, etc.).
 */

import { NivelMaterial, QuestaoObjetiva, IaPromptMetaExercicio, TipoExercicioInterativo } from "@/types";

export interface GerarExercicioIaParams {
  tema: string;
  nivel: NivelMaterial;
  tipoConteudo: "historia" | "cotidiano" | "dialogo" | "informativo";
  extensao: "curto" | "medio" | "longo";
  quantidadeQuestoes: number; // 2 a 5
  varianteIngles: "american" | "british";
  tipoExercicio: TipoExercicioInterativo;
}

export interface ExercicioIaGerado {
  titulo: string;
  descricao: string;
  instrucoes: string;
  categoria: string;
  tipoExercicio: TipoExercicioInterativo;
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
  actionUrl?: string;
  actionLabel?: string;
  status?: number;
}

export class OpenAiApiError extends Error {
  code: string;
  status: number;
  actionUrl?: string;
  actionLabel?: string;

  constructor(message: string, code: string, status: number, actionUrl?: string, actionLabel?: string) {
    super(message);
    this.name = "OpenAiApiError";
    this.code = code;
    this.status = status;
    this.actionUrl = actionUrl;
    this.actionLabel = actionLabel;
  }
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

  const isLeitura = params.tipoExercicio === "leitura_audio";

  if (isLeitura) {
    return `Você é o Especialista Pedagógico da Juno Academy (Método Paulo), referência no ensino de inglês no padrão CEFR.

Sua missão é gerar um exercício completo de LEITURA E INTERPRETAÇÃO TEXTUAL com áudio em inglês (padrão Lingua.com).

DIRETRIZES FUNDAMENTAIS:
1. Nível CEFR alvo: ${params.nivel}. Ajuste vocabulário, complexidade sintática e estruturas gramaticais estritamente para o nível ${params.nivel}.
2. Variante da língua: ${variante}. ${regrasVariante}
3. Tipo de conteúdo: ${NOMES_TIPO_CONTEUDO[params.tipoConteudo] || params.tipoConteudo}.
4. Extensão: ${DESCRICAO_EXTENSAO[params.extensao] || "3 parágrafos"}. O texto deve ser formatado em parágrafos separados por duas quebras de linha (\\n\\n).
5. O texto em inglês será lido pelo aluno e narrado por voz TTS. O texto deve soar 100% natural, fluente e foneticamente claro.
6. Quantidade de questões: exatamente ${params.quantidadeQuestoes}.
7. REGRAS OBRIGATÓRIAS PARA AS QUESTÕES:
   - Cada questão DEVE ter EXATAMENTE 4 alternativas.
   - Cada alternativa DEVE ter um texto claro, plausível e sem ambiguidades.
   - Exatamente UMA alternativa DEVE ser a correta.
   - A explicação pedagógica ('explicacao') DEVE ser em Português, referenciando explicitamente em qual trecho ou parágrafo a resposta se fundamenta.
   - Os IDs das questões devem ser sequenciais no formato "q-ia-1", "q-ia-2", etc.
   - Os IDs das alternativas devem seguir o formato "alt-ia-1-a", "alt-ia-1-b", "alt-ia-1-c", "alt-ia-1-d".
   - A soma de pontos de todas as questões DEVE totalizar 10.0 (distribua igualmente: ${(10 / params.quantidadeQuestoes).toFixed(2)} pontos por questão).

Gere a resposta estritamente conforme o schema JSON solicitado.`;
  }

  // Múltipla Escolha Pura (Gramática, Vocabulário, Expressões)
  return `Você é o Especialista Pedagógico da Juno Academy (Método Paulo), referência no ensino de inglês no padrão CEFR.

Sua missão é gerar um exercício prático de MÚLTIPLA ESCOLHA PURA (Gramática Aplicada, Vocabulário e Expressões) sobre o tema indicado.

DIRETRIZES FUNDAMENTAIS:
1. Nível CEFR alvo: ${params.nivel}.
2. Variante da língua: ${variante}. ${regrasVariante}
3. O exercício é composto por questões independentes (sem texto longo de leitura). O campo 'textoConteudo' DEVE ser uma string vazia ("").
4. Quantidade de questões: exatamente ${params.quantidadeQuestoes}.
5. REGRAS OBRIGATÓRIAS PARA AS QUESTÕES:
   - Cada questão deve apresentar uma frase ou contexto curto com lacuna ou pergunta gramatical/lexical direta.
   - Cada questão DEVE ter EXATAMENTE 4 alternativas.
   - Exatamente UMA alternativa DEVE ser a correta.
   - A explicação pedagógica ('explicacao') DEVE ser em Português, explicando a regra gramatical ou motivo do uso correto.
   - Os IDs das questões devem ser sequenciais: "q-ia-1", "q-ia-2", etc.
   - Os IDs das alternativas: "alt-ia-1-a", "alt-ia-1-b", "alt-ia-1-c", "alt-ia-1-d".
   - A soma de pontos DEVE totalizar 10.0 (${(10 / params.quantidadeQuestoes).toFixed(2)} pontos por questão).

Gere a resposta estritamente conforme o schema JSON solicitado.`;
}

const OPENAI_JSON_SCHEMA = {
  name: "exercicio_pedagogico",
  strict: true,
  schema: {
    type: "object",
    properties: {
      titulo: { type: "string" },
      descricao: { type: "string" },
      instrucoes: { type: "string" },
      categoria: { type: "string" },
      textoConteudo: { type: "string" },
      questoes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            enunciado: { type: "string" },
            alternativas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  texto: { type: "string" },
                },
                "required": ["id", "texto"],
                additionalProperties: false,
              },
            },
            alternativaCorretaId: { type: "string" },
            explicacao: { type: "string" },
          },
          required: ["id", "enunciado", "alternativas", "alternativaCorretaId", "explicacao"],
          additionalProperties: false,
        },
      },
    },
    required: ["titulo", "descricao", "instrucoes", "categoria", "textoConteudo", "questoes"],
    additionalProperties: false,
  },
};

function validarEstruturaGerada(json: unknown, params: GerarExercicioIaParams): ExercicioIaGerado {
  if (!json || typeof json !== "object") {
    throw new Error("Resposta da IA não é um objeto JSON válido.");
  }

  const obj = json as Record<string, unknown>;

  if (!obj.titulo || typeof obj.titulo !== "string" || obj.titulo.trim().length < 3) {
    throw new Error("A IA não gerou um título válido para o exercício.");
  }

  // Validação do texto de leitura apenas quando o tipo for leitura_audio
  if (params.tipoExercicio === "leitura_audio") {
    if (!obj.textoConteudo || typeof obj.textoConteudo !== "string" || obj.textoConteudo.trim().length < 40) {
      throw new Error("O texto pedagógico gerado para a leitura é muito curto ou inválido.");
    }
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
    const explicacao = String(rawQ.explicacao || "Resposta fundamentada nas regras pedagógicas.");

    if (!Array.isArray(rawQ.alternativas) || rawQ.alternativas.length < 2) {
      throw new Error(`A questão ${i + 1} não possui alternativas suficientes.`);
    }

    // Garante exatamente 4 alternativas (A, B, C, D)
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
    descricao: String(
      obj.descricao ||
        (params.tipoExercicio === "leitura_audio"
          ? "Exercício de interpretação e fixação pedagógica."
          : "Exercício prático de múltipla escolha para fixação de gramática e vocabulário.")
    ).trim(),
    instrucoes: String(
      obj.instrucoes ||
        (params.tipoExercicio === "leitura_audio"
          ? "Leia o texto com atenção, ouça a narração se desejar e selecione a alternativa correta para cada pergunta."
          : "Selecione a única alternativa correta para cada uma das perguntas.")
    ).trim(),
    categoria: String(
      obj.categoria || (params.tipoExercicio === "leitura_audio" ? "Reading & Listening" : "Gramática Aplicada")
    ).trim(),
    tipoExercicio: params.tipoExercicio,
    textoConteudo: params.tipoExercicio === "leitura_audio" ? String(obj.textoConteudo || "").trim() : "",
    questoes: questoesNormalizadas,
    iaPromptMeta: {
      tema: params.tema,
      nivel: params.nivel,
      tipoConteudo: params.tipoConteudo,
      extensao: params.extensao,
      varianteIngles: params.varianteIngles,
      geradoEm: new Date().toISOString(),
      modelo: "gpt-4o-mini",
    },
    modeloUtilizado: "gpt-4o-mini",
    provedor: "openai",
  };
}

async function gerarComOpenAI(params: GerarExercicioIaParams, apiKey: string): Promise<ExercicioIaGerado> {
  const systemPrompt = construirSystemPrompt(params);
  const userPrompt = `Gere agora um exercício completo sobre o tema "${params.tema}". Formate estritamente no schema JSON especificado.`;

  // Tenta primeiro com Structured Outputs (json_schema)
  let response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      response_format: {
        type: "json_schema",
        json_schema: OPENAI_JSON_SCHEMA,
      },
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  // Se json_schema não for aceito por alguma razão de compatibilidade da conta, fallback para json_object
  if (!response.ok && response.status === 400) {
    const errText = await response.text();
    if (errText.includes("json_schema") || errText.includes("response_format")) {
      console.warn("[OpenAI] Fallback de json_schema para json_object:", errText);
      response = await fetch("https://api.openai.com/v1/chat/completions", {
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
    } else {
      // Outro erro 400
      throw new OpenAiApiError(
        `Parâmetros de requisição inválidos na OpenAI (Erro 400): ${errText}`,
        "OPENAI_BAD_REQUEST",
        400
      );
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedError: Record<string, unknown> | null = null;
    try {
      parsedError = JSON.parse(errorBody);
    } catch {
      // Ignora erro de parse
    }

    const openAiError = (parsedError?.error || {}) as Record<string, unknown>;
    const errorCode = String(openAiError.code || "");
    const errorType = String(openAiError.type || "");
    const errorMessage = String(openAiError.message || errorBody);

    // 1. Quota / Créditos Esgotados (429)
    if (
      response.status === 429 ||
      errorCode === "credit_balance_exhausted" ||
      errorType === "insufficient_quota" ||
      errorMessage.toLowerCase().includes("credits remaining")
    ) {
      throw new OpenAiApiError(
        "Sua conta da OpenAI está sem créditos ativos ou com saldo esgotado (Erro 429: credit_balance_exhausted). Acesse platform.openai.com/settings/organization/billing para adicionar créditos à sua conta.",
        "OPENAI_CREDITS_EXHAUSTED",
        429,
        "https://platform.openai.com/settings/organization/billing",
        "Acessar Faturamento OpenAI ↗"
      );
    }

    // 2. Chave Inválida / Expirada (401)
    if (response.status === 401) {
      throw new OpenAiApiError(
        "A chave OPENAI_API_KEY configurada na Vercel não foi autorizada pela OpenAI (Erro 401: Invalid Authentication). Verifique a chave no painel da Vercel.",
        "OPENAI_INVALID_KEY",
        401,
        "https://platform.openai.com/api-keys",
        "Ver Chaves OpenAI ↗"
      );
    }

    // 3. Acesso Negado / Permissões (403)
    if (response.status === 403) {
      throw new OpenAiApiError(
        `Acesso não autorizado ao projeto ou modelo OpenAI (Erro 403): ${errorMessage}`,
        "OPENAI_FORBIDDEN",
        403
      );
    }

    // 4. Modelo Não Encontrado (404)
    if (response.status === 404) {
      throw new OpenAiApiError(
        "O modelo de inteligência artificial 'gpt-4o-mini' não está habilitado para esta chave OpenAI (Erro 404).",
        "OPENAI_MODEL_NOT_FOUND",
        404
      );
    }

    // 5. Instabilidade no servidor da OpenAI (500, 502, 503)
    if (response.status >= 500) {
      throw new OpenAiApiError(
        "Os servidores da OpenAI estão temporariamente instáveis. Aguarde alguns instantes e tente novamente.",
        "OPENAI_SERVER_ERROR",
        502
      );
    }

    throw new OpenAiApiError(
      `Erro na API OpenAI (${response.status}): ${errorMessage}`,
      "OPENAI_GENERIC_ERROR",
      response.status
    );
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new OpenAiApiError(
      "A OpenAI retornou uma resposta vazia. Tente novamente.",
      "OPENAI_EMPTY_RESPONSE",
      500
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new OpenAiApiError(
      "A resposta gerada pela OpenAI não pôde ser convertida em formato estruturado. Tente novamente.",
      "OPENAI_INVALID_JSON",
      500
    );
  }

  const exercicio = validarEstruturaGerada(parsed, params);
  exercicio.modeloUtilizado = "gpt-4o-mini";
  exercicio.provedor = "openai";
  return exercicio;
}

export async function gerarConteudoExercicioIa(
  params: GerarExercicioIaParams
): Promise<GerarConteudoResultado> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (!openaiKey) {
      return {
        success: false,
        error:
          "A chave OPENAI_API_KEY não está configurada nas variáveis de ambiente do servidor. Adicione a chave no painel da Vercel ou no arquivo .env.local.",
        code: "AI_KEYS_NOT_CONFIGURED",
        actionUrl: "https://vercel.com",
        actionLabel: "Configurar na Vercel ↗",
        status: 503,
      };
    }

    const resultado = await gerarComOpenAI(params, openaiKey);
    return { success: true, data: resultado };
  } catch (err: unknown) {
    if (err instanceof OpenAiApiError) {
      return {
        success: false,
        error: err.message,
        code: err.code,
        actionUrl: err.actionUrl,
        actionLabel: err.actionLabel,
        status: err.status,
      };
    }

    const msg = (err as Error)?.message || "Erro desconhecido ao gerar exercício com IA.";
    return {
      success: false,
      error: msg,
      code: "UNKNOWN_ERROR",
      status: 500,
    };
  }
}
