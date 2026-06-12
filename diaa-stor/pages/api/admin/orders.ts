import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET — list orders
  if (req.method === 'GET') {
    const { page = '1', limit = '25', status, search } = req.query
    const pageNum  = Math.max(1, parseInt(String(page)))
    const pageSize = Math.min(100, parseInt(String(limit)))
    const from = (pageNum - 1) * pageSize
    const to   = from + pageSize - 1

    let q = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })

    if (status && status !== 'all') q = q.eq('status', status)
    if (search) {
      q = q.or(
        `last_name.ilike.%${search}%,` +
        `first_name.ilike.%${search}%,` +
        `phone.ilike.%${search}%,` +
        `order_number.ilike.%${search}%,` +
        `product_name.ilike.%${search}%`
      )
    }

    q = q.order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ orders: data || [], total: count || 0, page: pageNum, pageSize })
  }

  // PUT — update order (status, nombre)
  if (req.method === 'PUT') {
    const { id, status, nombre } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis' })

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status  !== undefined) updates.status = status
    if (nombre  !== undefined) updates.nombre = nombre === '' ? null : Number(nombre)

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
