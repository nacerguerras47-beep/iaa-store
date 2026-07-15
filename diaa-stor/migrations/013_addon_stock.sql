-- Add stock column to product_addons
ALTER TABLE product_addons ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0);

-- Decrement addon stock (used when confirming an order)
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
    RAISE WARNING 'Stock insuffisant pour addon % (demandé: %)', pid, qty;
  END IF;

  RETURN new_stock;
END;
$$ LANGUAGE plpgsql;

-- Increment addon stock (used when cancelling a confirmed order)
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
