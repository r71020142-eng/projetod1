// src/lib/i18n/dynamicTranslator.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { Locale } from "./translations";
import {
  translateNacionalidade,
  translateProfissao,
  translateNivelEscolar,
  translateTextoBackground,
} from "./backgroundTranslator";

const STORAGE_CACHE_KEY = "mtd_dynamic_translations_cache_v1";

// Cache em memória compartilhado
const memoryCache = new Map<string, string>();

// Carrega cache salvo no localStorage do navegador
function getStoredCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStoredCache(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredCache();
    current[key] = value;
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(current));
  } catch {
    // Silently ignore quota exceeded
  }
}

/**
 * Tradução síncrona imediata usando o dicionário local.
 * Usada como fallback instantâneo antes da resposta da API de tradução.
 */
export function getImmediateTranslation(text?: string, targetLocale: Locale = "en"): string {
  if (!text || !text.trim()) return "";
  if (targetLocale === "pt") return text;

  const trimmed = text.trim();
  const cacheKey = `pt:en:${trimmed.toLowerCase()}`;

  // Verifica cache de memória
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Verifica localStorage
  const stored = getStoredCache();
  if (stored[cacheKey]) {
    memoryCache.set(cacheKey, stored[cacheKey]);
    return stored[cacheKey];
  }

  // Tenta dicionários específicos
  const asNac = translateNacionalidade(trimmed, "en");
  if (asNac !== trimmed) {
    memoryCache.set(cacheKey, asNac);
    return asNac;
  }

  const asProf = translateProfissao(trimmed, "en");
  if (asProf !== trimmed) {
    memoryCache.set(cacheKey, asProf);
    return asProf;
  }

  const asNivel = translateNivelEscolar(trimmed, "en");
  if (asNivel !== trimmed) {
    memoryCache.set(cacheKey, asNivel);
    return asNivel;
  }

  // Dicionário de frases narrativas
  const asText = translateTextoBackground(trimmed, "en");
  if (asText !== trimmed) {
    memoryCache.set(cacheKey, asText);
    return asText;
  }

  return trimmed;
}

/**
 * Função assíncrona para traduzir texto usando o endpoint /api/translate
 */
export async function translateDynamicAsync(
  text?: string,
  targetLocale: Locale = "en"
): Promise<string> {
  if (!text || !text.trim()) return "";
  if (targetLocale === "pt") return text;

  const trimmed = text.trim();
  const cacheKey = `pt:en:${trimmed.toLowerCase()}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  const stored = getStoredCache();
  if (stored[cacheKey]) {
    memoryCache.set(cacheKey, stored[cacheKey]);
    return stored[cacheKey];
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, from: "pt", to: targetLocale }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.translatedText) {
        const translated = data.translatedText;
        memoryCache.set(cacheKey, translated);
        saveToStoredCache(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    console.warn("Falha ao consultar /api/translate:", err);
  }

  return getImmediateTranslation(trimmed, targetLocale);
}

/**
 * Hook React que traduz qualquer texto livre (digitado manualmente e salvo no banco)
 * de forma transparente, com renderização instantânea do cache e atualização dinâmica.
 */
export function useDynamicTranslation(
  text: string | undefined | null,
  targetLocale: Locale = "en"
): string {
  const [translated, setTranslated] = useState<string>(() => {
    if (!text) return "";
    if (targetLocale === "pt") return text;
    return getImmediateTranslation(text, targetLocale);
  });

  const lastTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!text || !text.trim()) {
      setTranslated("");
      return;
    }

    if (targetLocale === "pt") {
      setTranslated(text);
      return;
    }

    const trimmed = text.trim();
    const cacheKey = `pt:en:${trimmed.toLowerCase()}`;

    // Se já estiver em cache, aplica na hora
    if (memoryCache.has(cacheKey)) {
      setTranslated(memoryCache.get(cacheKey)!);
      return;
    }

    const stored = getStoredCache();
    if (stored[cacheKey]) {
      memoryCache.set(cacheKey, stored[cacheKey]);
      setTranslated(stored[cacheKey]);
      return;
    }

    // Se não estiver em cache, aplica o que temos imediatamente e busca a tradução completa da IA
    const immediate = getImmediateTranslation(trimmed, targetLocale);
    setTranslated(immediate);

    if (lastTextRef.current === `${targetLocale}:${trimmed}`) return;
    lastTextRef.current = `${targetLocale}:${trimmed}`;

    let isMounted = true;
    translateDynamicAsync(trimmed, targetLocale).then((res) => {
      if (isMounted && res) {
        setTranslated(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [text, targetLocale]);

  return translated;
}

/**
 * Componente JSX declarativo para renderizar texto traduzido dinamicamente.
 */
export function DynamicText({
  text,
  targetLocale = "en",
  fallback = "",
}: {
  text?: string | null;
  targetLocale?: Locale;
  fallback?: string;
}) {
  const translated = useDynamicTranslation(text, targetLocale);
  if (!text || !text.trim()) {
    return <>{fallback}</>;
  }
  return <>{translated || text}</>;
}
