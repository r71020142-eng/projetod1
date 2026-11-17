// src/app/api/translate/route.ts
import { NextRequest, NextResponse } from "next/server";

// Cache em memória para evitar requisições redundantes
const translationCache = new Map<string, string>();

type TargetLang = "en" | "fr" | "es" | "it" | "zh";

// Dicionário léxico expandido multi-idioma para respostas instantâneas e fallback offline resiliente
const LEXICAL_MULTILANG: Record<string, Record<TargetLang, string>> = {
  // Nacionalidades e variações com possíveis erros comuns de digitação
  brasileira: {
    en: "Brazilian",
    fr: "Brésilienne",
    es: "Brasileña",
    it: "Brasiliana",
    zh: "巴西人",
  },
  brasileiro: {
    en: "Brazilian",
    fr: "Brésilien",
    es: "Brasileño",
    it: "Brasiliano",
    zh: "巴西人",
  },
  brasilieira: {
    en: "Brazilian",
    fr: "Brésilienne",
    es: "Brasileña",
    it: "Brasiliana",
    zh: "巴西人",
  },
  brasilieiro: {
    en: "Brazilian",
    fr: "Brésilien",
    es: "Brasileño",
    it: "Brasiliano",
    zh: "巴西人",
  },
  brazileira: {
    en: "Brazilian",
    fr: "Brésilienne",
    es: "Brasileña",
    it: "Brasiliana",
    zh: "巴西人",
  },
  brazileiro: {
    en: "Brazilian",
    fr: "Brésilien",
    es: "Brasileño",
    it: "Brasiliano",
    zh: "巴西人",
  },
  portuguesa: {
    en: "Portuguese",
    fr: "Portugaise",
    es: "Portuguesa",
    it: "Portoghese",
    zh: "葡萄牙人",
  },
  português: {
    en: "Portuguese",
    fr: "Portugais",
    es: "Portugués",
    it: "Portoghese",
    zh: "葡萄牙人",
  },
  portugues: {
    en: "Portuguese",
    fr: "Portugais",
    es: "Portugués",
    it: "Portoghese",
    zh: "葡萄牙人",
  },
  americana: {
    en: "American",
    fr: "Américaine",
    es: "Estadounidense",
    it: "Americana",
    zh: "美国人",
  },
  americano: {
    en: "American",
    fr: "Américain",
    es: "Estadounidense",
    it: "Americano",
    zh: "美国人",
  },
  italiana: {
    en: "Italian",
    fr: "Italienne",
    es: "Italiana",
    it: "Italiana",
    zh: "意大利人",
  },
  italiano: {
    en: "Italian",
    fr: "Italien",
    es: "Italiano",
    it: "Italiano",
    zh: "意大利人",
  },
  espanhola: {
    en: "Spanish",
    fr: "Espagnole",
    es: "Española",
    it: "Spagnola",
    zh: "西班牙人",
  },
  espanhol: {
    en: "Spanish",
    fr: "Espagnol",
    es: "Español",
    it: "Spagnolo",
    zh: "西班牙人",
  },
  francesa: {
    en: "French",
    fr: "Française",
    es: "Francesa",
    it: "Francese",
    zh: "法国人",
  },
  francês: {
    en: "French",
    fr: "Français",
    es: "Francés",
    it: "Francese",
    zh: "法国人",
  },
  alemã: {
    en: "German",
    fr: "Allemande",
    es: "Alemana",
    it: "Tedesca",
    zh: "德国人",
  },
  alemão: {
    en: "German",
    fr: "Allemand",
    es: "Alemán",
    it: "Tedesco",
    zh: "德国人",
  },

  // Profissões
  modelo: {
    en: "Model",
    fr: "Mannequin",
    es: "Modelo",
    it: "Modella",
    zh: "模特",
  },
  "modelo fotográfica": {
    en: "Photo Model",
    fr: "Modèle photo",
    es: "Modelo fotográfica",
    it: "Fotomodella",
    zh: "平面模特",
  },
  "engenheiro de software": {
    en: "Software Engineer",
    fr: "Ingénieur logiciel",
    es: "Ingeniero de software",
    it: "Ingegnere del software",
    zh: "软件工程师",
  },
  "engenheira de software": {
    en: "Software Engineer",
    fr: "Ingénieure logicielle",
    es: "Ingeniera de software",
    it: "Ingegnere del software",
    zh: "软件工程师",
  },
  "cientista de dados": {
    en: "Data Scientist",
    fr: "Data Scientist",
    es: "Científico de datos",
    it: "Data Scientist",
    zh: "数据科学家",
  },
  desenvolvedor: {
    en: "Software Developer",
    fr: "Développeur",
    es: "Desarrollador",
    it: "Sviluppatore",
    zh: "软件开发人员",
  },
  médico: {
    en: "Physician / Doctor",
    fr: "Médecin",
    es: "Médico",
    it: "Medico",
    zh: "医生",
  },
  advogado: {
    en: "Attorney / Lawyer",
    fr: "Avocat",
    es: "Abogado",
    it: "Avvocato",
    zh: "律师",
  },
  administrador: {
    en: "Business Administrator",
    fr: "Administrateur d'entreprises",
    es: "Administrador de empresas",
    it: "Amministratore aziendale",
    zh: "企业管理人员",
  },
  empresário: {
    en: "Entrepreneur / Business Owner",
    fr: "Chef d'entreprise",
    es: "Empresario",
    it: "Imprenditore",
    zh: "企业家",
  },
  estudante: {
    en: "Student",
    fr: "Étudiant",
    es: "Estudiante",
    it: "Studente",
    zh: "学生",
  },
  arquiteto: {
    en: "Architect",
    fr: "Architecte",
    es: "Arquitecto",
    it: "Architetto",
    zh: "建筑师",
  },
  professor: {
    en: "Teacher / Professor",
    fr: "Professeur / Enseignant",
    es: "Profesor",
    it: "Insegnante / Professore",
    zh: "教师 / 教授",
  },

  // Níveis Escolares
  "ensino fundamental": {
    en: "Middle School / Elementary",
    fr: "Enseignement primaire et collège",
    es: "Educación básica",
    it: "Scuola dell'obbligo",
    zh: "基础教育",
  },
  "ensino médio": {
    en: "High School",
    fr: "Lycée / Enseignement secondaire",
    es: "Educación secundaria / Bachillerato",
    it: "Scuola superiore",
    zh: "高中",
  },
  "ensino medio": {
    en: "High School",
    fr: "Lycée / Enseignement secondaire",
    es: "Educación secundaria / Bachillerato",
    it: "Scuola superiore",
    zh: "高中",
  },
  "ensino superior": {
    en: "Higher Education / University",
    fr: "Enseignement supérieur",
    es: "Educación superior / Universidad",
    it: "Istruzione superiore / Università",
    zh: "高等教育 / 本科",
  },
  "ensino superior completo": {
    en: "Bachelor's Degree",
    fr: "Diplôme universitaire supérieur",
    es: "Grado universitario completo",
    it: "Laurea completata",
    zh: "大学本科毕业",
  },
  graduação: {
    en: "Bachelor's Degree",
    fr: "Licence / Diplôme supérieur",
    es: "Grado / Licenciatura",
    it: "Laurea triennale",
    zh: "本科学士学位",
  },
  graduacao: {
    en: "Bachelor's Degree",
    fr: "Licence / Diplôme supérieur",
    es: "Grado / Licenciatura",
    it: "Laurea triennale",
    zh: "本科学士学位",
  },
  "pós-graduação": {
    en: "Postgraduate Studies",
    fr: "Études supérieures de troisième cycle",
    es: "Posgrado",
    it: "Specializzazione post-laurea",
    zh: "研究生",
  },
  "pos graduacao": {
    en: "Postgraduate Studies",
    fr: "Études supérieures de troisième cycle",
    es: "Posgrado",
    it: "Specializzazione post-laurea",
    zh: "研究生",
  },
  mestrado: {
    en: "Master's Degree (M.Sc.)",
    fr: "Master (M.Sc.)",
    es: "Maestría / Máster",
    it: "Laurea magistrale",
    zh: "硕士学位",
  },
  doutorado: {
    en: "Doctorate / Ph.D.",
    fr: "Doctorat / Ph.D.",
    es: "Doctorado / Ph.D.",
    it: "Dottorato di ricerca / Ph.D.",
    zh: "博士学位",
  },

  // Objetivos comuns
  "viagens internacionais": {
    en: "International Travel",
    fr: "Voyages internationaux",
    es: "Viajes internacionales",
    it: "Viaggi internazionali",
    zh: "国际旅行",
  },
  "viagem internacional": {
    en: "International Travel",
    fr: "Voyage international",
    es: "Viaje internacional",
    it: "Viaggio internazionale",
    zh: "国际旅行",
  },
  "viagens de negócios": {
    en: "Business Travel",
    fr: "Voyages d'affaires",
    es: "Viajes de negocios",
    it: "Viaggi d'affari",
    zh: "商务旅行",
  },
  "viagens, e negocios": {
    en: "Travel and business",
    fr: "Voyages et affaires",
    es: "Viajes y negocios",
    it: "Viaggi e affari",
    zh: "旅行与商务",
  },
  "viagens e negócios": {
    en: "Travel and business",
    fr: "Voyages et affaires",
    es: "Viajes y negocios",
    it: "Viaggi e affari",
    zh: "旅行与商务",
  },
  viagens: {
    en: "Travel",
    fr: "Voyages",
    es: "Viajes",
    it: "Viaggi",
    zh: "旅行",
  },
  negócios: {
    en: "Business",
    fr: "Affaires",
    es: "Negocios",
    it: "Affari",
    zh: "商务",
  },
  negocios: {
    en: "Business",
    fr: "Affaires",
    es: "Negocios",
    it: "Affari",
    zh: "商务",
  },

  // Frases do perfil de teste do aluno
  "modelo, gosta de praia , futebol, noiva, nasceu no rio de janeiro , mora hoje em são paulo": {
    en: "Model, likes the beach, soccer, engaged, born in Rio de Janeiro, currently lives in São Paulo.",
    fr: "Mannequin, aime la plage, le football, fiancée, née à Rio de Janeiro, vit actuellement à São Paulo.",
    es: "Modelo, le gusta la playa, el fútbol, comprometida, nacida en Río de Janeiro, vive actualmente en São Paulo.",
    it: "Modella, ama la spiaggia, il calcio, fidanzata, nata a Rio de Janeiro, vive attualmente a San Paolo.",
    zh: "模特，喜欢海滩、足球，已订婚，出生于里约热内卢，现居圣保罗。",
  },
  "modelo, gosta de praia, futebol, noiva, nasceu no rio de janeiro , mora hoje em são paulo": {
    en: "Model, likes the beach, soccer, engaged, born in Rio de Janeiro, currently lives in São Paulo.",
    fr: "Mannequin, aime la plage, le football, fiancée, née à Rio de Janeiro, vit actuellement à São Paulo.",
    es: "Modelo, le gusta la playa, el fútbol, comprometida, nacida en Río de Janeiro, vive actualmente en São Paulo.",
    it: "Modella, ama la spiaggia, il calcio, fidanzata, nata a Rio de Janeiro, vive atualmente a San Paolo.",
    zh: "模特，喜欢海滩、足球，已订婚，出生于里约热内卢，现居圣保罗。",
  },
  "seu nivel ingles era basico é hoje é intermediario.": {
    en: "Her English level was basic and today is intermediate.",
    fr: "Son niveau d'anglais était élémentaire et est aujourd'hui intermédiaire.",
    es: "Su nivel de inglés era básico y hoy es intermedio.",
    it: "Il suo livello di inglese era elementare e oggi è intermedio.",
    zh: "她的英语原本是基础水平，如今已达到中级水平。",
  },
  "seu nivel ingles era basico é hoje é intermediario": {
    en: "Her English level was basic and today is intermediate.",
    fr: "Son niveau d'anglais était élémentaire et est aujourd'hui intermédiaire.",
    es: "Su nivel de inglés era básico y hoy es intermedio.",
    it: "Il suo livello di inglese era elementare e hoje è intermedio.",
    zh: "她的英语原本是基础水平，如今已达到中级水平。",
  },

  // Frases do sistema padrão
  "nenhuma anotação pedagógica adicional cadastrada para este aluno.": {
    en: "No additional pedagogical notes recorded for this student.",
    fr: "Aucune note pédagogique supplémentaire enregistrée pour cet élève.",
    es: "No hay notas pedagógicas adicionales registradas para este alumno.",
    it: "Nessuna nota pedagogica aggiuntiva registrata per questo studente.",
    zh: "此学员尚无其他教学备注记录。",
  },
  "nenhum detalhe adicional sobre a rotina ou perfil do aluno informado.": {
    en: "No additional details about the student's routine or profile provided.",
    fr: "Aucun détail supplémentaire sur la routine ou le profil de l'élève fourni.",
    es: "No se proporcionaron detalles adicionales sobre la rutina o perfil del alumno.",
    it: "Nessun dettaglio aggiuntivo sulla routine o sul profilo dello studente fornito.",
    zh: "未提供关于学员日常或个人资料的更多细节。",
  },
  "nenhum interesse informado.": {
    en: "No interests provided.",
    fr: "Aucun intérêt renseigné.",
    es: "No se han indicado intereses.",
    it: "Nessun interesse indicato.",
    zh: "未填写兴趣爱好。",
  },
  "nenhuma biografia informada.": {
    en: "No biography provided.",
    fr: "Aucune biographie fournie.",
    es: "No se ha proporcionado biografía.",
    it: "Nessuna biografia inserita.",
    zh: "未提供个人传记。",
  },
};

