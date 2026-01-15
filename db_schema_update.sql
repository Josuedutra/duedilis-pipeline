-- Run this in your Supabase SQL Editor

ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS orcamento_detalhado JSONB;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
