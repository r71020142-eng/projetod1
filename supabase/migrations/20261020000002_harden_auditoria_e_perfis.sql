-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 2 (ETAPA 10.2A)
-- Hardening de Auditoria e Proteção Rigorosa de Perfis por Trigger
-- ==============================================================================

-- 1. HARDENING DE AUDITORIA (Revogação de Inserção por Usuários Comuns)
-- Remove a política que permitia usuários autenticados inserirem diretamente
DROP POLICY IF EXISTS "auditoria_insert_policy" ON public.auditoria_logs;

-- Revoga explicitamente permissões de escrita direta em auditoria_logs para anon e authenticated
REVOKE INSERT, UPDATE, DELETE ON TABLE public.auditoria_logs FROM anon, authenticated;

-- Garante que apenas SELECT permaneça para authenticated (filtrado via RLS por auditoria_select_policy)
GRANT SELECT ON TABLE public.auditoria_logs TO authenticated;

-- 2. TRIGGER DE PROTEÇÃO DE CAMPOS PRIVILEGIADOS EM public.perfis
-- Cria função SECURITY DEFINER com search_path = public
CREATE OR REPLACE FUNCTION public.protect_perfis_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se houver tentativa de alterar role ou status
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Somente administrador ativo autenticado pode realizar essa alteração
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar papel ou status de usuários.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Registra o trigger BEFORE UPDATE em public.perfis
DROP TRIGGER IF EXISTS trg_protect_perfis_privileged_fields ON public.perfis;
CREATE TRIGGER trg_protect_perfis_privileged_fields
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_perfis_privileged_fields();
