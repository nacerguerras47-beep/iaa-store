-- Update total_price → recalculate unit_price: unit_price = (total - delivery) / quantity
CREATE OR REPLACE FUNCTION update_order_total_price(p_order_number text, p_new_total numeric)
RETURNS SETOF orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_quantity numeric;
  v_delivery numeric;
  v_unit numeric;
BEGIN
  SELECT quantity, delivery_price INTO v_quantity, v_delivery
  FROM orders WHERE order_number = p_order_number;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_unit := ROUND((p_new_total - COALESCE(v_delivery, 0)) / GREATEST(COALESCE(v_quantity, 1), 1));

  RETURN QUERY
  UPDATE orders
  SET total_price = p_new_total,
      unit_price  = v_unit,
      updated_at  = NOW()
  WHERE order_number = p_order_number
  RETURNING *;
END;
$$;

-- Update unit_price → recalculate total_price: total_price = unit_price * quantity + delivery
CREATE OR REPLACE FUNCTION update_order_unit_price(p_order_number text, p_new_unit_price numeric)
RETURNS SETOF orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_quantity numeric;
  v_delivery numeric;
  v_total numeric;
BEGIN
  SELECT quantity, delivery_price INTO v_quantity, v_delivery
  FROM orders WHERE order_number = p_order_number;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_total := ROUND(p_new_unit_price * GREATEST(COALESCE(v_quantity, 1), 1) + COALESCE(v_delivery, 0));

  RETURN QUERY
  UPDATE orders
  SET unit_price   = p_new_unit_price,
      total_price  = v_total,
      updated_at   = NOW()
  WHERE order_number = p_order_number
  RETURNING *;
END;
$$;
