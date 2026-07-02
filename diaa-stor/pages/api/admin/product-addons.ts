import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { product_id } = req.query
    if (!product_id) return res.status(400).json({ error: 'product_id required' })

    const { data: addons, error } = await supabaseAdmin
      .from('product_addons')
      .select('*, product_addon_tiers(*)')
      .eq('product_id', product_id)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })

    const result = (addons || []).map((a: any) => ({
      id: a.id,
      product_id: a.product_id,
      name: a.name,
      max_quantity: a.max_quantity,
      is_active: a.is_active,
      tiers: (a.product_addon_tiers || []).map((t: any) => ({
        id: t.id,
        min_quantity: t.min_quantity,
        price_per_unit: Number(t.price_per_unit),
      })),
    }))

    return res.json(result)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
