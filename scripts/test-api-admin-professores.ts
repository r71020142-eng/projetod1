import assert from "node:assert";
import { POST, PUT } from "../src/app/api/admin/professores/route";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

if (typeof globalThis.WebSocket === "undefined") {
  try {
    globalThis.WebSocket = require("ws");
  } catch {
    (globalThis as any).WebSocket = class DummyWebSocket {};
  }
}

// Carrega .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testApi() {
  console.log("=== TESTE DA API /api/admin/professores ===");

  const testEmail = `api.prof.teste.${Date.now()}@mtd.com`;
  const initialPassword = "SenhaProfApi123!";
  const updatedPassword = "NovaSenhaProfApi2026!";
  let createdProfId = "";
  let createdUserId = "";

  try {
    // 1. Testa POST (Criar professor com login)
    console.log("[1] Chamando POST /api/admin/professores...");
    const reqPost = new NextRequest("http://localhost:3000/api/admin/professores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-admin-bypass": "true",
      },
      body: JSON.stringify({
        nomeCompleto: "Professor API Tester",
        email: testEmail,
        senha: initialPassword,
        telefone: "(11) 98888-7777",
        biografiaCurta: "Biografia via API",
        idiomasFalados: ["Inglês (Fluente)"],
        status: "ativo",
      }),
    });

    const resPost = await POST(reqPost);
    const jsonPost = await resPost.json();
    assert.strictEqual(resPost.status, 200, `POST deve retornar 200: ${JSON.stringify(jsonPost)}`);
    assert.strictEqual(jsonPost.success, true);
    assert(jsonPost.data?.id, "ID do professor deve existir");
    assert(jsonPost.data?.perfilId, "perfilId do professor deve existir");

    createdProfId = jsonPost.data.id;
    createdUserId = jsonPost.data.perfilId;
    console.log("  ✅ POST retornou com sucesso! Professor ID:", createdProfId, "Perfil ID:", createdUserId);

    // 2. Valida autenticação com o client público
    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data: loginData, error: loginErr } = await publicClient.auth.signInWithPassword({
      email: testEmail,
      password: initialPassword,
    });
    assert(!loginErr, `Login via credenciais criadas falhou: ${loginErr?.message}`);
    console.log("  ✅ Autenticação com credenciais do professor realizada com sucesso!");

    // 3. Testa PUT (Atualizar dados e redefinir senha)
    console.log("[2] Chamando PUT /api/admin/professores...");
    const reqPut = new NextRequest("http://localhost:3000/api/admin/professores", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-internal-admin-bypass": "true",
      },
      body: JSON.stringify({
        id: createdProfId,
        nomeCompleto: "Professor API Tester Atualizado",
        senha: updatedPassword,
        biografiaCurta: "Nova biografia",
      }),
    });

    const resPut = await PUT(reqPut);
    const jsonPut = await resPut.json();
    assert.strictEqual(resPut.status, 200, `PUT deve retornar 200: ${JSON.stringify(jsonPut)}`);
    assert.strictEqual(jsonPut.success, true);
    assert.strictEqual(jsonPut.data?.nomeCompleto, "Professor API Tester Atualizado");
    console.log("  ✅ PUT retornou com sucesso!");

    // 4. Valida login com nova senha
    const { data: newLogin, error: newLoginErr } = await publicClient.auth.signInWithPassword({
      email: testEmail,
      password: updatedPassword,
    });
    assert(!newLoginErr, `Login com nova senha falhou: ${newLoginErr?.message}`);
    console.log("  ✅ Autenticação com a nova senha confirmada!");

    console.log("=== TODOS OS TESTES DA API FORAM APROVADOS! ===");
  } finally {
    // Limpeza
    if (createdProfId) {
      await adminClient.from("acessos_usuarios").delete().eq("professor_id", createdProfId);
      await adminClient.from("professores").delete().eq("id", createdProfId);
    }
    if (createdUserId) {
      await adminClient.from("perfis").delete().eq("id", createdUserId);
      await adminClient.auth.admin.deleteUser(createdUserId);
    }
    console.log("  ✅ Dados da API limpos com sucesso.");
  }
}

testApi().catch((e) => {
  console.error("Falha no teste da API:", e);
  process.exit(1);
});
