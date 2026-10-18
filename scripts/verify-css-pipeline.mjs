import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("▶ Iniciando verificação do pipeline de CSS e Tailwind...");

let passed = 0;
let total = 0;

function check(label, condition) {
  total++;
  if (condition) {
    console.log(`✔ [OK] ${label}`);
    passed++;
  } else {
    console.error(`❌ [FALHA] ${label}`);
    process.exitCode = 1;
  }
}

// 1. globals.css existe e contém diretivas Tailwind
const globalsCssPath = path.join(projectRoot, "src/app/globals.css");
const globalsCssExists = fs.existsSync(globalsCssPath);
check("globals.css existe em src/app/globals.css", globalsCssExists);

if (globalsCssExists) {
  const content = fs.readFileSync(globalsCssPath, "utf-8");
  check("globals.css contém @tailwind base", content.includes("@tailwind base;"));
  check("globals.css contém @tailwind components", content.includes("@tailwind components;"));
  check("globals.css contém @tailwind utilities", content.includes("@tailwind utilities;"));
}

// 2. layout.tsx importa globals.css
const layoutPath = path.join(projectRoot, "src/app/layout.tsx");
const layoutExists = fs.existsSync(layoutPath);
check("layout raiz existe em src/app/layout.tsx", layoutExists);

if (layoutExists) {
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  const importsGlobals = /import\s+["']\.\/globals\.css["']/.test(layoutContent);
  check("layout.tsx importa './globals.css' incondicionalmente", importsGlobals);
}

// 3. Configuração do PostCSS
const postcssPath = path.join(projectRoot, "postcss.config.mjs");
const postcssExists = fs.existsSync(postcssPath);
check("Configuração do PostCSS existe (postcss.config.mjs)", postcssExists);

if (postcssExists) {
  const postcssContent = fs.readFileSync(postcssPath, "utf-8");
  check("PostCSS configura plugin tailwindcss", postcssContent.includes("tailwindcss:"));
}

// 4. Configuração do Tailwind
const tailwindPath = path.join(projectRoot, "tailwind.config.ts");
const tailwindExists = fs.existsSync(tailwindPath);
check("Configuração do Tailwind existe (tailwind.config.ts)", tailwindExists);

if (tailwindExists) {
  const tailwindContent = fs.readFileSync(tailwindPath, "utf-8");
  check("Tailwind content inclui src/app e src/components", 
    tailwindContent.includes("./src/app/**/*.{js,ts,jsx,tsx,mdx}") &&
    tailwindContent.includes("./src/components/**/*.{js,ts,jsx,tsx,mdx}")
  );
}

// 5. Verificação de build de CSS compilado (se .next existir)
const nextDir = path.join(projectRoot, ".next");
if (fs.existsSync(nextDir)) {
  const cssDir = path.join(nextDir, "static/css");
  if (fs.existsSync(cssDir)) {
    const findCss = (dir) => {
      let files = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(findCss(full));
        } else if (entry.name.endsWith(".css")) {
          files.push(full);
        }
      }
      return files;
    };
    const cssFiles = findCss(cssDir);
    check("Diretório .next/static/css possui arquivo CSS compilado", cssFiles.length > 0);
  } else {
    console.log("ℹ Diretório .next/static/css ainda não gerado (aguardando build ou dev)");
  }
}

console.log(`\n🎉 Pipeline CSS auditado: ${passed}/${total} verificações aprovadas.`);
