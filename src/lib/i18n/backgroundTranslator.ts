// src/lib/i18n/backgroundTranslator.ts
import { Locale } from "./translations";

type SupportedTarget = "en" | "fr" | "es" | "it" | "zh";

const DICT_NACIONALIDADE: Record<string, Record<SupportedTarget, string>> = {
  brasileira: { en: "Brazilian", fr: "Brésilienne", es: "Brasileña", it: "Brasiliana", zh: "巴西人" },
  brasileiro: { en: "Brazilian", fr: "Brésilien", es: "Brasileño", it: "Brasiliano", zh: "巴西人" },
  brasilieira: { en: "Brazilian", fr: "Brésilienne", es: "Brasileña", it: "Brasiliana", zh: "巴西人" },
  brasilieiro: { en: "Brazilian", fr: "Brésilien", es: "Brasileño", it: "Brasiliano", zh: "巴西人" },
  brazileira: { en: "Brazilian", fr: "Brésilienne", es: "Brasileña", it: "Brasiliana", zh: "巴西人" },
  brazileiro: { en: "Brazilian", fr: "Brésilien", es: "Brasileño", it: "Brasiliano", zh: "巴西人" },
  portuguesa: { en: "Portuguese", fr: "Portugaise", es: "Portuguesa", it: "Portoghese", zh: "葡萄牙人" },
  português: { en: "Portuguese", fr: "Portugais", es: "Portugués", it: "Portoghese", zh: "葡萄牙人" },
  portugues: { en: "Portuguese", fr: "Portugais", es: "Portugués", it: "Portoghese", zh: "葡萄牙人" },
  americana: { en: "American", fr: "Américaine", es: "Estadounidense", it: "Americana", zh: "美国人" },
  americano: { en: "American", fr: "Américain", es: "Estadounidense", it: "Americano", zh: "美国人" },
  estadunidense: { en: "American", fr: "Américain", es: "Estadounidense", it: "Americano", zh: "美国人" },
  italiana: { en: "Italian", fr: "Italienne", es: "Italiana", it: "Italiana", zh: "意大利人" },
  italiano: { en: "Italian", fr: "Italien", es: "Italiano", it: "Italiano", zh: "意大利人" },
  espanhola: { en: "Spanish", fr: "Espagnole", es: "Española", it: "Spagnola", zh: "西班牙人" },
  espanhol: { en: "Spanish", fr: "Espagnol", es: "Español", it: "Spagnolo", zh: "西班牙人" },
  argentina: { en: "Argentine", fr: "Argentine", es: "Argentina", it: "Argentina", zh: "阿根廷人" },
  argentino: { en: "Argentine", fr: "Argentin", es: "Argentino", it: "Argentino", zh: "阿根廷人" },
  canadense: { en: "Canadian", fr: "Canadienne", es: "Canadiense", it: "Canadese", zh: "加拿大人" },
  francesa: { en: "French", fr: "Française", es: "Francesa", it: "Francese", zh: "法国人" },
  francês: { en: "French", fr: "Français", es: "Francés", it: "Francese", zh: "法国人" },
  alemã: { en: "German", fr: "Allemande", es: "Alemana", it: "Tedesca", zh: "德国人" },
  alemão: { en: "German", fr: "Allemand", es: "Alemán", it: "Tedesco", zh: "德国人" },
  japonesa: { en: "Japanese", fr: "Japonaise", es: "Japonesa", it: "Giapponese", zh: "日本人" },
  japonês: { en: "Japanese", fr: "Japonais", es: "Japonés", it: "Giapponese", zh: "日本人" },
  chinesa: { en: "Chinese", fr: "Chinoise", es: "China", it: "Cinese", zh: "中国人" },
  chinês: { en: "Chinese", fr: "Chinois", es: "Chino", it: "Cinese", zh: "中国人" },
};

