import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolver a raiz exata do projeto de forma determinística
const projectRoot = path.resolve(__dirname, "..");
const nextDir = path.join(projectRoot, ".next");

// Verificações de segurança estritas:
// 1. Confirmar que o alvo é exclusivamente a pasta .next dentro do projeto
// 2. Bloquear caminhos perigosos como raiz, HOME ou genéricos
if (
  !nextDir.endsWith(path.sep + ".next") ||
  nextDir === path.sep + ".next" ||
  nextDir.length < 15
) {
  console.error("❌ Erro de segurança: Caminho inválido para remoção de cache:", nextDir);
  process.exit(1);
}

// Confirmar existência do package.json na raiz para certificar o projeto
const packageJsonPath = path.join(projectRoot, "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.error("❌ Erro de integridade: package.json não encontrado na raiz:", projectRoot);
  process.exit(1);
}

if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("✔ Cache .next removido com sucesso de:", nextDir);
  } catch (err) {
    console.error("❌ Falha ao remover diretório .next:", err.message);
    process.exit(1);
  }
} else {
  console.log("✔ Diretório .next já estava limpo.");
}
