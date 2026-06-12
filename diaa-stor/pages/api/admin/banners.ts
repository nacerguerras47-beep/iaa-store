import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .order('order_index')
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  }

  if (req.method === 'POST') {
    const { title, subtitle, button_text, link, image_url, is_active, order_index } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Titre requis' })

    const { data, error } = await supabaseAdmin
      .from('banners')
      .insert({
        title:       title.trim(),
        subtitle:    subtitle?.trim() || '',
        button_text: button_text?.trim() || 'Explorer',
        link:        link?.trim() || '/',
        image_url:   image_url || null,
        is_active:   is_active !== false,
        order_index: Number(order_index) || 0,
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
    if (updates.order_index !== undefined) updates.order_index = Number(updates.order_index)

    const { data, error } = await supabaseAdmin
      .from('banners')
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
    const { error } = await supabaseAdmin.from('banners').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
