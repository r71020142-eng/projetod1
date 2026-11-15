-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 24: EXCLUSÃO ADMINISTRATIVA DE ENTIDADES
-- Suporte completo a exclusão de Turmas, Aulas, Alunos e Professores
-- ==============================================================================

-- 1. Atualiza prevent_client_physical_delete permitindo exclusão apenas para Administradores
CREATE OR REPLACE FUNCTION public.prevent_client_physical_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Exclusão física bloqueada: apenas administradores ativos possuem permissão para excluir registros.';
  END IF;
  RETURN OLD;
END;
$$;

-- 2. Concessão de permissões de DELETE para autenticados (com filtragem estrita via RLS)
GRANT DELETE ON TABLE public.turmas TO authenticated;
GRANT DELETE ON TABLE public.aulas TO authenticated;
GRANT DELETE ON TABLE public.presencas_aulas TO authenticated;
GRANT DELETE ON TABLE public.matriculas_turmas TO authenticated;
GRANT DELETE ON TABLE public.alunos TO authenticated;
GRANT DELETE ON TABLE public.professores TO authenticated;

-- 3. Políticas RLS para DELETE exclusivo por administradores
DROP POLICY IF EXISTS admin_delete_turmas ON public.turmas;
CREATE POLICY admin_delete_turmas ON public.turmas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_aulas ON public.aulas;
CREATE POLICY admin_delete_aulas ON public.aulas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_presencas_aulas ON public.presencas_aulas;
CREATE POLICY admin_delete_presencas_aulas ON public.presencas_aulas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_matriculas_turmas ON public.matriculas_turmas;
CREATE POLICY admin_delete_matriculas_turmas ON public.matriculas_turmas FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_alunos ON public.alunos;
CREATE POLICY admin_delete_alunos ON public.alunos FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS admin_delete_professores ON public.professores;
CREATE POLICY admin_delete_professores ON public.professores FOR DELETE USING (public.is_admin());

