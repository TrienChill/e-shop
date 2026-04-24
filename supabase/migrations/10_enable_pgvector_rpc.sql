-- Migration: Add embedding column (768 dims) + match_products RPC + HNSW index
-- Purpose: RAG pipeline for AI chatbot product recommendation
-- Using text-embedding-004 (768 dims) for HNSW index compatibility
-- NOTE: Supabase pgvector limits HNSW/IVFFlat indexes to max 2000 dimensions

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add or update embedding column to 768 dims
-- Handle case where column already exists with wrong dimensions (e.g., 3072)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- If column already exists, alter it to 768 dims
DO $$
BEGIN
  -- Check if column exists and has different dimension
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
    AND column_name = 'embedding'
  ) THEN
    -- Alter to 768 dims (will fail if data has >768 dims, but user must re-run generate_embeddings.js anyway)
    ALTER TABLE public.products ALTER COLUMN embedding TYPE vector(768);
  ELSE
    -- Add the column
    ALTER TABLE public.products ADD COLUMN embedding vector(768);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter embedding column: %. Re-create may be needed.', SQLERRM;
END
$$;

-- Step 3: Create HNSW index (drop existing if exists to recreate with correct dims)
DROP INDEX IF EXISTS idx_products_embedding_hnsw;
CREATE INDEX idx_products_embedding_hnsw
ON public.products
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 4: Create RPC function for vector similarity search
DROP FUNCTION IF EXISTS match_products(vector, float, int);
CREATE FUNCTION match_products(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id bigint,
  name text,
  description text,
  price numeric,
  images text[],
  category_id bigint,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.images,
    p.category_id,
    1 - (p.embedding <=> match_products.query_embedding) AS similarity
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND p.is_active = true
    AND (1 - (p.embedding <=> match_products.query_embedding)) >= match_threshold
  ORDER BY p.embedding <=> match_products.query_embedding
  LIMIT match_products.match_count;
END;
$$;

-- Step 5: Grant execute permission
GRANT EXECUTE ON FUNCTION match_products(vector, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION match_products(vector, float, int) TO anon;

-- Step 6: RLS policy
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
CREATE POLICY "Anyone can read products"
ON public.products
FOR SELECT
TO authenticated, anon
USING (true);
