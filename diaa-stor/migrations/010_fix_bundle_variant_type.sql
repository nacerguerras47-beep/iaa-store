-- Fix: change variant_id from UUID to TEXT (stores variant name, matching code)
-- Run in Supabase Dashboard → SQL Editor

-- Drop the FK constraint first
ALTER TABLE product_bundles
  DROP CONSTRAINT IF EXISTS product_bundles_variant_id_fkey;

-- Change type to TEXT
ALTER TABLE product_bundles
  ALTER COLUMN variant_id TYPE TEXT;
