import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'
import { updateOrderNombreInSheet } from '../../../lib/googleSheets'

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

    // Fetch current order to detect status transition for stock management
    const { data: currentOrder, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, status, product_id, quantity')
      .eq('id', id)
      .single()

    if (fetchErr) return res.status(500).json({ error: fetchErr.message })

    const prevStatus = currentOrder?.status

    const updates: Record<string, string | number | null> = { updated_at: new Date().toISOString() }
    if (status  !== undefined) updates.status = String(status)
    if (nombre  !== undefined) updates.nombre = nombre === '' || nombre === null ? null : Number(nombre)

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // ── Stock management on status transition ──
    if (status !== undefined && status !== prevStatus && currentOrder?.product_id) {
      const qty = currentOrder.quantity || 0

      if (status === 'confirmed' && prevStatus !== 'confirmed') {
        const { error: stockErr } = await supabaseAdmin.rpc('decrement_stock', {
          pid: currentOrder.product_id,
          qty,
        })
        if (stockErr) console.error('Stock decrement failed:', stockErr.message)
      } else if (status === 'cancelled' && prevStatus === 'confirmed') {
        const { error: stockErr } = await supabaseAdmin.rpc('increment_stock', {
          pid: currentOrder.product_id,
          qty,
        })
        if (stockErr) console.error('Stock restore failed:', stockErr.message)
      }
    }

    // Sync nombre change to Google Sheets (column H)
    if (nombre !== undefined && data?.order_number) {
      updateOrderNombreInSheet(data.order_number, updates.nombre as number | null)
    }

    return res.json(data)
  }

  // DELETE — delete an order
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis' })

    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
