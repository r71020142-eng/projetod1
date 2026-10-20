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

## 5. Configuração de Autenticação e Redirect URLs (Supabase Auth)

Para o correto funcionamento do fluxo PKCE (Login, Confirmação de E-mail e Recuperação de Senha) no ambiente Preview da Vercel:

No painel do Supabase $\to$ **Authentication** $\to$ **URL Configuration**:

1. **Site URL:**
   `https://demonstrativo-mtd-git-etapa-10-backend-r71020142-6352s-projects.vercel.app`

2. **Redirect URLs (Allow list):**
   Adicione as seguintes URLs:
   - `https://demonstrativo-mtd-git-etapa-10-backend-r71020142-6352s-projects.vercel.app/auth/callback`
   - `https://demonstrativo-mtd-git-etapa-10-backend-r71020142-6352s-projects.vercel.app/redefinir-senha`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/redefinir-senha`

---

## 6. Criação Segura do Primeiro Administrador (Bootstrap Manual)

Por segurança e conformidade de menor privilégio, o trigger `handle_new_user` do banco cria todo novo cadastro público estritamente com o papel `aluno`. Não há criação de administrador por seeds públicos. Para inicializar o primeiro administrador:

1. No Supabase, acesse **Authentication $\to$ Users $\to$ "Add user" $\to$ "Create user"**.
2. Preencha o e-mail oficial (ex: `admin@mtd.com`) e defina uma senha temporária segura. Marque "Auto Confirm User?".
3. Copie o `User UID` gerado.
4. Confirme que o perfil foi criado com `role = 'aluno'`:
   ```sql
   SELECT id, email, role, status FROM public.perfis WHERE id = '[cole-o-User-UID-aqui]';
   ```
5. Promova o usuário a administrador executando a instrução SQL no **SQL Editor**:
   ```sql
   UPDATE public.perfis
   SET
     role = 'admin',
     nome_completo = 'Carla Mendes', -- Ou nome do administrador geral
     status = 'ativo'
   WHERE id = '[cole-o-User-UID-aqui]';
   ```
6. O trigger `trg_protect_perfis_privileged_fields` permite a alteração apenas em operações administrativas e bloqueia auto-promoções feitas por clientes não autorizados.

---

## 7. Como Verificar se as Políticas RLS e Triggers Estão Ativos

Para auditar e comprovar matematicamente que o Row Level Security e os triggers estão protegendo o banco:

1. No **SQL Editor** do Supabase, abra uma nova consulta.
2. Copie e execute o arquivo de validação:  
   [`supabase/tests/rls_validation.sql`](file:///Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd/supabase/tests/rls_validation.sql)
3. O script executa uma transação temporária com `ROLLBACK` ao final e comprova as 10 garantias:
   ```
   ✔ TESTE 1 PASSOU: Usuário anônimo não acessa nenhum perfil (RLS Default Deny).
   ✔ TESTE 2 PASSOU: Aluno acessa estritamente o próprio perfil.
   ✔ TESTE 3 PASSOU: Alteração de papel por aluno bloqueada com sucesso.
   ✔ TESTE 4 PASSOU: Alteração de status por aluno bloqueada com sucesso.
   ✔ TESTE 5 PASSOU: Tentativa de promoção de usuário por professor bloqueada com sucesso.
   ✔ TESTE 6 PASSOU: Inserção em auditoria_logs por aluno bloqueada (permissão revogada).
   ✔ TESTE 7 PASSOU: Inserção em auditoria_logs por professor bloqueada (permissão revogada).
   ✔ TESTE 8 PASSOU: Professor visualiza apenas discentes e seu perfil, sem privilégios de admin.
   ✔ TESTE 9 PASSOU: Administrador possui permissão autorizada de alteração de papéis.
   ✔ TESTE 10 PASSOU: UPDATE e DELETE em auditoria_logs bloqueados (imutabilidade).
   ```

---

## 8. Como Operar com Separação de Autenticação e Dados (Etapa 10.2A)

Na Etapa 10.2A, a plataforma permite testar a autenticação real sem migrar ainda os 21 repositórios do localStorage:
- **Preview Vercel (`etapa-10-backend`):**
  ```bash
  APP_MODE=demo
  AUTH_MODE=supabase
  DATA_SOURCE=local
  ```
  *(Exibe aviso discreto: "Ambiente de autenticação em teste com dados demonstrativos.")*
- **Produção Vercel (`main`):**
  ```bash
  APP_MODE=demo
  AUTH_MODE=demo
  DATA_SOURCE=local
  ```
  *(Produção 100% preservada no modo demonstrativo existente)*
