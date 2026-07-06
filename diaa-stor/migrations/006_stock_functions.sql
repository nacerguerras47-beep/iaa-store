-- Stock management functions for order status changes
-- Run in Supabase Dashboard → SQL Editor

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
