import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  promo_price?: number | null
  image: string
  quantity: number
  slug: string
}

interface CartContextType {
  items: CartItem[]
  count: number
  total: number
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeFromCart: (product_id: string) => void
  updateQuantity: (product_id: string, qty: number) => void
  clearCart: () => void
  isInCart: (product_id: string) => boolean
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('diaa_cart')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('diaa_cart', JSON.stringify(items))
    } catch {}
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
    setItems(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i))
  }, [removeFromCart])

  const clearCart = useCallback(() => setItems([]), [])

  const isInCart = useCallback((product_id: string) => items.some(i => i.product_id === product_id), [items])

  const count = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + (i.promo_price || i.price) * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, count, total, addToCart, removeFromCart, updateQuantity, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
