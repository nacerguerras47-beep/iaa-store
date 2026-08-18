-- Migration 016: variant_id on orders + guaranteed stock RPCs
-- Run in Supabase Dashboard → SQL Editor

-- 1) Store the exact variant UUID on the order (replaces fragile name matching)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- 2) Recreate ALL stock RPCs (safe — CREATE OR REPLACE guarantees they exist)
CREATE OR REPLACE FUNCTION decrement_stock(pid UUID, qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE products
    SET stock = stock - qty
    WHERE id = pid AND stock >= qty
    RETURNING stock INTO new_stock;

  IF new_stock IS NULL THEN
    RAISE WARNING 'Stock insuffisant pour le produit % (demandé: %)', pid, qty;
  END IF;

  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_stock(pid UUID, qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE products
    SET stock = stock + qty
    WHERE id = pid
    RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION decrement_addon_stock(pid UUID, qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE product_addons
    SET stock = stock - qty
    WHERE id = pid AND stock >= qty
    RETURNING stock INTO new_stock;

  IF new_stock IS NULL THEN
    RAISE WARNING 'Stock insuffisant pour l''addon % (demandé: %)', pid, qty;
  END IF;

  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_addon_stock(pid UUID, qty INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE product_addons
    SET stock = stock + qty
    WHERE id = pid
    RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;
