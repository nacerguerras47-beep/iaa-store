import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { sendTelegramNotification } from '../../../lib/telegram'
import { appendOrderToSheet } from '../../../lib/googleSheets'

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

  const {
    product_id, product_name, quantity,
    unit_price, delivery_price, total_price,
    last_name, first_name, phone,
    address, wilaya, commune, delivery_type,
  } = req.body

  // ── Validation ──
  const missing = ['product_id','product_name','quantity','last_name','first_name',
    'phone','address','wilaya','commune','delivery_type']
    .filter(f => !req.body[f])

  if (missing.length > 0) {
    return res.status(400).json({ error: `Champs manquants: ${missing.join(', ')}` })
  }

  // Phone: exactly 10 digits, starts with 05/06/07
  if (!/^(05|06|07)\d{8}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide (10 chiffres, commence par 05, 06 ou 07)' })
  }

  if (!['domicile', 'bureau'].includes(delivery_type)) {
    return res.status(400).json({ error: 'Type de livraison invalide' })
  }

  const now = new Date().toISOString()
  const order_number = generateOrderNumber()

  const orderPayload = {
    order_number,
    product_id:    String(product_id),
    product_name:  String(product_name).trim(),
    quantity:      Number(quantity),
    unit_price:    Number(unit_price),
    delivery_price: Number(delivery_price),
    total_price:   Number(total_price),
    last_name:     String(last_name).trim(),
    first_name:    String(first_name).trim(),
    phone:         String(phone).trim(),
    address:       String(address).trim(),
    wilaya:        String(wilaya).trim(),
    commune:       String(commune).trim(),
    delivery_type: String(delivery_type),
    status:        'pending',
    created_at:    now,
  }

  // ── Save to Supabase (primary storage) ──
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert(orderPayload)
    .select()
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return res.status(500).json({ error: 'Erreur lors de la sauvegarde de la commande' })
  }

  const savedOrder = { ...orderPayload, id: data.id }

  // ── Non-blocking side effects ──
  sendTelegramNotification(savedOrder).catch(e =>
    console.error('Telegram notification failed:', e)
  )

  appendOrderToSheet(savedOrder).catch(e =>
    console.error('Google Sheets append failed:', e)
  )

  return res.status(201).json({
    success: true,
    order_number,
    order_id: data.id,
  })
}
