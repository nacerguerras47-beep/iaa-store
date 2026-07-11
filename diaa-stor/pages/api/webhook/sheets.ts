import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const STATUS_MAP: Record<string, string> = {
  'En attente': 'pending',
  'Confirmé': 'confirmed',
  'Expédié': 'shipped',
  'Livré': 'delivered',
  'Annulé': 'cancelled',
}

const FIELD_MAP: Record<string, { dbColumn: string; transform?: (v: any) => any }> = {
  situation:    { dbColumn: 'status', transform: (v: string) => STATUS_MAP[v] || v },
  nombre:       { dbColumn: 'nombre' },
  is_expedie:   { dbColumn: 'is_expedie', transform: (v: any) => v === true || v === 'TRUE' || v === 'VRAI' },
  is_livre:     { dbColumn: 'is_livre', transform: (v: any) => v === true || v === 'TRUE' || v === 'VRAI' },
  paiement:     { dbColumn: 'paiement', transform: (v: any) => String(v) },
  total_price:  { dbColumn: 'total_price', transform: (v: any) => Number(v) },
  net_price:    { dbColumn: 'net_price', transform: (v: any) => Number(v) },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { secret, order_number, field, value } = req.body

  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!order_number || !field) {
    return res.status(400).json({ error: 'Missing order_number or field' })
  }

  const fieldConfig = FIELD_MAP[field]
  if (!fieldConfig) {
    return res.status(400).json({ error: `Unknown field: ${field}` })
  }

  if (value === undefined || value === null || value === '') {
    return res.status(400).json({ error: `Missing value for field: ${field}` })
  }

  const dbValue = fieldConfig.transform ? fieldConfig.transform(value) : value
  const dbColumn = fieldConfig.dbColumn

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ [dbColumn]: dbValue, updated_at: new Date().toISOString() })
    .eq('order_number', order_number)
    .select()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ success: true, updated: data?.length || 0 })
}
