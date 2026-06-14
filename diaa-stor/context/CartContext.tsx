import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react'

export interface CartItem {
  id:          string
  product_id:  string
  name:        string
  price:       number
  promo_price?: number | null
  image:       string
  quantity:    number
  slug:        string
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
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id)
      if (existing) {
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...prev, { ...item, quantity: qty }]
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
      prev.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i)
    )
  }, [removeFromCart])

  const clearCart = useCallback(() => setItems([]), [])

  const isInCart = useCallback(
    (product_id: string) => items.some(i => i.product_id === product_id),
    [items]
  )

  const count = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce(
    (s, i) => s + (i.promo_price != null && i.promo_price < i.price ? i.promo_price : i.price) * i.quantity,
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
