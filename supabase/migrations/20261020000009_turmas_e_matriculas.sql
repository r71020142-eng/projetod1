-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 9 (ETAPA 10.3A)
-- Migração de Turmas e Matrículas para o Supabase PostgreSQL
--
-- Entidades:
-- 1. public.turmas
-- 2. public.matriculas_turmas
--
-- Regras de Negócio e Segurança:
-- - Relacionamento N:N normalizado via matriculas_turmas (sem arrays/JSON de alunos).
-- - Turma individual com capacidade rigorosamente = 1.
-- - Turma em grupo com capacidade configurável (>= 1).
-- - Bloqueio de matrícula duplicada ativa (UNIQUE partial index).
-- - Bloqueio de novas turmas com professores inativos (trigger de integridade).
-- - Bloqueio de matrícula para alunos inativos (trigger e RPC com lock).
-- - Bloqueio de matrícula em turma encerrada.
-- - Bloqueio de deleção física (inativação e encerramento lógico com auditoria).
-- - RLS estrito: Anon bloqueado; Admin pleno; Professor lê apenas turmas sob sua
--   responsabilidade; Aluno lê apenas turmas em que está matriculado ativamente.
-- - Funções transacionais atômicas com SELECT ... FOR UPDATE contra race conditions.
-- ==============================================================================

-- 1. TABELA public.turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  modalidade TEXT NOT NULL CHECK (modalidade IN ('individual', 'grupo')),
  nivel TEXT NOT NULL DEFAULT 'nao_definido' CHECK (nivel IN ('nao_definido', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  objetivo_principal TEXT NOT NULL DEFAULT 'Geral',
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE RESTRICT,
  capacidade INTEGER NOT NULL CHECK (capacidade >= 1),
  status TEXT NOT NULL DEFAULT 'formacao' CHECK (status IN ('formacao', 'ativa', 'pausada', 'encerrada')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Regra estrutural: turma individual exige capacidade exatamente igual a 1
  CONSTRAINT chk_turma_individual_capacidade CHECK (modalidade <> 'individual' OR capacidade = 1)
);

-- Índices em public.turmas
CREATE INDEX IF NOT EXISTS idx_turmas_professor_id ON public.turmas(professor_id);
CREATE INDEX IF NOT EXISTS idx_turmas_status ON public.turmas(status);
CREATE INDEX IF NOT EXISTS idx_turmas_modalidade ON public.turmas(modalidade);
CREATE INDEX IF NOT EXISTS idx_turmas_nivel ON public.turmas(nivel);
CREATE INDEX IF NOT EXISTS idx_turmas_created_at ON public.turmas(created_at DESC);

-- Trigger de updated_at para turmas
DROP TRIGGER IF EXISTS trg_turmas_updated_at ON public.turmas;
CREATE TRIGGER trg_turmas_updated_at
BEFORE UPDATE ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger de auditoria operacional para turmas
DROP TRIGGER IF EXISTS trg_turmas_auditoria ON public.turmas;
CREATE TRIGGER trg_turmas_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.log_entidade_operacional_auditoria();

-- Trigger de integridade: proíbe associar turma a professor inativo
CREATE OR REPLACE FUNCTION public.check_turma_professor_ativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_status TEXT;
  v_prof_nome TEXT;
BEGIN
  SELECT status, nome_completo INTO v_prof_status, v_prof_nome
  FROM public.professores
  WHERE id = NEW.professor_id;

  IF v_prof_status IS NULL THEN
    RAISE EXCEPTION 'Professor não encontrado (ID: %).', NEW.professor_id;
  END IF;

  IF v_prof_status <> 'ativo' THEN
    RAISE EXCEPTION 'Não é permitido associar uma turma ao docente "%" pois seu cadastro está inativo.', v_prof_nome;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turmas_check_professor_ativo ON public.turmas;
CREATE TRIGGER trg_turmas_check_professor_ativo
BEFORE INSERT OR UPDATE OF professor_id ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.check_turma_professor_ativo();

-- 2. TABELA public.matriculas_turmas
CREATE TABLE IF NOT EXISTS public.matriculas_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'cancelada')),
  matriculado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  encerrado_em TIMESTAMPTZ,
  motivo_encerramento TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices em public.matriculas_turmas