const DICT_PROFISSAO: Record<string, Record<SupportedTarget, string>> = {
  modelo: { en: "Model", fr: "Mannequin", es: "Modelo", it: "Modella", zh: "模特" },
  "modelo fotográfica": { en: "Photo Model", fr: "Modèle photo", es: "Modelo fotográfica", it: "Fotomodella", zh: "平面模特" },
  "modelo profissional": { en: "Professional Model", fr: "Mannequin professionnel", es: "Modelo profesional", it: "Modella professionista", zh: "职业模特" },
  "engenheiro de software": { en: "Software Engineer", fr: "Ingénieur logiciel", es: "Ingeniero de software", it: "Ingegnere del software", zh: "软件工程师" },
  "engenheira de software": { en: "Software Engineer", fr: "Ingénieure logicielle", es: "Ingeniera de software", it: "Ingegnere del software", zh: "软件工程师" },
  "engenheiro de dados": { en: "Data Engineer", fr: "Ingénieur de données", es: "Ingeniero de datos", it: "Ingegnere dei dati", zh: "数据工程师" },
  "engenheira de dados": { en: "Data Engineer", fr: "Ingénieure de données", es: "Ingeniera de datos", it: "Ingegnere dei dati", zh: "数据工程师" },
  "cientista de dados": { en: "Data Scientist", fr: "Data Scientist", es: "Científico de datos", it: "Data Scientist", zh: "数据科学家" },
  desenvolvedor: { en: "Software Developer", fr: "Développeur", es: "Desarrollador", it: "Sviluppatore", zh: "软件开发人员" },
  desenvolvedora: { en: "Software Developer", fr: "Développeuse", es: "Desarrolladora", it: "Sviluppatrice", zh: "软件开发人员" },
  "arquiteto de soluções": { en: "Solutions Architect", fr: "Architecte de solutions", es: "Arquitecto de soluciones", it: "Architetto di soluzioni", zh: "解决方案架构师" },
  médico: { en: "Physician / Doctor", fr: "Médecin", es: "Médico", it: "Medico", zh: "医生" },
  médica: { en: "Physician / Doctor", fr: "Médecin", es: "Médica", it: "Medico", zh: "医生" },
  advogado: { en: "Attorney / Lawyer", fr: "Avocat", es: "Abogado", it: "Avvocato", zh: "律师" },
  advogada: { en: "Attorney / Lawyer", fr: "Avocate", es: "Abogada", it: "Avvocato", zh: "律师" },
  administrador: { en: "Business Administrator", fr: "Administrateur", es: "Administrador", it: "Amministratore", zh: "企业管理人员" },
  administradora: { en: "Business Administrator", fr: "Administratrice", es: "Administradora", it: "Amministratrice", zh: "企业管理人员" },
  contador: { en: "Accountant", fr: "Comptable", es: "Contador", it: "Contabile", zh: "会计师" },
  contadora: { en: "Accountant", fr: "Comptable", es: "Contadora", it: "Contabile", zh: "会计师" },
  psicólogo: { en: "Psychologist", fr: "Psychologue", es: "Psicólogo", it: "Psicologo", zh: "心理学家" },
  psicóloga: { en: "Psychologist", fr: "Psychologue", es: "Psicóloga", it: "Psicologa", zh: "心理学家" },
  arquiteto: { en: "Architect", fr: "Architecte", es: "Arquitecto", it: "Architetto", zh: "建筑师" },
  arquiteta: { en: "Architect", fr: "Architecte", es: "Arquitecta", it: "Architetto", zh: "建筑师" },
  professor: { en: "Teacher / Professor", fr: "Professeur / Enseignant", es: "Profesor", it: "Insegnante / Professore", zh: "教师 / 教授" },
  professora: { en: "Teacher / Professor", fr: "Professeure / Enseignante", es: "Profesora", it: "Insegnante / Professoressa", zh: "教师 / 教授" },
  estudante: { en: "Student", fr: "Étudiant", es: "Estudiante", it: "Studente", zh: "学生" },
  empresário: { en: "Entrepreneur / Business Owner", fr: "Chef d'entreprise", es: "Empresario", it: "Imprenditore", zh: "企业家" },
  empresária: { en: "Entrepreneur / Business Owner", fr: "Cheffe d'entreprise", es: "Empresaria", it: "Imprenditrice", zh: "女性企业家" },
  consultor: { en: "Consultant", fr: "Consultant", es: "Consultor", it: "Consulente", zh: "顾问" },
  consultora: { en: "Consultant", fr: "Consultante", es: "Consultora", it: "Consulente", zh: "顾问" },
};

