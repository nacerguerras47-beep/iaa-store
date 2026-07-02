-- Fix RLS: Allow public SELECT on product_addons and product_addon_tiers

ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_addon_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public SELECT on product_addons"
  ON product_addons FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public SELECT on product_addon_tiers"
  ON product_addon_tiers FOR SELECT
  TO public
  USING (true);
