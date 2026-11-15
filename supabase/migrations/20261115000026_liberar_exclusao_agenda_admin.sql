-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 26
-- Conceder Permissão Total de Exclusão ao Administrador (Remoção de Bloqueios Físicos)
-- ==============================================================================

-- 1. Atualiza prevent_agenda_physical_delete permitindo exclusão total para Administradores
CREATE OR REPLACE FUNCTION public.prevent_agenda_physical_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Permite exclusão completa para administradores ativos do sistema
  IF auth.uid() IS NOT NULL AND public.is_admin() THEN
    RETURN OLD;
  END IF;

  -- Se for execução via service_role ou tarefas internas do banco (sem auth.uid)
  IF auth.uid() IS NULL AND auth.role() <> 'anon' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'EXCLUSAO_FISICA_PROIBIDA: A exclusao fisica em % e restrita exclusivamente a administradores ativos do sistema.', TG_TABLE_NAME;
END;
$$;

-- 2. Atualiza prevent_client_physical_delete permitindo exclusão total para Administradores
CREATE OR REPLACE FUNCTION public.prevent_client_physical_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Permite exclusão completa para administradores ativos do sistema
  IF auth.uid() IS NOT NULL AND public.is_admin() THEN
    RETURN OLD;
  END IF;

  -- Se for execução via service_role ou tarefas internas do banco (sem auth.uid)
  IF auth.uid() IS NULL AND auth.role() <> 'anon' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Exclusão física bloqueada: apenas administradores ativos possuem permissão para excluir registros em %.', TG_TABLE_NAME;
END;
$$;

-- 3. Concessão de permissões de DELETE para autenticados em todas as tabelas
GRANT DELETE ON TABLE public.series_aulas TO authenticated, service_role;
GRANT DELETE ON TABLE public.aulas TO authenticated, service_role;
GRANT DELETE ON TABLE public.presencas_aulas TO authenticated, service_role;
GRANT DELETE ON TABLE public.turmas TO authenticated, service_role;
GRANT DELETE ON TABLE public.matriculas_turmas TO authenticated, service_role;
GRANT DELETE ON TABLE public.alunos TO authenticated, service_role;
GRANT DELETE ON TABLE public.professores TO authenticated, service_role;

-- 4. Políticas RLS para DELETE exclusivo por administradores
DROP POLICY IF EXISTS admin_delete_series_aulas ON public.series_aulas;
CREATE POLICY admin_delete_series_aulas ON public.series_aulas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_aulas ON public.aulas;
CREATE POLICY admin_delete_aulas ON public.aulas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_presencas_aulas ON public.presencas_aulas;
CREATE POLICY admin_delete_presencas_aulas ON public.presencas_aulas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_turmas ON public.turmas;
CREATE POLICY admin_delete_turmas ON public.turmas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_matriculas_turmas ON public.matriculas_turmas;
CREATE POLICY admin_delete_matriculas_turmas ON public.matriculas_turmas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_alunos ON public.alunos;
CREATE POLICY admin_delete_alunos ON public.alunos FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_professores ON public.professores;
CREATE POLICY admin_delete_professores ON public.professores FOR DELETE USING (public.is_admin());

-- 5. Concessão de execução das triggers e RPCs
GRANT EXECUTE ON FUNCTION public.prevent_agenda_physical_delete() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prevent_client_physical_delete() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.excluir_turma_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.excluir_aula_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.excluir_aluno_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.excluir_professor_admin(uuid) TO authenticated, service_role;
