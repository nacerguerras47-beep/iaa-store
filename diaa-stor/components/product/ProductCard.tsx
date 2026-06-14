import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Zap, Check } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'

interface Product {
  id: string; name: string; slug?: string; price: number
  promo_price?: number | null; images: string[]; category?: string
  is_new?: boolean; stock?: number
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, isInCart } = useCart()
  const hasPromo = product.promo_price && product.promo_price < product.price
  const discount  = hasPromo
    ? Math.round(((product.price - product.promo_price!) / product.price) * 100)
    : 0
  const displayPrice = hasPromo ? product.promo_price! : product.price
  const image  = product.images?.[0] || '/placeholder.jpg'
  const href   = `/product/${product.slug || product.id}`
  const inCart = isInCart(product.id)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart({
      id:          `${product.id}-cart`,
      product_id:  product.id,
      name:        product.name,
      price:       product.price,
      promo_price: product.promo_price,
      image,
      slug: product.slug || product.id,
    })
    toast.success(`${product.name} ajouté au panier !`)
  }

  return (
    <Link href={href}>
      {/*
        * NOTE: 'group' is intentionally placed here on the <article> element,
        * NOT in globals.css. Tailwind forbids 'group' inside @apply because it
        * is a behaviour marker that must appear directly in the HTML class list
        * to be recognised by the CSS engine.
        *
        * The hover effects for .product-card-img and .product-card-overlay are
        * handled via plain CSS parent→child selectors in globals.css so that
        * group-hover: variants are not needed at all.
        */}
      <article className="product-card h-full">

        {/* Image container */}
        <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-700 aspect-square">
          <Image
            src={image}
            alt={product.name}
            fill
            className="product-card-img"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            loading="lazy"
          />

          {/* Promo / New badges */}
          {hasPromo && <div className="badge-promo">-{discount}%</div>}
          {product.is_new && !hasPromo && <div className="badge-new">Nouveau</div>}

          {/*
            * Quick-add overlay:
            * Visibility is controlled by .product-card:hover .product-card-overlay
            * in globals.css — no group / group-hover utilities needed.
            */}
          <div className="product-card-overlay">
            <button
              onClick={handleAddToCart}
              className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 bg-navy-700/90 hover:bg-navy-700 backdrop-blur-sm transition-colors"
            >
              {inCart
                ? <><Check size={13} /> Dans le panier</>
                : <><ShoppingCart size={13} /> Ajouter au panier</>
              }
            </button>
          </div>
        </div>

        {/* Product info */}
        <div className="p-3.5 flex flex-col flex-1">
          {product.category && (
            <span className="text-[10px] font-bold text-navy-400 dark:text-navy-400 uppercase tracking-wide mb-1">
              {product.category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white leading-snug line-clamp-2 mb-2 flex-1">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              {hasPromo ? (
                <>
                  <div className="text-base font-black text-gold-600 dark:text-gold-400">
                    {displayPrice.toLocaleString()} <span className="text-xs">DA</span>
                  </div>
                  <div className="text-xs text-slate-400 line-through">
                    {product.price.toLocaleString()} DA
                  </div>
                </>
              ) : (
                <div className="text-base font-black text-slate-800 dark:text-white">
                  {displayPrice.toLocaleString()} <span className="text-xs font-semibold">DA</span>
                </div>
              )}
            </div>
            {hasPromo && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-gold-600">
                <Zap size={11} className="fill-current" />PROMO
              </span>
            )}
          </div>

          {/* Low stock warning */}
          {product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                Plus que {product.stock} !
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}

