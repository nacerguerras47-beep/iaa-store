import { supabaseAdmin } from './supabaseAdmin'
import { updateOrderStatusInSheet } from './googleSheets'
import { sendPurchaseEvent } from './metaConversions'

// ── Robust stock helpers: RPC first, direct UPDATE fallback ──
// If the RPC doesn't exist in the DB, we never fail silently again.

async function decrementProductStock(productId: string, qty: number) {
  const { data, error } = await supabaseAdmin.rpc('decrement_stock', { pid: productId, qty })
  if (!error) {
    if (data === null) console.warn(`[stock] Product ${productId}: stock insuffisant (qty ${qty})`)
    else console.log(`[stock] Product ${productId} decremented →`, data)
    return
  }
  const { data: row } = await supabaseAdmin.from('products').select('stock').eq('id', productId).single()
  if (!row) { console.error(`[stock] Product ${productId} not found (rpc error: ${error.message})`); return }
  if (row.stock < qty) { console.warn(`[stock] Product ${productId}: stock insuffisant (${row.stock} < ${qty})`); return }
  const { error: uErr } = await supabaseAdmin.from('products').update({ stock: row.stock - qty }).eq('id', productId)
  if (uErr) console.error(`[stock] Product ${productId} direct update failed:`, uErr.message)
  else console.log(`[stock] Product ${productId} decremented (direct) →`, row.stock - qty)
}

async function incrementProductStock(productId: string, qty: number) {
  const { error } = await supabaseAdmin.rpc('increment_stock', { pid: productId, qty })
  if (!error) return
  const { data: row } = await supabaseAdmin.from('products').select('stock').eq('id', productId).single()
  if (!row) { console.error(`[stock] Product ${productId} not found (rpc error: ${error.message})`); return }
  const { error: uErr } = await supabaseAdmin.from('products').update({ stock: row.stock + qty }).eq('id', productId)
  if (uErr) console.error(`[stock] Product ${productId} direct restore failed:`, uErr.message)
  else console.log(`[stock] Product ${productId} restored (direct) →`, row.stock + qty)
}

async function decrementVariantStock(variantId: string, qty: number) {
  const { data, error } = await supabaseAdmin.rpc('decrement_variant_stock', { pid: variantId, qty })
  if (!error) {
    if (data === null) console.warn(`[stock] Variant ${variantId}: stock insuffisant (qty ${qty})`)
    else console.log(`[stock] Variant ${variantId} decremented →`, data)
    return
  }
  const { data: row } = await supabaseAdmin.from('product_variants').select('stock').eq('id', variantId).single()
  if (!row) { console.error(`[stock] Variant ${variantId} not found (rpc error: ${error.message})`); return }
  if (row.stock < qty) { console.warn(`[stock] Variant ${variantId}: stock insuffisant (${row.stock} < ${qty})`); return }
  const { error: uErr } = await supabaseAdmin.from('product_variants').update({ stock: row.stock - qty }).eq('id', variantId)
  if (uErr) console.error(`[stock] Variant ${variantId} direct update failed:`, uErr.message)
  else console.log(`[stock] Variant ${variantId} decremented (direct) →`, row.stock - qty)
}

async function incrementVariantStock(variantId: string, qty: number) {
  const { error } = await supabaseAdmin.rpc('increment_variant_stock', { pid: variantId, qty })
  if (!error) return
  const { data: row } = await supabaseAdmin.from('product_variants').select('stock').eq('id', variantId).single()
  if (!row) { console.error(`[stock] Variant ${variantId} not found (rpc error: ${error.message})`); return }
  const { error: uErr } = await supabaseAdmin.from('product_variants').update({ stock: row.stock + qty }).eq('id', variantId)
  if (uErr) console.error(`[stock] Variant ${variantId} direct restore failed:`, uErr.message)
  else console.log(`[stock] Variant ${variantId} restored (direct) →`, row.stock + qty)
}

async function decrementAddonStock(addonId: string, qty: number) {
  const { error } = await supabaseAdmin.rpc('decrement_addon_stock', { pid: addonId, qty })
  if (!error) return
  const { data: row } = await supabaseAdmin.from('product_addons').select('stock').eq('id', addonId).single()
  if (!row) { console.error(`[stock] Addon ${addonId} not found (rpc error: ${error.message})`); return }
  if (row.stock < qty) { console.warn(`[stock] Addon ${addonId}: stock insuffisant (${row.stock} < ${qty})`); return }
  const { error: uErr } = await supabaseAdmin.from('product_addons').update({ stock: row.stock - qty }).eq('id', addonId)
  if (uErr) console.error(`[stock] Addon ${addonId} direct update failed:`, uErr.message)
  else console.log(`[stock] Addon ${addonId} decremented (direct) →`, row.stock - qty)
}

async function incrementAddonStock(addonId: string, qty: number) {
  const { error } = await supabaseAdmin.rpc('increment_addon_stock', { pid: addonId, qty })
  if (!error) return
  const { data: row } = await supabaseAdmin.from('product_addons').select('stock').eq('id', addonId).single()
  if (!row) { console.error(`[stock] Addon ${addonId} not found (rpc error: ${error.message})`); return }
  const { error: uErr } = await supabaseAdmin.from('product_addons').update({ stock: row.stock + qty }).eq('id', addonId)
  if (uErr) console.error(`[stock] Addon ${addonId} direct restore failed:`, uErr.message)
  else console.log(`[stock] Addon ${addonId} restored (direct) →`, row.stock + qty)
}

