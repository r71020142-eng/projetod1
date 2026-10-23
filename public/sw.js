/**
 * Service Worker Oficial — Método Paulo (MTD) PWA
 *
 * POLÍTICA DE SEGURANÇA E PRIVACIDADE:
 * - Cache restrito estritamente a assets estáticos públicos imutáveis (CSS, JS bundles compilados, ícones, fontes).
 * - Rotas de autenticação, APIs (/api/*), áreas restritas (/aluno/*, /admin/*) e requisições ao Supabase
 *   NUNCA são armazenadas em cache compartilhado pelo Service Worker (estratégia Network-Only com fallback offline).
 * - Garante total isolamento entre alunos e integridade dos dados em tempo real.
 */

const CACHE_NAME = "mtd-pwa-static-v1";
const OFFLINE_URL = "/offline.html";

// Assets estáticos públicos pré-cacheados para o shell offline
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/manifest.json",
  "/assets/mtd/mtd-logo-mark.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-16x16.png",
];

// Instalação: pré-carrega assets públicos seguros e ativa imediatamente
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Falha ao pré-carregar assets estáticos:", err);
      })
  );
});

// Ativação: limpa caches antigos e assume o controle imediatamente
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Apenas requisições GET são processadas
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // 1. REQUISIÇÕES PROTEGIDAS (Supabase, APIs, Autenticação, Painéis Aluno e Admin)
  // REGRA DE SEGURANÇA: NUNCA armazenar em cache para evitar vazamento de dados ou telas desatualizadas.
  const isProtectedOrDynamic =
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/aluno") ||
    url.pathname === "/login";

  if (isProtectedOrDynamic) {
    // Modo de navegação (HTML): tenta rede; se estiver offline, entrega página offline limpa
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request).catch(() =>
          caches.match(OFFLINE_URL).then((res) => res || Response.error())
        )
      );
      return;
    }

    // Demais chamadas dinâmicas (APIs/Supabase): estritamente rede direta
    event.respondWith(fetch(request));
    return;
  }

  // 2. NAVEGAÇÃO DE PÁGINAS GERAIS: Network-First com fallback para offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((res) => res || Response.error())
      )
    );
    return;
  }

  // 3. ASSETS ESTÁTICOS IMUTÁVEIS (Next.js static chunks, fontes, ícones, imagens estáticas)
  // Estratégia Stale-While-Revalidate para velocidade e suporte offline de assets
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ico");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default: rede direta
  event.respondWith(fetch(request));
});
