-- Migração: Adicionar campos de background do aluno na tabela public.alunos
-- Data: 2026-11-15

ALTER TABLE public.alunos
ADD COLUMN IF NOT EXISTS idade INT,
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS nivel_escolar TEXT,
ADD COLUMN IF NOT EXISTS profissao TEXT,
ADD COLUMN IF NOT EXISTS nacionalidade TEXT,
ADD COLUMN IF NOT EXISTS sobre_aluno TEXT,
ADD COLUMN IF NOT EXISTS interesses TEXT,
ADD COLUMN IF NOT EXISTS biografia TEXT;
