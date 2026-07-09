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
      .select('*, variants:product_variants(*), bundles:product_bundles(*)', { count: 'exact' })

    if (search)   q = q.ilike('name', `%${search}%`)
    if (category && category !== 'all') q = q.eq('category', category)

    q = q.order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ products: data || [], total: count || 0, page: pageNum, pageSize })
  }

  // POST — create product
  if (req.method === 'POST') {
    const { name, description, price, promo_price, images, category, stock, is_visible, is_new, has_bundles, bundles, extra_unit_price, addons, variants } = req.body
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
        has_bundles: Boolean(has_bundles),
        bundles:     [],
        extra_unit_price: extra_unit_price != null ? Number(extra_unit_price) : null,
        slug,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Save addons with tiers
    if (Array.isArray(addons) && addons.length > 0) {
      await Promise.all(addons.map(async (a: any) => {
        const { data: addon, error } = await supabaseAdmin
          .from('product_addons')
          .insert({
            product_id: data.id,
            name: a.name,
            max_quantity: Number(a.max_quantity) || 1,
            is_active: a.is_active !== false,
          })
          .select()
          .single()

        if (!error && addon && Array.isArray(a.tiers) && a.tiers.length > 0) {
          await supabaseAdmin.from('product_addon_tiers').insert(
            a.tiers.map((t: any) => ({
              addon_id: addon.id,
              min_quantity: Number(t.min_quantity),
              price_per_unit: Number(t.price_per_unit),
            }))
          )
        }
      }))
    }

    // Save variants
    if (Array.isArray(variants) && variants.length > 0) {
      await supabaseAdmin.from('product_variants').insert(
        variants.map((v: any, i: number) => ({
          product_id:  data.id,
          name:        String(v.name).trim(),
          price:       Number(v.price),
          promo_price: v.promo_price ? Number(v.promo_price) : null,
          stock:       Number(v.stock) || 0,
          is_active:   v.is_active !== false,
          sort_order:  i,
        }))
      )
    }

    // Save bundles to product_bundles table
    if (Array.isArray(bundles) && bundles.length > 0) {
      await supabaseAdmin.from('product_bundles').insert(
        bundles.map((b: any, i: number) => ({
          product_id:       data.id,
          variant_id:       b.variant_id || null,
          name:             String(b.name).trim(),
          price:            Number(b.price),
          quantity_trigger: b.quantity_trigger != null ? Number(b.quantity_trigger) : null,
          discount_percent: b.discount_percent != null ? Number(b.discount_percent) : null,
          sort_order:       i,
        }))
      )
    }

    return res.status(201).json(data)
  }

  // PUT — update product
  if (req.method === 'PUT') {
    const { id, addons, variants, bundles, ...updates } = req.body
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

    // Replace addons with tiers
    if (Array.isArray(addons)) {
      await supabaseAdmin.from('product_addons').delete().eq('product_id', id)
      if (addons.length > 0) {
        await Promise.all(addons.map(async (a: any) => {
          const { data: addon } = await supabaseAdmin
            .from('product_addons')
            .insert({
              product_id: id,
              name: a.name,
              max_quantity: Number(a.max_quantity) || 1,
              is_active: a.is_active !== false,
            })
            .select()
            .single()

          if (addon && Array.isArray(a.tiers) && a.tiers.length > 0) {
            await supabaseAdmin.from('product_addon_tiers').insert(
              a.tiers.map((t: any) => ({
                addon_id: addon.id,
                min_quantity: Number(t.min_quantity),
                price_per_unit: Number(t.price_per_unit),
              }))
            )
          }
        }))
      }
    }

    // Replace variants
    if (Array.isArray(variants)) {
      await supabaseAdmin.from('product_variants').delete().eq('product_id', id)
      if (variants.length > 0) {
        await supabaseAdmin.from('product_variants').insert(
          variants.map((v: any, i: number) => ({
            product_id:  id,
            name:        String(v.name).trim(),
            price:       Number(v.price),
            promo_price: v.promo_price ? Number(v.promo_price) : null,
            stock:       Number(v.stock) || 0,
            is_active:   v.is_active !== false,
            sort_order:  i,
          }))
        )
      }
    }

    // Replace bundles in product_bundles table
    if (Array.isArray(bundles)) {
      await supabaseAdmin.from('product_bundles').delete().eq('product_id', id)
      if (bundles.length > 0) {
        await supabaseAdmin.from('product_bundles').insert(
          bundles.map((b: any, i: number) => ({
            product_id:       id,
            variant_id:       b.variant_id || null,
            name:             String(b.name).trim(),
            price:            Number(b.price),
            quantity_trigger: b.quantity_trigger != null ? Number(b.quantity_trigger) : null,
            discount_percent: b.discount_percent != null ? Number(b.discount_percent) : null,
            sort_order:       i,
          }))
        )
      }
    }

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
