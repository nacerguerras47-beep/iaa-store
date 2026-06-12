-- ============================================================
-- DIAA STORE — Complete Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLE: categories
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '📦',
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
-- TABLE: products
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  promo_price NUMERIC(10,2) CHECK (promo_price IS NULL OR promo_price >= 0),
  images      TEXT[]  NOT NULL DEFAULT '{}',
  category    TEXT,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  is_new      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products (is_visible);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- TABLE: orders
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number   TEXT NOT NULL UNIQUE,
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price     NUMERIC(10,2) NOT NULL,
  delivery_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price    NUMERIC(10,2) NOT NULL,
  last_name      TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address        TEXT NOT NULL,
  wilaya         TEXT NOT NULL,
  commune        TEXT NOT NULL,
  delivery_type  TEXT NOT NULL CHECK (delivery_type IN ('domicile','bureau')),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  nombre         INTEGER,   -- Admin manually sets this for sorting in Google Sheets
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_phone      ON orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_nombre     ON orders (nombre ASC NULLS LAST);

-- ────────────────────────────────────────────────────────────
-- TABLE: promotions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label            TEXT NOT NULL,
  discount_percent INTEGER CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 100)),
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
-- TABLE: banners
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  subtitle    TEXT DEFAULT '',
  button_text TEXT DEFAULT 'Explorer',
  link        TEXT DEFAULT '/',
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_banners_is_active    ON banners (is_active);
CREATE INDEX IF NOT EXISTS idx_banners_order_index  ON banners (order_index ASC);

-- ────────────────────────────────────────────────────────────
-- TABLE: settings  (key-value store for admin config)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('delivery_home_price',   '400'),
  ('delivery_office_price', '250'),
  ('whatsapp_number',       '213XXXXXXXXX'),
  ('store_name',            'Diaa Store'),
  ('store_email',           '')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;

-- ── products: anyone can read visible products, only service_role can write
CREATE POLICY "Public can view visible products"
  ON products FOR SELECT
  USING (is_visible = TRUE);

CREATE POLICY "Service role full access on products"
  ON products FOR ALL
  USING (auth.role() = 'service_role');

-- ── categories: anyone can read
CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role full access on categories"
  ON categories FOR ALL
  USING (auth.role() = 'service_role');

-- ── banners: anyone can read active banners
CREATE POLICY "Public can view active banners"
  ON banners FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Service role full access on banners"
  ON banners FOR ALL
  USING (auth.role() = 'service_role');

-- ── orders: public can insert (place orders), only service_role can read/update
CREATE POLICY "Public can create orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access on orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');

-- ── promotions: anyone can read active
CREATE POLICY "Public can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Service role full access on promotions"
  ON promotions FOR ALL
  USING (auth.role() = 'service_role');

-- ── settings: public can read (needed for delivery prices), service_role writes
CREATE POLICY "Public can read settings"
  ON settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role full access on settings"
  ON settings FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- STORAGE BUCKET: product-images
-- Run these in Supabase Dashboard → Storage (or via SQL):
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public to read images
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow service_role to upload/delete images
CREATE POLICY "Service role manage product images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-images' AND auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- SAMPLE DATA (optional — delete if you want a clean start)
-- ────────────────────────────────────────────────────────────
INSERT INTO categories (name, icon, slug) VALUES
  ('Éclairage',    '💡', 'eclairage'),
  ('Décoration',   '🪴', 'decoration'),
  ('Électronique', '⚡', 'electronique'),
  ('Maison',       '🏠', 'maison')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO banners (title, subtitle, button_text, link, is_active, order_index) VALUES
  ('Illuminate Your Shopping', 'Produits de qualité livrés partout en Algérie. Paiement à la livraison.', 'Explorer nos produits', '/#products', TRUE, 0)
ON CONFLICT DO NOTHING;

SELECT 'Schema installed successfully! ✅' AS status;
