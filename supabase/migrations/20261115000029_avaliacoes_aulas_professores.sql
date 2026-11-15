-- Migração: Avaliações de Aulas e Professores pelos Alunos
-- Data: 2026-11-15

CREATE TABLE IF NOT EXISTS public.avaliacoes_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.professores(id) ON DELETE SET NULL,
  nota_aula INT NOT NULL CHECK (nota_aula >= 0 AND nota_aula <= 10),
  opiniao_aula TEXT,
  nota_professor INT NOT NULL CHECK (nota_professor >= 0 AND nota_professor <= 10),
  opiniao_professor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_avaliacoes_aulas_aula_aluno UNIQUE (aula_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_aulas_aula ON public.avaliacoes_aulas(aula_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aulas_aluno ON public.avaliacoes_aulas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aulas_professor ON public.avaliacoes_aulas(professor_id);

ALTER TABLE public.avaliacoes_aulas ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.avaliacoes_aulas TO authenticated, service_role;

DROP POLICY IF EXISTS admin_all_avaliacoes_aulas ON public.avaliacoes_aulas;
CREATE POLICY admin_all_avaliacoes_aulas ON public.avaliacoes_aulas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS professor_select_avaliacoes_aulas ON public.avaliacoes_aulas;
CREATE POLICY professor_select_avaliacoes_aulas ON public.avaliacoes_aulas
  FOR SELECT TO authenticated
  USING (public.get_current_professor_id() IS NOT NULL OR public.get_auth_role() = 'professor');

DROP POLICY IF EXISTS aluno_manage_own_avaliacoes ON public.avaliacoes_aulas;
CREATE POLICY aluno_manage_own_avaliacoes ON public.avaliacoes_aulas
  FOR ALL TO authenticated
  USING (
    aluno_id::text = (SELECT aluno_id FROM public.perfis WHERE id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    aluno_id::text = (SELECT aluno_id FROM public.perfis WHERE id = auth.uid())
    OR public.is_admin()
  );
