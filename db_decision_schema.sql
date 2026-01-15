-- Run this in your Supabase SQL Editor

ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS relatorio_decisao JSONB;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
