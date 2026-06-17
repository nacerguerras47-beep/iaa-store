import { createClient } from '@supabase/supabase-js'

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey      = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * SERVER-ONLY Supabase client using the service role key.
 *
 * Import this ONLY from:
 *   - pages/api/**   (Next.js API routes — always server-side)
 *
 * NEVER import this from page components, hooks, or context files.
 * SUPABASE_SERVICE_ROLE_KEY is not a NEXT_PUBLIC_ variable and is
 * therefore completely absent from the client bundle. If this file is
 * ever imported by client-rendered code, createClient() throws
 * "supabaseKey is required" the moment the module loads, crashing
 * the page before React can render anything.
 *
 * If you see "supabaseKey is required" in production:
 *   1. First confirm no page/component file imports from
 *      'lib/supabaseAdmin' (only files under pages/api/** should).
 *   2. Then confirm SUPABASE_SERVICE_ROLE_KEY is set in
 *      Netlify → Site configuration → Environment variables.
 *   3. Redeploy with "Clear cache and deploy site" — env var changes
 *      are not picked up by a normal incremental redeploy.
 */
if (!supabaseUrl || !serviceRoleKey) {
  const missing = [
    !supabaseUrl    && 'NEXT_PUBLIC_SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean).join(', ')

  throw new Error(
    `[Diaa Store] Missing required environment variable(s): ${missing}. ` +
    `Set them in Netlify → Site configuration → Environment variables, ` +
    `then redeploy with "Clear cache and deploy site".`
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
})
