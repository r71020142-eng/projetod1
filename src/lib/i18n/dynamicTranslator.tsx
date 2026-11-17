// src/lib/i18n/dynamicTranslator.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Locale } from "./translations";
import {
  translateNacionalidade,
  translateProfissao,
  translateNivelEscolar,
  translateTextoBackground,
} from "./backgroundTranslator";

const STORAGE_CACHE_KEY = "mtd_dynamic_translations_cache_v2";

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
  const cacheKey = `pt:${targetLocale}:${trimmed.toLowerCase()}`;

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
  const asNac = translateNacionalidade(trimmed, targetLocale);
  if (asNac !== trimmed) {
    memoryCache.set(cacheKey, asNac);
    return asNac;
  }

  const asProf = translateProfissao(trimmed, targetLocale);
  if (asProf !== trimmed) {
    memoryCache.set(cacheKey, asProf);
    return asProf;
  }

  const asNivel = translateNivelEscolar(trimmed, targetLocale);
  if (asNivel !== trimmed) {
    memoryCache.set(cacheKey, asNivel);
    return asNivel;
  }

  // Dicionário de frases narrativas
  const asText = translateTextoBackground(trimmed, targetLocale);
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
  const cacheKey = `pt:${targetLocale}:${trimmed.toLowerCase()}`;

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
    const cacheKey = `pt:${targetLocale}:${trimmed.toLowerCase()}`;

    // 1. Tenta retorno síncrono imediato de cache ou dicionário
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

    const immediate = getImmediateTranslation(trimmed, targetLocale);
    if (immediate !== trimmed) {
      setTranslated(immediate);
    }

    // 2. Se for texto longo ou ainda não traduzido perfeitamente, busca na API de tradução em background
    let isCancelled = false;
    lastTextRef.current = trimmed;

    translateDynamicAsync(trimmed, targetLocale).then((res) => {
      if (!isCancelled && res && lastTextRef.current === trimmed) {
        setTranslated(res);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [text, targetLocale]);

  return translated || text || "";
}

/**
 * Componente declarativo que envolve qualquer texto salvo e o renderiza traduzido.
 * Substitui automaticamente qualquer conteúdo dinâmico (biografia, interesses, observações, etc.)
 */
export function DynamicText({
  text,
  targetLocale = "en",
  fallback,
  className,
}: {
  text?: string | null;
  targetLocale?: Locale;
  fallback?: string;
  className?: string;
}) {
  const translated = useDynamicTranslation(text, targetLocale);

  if (!text && fallback) {
    return <span className={className}>{fallback}</span>;
  }

  return <span className={className}>{translated || text || ""}</span>;
}
