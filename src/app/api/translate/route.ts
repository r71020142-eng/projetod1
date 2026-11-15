// src/app/api/translate/route.ts
import { NextRequest, NextResponse } from "next/server";

// Cache em memória para evitar requisições redundantes
const translationCache = new Map<string, string>();

// Dicionário léxico expandido para respostas ultrarrápidas e fallback offline
const LEXICAL_DICTIONARY_PT_TO_EN: Record<string, string> = {
  // Nacionalidades e variações com possíveis erros de digitação comuns
  brasileira: "Brazilian",
  brasileiro: "Brazilian",
  brasilieira: "Brazilian",
  brasilieiro: "Brazilian",
  brazileira: "Brazilian",
  brazileiro: "Brazilian",
  portuguesa: "Portuguese",
  português: "Portuguese",
  portugues: "Portuguese",
  americana: "American",
  americano: "American",
  estadunidense: "American",
  italiana: "Italian",
  italiano: "Italian",
  espanhola: "Spanish",
  espanhol: "Spanish",
  argentina: "Argentine",
  argentino: "Argentine",
  canadense: "Canadian",
  francesa: "French",
  francês: "French",
  alemã: "German",
  alemão: "German",
  inglesa: "English / British",
  inglês: "English / British",
  japonesa: "Japanese",
  japonês: "Japanese",

  // Profissões
  modelo: "Model",
  "modelo fotográfica": "Photo Model",
  "engenheiro de software": "Software Engineer",
  "engenheira de software": "Software Engineer",
  "engenheiro de dados": "Data Engineer",
  "engenheira de dados": "Data Engineer",
  "cientista de dados": "Data Scientist",
  desenvolvedor: "Software Developer",
  desenvolvedora: "Software Developer",
  médico: "Physician / Doctor",
  médica: "Physician / Doctor",
  advogado: "Attorney / Lawyer",
  advogada: "Attorney / Lawyer",
  administrador: "Business Administrator",
  administradora: "Business Administrator",
  empresário: "Entrepreneur / Business Owner",
  empresária: "Entrepreneur / Business Owner",
  estudante: "Student",
  arquiteto: "Architect",
  arquiteta: "Architect",
  professor: "Teacher / Professor",
  professora: "Teacher / Professor",
  consultor: "Consultant",
  consultora: "Consultant",

  // Níveis Escolares
  "ensino fundamental": "Middle School / Elementary",
  "ensino médio": "High School",
  "ensino medio": "High School",
  "ensino médio completo": "Completed High School",
  "ensino superior": "Higher Education / University",
  "ensino superior completo": "Bachelor's Degree",
  "ensino superior incompleto": "Undergraduate (In Progress)",
  graduação: "Bachelor's Degree",
  graduacao: "Bachelor's Degree",
  "pós-graduação": "Postgraduate Studies",
  "pos graduacao": "Postgraduate Studies",
  mestrado: "Master's Degree (M.Sc.)",
  doutorado: "Doctorate / Ph.D.",

  // Objetivos comuns
  "viagens internacionais": "International Travel",
  "viagens de negócios": "Business Travel",
  "viagem internacional": "International Travel",
  "trabalho no exterior": "Work Abroad",
  "carreira internacional": "International Career",
  "conferências e reuniões": "Conferences and Meetings",
  "fluência para negócios": "Fluency for Business",
  "estudos acadêmicos": "Academic Studies",
  "conversação geral": "General Conversation",

  // Frases do sistema padrão
  "nenhuma anotação pedagógica adicional cadastrada para este aluno.":
    "No additional pedagogical notes recorded for this student.",
  "nenhum detalhe adicional sobre a rotina ou perfil do aluno informado.":
    "No additional details about the student's routine or profile provided.",
  "nenhum interesse informado.": "No interests provided.",
  "nenhuma biografia informada.": "No biography provided.",
};

async function translateSingle(text: string, from = "pt", to = "en"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // 1. Verifica cache em memória
  const cacheKey = `${from}:${to}:${trimmed.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 2. Se for texto curto, verifica dicionário léxico
  const lower = trimmed.toLowerCase();
  if (from === "pt" && to === "en" && LEXICAL_DICTIONARY_PT_TO_EN[lower]) {
    const res = LEXICAL_DICTIONARY_PT_TO_EN[lower];
    translationCache.set(cacheKey, res);
    return res;
  }

  // 3. Consulta serviço MyMemory Translation API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data?.responseData?.translatedText) {
        let result = data.responseData.translatedText;
        // Limpa possíveis escapes HTML retornados pela API
        result = result
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");

        // Valida se não foi mensagem de erro da API MyMemory
        if (!result.toLowerCase().includes("mymemory warning")) {
          translationCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn("MyMemory API offline or timed out, using fallback:", err);
  }

  // 4. Fallback léxico / tokenizado caso a API externa não responda
  if (from === "pt" && to === "en") {
    let replaced = trimmed;
    for (const [pt, en] of Object.entries(LEXICAL_DICTIONARY_PT_TO_EN)) {
      const reg = new RegExp(`\\b${pt}\\b`, "gi");
      replaced = replaced.replace(reg, en);
    }
    translationCache.set(cacheKey, replaced);
    return replaced;
  }

  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const from = body.from || "pt";
    const to = body.to || "en";

    // Suporte para tradução de array de textos em lote (Batch)
    if (Array.isArray(body.texts)) {
      const results = await Promise.all(
        body.texts.map((t: string) => (typeof t === "string" ? translateSingle(t, from, to) : ""))
      );
      return NextResponse.json({ translatedTexts: results });
    }

    // Tradução de texto único
    if (typeof body.text === "string") {
      const result = await translateSingle(body.text, from, to);
      return NextResponse.json({ translatedText: result });
    }

    return NextResponse.json({ error: "Missing text or texts array" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Erro na rota de tradução:", error);
    const msg = error instanceof Error ? error.message : "Erro interno de tradução";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
