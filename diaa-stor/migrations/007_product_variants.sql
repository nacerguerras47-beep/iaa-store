-- Product Variants table
-- Each product can have multiple variants (e.g. "5 mètres", "10 mètres")
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  promo_price NUMERIC(10,2) CHECK (promo_price IS NULL OR promo_price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants (product_id);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Public can read active variants
CREATE POLICY "Public can view active variants"
  ON product_variants FOR SELECT
  USING (is_active = TRUE);

-- Service role full access
CREATE POLICY "Service role full access on variants"
  ON product_variants FOR ALL
  USING (auth.role() = 'service_role');

-- RPC: decrement variant stock atomically
CREATE OR REPLACE FUNCTION decrement_variant_stock(pid UUID, qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE product_variants
    SET stock = stock - qty
    WHERE id = pid AND stock >= qty
    RETURNING stock INTO new_stock;

  IF new_stock IS NULL THEN
    RAISE WARNING 'Stock insuffisant pour le variant % (demandé: %)', pid, qty;
  END IF;

  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment variant stock
CREATE OR REPLACE FUNCTION increment_variant_stock(pid UUID, qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE product_variants
    SET stock = stock + qty
    WHERE id = pid
    RETURNING stock INTO new_stock;
  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;

-- Add variant_name column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_name TEXT;