CREATE INDEX IF NOT EXISTS idx_matriculas_turmas_turma_id ON public.matriculas_turmas(turma_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turmas_aluno_id ON public.matriculas_turmas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turmas_status ON public.matriculas_turmas(status);

-- Unicidade parcial: o mesmo discente não pode possuir mais de uma matrícula ativa na mesma turma
CREATE UNIQUE INDEX IF NOT EXISTS idx_matriculas_turmas_ativa_unica
ON public.matriculas_turmas (turma_id, aluno_id)
WHERE status = 'ativa';

-- Trigger de updated_at para matriculas_turmas
DROP TRIGGER IF EXISTS trg_matriculas_turmas_updated_at ON public.matriculas_turmas;
CREATE TRIGGER trg_matriculas_turmas_updated_at
BEFORE UPDATE ON public.matriculas_turmas
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger de auditoria operacional para matriculas_turmas
DROP TRIGGER IF EXISTS trg_matriculas_turmas_auditoria ON public.matriculas_turmas;
CREATE TRIGGER trg_matriculas_turmas_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.matriculas_turmas
FOR EACH ROW
EXECUTE FUNCTION public.log_entidade_operacional_auditoria();

-- Trigger de integridade: proíbe matricular aluno inativo
CREATE OR REPLACE FUNCTION public.check_matricula_aluno_ativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_status TEXT;
  v_aluno_nome TEXT;
BEGIN
  -- Apenas valida em novas matrículas ativas ou reativação de matrícula
  IF NEW.status = 'ativa' THEN
    SELECT status, nome_completo INTO v_aluno_status, v_aluno_nome
    FROM public.alunos
    WHERE id = NEW.aluno_id;

    IF v_aluno_status IS NULL THEN
      RAISE EXCEPTION 'Aluno não encontrado (ID: %).', NEW.aluno_id;
    END IF;

    IF v_aluno_status <> 'ativo' THEN
      RAISE EXCEPTION 'Não é permitido matricular o discente "%" pois seu cadastro está inativo.', v_aluno_nome;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matriculas_turmas_check_aluno_ativo ON public.matriculas_turmas;
CREATE TRIGGER trg_matriculas_turmas_check_aluno_ativo
BEFORE INSERT OR UPDATE OF aluno_id, status ON public.matriculas_turmas
FOR EACH ROW
EXECUTE FUNCTION public.check_matricula_aluno_ativo();

-- 3. FUNÇÕES AUXILIARES DE RESOLUÇÃO DE IDENTIDADE PARA RLS
CREATE OR REPLACE FUNCTION public.get_current_professor_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_prof_id
  FROM public.professores
  WHERE perfil_id = auth.uid()
  LIMIT 1;
  RETURN v_prof_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_aluno_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_aluno_id
  FROM public.alunos
  WHERE perfil_id = auth.uid()
  LIMIT 1;
  RETURN v_aluno_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_professor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_professor_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_current_aluno_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_aluno_id() TO authenticated, service_role;

-- 4. FUNÇÕES TRANSACIONAIS CONCORRENTES (RPC COM LOCK FOR UPDATE)

-- 4.1. Matricular Aluno com Bloqueio de Concorrência
CREATE OR REPLACE FUNCTION public.matricular_aluno_turma(
  p_turma_id UUID,
  p_aluno_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_turma RECORD;
  v_aluno RECORD;
  v_contagem_ativas INTEGER;
  v_nova_matricula_id UUID;
  v_caller_role public.user_role;
  v_caller_uid UUID;
BEGIN
  -- Autorização: apenas admin ativo ou service_role
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL THEN
    v_caller_role := public.get_auth_role();
    IF v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem matricular discentes em turmas.';
    END IF;
  END IF;

  -- Lock na turma (SELECT ... FOR UPDATE) para serializar concorrência
  SELECT * INTO v_turma
  FROM public.turmas
  WHERE id = p_turma_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada (ID: %).', p_turma_id;
  END IF;

  IF v_turma.status = 'encerrada' THEN
    RAISE EXCEPTION 'Não é permitido matricular alunos em uma turma encerrada.';
  END IF;

  -- Validação do aluno
  SELECT * INTO v_aluno
  FROM public.alunos
  WHERE id = p_aluno_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado (ID: %).', p_aluno_id;
  END IF;

  IF v_aluno.status <> 'ativo' THEN
    RAISE EXCEPTION 'O discente "%" está inativo. Apenas alunos com matrícula ativa podem ser vinculados.', v_aluno.nome_completo;
  END IF;

  -- Verificação de duplicidade ativa
  IF EXISTS (
    SELECT 1 FROM public.matriculas_turmas
    WHERE turma_id = p_turma_id
      AND aluno_id = p_aluno_id
      AND status = 'ativa'
  ) THEN
    RAISE EXCEPTION 'Este discente já está matriculado nesta turma.';
  END IF;

  -- Contagem atômica dentro da transação protegida por lock
  SELECT count(*) INTO v_contagem_ativas
  FROM public.matriculas_turmas
  WHERE turma_id = p_turma_id
    AND status = 'ativa';

  -- Validação de capacidade
  IF v_turma.modalidade = 'individual' AND v_contagem_ativas >= 1 THEN
    RAISE EXCEPTION 'Turma individual já atingiu a capacidade máxima (1 aluno).';
  END IF;

  IF v_turma.modalidade = 'grupo' AND v_contagem_ativas >= v_turma.capacidade THEN
    RAISE EXCEPTION 'A turma atingiu a capacidade máxima planejada (% alunos).', v_turma.capacidade;
  END IF;

  -- Inserção da matrícula
  INSERT INTO public.matriculas_turmas (
    turma_id,
    aluno_id,
    status,
    matriculado_em,
    motivo_encerramento,
    criado_por
  ) VALUES (
    p_turma_id,
    p_aluno_id,
    'ativa',
    now(),
    p_motivo,
    v_caller_uid
  )
  RETURNING id INTO v_nova_matricula_id;

  RETURN jsonb_build_object(
    'success', true,
    'matricula_id', v_nova_matricula_id,
    'turma_id', p_turma_id,
    'aluno_id', p_aluno_id,
    'capacidade', v_turma.capacidade,
    'total_matriculados', v_contagem_ativas + 1,
    'modalidade', v_turma.modalidade
  );
END;
$$;

-- 4.2. Encerrar Matrícula (preservando datas e histórico)
CREATE OR REPLACE FUNCTION public.encerrar_matricula_aluno(
  p_turma_id UUID,
  p_aluno_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_matricula RECORD;
  v_caller_role public.user_role;
  v_caller_uid UUID;
BEGIN
  -- Autorização: apenas admin ativo ou service_role
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL THEN
    v_caller_role := public.get_auth_role();
    IF v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem encerrar matrículas.';
    END IF;
  END IF;

  SELECT * INTO v_matricula
  FROM public.matriculas_turmas
  WHERE turma_id = p_turma_id
    AND aluno_id = p_aluno_id
    AND status = 'ativa'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matrícula ativa não encontrada para o aluno informado nesta turma.';
  END IF;

  UPDATE public.matriculas_turmas
  SET status = 'encerrada',
      encerrado_em = now(),
      motivo_encerramento = COALESCE(p_motivo, 'Encerramento administrativo'),
      updated_at = now()
  WHERE id = v_matricula.id;

  RETURN jsonb_build_object(
    'success', true,
    'matricula_id', v_matricula.id,
    'turma_id', p_turma_id,
    'aluno_id', p_aluno_id,
    'status', 'encerrada',
    'encerrado_em', now()
  );
END;
$$;

-- 4.3. Alterar Capacidade com Lock e Validação
CREATE OR REPLACE FUNCTION public.alterar_capacidade_turma(
  p_turma_id UUID,
  p_nova_capacidade INTEGER
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
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL THEN
    v_caller_role := public.get_auth_role();
    IF v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem alterar a capacidade de turmas.';
    END IF;
  END IF;

  SELECT * INTO v_turma
  FROM public.turmas
  WHERE id = p_turma_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada (ID: %).', p_turma_id;
  END IF;

  IF v_turma.modalidade = 'individual' AND p_nova_capacidade <> 1 THEN
    RAISE EXCEPTION 'Turmas individuais devem ter capacidade estritamente igual a 1.';
  END IF;

  IF p_nova_capacidade < 1 THEN
    RAISE EXCEPTION 'A capacidade deve ser de no mínimo 1 aluno.';
  END IF;

  SELECT count(*) INTO v_contagem_ativas
  FROM public.matriculas_turmas
  WHERE turma_id = p_turma_id AND status = 'ativa';

  IF p_nova_capacidade < v_contagem_ativas THEN
    RAISE EXCEPTION 'A nova capacidade (%) não pode ser menor que o total de alunos já matriculados (%).',
      p_nova_capacidade, v_contagem_ativas;
  END IF;

  UPDATE public.turmas
  SET capacidade = p_nova_capacidade,
      updated_at = now()
  WHERE id = p_turma_id;

  RETURN jsonb_build_object(
    'success', true,
    'turma_id', p_turma_id,
    'capacidade_anterior', v_turma.capacidade,
    'nova_capacidade', p_nova_capacidade
  );
END;
$$;

-- 4.4. Trocar Professor Responsável com Validação de Status Ativo
CREATE OR REPLACE FUNCTION public.trocar_professor_turma(
  p_turma_id UUID,
  p_novo_professor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_turma RECORD;
  v_prof RECORD;
  v_caller_role public.user_role;
  v_caller_uid UUID;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL THEN
    v_caller_role := public.get_auth_role();
    IF v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores ativos podem trocar o professor da turma.';
    END IF;
  END IF;

  SELECT * INTO v_turma
  FROM public.turmas
  WHERE id = p_turma_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada (ID: %).', p_turma_id;
  END IF;

  SELECT * INTO v_prof
  FROM public.professores
  WHERE id = p_novo_professor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professor não encontrado (ID: %).', p_novo_professor_id;
  END IF;

  IF v_prof.status <> 'ativo' THEN
    RAISE EXCEPTION 'O professor "%" está inativo. Apenas docentes com cadastro ativo podem ser associados a turmas.', v_prof.nome_completo;
  END IF;

  UPDATE public.turmas
  SET professor_id = p_novo_professor_id,
      updated_at = now()
  WHERE id = p_turma_id;

  RETURN jsonb_build_object(
    'success', true,
    'turma_id', p_turma_id,
    'professor_anterior_id', v_turma.professor_id,
    'novo_professor_id', p_novo_professor_id,
    'novo_professor_nome', v_prof.nome_completo
  );
END;
$$;

-- Permissões de Execução nas RPCs Transacionais
REVOKE ALL ON FUNCTION public.matricular_aluno_turma(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matricular_aluno_turma(UUID, UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.encerrar_matricula_aluno(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encerrar_matricula_aluno(UUID, UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.alterar_capacidade_turma(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_capacidade_turma(UUID, INTEGER) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.trocar_professor_turma(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trocar_professor_turma(UUID, UUID) TO authenticated, service_role;

-- 5. BLOQUEIO DE EXCLUSÃO FÍSICA
REVOKE DELETE ON public.turmas FROM PUBLIC, anon, authenticated;
REVOKE DELETE ON public.matriculas_turmas FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_turmas_prevent_client_physical_delete ON public.turmas;
CREATE TRIGGER trg_turmas_prevent_client_physical_delete
BEFORE DELETE ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_physical_delete();

DROP TRIGGER IF EXISTS trg_matriculas_turmas_prevent_client_physical_delete ON public.matriculas_turmas;
CREATE TRIGGER trg_matriculas_turmas_prevent_client_physical_delete
BEFORE DELETE ON public.matriculas_turmas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_physical_delete();

-- 6. ROW LEVEL SECURITY (RLS) E MENOR PRIVILÉGIO

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas_turmas ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas existentes (garantindo idempotência)
DROP POLICY IF EXISTS admin_all_turmas ON public.turmas;
DROP POLICY IF EXISTS admin_select_turmas ON public.turmas;
DROP POLICY IF EXISTS admin_insert_turmas ON public.turmas;
DROP POLICY IF EXISTS admin_update_turmas ON public.turmas;
DROP POLICY IF EXISTS professor_select_turmas ON public.turmas;
DROP POLICY IF EXISTS aluno_select_turmas ON public.turmas;

DROP POLICY IF EXISTS admin_all_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS admin_select_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS admin_insert_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS admin_update_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS professor_select_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS aluno_select_matriculas ON public.matriculas_turmas;

-- 6.1. Políticas em public.turmas

-- ADMIN: SELECT pleno
CREATE POLICY admin_select_turmas
ON public.turmas
FOR SELECT
TO authenticated
USING (public.is_admin());

-- ADMIN: INSERT pleno
CREATE POLICY admin_insert_turmas
ON public.turmas
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ADMIN: UPDATE pleno
CREATE POLICY admin_update_turmas
ON public.turmas
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PROFESSOR ATIVO: SELECT apenas das turmas sob sua responsabilidade
CREATE POLICY professor_select_turmas
ON public.turmas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND professor_id = public.get_current_professor_id()
);

-- ALUNO ATIVO: SELECT apenas das turmas nas quais possui matrícula ativa
CREATE POLICY aluno_select_turmas
ON public.turmas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'aluno'
  AND id IN (
    SELECT m.turma_id
    FROM public.matriculas_turmas m
    WHERE m.aluno_id = public.get_current_aluno_id()
      AND m.status = 'ativa'
  )
);

-- 6.2. Políticas em public.matriculas_turmas

-- ADMIN: SELECT pleno
CREATE POLICY admin_select_matriculas
ON public.matriculas_turmas
FOR SELECT
TO authenticated
USING (public.is_admin());

-- ADMIN: INSERT pleno
CREATE POLICY admin_insert_matriculas
ON public.matriculas_turmas
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ADMIN: UPDATE pleno
CREATE POLICY admin_update_matriculas
ON public.matriculas_turmas
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PROFESSOR ATIVO: SELECT das matrículas de suas turmas
CREATE POLICY professor_select_matriculas
ON public.matriculas_turmas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND turma_id IN (
    SELECT t.id
    FROM public.turmas t
    WHERE t.professor_id = public.get_current_professor_id()
  )
);

-- ALUNO ATIVO: SELECT apenas das próprias matrículas
CREATE POLICY aluno_select_matriculas
ON public.matriculas_turmas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'aluno'
  AND aluno_id = public.get_current_aluno_id()
);

-- Concessões de tabela (DML)
GRANT SELECT, INSERT, UPDATE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.matriculas_turmas TO authenticated;
GRANT ALL ON public.matriculas_turmas TO service_role;
