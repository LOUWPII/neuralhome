-- Migrations for pgvector RAG pipeline
-- Run this in your Supabase SQL Editor

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to concepts table
ALTER TABLE concepts 
ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. Add chunk_text to store the original chunk the embedding was generated from
ALTER TABLE concepts
ADD COLUMN IF NOT EXISTS chunk_text text;

-- 4. Create an HNSW index for fast similarity search (much faster than brute force)
CREATE INDEX IF NOT EXISTS concepts_embedding_idx 
ON concepts USING hnsw (embedding vector_cosine_ops);

-- 5. Create a function to search concepts by vector similarity
CREATE OR REPLACE FUNCTION match_concepts(
  query_embedding vector(384),
  palace_id_filter uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  label text,
  context text,
  feynman_summary text,
  chunk_text text,
  model_type text,
  position_x float,
  position_y float,
  position_z float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.label,
    c.context,
    c.feynman_summary,
    c.chunk_text,
    c.model_type,
    c.position_x,
    c.position_y,
    c.position_z,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM concepts c
  WHERE 
    c.palace_id = palace_id_filter
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