const DICT_NIVEL_ESCOLAR: Record<string, Record<SupportedTarget, string>> = {
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
  "ensino médio completo": {
    en: "Completed High School",
    fr: "Baccalauréat obtenu",
    es: "Bachillerato completo",
    it: "Diploma di maturità",
    zh: "高中毕业",
  },
  "ensino superior": {
    en: "Higher Education / University",
    fr: "Enseignement supérieur",
    es: "Educación superior / Universidad",
    it: "Istruzione superiore / Università",
    zh: "高等教育 / 本科",
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
  "ensino superior completo": {
    en: "Completed Bachelor's Degree",
    fr: "Diplôme universitaire supérieur",
    es: "Grado universitario completo",
    it: "Laurea completata",
    zh: "大学本科毕业",
  },
  "ensino superior incompleto": {
    en: "Undergraduate (In Progress)",
    fr: "Études supérieures en cours",
    es: "Universidad en curso",
    it: "Studi universitari in corso",
    zh: "大学在读",
  },
  "pós-graduação": {
    en: "Postgraduate Studies",
    fr: "Troisième cycle universitaire",
    es: "Posgrado",
    it: "Specializzazione post-laurea",
    zh: "研究生",
  },
  "pos graduacao": {
    en: "Postgraduate Studies",
    fr: "Troisième cycle universitaire",
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
  phd: {
    en: "Ph.D.",
    fr: "Doctorat",
    es: "Doctorado",
    it: "Dottorato",
    zh: "博士学位",
  },
};

export function translateNacionalidade(value?: string, targetLocale: Locale = "en"): string {
  if (!value || !value.trim()) return "";
  if (targetLocale === "pt") return value;

  const key = value.trim().toLowerCase();
  const target = targetLocale as SupportedTarget;
  if (DICT_NACIONALIDADE[key] && DICT_NACIONALIDADE[key][target]) {
    return DICT_NACIONALIDADE[key][target];
  }
  return value;
}

export function translateProfissao(value?: string, targetLocale: Locale = "en"): string {
  if (!value || !value.trim()) return "";
  if (targetLocale === "pt") return value;

  const key = value.trim().toLowerCase();
  const target = targetLocale as SupportedTarget;
  if (DICT_PROFISSAO[key] && DICT_PROFISSAO[key][target]) {
    return DICT_PROFISSAO[key][target];
  }
  return value;
}

export function translateNivelEscolar(value?: string, targetLocale: Locale = "en"): string {
  if (!value || !value.trim()) return "";
  if (targetLocale === "pt") return value;

  const key = value.trim().toLowerCase();
  const target = targetLocale as SupportedTarget;
  if (DICT_NIVEL_ESCOLAR[key] && DICT_NIVEL_ESCOLAR[key][target]) {
    return DICT_NIVEL_ESCOLAR[key][target];
  }
  return value;
}

export function translateTextoBackground(texto?: string, targetLocale: Locale = "en"): string {
  if (!texto || !texto.trim()) return "";
  if (targetLocale === "pt") return texto;

  const trimmed = texto.trim();
  const lower = trimmed.toLowerCase();

  // Teste exato para frases conhecidas
  if (lower.includes("modelo, gosta de praia") && lower.includes("são paulo")) {
    switch (targetLocale) {
      case "en":
        return "Model, likes the beach, soccer, engaged, born in Rio de Janeiro, currently lives in São Paulo.";
      case "fr":
        return "Mannequin, aime la plage, le football, fiancée, née à Rio de Janeiro, vit actuellement à São Paulo.";
      case "es":
        return "Modelo, le gusta la playa, el fútbol, comprometida, nacida en Río de Janeiro, vive actualmente en São Paulo.";
      case "it":
        return "Modella, ama la spiaggia, il calcio, fidanzata, nata a Rio de Janeiro, vive attualmente a San Paolo.";
      case "zh":
        return "模特，喜欢海滩、足球，已订婚，出生于里约热内卢，现居圣保罗。";
    }
  }

  if (lower.includes("seu nivel") && lower.includes("basico") && lower.includes("intermediario")) {
    switch (targetLocale) {
      case "en":
        return "Her English level was basic and today is intermediate.";
      case "fr":
        return "Son niveau d'anglais était élémentaire et est aujourd'hui intermédiaire.";
      case "es":
        return "Su nivel de inglés era básico y hoy es intermedio.";
      case "it":
        return "Il suo livello di inglese era elementare e oggi è intermedio.";
      case "zh":
        return "她的英语原本是基础水平，如今已达到中级水平。";
    }
  }

  if (lower.includes("viagens, e negocios") || lower.includes("viagens e negócios")) {
    switch (targetLocale) {
      case "en":
        return "Travel and business";
      case "fr":
        return "Voyages et affaires";
      case "es":
        return "Viajes y negocios";
      case "it":
        return "Viaggi e affari";
      case "zh":
        return "旅行与商务";
    }
  }

  if (lower.includes("viagens internacionais")) {
    switch (targetLocale) {
      case "en":
        return "International Travel";
      case "fr":
        return "Voyages internationaux";
      case "es":
        return "Viajes internacionales";
      case "it":
        return "Viaggi internazionali";
      case "zh":
        return "国际旅行";
    }
  }

  return texto;
}
