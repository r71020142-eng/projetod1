-- Rollback: 20261120000031_exercicios_ia_audio.sql
ALTER TABLE public.exercicios_interativos
  DROP COLUMN IF EXISTS audio_texto_hash,
  DROP COLUMN IF EXISTS audio_status,
  DROP COLUMN IF EXISTS audio_provedor,
  DROP COLUMN IF EXISTS audio_voz_id,
  DROP COLUMN IF EXISTS audio_voz_nome,
  DROP COLUMN IF EXISTS audio_velocidade,
  DROP COLUMN IF EXISTS audio_gerado_em,
  DROP COLUMN IF EXISTS audio_is_ia,
  DROP COLUMN IF EXISTS conteudo_gerado_por_ia,
  DROP COLUMN IF EXISTS ia_prompt_meta;
