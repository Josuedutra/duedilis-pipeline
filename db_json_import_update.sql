-- Run this in your Supabase SQL Editor to support the new JSON import structure

ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS cenario_usado TEXT,
ADD COLUMN IF NOT EXISTS otimizacoes_aplicadas JSONB, -- Array of strings
ADD COLUMN IF NOT EXISTS requisitos_validar JSONB,    -- Array of strings
ADD COLUMN IF NOT EXISTS dependencia_lote TEXT,
ADD COLUMN IF NOT EXISTS orcamento JSONB;             -- New simplified budget structure

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
