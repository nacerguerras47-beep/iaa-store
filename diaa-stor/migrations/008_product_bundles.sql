-- Product Bundles table (replaces JSON bundles column)
-- Each bundle can optionally be tied to a specific variant via variant_id
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS product_bundles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  quantity_trigger INTEGER CHECK (quantity_trigger IS NULL OR quantity_trigger >= 0),
  discount_percent NUMERIC(5,2) CHECK (discount_percent IS NULL OR discount_percent >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_product ON product_bundles (product_id);
CREATE INDEX IF NOT EXISTS idx_bundles_variant ON product_bundles (variant_id);

-- Migrate existing JSON bundles from products.bundles
DO $$
DECLARE
  rec RECORD;
  i INTEGER;
  bundle_obj JSONB;
BEGIN
  FOR rec IN SELECT id, bundles FROM products WHERE jsonb_typeof(bundles::jsonb) = 'array' AND bundles::jsonb != '[]'::jsonb LOOP
    i := 0;
    FOR bundle_obj IN SELECT * FROM jsonb_array_elements(rec.bundles::jsonb) LOOP
      INSERT INTO product_bundles (product_id, name, price, quantity_trigger, discount_percent, sort_order, is_active)
      VALUES (
        rec.id,
        (bundle_obj->>'name')::TEXT,
        COALESCE((bundle_obj->>'price')::NUMERIC, 0),
        (bundle_obj->>'quantity_trigger')::INTEGER,
        (bundle_obj->>'discount_percent')::NUMERIC(5,2),
        i,
        TRUE
      );
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;

-- Public can read active bundles
CREATE POLICY "Public can view active bundles"
  ON product_bundles FOR SELECT
  USING (is_active = TRUE);

-- Service role full access
CREATE POLICY "Service role full access on bundles"
  ON product_bundles FOR ALL
  USING (auth.role() = 'service_role');