-- 4. RPC para Exclusão Completa e Transacional de Turma
CREATE OR REPLACE FUNCTION public.excluir_turma_admin(p_turma_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_nome text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir turmas.';
  END IF;

  SELECT nome INTO v_nome FROM public.turmas WHERE id = p_turma_id;
  IF v_nome IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Turma não encontrada');
  END IF;

  -- 1. Remove presenças de todas as aulas vinculadas a esta turma
  DELETE FROM public.presencas_aulas WHERE aula_id IN (SELECT id FROM public.aulas WHERE turma_id = p_turma_id);

  -- 2. Remove aulas agendadas e séries da turma
  DELETE FROM public.aulas WHERE turma_id = p_turma_id;
  DELETE FROM public.series_aulas WHERE turma_id = p_turma_id;

  -- 3. Remove matrículas de alunos na turma
  DELETE FROM public.matriculas_turmas WHERE turma_id = p_turma_id;

  -- 4. Desvincula avaliações e espaços de comunidade
  UPDATE public.espacos_comunidade SET turma_id = NULL WHERE turma_id = p_turma_id;
  UPDATE public.avaliacoes SET destino_turma_id = NULL WHERE destino_turma_id = p_turma_id;

  -- 5. Exclui a turma
  DELETE FROM public.turmas WHERE id = p_turma_id;

  RETURN jsonb_build_object('success', true, 'turma_id', p_turma_id, 'nome', v_nome);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC para Exclusão Completa e Transacional de Aula Agendada
CREATE OR REPLACE FUNCTION public.excluir_aula_admin(p_aula_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_turma_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir aulas do cronograma.';
  END IF;

  SELECT turma_id INTO v_turma_id FROM public.aulas WHERE id = p_aula_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aula não encontrada');
  END IF;

  -- 1. Remove presenças associadas
  DELETE FROM public.presencas_aulas WHERE aula_id = p_aula_id;

  -- 2. Remove a aula
  DELETE FROM public.aulas WHERE id = p_aula_id;

  RETURN jsonb_build_object('success', true, 'aula_id', p_aula_id, 'turma_id', v_turma_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC para Exclusão Completa e Transacional de Aluno
CREATE OR REPLACE FUNCTION public.excluir_aluno_admin(p_aluno_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_perfil_id uuid;
  v_email text;
  v_nome text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir alunos.';
  END IF;

  SELECT perfil_id, email, nome_completo INTO v_perfil_id, v_email, v_nome FROM public.alunos WHERE id = p_aluno_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aluno não encontrado');
  END IF;

  -- Proteção para contas de homologação / mestres
  IF lower(v_email) = 'r71020142@gmail.com' OR lower(v_email) = 'homologacao.aluno@escolapaulo.com.br' THEN
    RAISE EXCEPTION 'Não é permitido excluir contas mestres ou de homologação oficial do sistema.';
  END IF;

  -- Desassocia/Remove dependências acadêmicas do discente
  DELETE FROM public.acessos_usuarios WHERE aluno_id = p_aluno_id;
  DELETE FROM public.matriculas_turmas WHERE aluno_id = p_aluno_id;
  DELETE FROM public.presencas_aulas WHERE aluno_id = p_aluno_id;
  DELETE FROM public.progresso_cartoes_alunos WHERE aluno_id = p_aluno_id;
  DELETE FROM public.historico_revisoes_srs WHERE aluno_id = p_aluno_id;
  DELETE FROM public.sessoes_estudo_srs WHERE aluno_id = p_aluno_id;
  DELETE FROM public.progresso_modulos_alunos WHERE aluno_id = p_aluno_id;
  DELETE FROM public.tentativas_avaliacoes WHERE aluno_id = p_aluno_id;
  DELETE FROM public.entregas_atividades WHERE aluno_id = p_aluno_id;
  DELETE FROM public.conquistas_concedidas WHERE aluno_id = p_aluno_id;
  DELETE FROM public.eventos_pontos WHERE aluno_id = p_aluno_id;
  DELETE FROM public.solicitacoes_placas WHERE aluno_id = p_aluno_id;
  DELETE FROM public.interesses_oportunidades WHERE aluno_id = p_aluno_id;
  DELETE FROM public.self_presentations WHERE aluno_id = p_aluno_id;
  DELETE FROM public.alunos_dados_pedagogicos WHERE aluno_id = p_aluno_id;
  UPDATE public.avaliacoes SET destino_aluno_id = NULL WHERE destino_aluno_id = p_aluno_id;

  -- Remove registro do aluno
  DELETE FROM public.alunos WHERE id = p_aluno_id;

  -- Se houver perfil_id associado, remove de perfis
  IF v_perfil_id IS NOT NULL THEN
    DELETE FROM public.perfis WHERE id = v_perfil_id AND role = 'aluno';
  END IF;

  RETURN jsonb_build_object('success', true, 'aluno_id', p_aluno_id, 'perfil_id', v_perfil_id, 'nome', v_nome);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC para Exclusão Completa e Transacional de Professor
CREATE OR REPLACE FUNCTION public.excluir_professor_admin(p_professor_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_perfil_id uuid;
  v_email text;
  v_nome text;
  v_fallback_prof_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir professores.';
  END IF;

  SELECT perfil_id, email, nome_completo INTO v_perfil_id, v_email, v_nome FROM public.professores WHERE id = p_professor_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Professor não encontrado');
  END IF;

  -- Proteção para contas mestres
  IF lower(v_email) = 'r71020142@gmail.com' THEN
    RAISE EXCEPTION 'Não é permitido excluir a conta mestre do sistema.';
  END IF;

  -- Busca outro professor ativo como fallback para turmas onde ele era o único docente
  SELECT id INTO v_fallback_prof_id FROM public.professores WHERE id <> p_professor_id AND status = 'ativo' ORDER BY created_at ASC LIMIT 1;

  -- Se ele for o titular de alguma turma:
  -- Se a turma tiver co-docentes, promove o próximo co-docente a titular
  -- Se não tiver outro docente na turma, usa o fallback ativo
  UPDATE public.turmas
  SET professor_id = COALESCE(
        (SELECT p FROM unnest(professores_ids) p WHERE p <> p_professor_id LIMIT 1),
        v_fallback_prof_id
      ),
      professores_ids = array_remove(professores_ids, p_professor_id)
  WHERE professor_id = p_professor_id;

  -- Remove do array professores_ids de todas as outras turmas
  UPDATE public.turmas
  SET professores_ids = array_remove(professores_ids, p_professor_id)
  WHERE p_professor_id = ANY(professores_ids);

  -- Atualiza aulas do cronograma que estavam com este professor para o fallback
  IF v_fallback_prof_id IS NOT NULL THEN
    UPDATE public.aulas SET professor_id = v_fallback_prof_id WHERE professor_id = p_professor_id;
    UPDATE public.series_aulas SET professor_id = v_fallback_prof_id WHERE professor_id = p_professor_id;
  END IF;

  -- Desassocia/Remove dependências acadêmicas do docente
  DELETE FROM public.acessos_usuarios WHERE professor_id = p_professor_id;
  UPDATE public.conquistas_concedidas SET professor_id = NULL WHERE professor_id = p_professor_id;
  UPDATE public.entregas_atividades SET professor_corretor_id = NULL WHERE professor_corretor_id = p_professor_id;
  UPDATE public.progresso_modulos_alunos SET validado_por_professor_id = NULL WHERE validado_por_professor_id = p_professor_id;
  UPDATE public.self_presentations SET professor_avaliador_id = NULL WHERE professor_avaliador_id = p_professor_id;

  -- Remove registro do professor
  DELETE FROM public.professores WHERE id = p_professor_id;

  -- Se houver perfil_id associado, remove de perfis
  IF v_perfil_id IS NOT NULL THEN
    DELETE FROM public.perfis WHERE id = v_perfil_id AND role = 'professor';
  END IF;

  RETURN jsonb_build_object('success', true, 'professor_id', p_professor_id, 'perfil_id', v_perfil_id, 'nome', v_nome);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
