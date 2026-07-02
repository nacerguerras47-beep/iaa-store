import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react'
import { computeBundleTotal } from '../lib/pricing'

export interface BundleOption {
  name: string
  price: number
  quantity_trigger?: number | null
}

export interface CartItem {
  id:          string
  product_id:  string
  name:        string
  price:       number
  promo_price?: number | null
  image:       string
  quantity:    number
  slug:        string
  bundles?:    BundleOption[]
  applied_bundle_idx?: number | null
  base_name?:  string
  base_price?: number
  base_promo_price?: number | null
  extra_unit_price?: number | null
  addons?: { name: string; quantity: number; price_per_unit: number; total?: number }[]
}

interface CartContextType {
  items:          CartItem[]
  count:          number
  total:          number
  clientReady:    boolean   // true only after localStorage has been read on the client
  addToCart:      (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeFromCart: (product_id: string) => void
  updateQuantity: (product_id: string, qty: number) => void
  clearCart:      () => void
  isInCart:       (product_id: string) => boolean
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems]           = useState<CartItem[]>([])
  // clientReady becomes true after the first useEffect runs on the client.
  // Components that show cart-derived content (badge count, item list) should
  // wait for this flag before rendering, so server HTML and initial client
  // render always agree (both show an empty/hidden state).
  const [clientReady, setClientReady] = useState(false)

  // initialized ref prevents the write-effect from overwriting localStorage
  // before the read-effect has restored saved items.
  const initialized = useRef(false)

  // EFFECT 1 — read from localStorage once on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('diaa_cart')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // corrupt localStorage data — start fresh
    } finally {
      initialized.current = true
      setClientReady(true)
    }
  }, [])

  // EFFECT 2 — persist to localStorage whenever items change.
  // Guard: only run after EFFECT 1 has completed (initialized.current = true).
  // Without this guard, the very first render writes items=[] to localStorage
  // BEFORE effect 1 reads the saved data, wiping the user's cart.
  useEffect(() => {
    if (!initialized.current) return
    try {
      localStorage.setItem('diaa_cart', JSON.stringify(items))
    } catch {
      // storage quota exceeded or private browsing — ignore
    }
  }, [items])

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) => {
    const base_name = item.bundles && item.applied_bundle_idx != null
      ? item.base_name ?? item.name
      : item.name
    const base_price = item.bundles && item.applied_bundle_idx != null
      ? item.base_price ?? item.price
      : item.price
    const base_promo_price = item.bundles && item.applied_bundle_idx != null
      ? (item.base_promo_price !== undefined ? item.base_promo_price : item.promo_price)
      : item.promo_price

    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id)
      if (existing) {
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...prev, {
        ...item,
        quantity: qty,
        base_name,
        base_price,
        base_promo_price,
        extra_unit_price: item.extra_unit_price ?? null,
      }]
    })
  }, [])

  const removeFromCart = useCallback((product_id: string) => {
    setItems(prev => prev.filter(i => i.product_id !== product_id))
  }, [])

  const updateQuantity = useCallback((product_id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(product_id)
      return
    }
    setItems(prev =>
      prev.map(i => {
        if (i.product_id !== product_id) return i
        const updated = { ...i, quantity: qty }
        if (!updated.bundles || updated.bundles.length === 0) return updated

        const currentBundle = updated.applied_bundle_idx != null ? updated.bundles[updated.applied_bundle_idx] : null
        if (currentBundle && currentBundle.quantity_trigger == null) return updated

        let bestIdx = -1, bestTrigger = -1
        for (let i = 0; i < updated.bundles.length; i++) {
          const b = updated.bundles[i]
          if (b.quantity_trigger != null && qty >= b.quantity_trigger && b.quantity_trigger > bestTrigger) {
            bestTrigger = b.quantity_trigger; bestIdx = i
          }
        }

        if (bestIdx !== -1) {
          const bundle = updated.bundles[bestIdx]
          return {
            ...updated,
            applied_bundle_idx: bestIdx,
            name: (updated.base_name || updated.name) + ' (' + bundle.name + ')',
            price: updated.base_price || updated.price,
            promo_price: updated.base_promo_price !== undefined ? updated.base_promo_price : updated.promo_price,
          }
        }

        if (currentBundle && currentBundle.quantity_trigger != null) {
          return {
            ...updated,
            applied_bundle_idx: null,
            name: updated.base_name || updated.name,
            price: updated.base_price || updated.price,
            promo_price: updated.base_promo_price !== undefined ? updated.base_promo_price : updated.promo_price,
          }
        }

        return updated
      })
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => setItems([]), [])

  const isInCart = useCallback(
    (product_id: string) => items.some(i => i.product_id === product_id),
    [items]
  )

  const count = items.length
  const total = items.reduce(
    (s, i) => {
      const base = computeBundleTotal(i.quantity, i.base_price || i.price, i.base_promo_price ?? i.promo_price, i.bundles, i.extra_unit_price)
      const addons = (i.addons || []).reduce((as, a) => as + (a.total ?? a.quantity * a.price_per_unit), 0)
      return s + base + addons
    },
    0
  )

  return (
    <CartContext.Provider value={{
      items, count, total, clientReady,
      addToCart, removeFromCart, updateQuantity, clearCart, isInCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
