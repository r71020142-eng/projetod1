-- Migração: Suporte a Múltiplos Professores por Turma
-- Permite vincular 2 ou mais professores na mesma turma mantendo compatibilidade retroativa.

ALTER TABLE public.turmas
ADD COLUMN IF NOT EXISTS professores_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- Preenche turmas legadas com o professor_id atual
UPDATE public.turmas
SET professores_ids = ARRAY[professor_id]
WHERE professores_ids IS NULL OR cardinality(professores_ids) = 0;

-- Atualiza trigger de integridade da turma para validar todos os professores atribuídos
CREATE OR REPLACE FUNCTION public.check_turma_integridade()
RETURNS trigger AS $$
DECLARE
  v_prof_status TEXT;
  v_prof_nome TEXT;
  v_contagem_ativas INTEGER;
  v_p_id UUID;
BEGIN
  -- 2.1. Validação de status ativo do professor principal
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.professor_id <> OLD.professor_id) THEN
    SELECT status, nome_completo INTO v_prof_status, v_prof_nome
    FROM public.professores
    WHERE id = NEW.professor_id;

    IF v_prof_status IS NULL THEN
      RAISE EXCEPTION 'Professor principal não encontrado (ID: %).', NEW.professor_id;
    END IF;

    IF v_prof_status <> 'ativo' THEN
      RAISE EXCEPTION 'Não é permitido associar uma turma ao docente "%" pois seu cadastro está inativo.', v_prof_nome;
    END IF;
  END IF;

  -- 2.1b. Validação dos professores_ids adicionais (se informados)
  IF NEW.professores_ids IS NOT NULL AND cardinality(NEW.professores_ids) > 0 THEN
    FOREACH v_p_id IN ARRAY NEW.professores_ids
    LOOP
      SELECT status, nome_completo INTO v_prof_status, v_prof_nome
      FROM public.professores
      WHERE id = v_p_id;

      IF v_prof_status IS NULL THEN
        RAISE EXCEPTION 'Professor não encontrado no corpo docente (ID: %).', v_p_id;
      END IF;

      IF v_prof_status <> 'ativo' THEN
        RAISE EXCEPTION 'Não é permitido associar o docente "%" à turma pois seu cadastro está inativo.', v_prof_nome;
      END IF;
    END LOOP;
  ELSE
    NEW.professores_ids := ARRAY[NEW.professor_id];
  END IF;

  -- Garante que o professor_id principal sempre esteja contido em professores_ids
  IF NOT (NEW.professor_id = ANY(NEW.professores_ids)) THEN
    NEW.professores_ids := array_prepend(NEW.professor_id, NEW.professores_ids);
  END IF;

  -- 2.2. Validação estrutural de turma individual
  IF NEW.modalidade = 'individual' AND NEW.capacidade <> 1 THEN
    RAISE EXCEPTION 'Turma individual deve ter capacidade rigorosamente igual a 1.';
  END IF;

  -- 2.3. Em atualizações, proíbe reduzir a capacidade abaixo das matrículas ativas existentes
  IF TG_OP = 'UPDATE' THEN
    SELECT count(*) INTO v_contagem_ativas
    FROM public.matriculas_turmas
    WHERE turma_id = NEW.id
      AND status = 'ativa';

    IF NEW.capacidade < v_contagem_ativas THEN
      RAISE EXCEPTION 'Não é permitido reduzir a capacidade para % pois a turma já possui % discente(s) matriculado(s) ativamente.', NEW.capacidade, v_contagem_ativas;
    END IF;

    IF NEW.modalidade = 'individual' AND v_contagem_ativas > 1 THEN
      RAISE EXCEPTION 'Não é permitido alterar a modalidade para individual pois a turma possui % discentes matriculados.', v_contagem_ativas;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza professor_has_matricula para verificar se o docente é responsável direto ou co-docente
CREATE OR REPLACE FUNCTION public.professor_has_matricula(p_turma_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas
    WHERE id = p_turma_id
      AND (
        professor_id = public.get_current_professor_id()
        OR (professores_ids IS NOT NULL AND public.get_current_professor_id() = ANY(professores_ids))
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Atualiza política RLS para permitir que qualquer professor vinculado (principal ou co-docente) visualize suas turmas
DROP POLICY IF EXISTS professor_select_turmas ON public.turmas;
CREATE POLICY professor_select_turmas ON public.turmas
FOR SELECT
USING (
  (get_auth_role() = 'professor'::user_role)
  AND (
    professor_id = get_current_professor_id()
    OR (professores_ids IS NOT NULL AND get_current_professor_id() = ANY(professores_ids))
  )
);
