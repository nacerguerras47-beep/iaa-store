-- Add columns for Google Sheets bidirectional sync
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_expedie boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_livre boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paiement text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS net_price numeric DEFAULT 0;
