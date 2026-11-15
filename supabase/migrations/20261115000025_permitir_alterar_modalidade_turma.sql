-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 25
-- Permitir Transição de Modalidade de Turmas (Individual <-> Grupo) e Atualização de Capacidade
-- ==============================================================================

-- Remove a assinatura antiga de 2 argumentos para evitar ambiguidade na resolução de sobrecarga
DROP FUNCTION IF EXISTS public.alterar_capacidade_turma(UUID, INTEGER);

-- Cria ou substitui com suporte a p_nova_modalidade opcional (default NULL)
CREATE OR REPLACE FUNCTION public.alterar_capacidade_turma(
  p_turma_id UUID,
  p_nova_capacidade INTEGER,
  p_nova_modalidade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_turma RECORD;
  v_contagem_ativas INTEGER;
  v_caller_role public.user_role;
  v_caller_uid UUID;
  v_modalidade_final TEXT;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL THEN
    v_caller_role := public.get_auth_role();
    IF v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem alterar a capacidade ou modalidade de turmas.';
    END IF;
  END IF;

  SELECT * INTO v_turma
  FROM public.turmas
  WHERE id = p_turma_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada (ID: %).', p_turma_id;
  END IF;

  -- Determina modalidade final (se informada, usa a nova; se NULL, mantém a atual)
  v_modalidade_final := COALESCE(p_nova_modalidade, v_turma.modalidade);

  IF v_modalidade_final NOT IN ('individual', 'grupo') THEN
    RAISE EXCEPTION 'Modalidade inválida: "%". Deve ser "individual" ou "grupo".', v_modalidade_final;
  END IF;

  IF v_modalidade_final = 'individual' AND p_nova_capacidade <> 1 THEN
    RAISE EXCEPTION 'Turmas individuais devem ter capacidade estritamente igual a 1.';
  END IF;

  IF p_nova_capacidade < 1 THEN
    RAISE EXCEPTION 'A capacidade deve ser de no mínimo 1 aluno.';
  END IF;

  SELECT count(*) INTO v_contagem_ativas
  FROM public.matriculas_turmas
  WHERE turma_id = p_turma_id AND status = 'ativa';

  IF v_modalidade_final = 'individual' AND v_contagem_ativas > 1 THEN
    RAISE EXCEPTION 'Não é permitido alterar para modalidade individual pois a turma possui % discentes matriculados ativamente.', v_contagem_ativas;
  END IF;

  IF p_nova_capacidade < v_contagem_ativas THEN
    RAISE EXCEPTION 'A nova capacidade (%) não pode ser menor que o total de alunos já matriculados (%).',
      p_nova_capacidade, v_contagem_ativas;
  END IF;

  UPDATE public.turmas
  SET capacidade = p_nova_capacidade,
      modalidade = v_modalidade_final,
      updated_at = now()
  WHERE id = p_turma_id;

  RETURN jsonb_build_object(
    'success', true,
    'turma_id', p_turma_id,
    'modalidade_anterior', v_turma.modalidade,
    'nova_modalidade', v_modalidade_final,
    'capacidade_anterior', v_turma.capacidade,
    'nova_capacidade', p_nova_capacidade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.alterar_capacidade_turma(UUID, INTEGER, TEXT) TO authenticated, service_role;
