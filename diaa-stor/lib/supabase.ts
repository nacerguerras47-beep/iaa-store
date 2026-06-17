import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Defensive runtime check.
 *
 * If you are seeing "supabaseKey is required" in the browser console even
 * after splitting supabase.ts / supabaseAdmin.ts, it means one of these two
 * NEXT_PUBLIC_ variables is missing, empty, or misspelled in your Netlify
 * environment variables — NOT a code bug.
 *
 * NEXT_PUBLIC_ variables are baked into the client bundle at BUILD TIME.
 * If they are not set when Netlify runs `npm run build`, every page that
 * imports { supabase } — including the homepage and the product page —
 * receives `undefined` for the key, and createClient() throws immediately
 * when the module is first evaluated, crashing the entire React tree before
 * it can render. This looks like a hydration error in the browser console
 * (#418 / #423) but the real error just above it — "supabaseKey is
 * required" — is the actual root cause.
 *
 * To fix this on Netlify:
 *   1. Site configuration → Environment variables
 *   2. Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *      are present, spelled exactly like this (case-sensitive), and have
 *      no leading/trailing spaces or quotes in the value field.
 *   3. Deploys → Trigger deploy → "Clear cache and deploy site"
 *      (a normal redeploy reuses the old build cache and will NOT pick up
 *      newly added environment variables — you must clear the cache).
 */
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl     && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ')

  throw new Error(
    `[Diaa Store] Missing required environment variable(s): ${missing}. ` +
    `Set them in Netlify → Site configuration → Environment variables, ` +
    `then redeploy with "Clear cache and deploy site".`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
