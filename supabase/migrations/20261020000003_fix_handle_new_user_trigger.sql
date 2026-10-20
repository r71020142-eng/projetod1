-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 3 (ETAPA 10.2A - CORREÇÃO DE TRIGGER E PERFIS)
-- Correção Definitiva da Criação Automática de Perfis (on_auth_user_created)
-- ==============================================================================

-- 1. FUNÇÃO HANDLE_NEW_USER APRIMORADA E BLINDADA
-- Regras de Segurança:
-- - Executa como SECURITY DEFINER (privilégios do postgres).
-- - search_path fixado estritamente em 'public, auth'.
-- - Atribui obrigatoriamente id = NEW.id e email = NEW.email.
-- - Extrai nome_completo dos metadados com múltiplos fallbacks seguros ('nome_completo', 'full_name', 'name', 'nome', prefixo de email ou 'Novo Usuário').
-- - Atribui estritamente role = 'aluno' e status = 'ativo', ignorando quaisquer metadados de autopromoção.
-- - Trata conflitos com ON CONFLICT (id) DO NOTHING, preservando perfis pré-existentes.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_nome TEXT;
BEGIN
  -- Se porventura o usuário for criado sem e-mail, encerra sem falhar
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  -- Resolução resiliente do nome completo a partir dos metadados
  v_nome := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nome_completo'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
    NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
    'Novo Usuário'
  );

  -- Inserção idempotente na tabela pública de perfis
  INSERT INTO public.perfis (id, email, nome_completo, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_nome,
    'aluno'::public.user_role,
    'ativo'::public.profile_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. GARANTIA DO TRIGGER AFTER INSERT EM auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. BACKFILL SEGURO PARA USUÁRIOS SEM PERFIL
-- Insere perfil exclusivamente para usuários em auth.users que NÃO possuam perfil em public.perfis.
-- Usuários existentes (incluindo o administrador Ray Pires) são preservados integralmente sem rebaixamento.
INSERT INTO public.perfis (id, email, nome_completo, role, status)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'nome_completo'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'nome'), ''),
    NULLIF(trim(split_part(u.email, '@', 1)), ''),
    'Novo Usuário'
  ) AS nome_completo,
  'aluno'::public.user_role AS role,
  'ativo'::public.profile_status AS status
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.perfis p WHERE p.id = u.id
  )
ON CONFLICT (id) DO NOTHING;
