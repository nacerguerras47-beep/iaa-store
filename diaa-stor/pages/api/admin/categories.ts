import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name')
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data || [])
  }

  if (req.method === 'POST') {
    const { name, icon } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })

    const slug = name.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name: name.trim(), icon: icon || '📦', slug })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'PUT') {
    const { id, name, icon } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis' })

    const updates: any = { updated_at: new Date().toISOString() }
    if (name) updates.name = name.trim()
    if (icon) updates.icon = icon

    const { data, error } = await supabaseAdmin
      .from('categories')
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
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
