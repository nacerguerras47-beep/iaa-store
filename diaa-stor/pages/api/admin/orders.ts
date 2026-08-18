import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'
import { updateOrderNombreInSheet, updateOrderPriceInSheet, updateOrderStatusInSheet } from '../../../lib/googleSheets'
import { handleOrderConfirmed, handleOrderCancelled } from '../../../lib/orderConfirmation'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET — list orders
  if (req.method === 'GET') {
    const { page = '1', limit = '25', status, search, stats } = req.query

    // Stats mode: lightweight aggregate across all orders
    if (stats === 'true') {
      const { data: all, error } = await supabaseAdmin
        .from('orders')
        .select('total_price, delivery_price')
      if (error) return res.status(500).json({ error: error.message })
      const revenue = (all || []).reduce((s: number, o: any) => s + ((Number(o.total_price)||0) - (Number(o.delivery_price)||0)), 0)
      return res.json({ revenue, count: all?.length || 0 })
    }

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

  // PUT — update order (status, nombre, prices)
  if (req.method === 'PUT') {
    const { id, order_number, status, nombre, unit_price, delivery_price, total_price } = req.body
    const lookupId = id || order_number
    if (!lookupId) return res.status(400).json({ error: 'ID ou order_number requis' })

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' })
    }

    // Fetch current order — by id or order_number
    let query = supabaseAdmin
      .from('orders')
      .select('id, status, product_id, quantity, variant_name, variant_id, phone, total_price, product_name, order_number, addons, fbclid, fbclid_captured_at')
    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('order_number', order_number)
    }
    const { data: currentOrder, error: fetchErr } = await query.single()

    if (fetchErr) return res.status(500).json({ error: fetchErr.message })

    const prevStatus = currentOrder?.status

    const updates: Record<string, string | number | null> = { updated_at: new Date().toISOString() }
    if (status         !== undefined) updates.status        = String(status)
    if (nombre         !== undefined) updates.nombre        = nombre === '' || nombre === null ? null : Number(nombre)
    if (unit_price     !== undefined) updates.unit_price    = Number(unit_price)
    if (delivery_price !== undefined) updates.delivery_price = Number(delivery_price)
    if (total_price    !== undefined) updates.total_price   = Number(total_price)

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', currentOrder.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // ── Confirmed → all side effects via shared function ──
    if (status === 'confirmed' && status !== prevStatus) {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress || null
      const clientUA = (req.headers['user-agent'] as string) || null
      await handleOrderConfirmed(currentOrder.id, { clientIp, clientUA })
    }

    // ── Stock restore on cancellation ──
    if (status === 'cancelled' && prevStatus === 'confirmed') {
      await handleOrderCancelled(currentOrder.id)
    }

    // Sync status change to Google Sheets (column I — Situation)
    if (status !== undefined && data?.order_number) {
      const statusLabels: Record<string, string> = {
        pending: 'En attente',
        confirmed: 'Confirmé',
        shipped: 'Expédié',
        delivered: 'Livré',
        cancelled: 'Annulé',
      }
      try { await updateOrderStatusInSheet(data.order_number, statusLabels[status] || status) } catch (e) { console.error('Status sync failed:', e) }
    }

    // Sync nombre change to Google Sheets (column J)
    if (nombre !== undefined && data?.order_number) {
      try { await updateOrderNombreInSheet(data.order_number, updates.nombre as number | null) } catch (e) { console.error('Nombre sync failed:', e) }
    }

    // Sync price change to Google Sheets (columns O & P)
    if (unit_price !== undefined && total_price !== undefined && delivery_price !== undefined && data?.order_number) {
      try { await updateOrderPriceInSheet(data.order_number, Number(total_price), Number(unit_price)) } catch (e) { console.error('Price sync failed:', e) }
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
