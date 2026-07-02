export interface BundleOption {
  name: string
  price: number
  quantity_trigger?: number | null
}

/**
 * Computes the total price for a product given a quantity.
 *
 * Algorithm:
 * 1. If extraUnitPrice is NULL → fall back to simple (promoPrice ?? basePrice) × qty
 * 2. Find the bundle with the highest quantity_trigger ≤ qty
 * 3. If found:
 *    - qty === trigger → return bundle.price
 *    - qty > trigger  → return bundle.price + (qty - trigger) × extraUnitPrice
 * 4. If no trigger bundle found → return (promoPrice ?? basePrice) × qty
 */
export function computeBundleTotal(
  qty: number,
  basePrice: number,
  promoPrice: number | null | undefined,
  bundles: BundleOption[] | null | undefined,
  extraUnitPrice: number | null | undefined,
): number {
  const effectiveBase = promoPrice != null && promoPrice < basePrice ? promoPrice : basePrice

  if (extraUnitPrice == null) {
    return effectiveBase * qty
  }

  let bestIdx = -1
  let bestTrigger = -1

  if (bundles) {
    for (let i = 0; i < bundles.length; i++) {
      const b = bundles[i]
      if (b.quantity_trigger != null && qty >= b.quantity_trigger && b.quantity_trigger > bestTrigger) {
        bestTrigger = b.quantity_trigger
        bestIdx = i
      }
    }
  }

  if (bestIdx !== -1) {
    const bundle = bundles![bestIdx]
    const trigger = bundle.quantity_trigger!
    if (qty <= trigger) {
      return bundle.price
    }
    return bundle.price + (qty - trigger) * extraUnitPrice
  }

  return effectiveBase * qty
}

export interface AddonTier {
  min_quantity: number
  price_per_unit: number
}

/**
 * Computes the effective price_per_unit and total for an addon given a quantity.
 * Finds the tier with the highest min_quantity ≤ qty.
 */
export function computeAddonTotal(
  tiers: AddonTier[],
  qty: number,
): { price_per_unit: number; total: number } {
  if (qty <= 0 || !tiers || tiers.length === 0) {
    return { price_per_unit: 0, total: 0 }
  }

  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity)
  let bestTier = sorted[0]
  for (const tier of sorted) {
    if (tier.min_quantity <= qty) {
      bestTier = tier
    }
  }

  return {
    price_per_unit: bestTier.price_per_unit,
    total: bestTier.price_per_unit * qty,
  }
}

export interface GlobalPromotion {
  id: string
  discount_percent: number
  product_id?: string | null
  label: string
}

/**
 * Applies global promotion discount percentages to products.
 * - Products with a matching product_id get the promo applied
 * - If no product_id is set on the promotion, it applies to all products
 * - If a product already has promo_price, the lower of the two wins
 */
export function applyGlobalPromotions<T extends { price: number; promo_price?: number | null }>(
  products: T[],
  promotions: GlobalPromotion[],
): T[] {
  if (!promotions || promotions.length === 0) return products

  return products.map(product => {
    let bestDiscount = 0
    for (const p of promotions) {
      if (!p.discount_percent) continue
      if (p.product_id && p.product_id !== (product as any).id) continue
      const discounted = product.price * (p.discount_percent / 100)
      if (discounted > bestDiscount) bestDiscount = discounted
    }

    if (bestDiscount <= 0) return product

    const promoFromGlobal = Math.round(product.price - bestDiscount)
    const existingPromo = product.promo_price != null && product.promo_price < product.price ? product.promo_price : null

    if (existingPromo != null && existingPromo < promoFromGlobal) return product

    return { ...product, promo_price: promoFromGlobal }
  })
}

export async function fetchActivePromotions(supabase: any): Promise<GlobalPromotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('id, discount_percent, product_id, label, starts_at, ends_at')
    .eq('is_active', true)
  if (error) {
    console.error('fetchActivePromotions error:', error)
    return []
  }
  const now = new Date()
  return (data || []).filter((p: any) => {
    if (p.starts_at && new Date(p.starts_at) > now) return false
    if (p.ends_at && new Date(p.ends_at) < now) return false
    return true
  })
}