// ── Variant lookup: 1) variant_id (UUID)  2) exact name  3) case-insensitive name ──
async function findVariant(order: { product_id?: string | null; variant_id?: string | null; variant_name?: string | null }): Promise<{ id: string } | null> {
  if (order.variant_id) {
    const { data } = await supabaseAdmin.from('product_variants').select('id').eq('id', order.variant_id).maybeSingle()
    if (data) return data
  }
  if (order.product_id && order.variant_name) {
    const { data: exact } = await supabaseAdmin
      .from('product_variants').select('id')
      .eq('product_id', order.product_id).eq('name', order.variant_name)
      .maybeSingle()
    if (exact) return exact
    const { data: ci } = await supabaseAdmin
      .from('product_variants').select('id')
      .eq('product_id', order.product_id).ilike('name', order.variant_name.trim())
      .maybeSingle()
    if (ci) return ci
  }
  return null
}

// ── Order confirmed → stock decrement + Meta CAPI + sheet sync ──
export async function handleOrderConfirmed(
  orderId: string,
  options?: { clientIp?: string | null; clientUA?: string | null }
): Promise<void> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, product_id, quantity, variant_name, variant_id, phone, total_price, product_name, order_number, addons, fbclid, fbclid_captured_at')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    console.error('[orderConfirmation] Order not found:', orderId, error?.message)
    return
  }

  if (order.status !== 'confirmed') {
    console.log('[orderConfirmation] Order status is "' + order.status + '", skipping side effects')
    return
  }

  console.log('[orderConfirmation] Processing confirmed order:', JSON.stringify({
    id: order.id, product_id: order.product_id, quantity: order.quantity, variant_name: order.variant_name, variant_id: order.variant_id, addons_count: order.addons?.length
  }))

  const qty = Number(order.quantity) || 0

  // ── Product / variant stock decrement ──
  if (order.product_id && qty > 0) {
    if (order.variant_name || order.variant_id) {
      const variant = await findVariant(order)
      if (variant) {
        console.log('[orderConfirmation] Found variant:', variant.id, 'qty:', qty)
        await decrementVariantStock(variant.id, qty)
      } else {
        console.warn(`[orderConfirmation] Variant "${order.variant_name}" not found (id + exact + case-insensitive), falling back to product stock`)
        await decrementProductStock(order.product_id, qty)
      }
    } else {
      console.log('[orderConfirmation] No variant, decrementing product stock:', order.product_id, 'qty:', qty)
      await decrementProductStock(order.product_id, qty)
    }
  } else if (order.product_id) {
    console.warn('[orderConfirmation] qty = 0, skipping stock decrement')
  } else {
    console.warn('[orderConfirmation] No product_id, skipping stock decrement')
  }

  // ── Addon stock decrement ──
  if (Array.isArray(order.addons) && order.addons.length > 0) {
    for (const addon of order.addons) {
      if (!addon.id) continue
      const aQty = Number(addon.quantity) || 0
      if (aQty <= 0) continue
      console.log('[orderConfirmation] Decrementing addon stock:', addon.id, 'qty:', aQty)
      await decrementAddonStock(addon.id, aQty)
    }
  }

  // ── Meta CAPI Purchase event ──
  if (order.phone && order.total_price) {
    sendPurchaseEvent({
      order_number: order.order_number || '',
      phone: order.phone,
      total: Number(order.total_price),
      product_name: order.product_name || '',
      fbclid: order.fbclid || null,
      fbclid_captured_at: order.fbclid_captured_at || null,
      client_ip_address: options?.clientIp || null,
      client_user_agent: options?.clientUA || null,
    }).catch(e => console.error('[orderConfirmation] sendPurchaseEvent failed:', e))
  }

  // ── Sync status to Google Sheets ──
  if (order.order_number) {
    try {
      await updateOrderStatusInSheet(order.order_number, 'Confirmé')
    } catch (e) {
      console.error('[orderConfirmation] Sheet sync failed:', e)
    }
  }
}

// ── Order cancelled → restore stock ──
export async function handleOrderCancelled(orderId: string): Promise<void> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, product_id, quantity, variant_name, variant_id, addons')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    console.error('[orderConfirmation] Order not found for restore:', orderId, error?.message)
    return
  }

  const qty = Number(order.quantity) || 0

  if (order.product_id && qty > 0) {
    if (order.variant_name || order.variant_id) {
      const variant = await findVariant(order)
      if (variant) {
        console.log('[orderConfirmation] Restoring variant stock:', variant.id, 'qty:', qty)
        await incrementVariantStock(variant.id, qty)
      } else {
        console.warn(`[orderConfirmation] Variant "${order.variant_name}" not found for restore, falling back to product stock`)
        await incrementProductStock(order.product_id, qty)
      }
    } else {
      console.log('[orderConfirmation] Restoring product stock:', order.product_id, 'qty:', qty)
      await incrementProductStock(order.product_id, qty)
    }
  } else if (order.product_id) {
    console.warn('[orderConfirmation] qty = 0, skipping stock restore')
  } else {
    console.warn('[orderConfirmation] No product_id, skipping stock restore')
  }

  if (Array.isArray(order.addons) && order.addons.length > 0) {
    for (const addon of order.addons) {
      if (!addon.id) continue
      const aQty = Number(addon.quantity) || 0
      if (aQty <= 0) continue
      console.log('[orderConfirmation] Restoring addon stock:', addon.id, 'qty:', aQty)
      await incrementAddonStock(addon.id, aQty)
    }
  }
}