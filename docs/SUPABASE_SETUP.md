# GUIA DE CONFIGURAÇÃO E IMPLANTAÇÃO DO SUPABASE
**Plataforma DEMOSTRATIVO MTD — Método Paulo**

---

> **Documento:** Guia Operacional de Setup, Migrações e Auditoria do Supabase  
> **Versão:** 10.1.0  
> **Status:** Ativo / Vigente  
> **Segurança:** Isento de credenciais, chaves reais ou segredos expostos.

---

## 1. Visão Geral da Infraestrutura

O backend do **DEMOSTRATIVO MTD** utiliza a infraestrutura **Vercel (Compute & Edge)** + **Supabase (PostgreSQL, Auth, RLS e Storage)**.

A transição é progressiva e segura:
- Enquanto `APP_MODE=demo`, a plataforma continua operando isoladamente com repositórios no navegador (`localStorage`) e dados semente.
- Quando `APP_MODE=production`, o sistema conecta-se ao Supabase através dos clientes `@supabase/ssr` e `@supabase/supabase-js`, ativando o modelo de negação padrão (Default Deny RLS).

---

## 2. Passo a Passo: Criação do Projeto no Supabase

1. Acesse o console do [Supabase](https://supabase.com/dashboard) e faça login.
2. Clique em **"New Project"**.
3. Defina os parâmetros:
   - **Name:** `demonstrativo-mtd` (ou nomenclatura oficial da escola).
   - **Database Password:** Gere uma senha forte de pelo menos 16 caracteres e guarde-a em seu cofre de senhas (Bitwarden, 1Password, etc.).
   - **Region:** Selecione `São Paulo (sa-east-1)` para menor latência no Brasil.
   - **Pricing Plan:** Free / Pro (conforme a capacidade contratada).
4. Aguarde o provisionamento do cluster PostgreSQL (~2 minutos).

---

## 3. Coleta Segura de Variáveis de Ambiente

No painel do projeto Supabase, acesse **Project Settings $\to$ API**:

1. **Project URL:** copie a URL no formato `https://[seu-projeto-id].supabase.co`.
2. **Project API Keys (Padrão Oficial Atual - Publishable & Secret Keys):**
   - **Publishable Key (`sb_pub_...`):** Chave pública segura para uso no navegador com RLS ativo. Variável: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. *(Nota histórica: substitui o padrão legado `NEXT_PUBLIC_SUPABASE_ANON_KEY`, agora obsoleto)*.
   - **Secret Key (`sb_sec_...`):** Chave privada de serviço com poderes administrativos. **NUNCA compartilhe, versione ou exponha no cliente**. Variável: `SUPABASE_SECRET_KEY`. *(Nota histórica: substitui o padrão legado `SUPABASE_SERVICE_ROLE_KEY`, agora obsoleto)*.

---

## 4. Configuração das Variáveis na Vercel (Produção vs. Preview)

> [!CAUTION]
> **Regra Mandatória de Segurança:**  
> A branch `main` (Produção) deve manter `APP_MODE=demo` até que todas as migrações e testes estejam concluídos e homologados.  
> As credenciais do Supabase devem ser configuradas exclusivamente para o ambiente **Preview** da branch `etapa-10-backend`.

No painel da [Vercel](https://vercel.com/dashboard) $\to$ **Projeto `demonstrativo-mtd`** $\to$ **Settings** $\to$ **Environment Variables**:

| Nome da Variável | Valor Exemplo | Ambientes Selecionados |
| :--- | :--- | :--- |
| `APP_MODE` | `demo` | **Production**, **Preview**, **Development** |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | **Production**, **Preview**, **Development** |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[seu-id].supabase.co` | **Preview**, **Development** (Desmarcar Production) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_pub_...` | **Preview**, **Development** (Desmarcar Production) |
| `SUPABASE_SECRET_KEY` | `sb_sec_...` | **Preview**, **Development** (Desmarcar Production) |

---

## 5. Aplicação das Migrações SQL Iniciais

Existem duas formas seguras de aplicar as migrações:

### Opção A: Via Supabase SQL Editor (Interface Web - Mais Rápida)
1. No painel do Supabase, clique em **SQL Editor** no menu lateral esquerdo.
2. Clique em **"New Query"**.
3. Copie o conteúdo integral do arquivo:  
   [`supabase/migrations/20261019000001_initial_schema_perfis_e_auditoria.sql`](file:///Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd/supabase/migrations/20261019000001_initial_schema_perfis_e_auditoria.sql)
4. Cole no editor e clique em **"Run"** (ou `Cmd + Enter`).
5. Confirme a mensagem: `Success. No rows returned`.

### Opção B: Via Supabase CLI (Linha de Comando)
Caso possua a Supabase CLI instalada localmente:
```bash
# Login na CLI
npx supabase login

# Vinculação ao projeto remoto
npx supabase link --project-ref [seu-project-id]

# Envio das migrações pendentes
npx supabase db push
```

---

## 6. Criação Segura do Primeiro Administrador

Por segurança, o trigger `handle_new_user` do banco cria todo novo cadastro público estritamente com o papel `aluno` (menor privilégio). Para criar o primeiro administrador:

1. No Supabase, acesse **Authentication $\to$ Users $\to$ "Add user" $\to$ "Create user"**.
2. Preencha o e-mail oficial (ex: `admin@mtd.com`) e defina uma senha temporária segura.
3. Copie o `User UID` gerado.
4. Abra o **SQL Editor** e execute a promoção manual:
   ```sql
   UPDATE public.perfis
   SET
     role = 'admin',
     nome_completo = 'Carla Mendes', -- Ou nome do administrador geral
     status = 'ativo'
   WHERE id = '[cole-o-User-UID-aqui]';
   ```
5. Registre a ação na tabela de auditoria:
   ```sql
   INSERT INTO public.auditoria_logs (
     ator_role, acao, entidade, identificador_entidade, valores_posteriores
   ) VALUES (
     'system_bootstrap',
     'ROLE_PROMOTION',
     'perfis',
     '[cole-o-User-UID-aqui]',
     '{"role": "admin", "promovido_por": "setup_inicial"}'::jsonb
   );
   ```

---

## 7. Como Verificar se as Políticas RLS Estão Ativas

Para auditar e comprovar matematicamente que o Row Level Security está protegendo o banco:

1. No **SQL Editor** do Supabase, abra uma nova consulta.
2. Copie e execute o arquivo de validação:  
   [`supabase/tests/rls_validation.sql`](file:///Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd/supabase/tests/rls_validation.sql)
3. O script executa uma transação temporária com `ROLLBACK` ao final e exibe os notices:
   ```
   ✔ TESTE 1 PASSOU: Usuário anônimo não acessa nenhum perfil (RLS Default Deny).
   ✔ TESTE 2 PASSOU: Aluno acessa estritamente o próprio perfil.
   ✔ TESTE 3 PASSOU: RLS bloqueou a tentativa de auto-promoção do aluno.
   ✔ TESTE 4 PASSOU: Professor visualiza apenas discentes e seu perfil, sem privilégios de admin.
   ✔ TESTE 5 PASSOU: Administrador acessa todos os perfis da escola.
   ✔ TESTE 6 PASSOU: Logs de auditoria são sigilosos e inacessíveis para discentes.
   ```

---

## 8. Como Retornar ou Manter o Modo Demonstrativo

Caso ocorra qualquer inconsistência de rede ou configuração externa, a aplicação retorna instantaneamente ao modo demonstrativo seguro:
1. No arquivo `.env.local` (local) ou nas variáveis da Vercel (nuvem):
   ```bash
   APP_MODE=demo
   NEXT_PUBLIC_DEMO_MODE=true
   ```
2. O sistema desacopla chamadas ao Supabase e reativa automaticamente os repositórios locais e os dados semente em `localStorage`.
