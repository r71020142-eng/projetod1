/**
 * Teste Automatizado de Validação do PWA — Método Paulo (DEMOSTRATIVO MTD)
 * Executa checagem de conformidade com os critérios de instalabilidade PWA (W3C / Google Lighthouse / Apple Web Clip).
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FALHA: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🔍 INICIANDO VALIDAÇÃO COMPLETA DO PWA (${BASE_URL})`);
  console.log(`======================================================\n`);

  // 1. Validar /manifest.webmanifest
  console.log(`[1] Validando Web App Manifest (/manifest.webmanifest):`);
  try {
    const res = await fetch(`${BASE_URL}/manifest.webmanifest`);
    assert(res.status === 200, `Manifest retornou status 200 (atual: ${res.status})`);
    
    const manifest = await res.json();
    assert(manifest.name === "Método Paulo", `name correto: "${manifest.name}"`);
    assert(manifest.short_name === "Método Paulo", `short_name correto: "${manifest.short_name}"`);
    assert(manifest.start_url === "/login", `start_url correto: "${manifest.start_url}"`);
    assert(manifest.display === "standalone", `display standalone: "${manifest.display}"`);
    assert(manifest.theme_color === "#0F172A", `theme_color condizente: "${manifest.theme_color}"`);
    assert(manifest.background_color === "#0F172A", `background_color condizente: "${manifest.background_color}"`);
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, `Possui ao menos 3 ícones configurados`);

    const has192 = manifest.icons.some(i => i.sizes === "192x192" && i.purpose?.includes("any"));
    const has512 = manifest.icons.some(i => i.sizes === "512x512" && i.purpose?.includes("any"));
    const hasMaskable = manifest.icons.some(i => i.purpose?.includes("maskable"));

    assert(has192, `Ícone 192x192 any presente no manifest`);
    assert(has512, `Ícone 512x512 any presente no manifest`);
    assert(hasMaskable, `Ícone maskable presente para Android adaptive icons`);
  } catch (err) {
    assert(false, `Falha ao carregar /manifest.webmanifest: ${err.message}`);
  }

  // 2. Validar fallback /manifest.json
  console.log(`\n[2] Validando Fallback Manifest (/manifest.json):`);
  try {
    const res = await fetch(`${BASE_URL}/manifest.json`);
    assert(res.status === 200, `/manifest.json acessível com status 200`);
    const json = await res.json();
    assert(json.name === "Método Paulo", `Fallback com name correspondente`);
  } catch (err) {
    assert(false, `Falha em /manifest.json: ${err.message}`);
  }

  // 3. Validar Service Worker (/sw.js)
  console.log(`\n[3] Validando Service Worker (/sw.js):`);
  try {
    const res = await fetch(`${BASE_URL}/sw.js`);
    assert(res.status === 200, `Service Worker retornado com status 200`);
    const swContent = await res.text();
    assert(swContent.includes("CACHE_NAME"), `SW define nome de cache versionado`);
    assert(swContent.includes("OFFLINE_URL"), `SW referencia URL da página offline`);
    assert(swContent.includes("supabase.co"), `SW contém bypass estrito de segurança para Supabase`);
    assert(swContent.includes("/aluno"), `SW contém bypass de cache para área do aluno`);
    assert(swContent.includes("/admin"), `SW contém bypass de cache para área administrativa`);
    assert(swContent.includes("/api/"), `SW contém bypass de cache para rotas de API`);
    assert(swContent.includes("skipWaiting"), `SW ativa imediatamente via skipWaiting()`);
    assert(swContent.includes("clients.claim"), `SW assume controle via clients.claim()`);
  } catch (err) {
    assert(false, `Falha ao testar /sw.js: ${err.message}`);
  }

  // 4. Validar Tela Offline (/offline.html)
  console.log(`\n[4] Validando Tela de Fallback Offline (/offline.html):`);
  try {
    const res = await fetch(`${BASE_URL}/offline.html`);
    assert(res.status === 200, `/offline.html retornado com status 200`);
    const html = await res.text();
    assert(html.includes("Sem conexão com a internet"), `Mensagem clara de offline presente`);
    assert(html.includes("Método Paulo"), `Identidade Método Paulo preservada no fallback`);
  } catch (err) {
    assert(false, `Falha ao testar /offline.html: ${err.message}`);
  }

  // 5. Validar Assets de Ícones
  console.log(`\n[5] Validando Assets e Ícones PWA:`);
  const iconUrls = [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/icons/apple-touch-icon.png",
    "/apple-touch-icon.png",
    "/icons/favicon-32x32.png",
    "/icons/favicon-16x16.png",
  ];

  for (const url of iconUrls) {
    try {
      const res = await fetch(`${BASE_URL}${url}`);
      assert(res.status === 200, `Ícone ${url} retornado com status 200`);
    } catch (err) {
      assert(false, `Ícone ${url} inacessível: ${err.message}`);
    }
  }

  // 6. Validar Metatags no HTML (/login)
  console.log(`\n[6] Validando Metatags e Cabeçalhos PWA (/login):`);
  try {
    const res = await fetch(`${BASE_URL}/login`);
    assert(res.status === 200, `/login retornado com status 200`);
    const html = await res.text();
    assert(html.includes('rel="manifest"'), `Link para Web App Manifest presente no <head>`);
    assert(html.includes('name="theme-color"'), `Metatag theme-color presente`);
    assert(html.includes('name="apple-mobile-web-app-capable" content="yes"'), `Suporte iOS apple-mobile-web-app-capable presente`);
    assert(html.includes('name="apple-mobile-web-app-title" content="Método Paulo"'), `Título do web clip iOS presente`);
    assert(html.includes('rel="apple-touch-icon"'), `Apple touch icon referenciado`);
    assert(html.includes('name="viewport"'), `Metatag viewport responsiva presente`);
  } catch (err) {
    assert(false, `Falha ao inspecionar HTML do /login: ${err.message}`);
  }

  console.log(`\n======================================================`);
  console.log(`📊 RESULTADO FINAL DOS TESTES PWA:`);
  console.log(`   Total de verificações com sucesso: ${passed}`);
  console.log(`   Total de falhas: ${failed}`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal durante a execução dos testes:", err);
  process.exit(1);
});
