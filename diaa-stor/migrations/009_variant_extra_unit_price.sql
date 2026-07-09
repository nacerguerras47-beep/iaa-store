-- Add extra_unit_price per variant
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS extra_unit_price NUMERIC(10,2) CHECK (extra_unit_price IS NULL OR extra_unit_price >= 0);
