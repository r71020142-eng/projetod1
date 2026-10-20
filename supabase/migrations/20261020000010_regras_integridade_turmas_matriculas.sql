-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 10 (REVISÃO COMPLEMENTAR DA ETAPA 10.3A)
-- Integridade Estrutural e Travas de Capacidade em Turmas e Matrículas
--
-- Objetivo:
-- Garantir que TODAS as operações diretas de INSERT e UPDATE em public.turmas
-- e public.matriculas_turmas (seja via interface, API, scripts ou clientes SQL)
-- respeitem estritamente as regras de negócio e limites de capacidade:
--
-- 1. Proibição de matrícula (nova ou transferência) em turma lotada (individual=1, grupo=capacidade).
-- 2. Proibição de reativação de matrícula (status -> 'ativa') em turma lotada.
-- 3. Proibição de matrícula em turma com status 'encerrada'.
-- 4. Proibição de redução de capacidade abaixo do número de discentes já matriculados ativamente.
-- 5. Proibição de alteração de modalidade para 'individual' quando houver mais de 1 matrícula ativa.
-- 6. Proibição de vincular discente inativo ou professor inativo.
-- 7. Serialização com lock FOR UPDATE na linha da turma durante inserções/atualizações de matrícula.
-- ==============================================================================

-- 1. TRIGGER DE INTEGRIDADE EM public.matriculas_turmas
-- Consolida e expande as validações de discente, status da turma e capacidade máxima.

CREATE OR REPLACE FUNCTION public.check_matricula_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aluno_status TEXT;
  v_aluno_nome TEXT;
  v_turma RECORD;
  v_contagem_ativas INTEGER;
BEGIN
  -- Regras aplicáveis a qualquer matrícula com status ativo
  IF NEW.status = 'ativa' THEN
    -- 1.1. Validação de status ativo do discente
    SELECT status, nome_completo INTO v_aluno_status, v_aluno_nome
    FROM public.alunos
    WHERE id = NEW.aluno_id;

    IF v_aluno_status IS NULL THEN
      RAISE EXCEPTION 'Discente não encontrado (ID: %).', NEW.aluno_id;
    END IF;

    IF v_aluno_status <> 'ativo' THEN
      RAISE EXCEPTION 'Não é permitido matricular o discente "%" pois seu cadastro está inativo.', v_aluno_nome;
    END IF;

    -- 1.2. Validação da turma com bloqueio de linha (FOR UPDATE) para serialização de concorrência
    SELECT id, nome, modalidade, capacidade, status INTO v_turma
    FROM public.turmas
    WHERE id = NEW.turma_id
    FOR UPDATE;

    IF v_turma.id IS NULL THEN
      RAISE EXCEPTION 'Turma não encontrada (ID: %).', NEW.turma_id;
    END IF;

    -- 1.3. Bloqueio de matrícula ou reativação em turma encerrada
    IF v_turma.status = 'encerrada' THEN
      RAISE EXCEPTION 'Não é permitido matricular ou reativar aluno na turma "%" pois ela está encerrada.', v_turma.nome;
    END IF;

    -- 1.4. Contagem atômica de matrículas ativas existentes na turma de destino
    -- Em caso de UPDATE da mesma matrícula na mesma turma, exclui a própria linha da contagem
    SELECT count(*) INTO v_contagem_ativas
    FROM public.matriculas_turmas
    WHERE turma_id = NEW.turma_id
      AND status = 'ativa'
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    -- 1.5. Bloqueio de excesso de capacidade
    IF v_turma.modalidade = 'individual' AND v_contagem_ativas >= 1 THEN
      RAISE EXCEPTION 'A turma individual "%" já atingiu a capacidade máxima (1 aluno).', v_turma.nome;
    END IF;

    IF v_turma.modalidade = 'grupo' AND v_contagem_ativas >= v_turma.capacidade THEN
      RAISE EXCEPTION 'A turma "%" atingiu a capacidade máxima planejada (% alunos).', v_turma.nome, v_turma.capacidade;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Substitui o trigger anterior com a versão completa
DROP TRIGGER IF EXISTS trg_matriculas_turmas_check_aluno_ativo ON public.matriculas_turmas;
DROP TRIGGER IF EXISTS trg_matriculas_turmas_check_integridade ON public.matriculas_turmas;

CREATE TRIGGER trg_matriculas_turmas_check_integridade
BEFORE INSERT OR UPDATE OF turma_id, aluno_id, status ON public.matriculas_turmas
FOR EACH ROW
EXECUTE FUNCTION public.check_matricula_integridade();


-- 2. TRIGGER DE INTEGRIDADE EM public.turmas
-- Garante capacidade mínima, consistência de modalidade e professor ativo.

CREATE OR REPLACE FUNCTION public.check_turma_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_prof_status TEXT;
  v_prof_nome TEXT;
  v_contagem_ativas INTEGER;
BEGIN
  -- 2.1. Validação de status ativo do professor (na criação ou quando o professor_id for alterado)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.professor_id <> OLD.professor_id) THEN
    SELECT status, nome_completo INTO v_prof_status, v_prof_nome
    FROM public.professores
    WHERE id = NEW.professor_id;

    IF v_prof_status IS NULL THEN
      RAISE EXCEPTION 'Professor não encontrado (ID: %).', NEW.professor_id;
    END IF;

    IF v_prof_status <> 'ativo' THEN
      RAISE EXCEPTION 'Não é permitido associar uma turma ao docente "%" pois seu cadastro está inativo.', v_prof_nome;
    END IF;
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
$$;

-- Substitui o trigger anterior com a versão completa
DROP TRIGGER IF EXISTS trg_turmas_check_professor_ativo ON public.turmas;
DROP TRIGGER IF EXISTS trg_turmas_check_integridade ON public.turmas;

CREATE TRIGGER trg_turmas_check_integridade
BEFORE INSERT OR UPDATE OF professor_id, capacidade, modalidade, status ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.check_turma_integridade();