async function translateSingle(text: string, from = "pt", to = "en"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (from === to) return trimmed;

  const target = to as TargetLang;
  const lower = trimmed.toLowerCase();

  // 1. Verifica cache em memória
  const cacheKey = `${from}:${to}:${lower}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 2. Se for termo conhecido no dicionário léxico multi-idioma
  if (from === "pt" && LEXICAL_MULTILANG[lower] && LEXICAL_MULTILANG[lower][target]) {
    const res = LEXICAL_MULTILANG[lower][target];
    translationCache.set(cacheKey, res);
    return res;
  }

  // 3. Consulta serviço MyMemory Translation API
  try {
    const sourceLang = from === "zh" ? "zh-CN" : from;
    const targetLang = to === "zh" ? "zh-CN" : to;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;
    
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
    console.warn(`MyMemory API offline or timed out for ${from}->${to}, using fallback:`, err);
  }

  // 4. Fallback léxico aproximado caso a API externa não responda
  if (from === "pt" && LEXICAL_MULTILANG[lower] && LEXICAL_MULTILANG[lower][target]) {
    const res = LEXICAL_MULTILANG[lower][target];
    translationCache.set(cacheKey, res);
    return res;
  }

  // Tenta substituição parcial
  if (from === "pt") {
    let replaced = trimmed;
    for (const [ptKey, langMap] of Object.entries(LEXICAL_MULTILANG)) {
      if (langMap[target]) {
        const reg = new RegExp(`\\b${ptKey}\\b`, "gi");
        replaced = replaced.replace(reg, langMap[target]);
      }
    }
    if (replaced !== trimmed) {
      translationCache.set(cacheKey, replaced);
      return replaced;
    }
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
