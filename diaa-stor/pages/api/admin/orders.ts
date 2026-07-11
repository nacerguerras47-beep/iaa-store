import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'
import { updateOrderNombreInSheet, updateOrderPriceInSheet, updateOrderStatusInSheet } from '../../../lib/googleSheets'
import { sendPurchaseEvent } from '../../../lib/metaConversions'

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

  // PUT — update order (status, nombre, prices)
  if (req.method === 'PUT') {
    const { id, status, nombre, unit_price, delivery_price, total_price } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis' })

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' })
    }

    // Fetch current order to detect status transition for stock management
    const { data: currentOrder, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, status, product_id, quantity, variant_name, phone, total_price, product_name, order_number')
      .eq('id', id)
      .single()

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
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // ── Stock management on status transition ──
    if (status !== undefined && status !== prevStatus && currentOrder?.product_id) {
      const qty = currentOrder.quantity || 0

      if (status === 'confirmed' && prevStatus !== 'confirmed') {
        if (currentOrder.variant_name) {
          // Find variant by name on the product and decrement its stock
          const { data: variant } = await supabaseAdmin
            .from('product_variants')
            .select('id')
            .eq('product_id', currentOrder.product_id)
            .eq('name', currentOrder.variant_name)
            .maybeSingle()

          if (variant) {
            const { error: vErr } = await supabaseAdmin.rpc('decrement_variant_stock', {
              pid: variant.id,
              qty,
            })
            if (vErr) console.error('Variant stock decrement failed:', vErr.message)
          }
        } else {
          const { error: stockErr } = await supabaseAdmin.rpc('decrement_stock', {
            pid: currentOrder.product_id,
            qty,
          })
          if (stockErr) console.error('Stock decrement failed:', stockErr.message)
        }
      } else if (status === 'cancelled' && prevStatus === 'confirmed') {
        if (currentOrder.variant_name) {
          const { data: variant } = await supabaseAdmin
            .from('product_variants')
            .select('id')
            .eq('product_id', currentOrder.product_id)
            .eq('name', currentOrder.variant_name)
            .maybeSingle()

          if (variant) {
            const { error: vErr } = await supabaseAdmin.rpc('increment_variant_stock', {
              pid: variant.id,
              qty,
            })
            if (vErr) console.error('Variant stock restore failed:', vErr.message)
          }
        } else {
          const { error: stockErr } = await supabaseAdmin.rpc('increment_stock', {
            pid: currentOrder.product_id,
            qty,
          })
          if (stockErr) console.error('Stock restore failed:', stockErr.message)
        }
      }
    }

    // ── Meta Conversions API Purchase event ──
    if (status === 'confirmed' && status !== prevStatus && currentOrder?.phone && currentOrder?.total_price) {
      sendPurchaseEvent({
        order_number: currentOrder.order_number || '',
        phone: currentOrder.phone,
        total: Number(currentOrder.total_price),
        product_name: currentOrder.product_name || '',
      }).catch(e => console.error('[MetaCAPI] sendPurchaseEvent failed:', e))
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
    if (total_price !== undefined && delivery_price !== undefined && data?.order_number) {
      const netPrice = Number(total_price) - Number(delivery_price)
      try { await updateOrderPriceInSheet(data.order_number, Number(total_price), netPrice) } catch (e) { console.error('Price sync failed:', e) }
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
