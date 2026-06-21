import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*, products(id, name, images, price)')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  }

  if (req.method === 'POST') {
    const { label, discount_percent, product_id, starts_at, ends_at, is_active } = req.body
    if (!label?.trim()) return res.status(400).json({ error: 'Label requis' })

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .insert({
        label:            label.trim(),
        discount_percent: discount_percent ? Number(discount_percent) : null,
        product_id:       product_id || null,
        starts_at:        starts_at  || null,
        ends_at:          ends_at    || null,
        is_active:        is_active !== false,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis' })
    updates.updated_at = new Date().toISOString()
    if (updates.discount_percent !== undefined)
      updates.discount_percent = updates.discount_percent ? Number(updates.discount_percent) : null

    const { data, error } = await supabaseAdmin
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'ID requis' })
    const { error } = await supabaseAdmin.from('promotions').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
