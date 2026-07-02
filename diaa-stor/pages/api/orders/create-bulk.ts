import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { sendBulkTelegramNotification } from '../../../lib/telegram'
import { appendBulkOrdersToSheet } from '../../../lib/googleSheets'

function generateOrderNumber(): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DS-${yy}${mm}${dd}-${rand}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { items, total_delivery: totalDelivery, last_name, first_name, phone, address, wilaya, commune, delivery_type } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Aucun produit dans la commande' })
  }

  const missing = ['last_name', 'first_name', 'phone', 'wilaya', 'commune', 'delivery_type']
    .filter(f => !req.body[f])
  if (missing.length > 0) {
    return res.status(400).json({ error: `Champs manquants: ${missing.join(', ')}` })
  }

  if (!/^(05|06|07)\d{8}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide (10 chiffres, commence par 05, 06 ou 07)' })
  }

  if (!['domicile', 'bureau'].includes(delivery_type)) {
    return res.status(400).json({ error: 'Type de livraison invalide' })
  }

  const now = new Date().toISOString()
  const createdOrders: any[] = []

  for (const item of items) {
    const orderPayload = {
      order_number: generateOrderNumber(),
      product_id:    String(item.product_id),
      product_name:  String(item.product_name).trim(),
      quantity:      Number(item.quantity),
      unit_price:    Number(item.unit_price),
      delivery_price: Number(item.delivery_price),
      total_price:   Number(item.total_price),
      last_name:     String(last_name).trim(),
      first_name:    String(first_name).trim(),
      phone:         String(phone).trim(),
      address:       String(address || '').trim(),
      wilaya:        String(wilaya).trim(),
      commune:       String(commune).trim(),
      delivery_type: String(delivery_type),
      bundle_name:   item.bundle_name ? String(item.bundle_name).trim() : null,
      addons:        Array.isArray(item.addons) ? item.addons : [],
      status:        'pending',
      created_at:    now,
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return res.status(500).json({ error: 'Erreur lors de la sauvegarde de la commande' })
    }

    createdOrders.push({ ...orderPayload, id: data.id })
  }

  // Single Telegram notification + single Sheets batch
  sendBulkTelegramNotification(createdOrders, totalDelivery).catch(e =>
    console.error('Telegram notification failed:', e)
  )
  let sheetError: string | null = null
  try {
    await appendBulkOrdersToSheet(createdOrders)
  } catch (e: any) {
    sheetError = e.message || 'Erreur Google Sheets'
    console.error('Google Sheets append failed:', e)
  }

  return res.status(201).json({
    success: true,
    order_numbers: createdOrders.map(o => o.order_number),
    sheet_error: sheetError,
  })
}