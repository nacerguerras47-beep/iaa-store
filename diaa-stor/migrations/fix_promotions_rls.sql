-- Fix RLS: Ensure public SELECT policy exists on promotions table
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active promotions" ON promotions;
CREATE POLICY "Public can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Service role full access on promotions" ON promotions;
CREATE POLICY "Service role full access on promotions"
  ON promotions FOR ALL
  USING (auth.role() = 'service_role');
