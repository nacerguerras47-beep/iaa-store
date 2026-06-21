import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { withAdminAuth } from '../../../lib/adminAuth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET — list products with optional search/category/page
  if (req.method === 'GET') {
    const { search, category, page = '1', limit = '20' } = req.query
    const pageNum  = Math.max(1, parseInt(String(page)))
    const pageSize = Math.min(100, parseInt(String(limit)))
    const from = (pageNum - 1) * pageSize
    const to   = from + pageSize - 1

    let q = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })

    if (search)   q = q.ilike('name', `%${search}%`)
    if (category && category !== 'all') q = q.eq('category', category)

    q = q.order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ products: data || [], total: count || 0, page: pageNum, pageSize })
  }

  // POST — create product
  if (req.method === 'POST') {
    const { name, description, price, promo_price, images, category, stock, is_visible, is_new } = req.body
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nom et prix sont requis' })
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60) + '-' + Date.now().toString(36)

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        price:       Number(price),
        promo_price: promo_price ? Number(promo_price) : null,
        images:      Array.isArray(images) ? images : [],
        category:    category?.trim() || null,
        stock:       Number(stock) || 0,
        is_visible:  is_visible !== false,
        is_new:      Boolean(is_new),
        slug,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  // PUT — update product
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis' })

    // Sanitize numeric fields
    if (updates.price    !== undefined) updates.price       = Number(updates.price)
    if (updates.promo_price !== undefined) updates.promo_price = updates.promo_price ? Number(updates.promo_price) : null
    if (updates.stock    !== undefined) updates.stock       = Number(updates.stock)

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // DELETE — remove product
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'ID requis' })

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAdminAuth(handler)
