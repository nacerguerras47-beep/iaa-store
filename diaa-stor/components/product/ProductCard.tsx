import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Zap, Check } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'

interface Product {
  id:          string
  name:        string
  slug?:       string
  price:       number
  promo_price?: number | null
  images:      string[]
  category?:   string
  is_new?:     boolean
  stock?:      number
  has_bundles?: boolean
  bundles?:    { name: string; price: number; quantity_trigger?: number | null }[]
  extra_unit_price?: number | null
}

/**
 * fmt — always uses 'fr-FR' locale explicitly.
 *
 * NEVER call .toLocaleString() without an explicit locale in server-rendered
 * components. Node.js on Netlify defaults to 'en-US' (1,500 with commas).
 * Algerian browsers default to 'fr-FR' (1 500 with spaces) or 'ar-DZ'
 * (Arabic-Indic numerals). The resulting text node mismatch triggers
 * React hydration error #418.
 */
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

export default function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation('common')
  const { addToCart, isInCart } = useCart()

  const hasPromo = Boolean(product.promo_price && product.promo_price < product.price)
  const displayPrice = hasPromo ? product.promo_price! : product.price
  const image  = product.images?.[0] || '/placeholder.jpg'
  const href   = `/product/${product.slug || product.id}`
  const inCart = isInCart(product.id)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const hasBundles = product.has_bundles && product.bundles?.length
    addToCart({
      id:          `${product.id}-cart`,
      product_id:  product.id,
      name:        product.name,
      price:       product.price,
      promo_price: product.promo_price,
      image,
      slug: product.slug || product.id,
      bundles: hasBundles ? product.bundles : undefined,
      extra_unit_price: product.extra_unit_price ?? null,
    })
    toast.success(`${product.name} — ${t('addedToCart')}`)
  }

  return (
    <Link href={href}>
      <article className="product-card h-full">

        {/* Image */}
        <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-700 aspect-square">
          <Image
            src={image}
            alt={product.name}
            fill
            className="product-card-img"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            loading="lazy"
          />
          {hasPromo && <div className="badge-promo">{t('promo')}</div>}
          {product.is_new && !hasPromo && <div className="badge-new">{t('new')}</div>}

          {/* Quick-add overlay — revealed by .product-card:hover in globals.css */}
          <div className="product-card-overlay">
            <button
              onClick={handleAddToCart}
              className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 bg-navy-700/90 hover:bg-navy-700 backdrop-blur-sm transition-colors"
            >
              {inCart
                ? <><Check size={13} /> {t('inCart')}</>
                : <><ShoppingCart size={13} /> {t('addToCart')}</>
              }
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col flex-1">
          {product.category && (
            <span className="text-[10px] font-bold text-navy-400 dark:text-navy-400 uppercase tracking-wide mb-1">
              {product.category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white leading-snug line-clamp-2 mb-2 flex-1">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <div>
              {hasPromo ? (
                <>
                  {/* fmt() used here — explicit 'fr-FR' locale */}
                  <div className="text-base font-black text-gold-600 dark:text-gold-400">
                    {fmt(displayPrice)} <span className="text-xs">DA</span>
                  </div>
                  <div className="text-xs text-slate-400 line-through">
                    {fmt(product.price)} DA
                  </div>
                </>
              ) : (
                <div className="text-base font-black text-slate-800 dark:text-white">
                  {/* fmt() used here — explicit 'fr-FR' locale */}
                  {fmt(displayPrice)} <span className="text-xs font-semibold">DA</span>
                </div>
              )}
            </div>
            {hasPromo && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-gold-600">
                <Zap size={11} className="fill-current" />{t('promo')}
              </span>
            )}
          </div>

          {product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                {t('onlyLeft', { count: product.stock })}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
