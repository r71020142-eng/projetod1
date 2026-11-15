// src/lib/i18n/backgroundTranslator.ts
import { Locale } from "./translations";

const DICT_NACIONALIDADE_PT_TO_EN: Record<string, string> = {
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
  frances: "French",
  alemã: "German",
  alemão: "German",
  inglesa: "English / British",
  inglês: "English / British",
  japonesa: "Japanese",
  japonês: "Japanese",
};

const DICT_PROFISSAO_PT_TO_EN: Record<string, string> = {
  modelo: "Model",
  "modelo fotográfica": "Photo Model",
  "modelo profissional": "Professional Model",
  "engenheiro de software": "Software Engineer",
  "engenheira de software": "Software Engineer",
  "engenheiro de dados": "Data Engineer",
  "engenheira de dados": "Data Engineer",
  "engenheiro de dados sênior": "Senior Data Engineer",
  "engenheiro de dados pleno": "Mid-level Data Engineer",
  "engenheiro de dados júnior": "Junior Data Engineer",
  "head de engenharia de dados": "Head of Data Engineering",
  "cientista de dados": "Data Scientist",
  "arquiteto de soluções": "Solutions Architect",
  "arquiteto de software": "Software Architect",
  "arquiteto de soluções cloud": "Cloud Solutions Architect",
  desenvolvedor: "Software Developer",
  desenvolvedora: "Software Developer",
  "desenvolvedor frontend": "Frontend Developer",
  "desenvolvedor backend": "Backend Developer",
  "desenvolvedor fullstack": "Full Stack Developer",
  "gerente de produto": "Product Manager",
  "product manager": "Product Manager",
  "tech lead": "Tech Lead",
  médico: "Physician / Doctor",
  médica: "Physician / Doctor",
  advogado: "Attorney / Lawyer",
  advogada: "Attorney / Lawyer",
  administrador: "Business Administrator",
  administradora: "Business Administrator",
  contador: "Accountant",
  contadora: "Accountant",
  psicólogo: "Psychologist",
  psicóloga: "Psychologist",
  arquiteto: "Architect",
  arquiteta: "Architect",
  professor: "Teacher / Professor",
  professora: "Teacher / Professor",
  estudante: "Student",
  empresário: "Entrepreneur / Business Owner",
  empresária: "Entrepreneur / Business Owner",
  consultor: "Consultant",
  consultora: "Consultant",
  diretor: "Director / Executive",
  diretora: "Director / Executive",
};

const DICT_NIVEL_ESCOLAR_PT_TO_EN: Record<string, string> = {
  "ensino fundamental": "Middle School / Elementary",
  "ensino médio": "High School",
  "ensino medio": "High School",
  "ensino médio completo": "Completed High School",
  "ensino superior": "Higher Education / University",
  graduação: "Bachelor's Degree",
  graduacao: "Bachelor's Degree",
  "superior completo": "Completed Bachelor's Degree",
  "ensino superior completo": "Completed Bachelor's Degree",
  "ensino superior incompleto": "Undergraduate (In Progress)",
  pós_graduação: "Postgraduate / Master's",
  "pós-graduação": "Postgraduate Studies",
  "pos graduacao": "Postgraduate Studies",
  "pós-graduação em inteligência artificial": "Postgraduate in Artificial Intelligence",
  "pós-graduação em engenharia de software": "Postgraduate in Software Engineering",
  mestrado: "Master's Degree (M.Sc.)",
  doutorado: "Doctorate / Ph.D.",
  phd: "Ph.D.",
};

const COMMON_PHRASES_PT_TO_EN: Array<[RegExp, string]> = [
  [/profissional com mais de (\d+) anos de experiência/gi, "Professional with over $1 years of experience"],
  [/anos de experiência em engenharia de software/gi, "years of experience in software engineering"],
  [/e pipelines analíticos/gi, "and analytical pipelines"],
  [/estudante dedicado/gi, "Dedicated student"],
  [/buscando fluência para/gi, "seeking fluency for"],
  [/buscando fluência em inglês para liderar times globais/gi, "seeking English fluency to lead global teams"],
  [/reuniões globais e conferências internacionais/gi, "global meetings and international conferences"],
  [/conferências internacionais e reuniões globais/gi, "international conferences and global meetings"],
  [/inteligência artificial generativa/gi, "generative artificial intelligence"],
  [/inteligência artificial/gi, "artificial intelligence"],
  [/computação em nuvem/gi, "cloud computing"],
  [/viagens internacionais/gi, "international travel"],
  [/viagens, e negocios/gi, "Travel and business"],
  [/viagens e negócios/gi, "Travel and business"],
  [/viagens/gi, "Travel"],
  [/negocios/gi, "business"],
  [/negócios/gi, "business"],
  [/modelo, gosta de praia/gi, "Model, likes the beach"],
  [/gosta de praia/gi, "likes the beach"],
  [/futebol/gi, "soccer"],
  [/noiva/gi, "engaged"],
  [/nasceu no rio de janeiro/gi, "born in Rio de Janeiro"],
  [/mora hoje em são paulo/gi, "currently lives in São Paulo"],
  [/mora hoje em sao paulo/gi, "currently lives in São Paulo"],
  [/seu nivel ingles era basico/gi, "Her English level was basic"],
  [/seu nível de inglês era básico/gi, "Her English level was basic"],
  [/é hoje é intermediario/gi, "and today is intermediate"],
  [/e hoje é intermediário/gi, "and today is intermediate"],
  [/liderança técnica/gi, "technical leadership"],
  [/culinária italiana/gi, "Italian cuisine"],
  [/tecnologia/gi, "technology"],
  [/música/gi, "music"],
  [/negócios/gi, "business"],
  [/nascido em/gi, "Born in"],
  [/reside em/gi, "living in"],
  [/atua há (\d+) anos no setor de/gi, "Has been working for $1 years in the"],
  [/setor de tecnologia da informação/gi, "information technology sector"],
  [/e busca aprimorar pronúncia/gi, "and aims to enhance pronunciation"],
  [/vocabulário técnico para negociações em inglês/gi, "technical vocabulary for business negotiations in English"],
];

export function translateNacionalidade(value?: string, targetLocale: Locale = "en"): string {
  if (!value || !value.trim()) return "";
  if (targetLocale === "pt") return value;

  const key = value.trim().toLowerCase();
  return DICT_NACIONALIDADE_PT_TO_EN[key] || value;
}

export function translateProfissao(value?: string, targetLocale: Locale = "en"): string {
  if (!value || !value.trim()) return "";
  if (targetLocale === "pt") return value;

  const key = value.trim().toLowerCase();
  return DICT_PROFISSAO_PT_TO_EN[key] || value;
}

export function translateNivelEscolar(value?: string, targetLocale: Locale = "en"): string {
  if (!value || !value.trim()) return "";
  if (targetLocale === "pt") return value;

  const key = value.trim().toLowerCase();
  return DICT_NIVEL_ESCOLAR_PT_TO_EN[key] || value;
}

export function translateTextoBackground(texto?: string, targetLocale: Locale = "en"): string {
  if (!texto || !texto.trim()) return "";
  if (targetLocale === "pt") return texto;

  let translated = texto;
  for (const [pattern, replacement] of COMMON_PHRASES_PT_TO_EN) {
    translated = translated.replace(pattern, replacement);
  }
  return translated;
}
