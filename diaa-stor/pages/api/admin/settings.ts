import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('settings').select('*')
    if (error) return res.status(500).json({ error: error.message })
    // Return as flat key→value object
    const obj = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]))
    return res.json(obj)
  }

  if (req.method === 'POST') {
    const { key, value } = req.body
    if (!key?.trim()) return res.status(400).json({ error: 'Clé requise' })

    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert({ key: key.trim(), value: String(value ?? '') }, { onConflict: 'key' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // Bulk save multiple keys at once
  if (req.method === 'PUT') {
    const entries = req.body as Record<string, string>
    if (!entries || typeof entries !== 'object') {
      return res.status(400).json({ error: 'Corps JSON requis' })
    }

    const rows = Object.entries(entries).map(([key, value]) => ({
      key: key.trim(),
      value: String(value ?? ''),
    }))

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, updated: rows.length })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
