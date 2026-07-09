import { useState } from 'react'
import { GetServerSideProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingCart, Zap, Check, MessageCircle, Share2, Shield, Truck, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'
import OrderForm from '../../components/product/OrderForm'
import { supabase } from '../../lib/supabase'
import { computeAddonTotal, fetchActivePromotions, applyGlobalPromotions, getBundlePrice } from '../../lib/pricing'
import { useCart } from '../../context/CartContext'

interface Product { id:string; name:string; slug:string; description?:string; price:number; promo_price?:number|null; images:string[]; stock:number; category?:string; is_visible:boolean; has_bundles?:boolean; bundles?:{id:string;name:string;price:number;quantity_trigger?:number|null;discount_percent?:number|null;variant_id?:string|null;is_active:boolean;sort_order:number}[]; extra_unit_price?:number|null; variants?:{id:string;name:string;price:number;promo_price?:number|null;extra_unit_price?:number|null;stock:number;is_active:boolean}[] }
/**
 * fmt — always passes 'fr-FR' explicitly to toLocaleString.
 * Without an explicit locale, Node.js (Netlify build/SSR) defaults to
 * 'en-US' (1,500 with commas) while Algerian browsers default to 'fr-FR'
 * (1 500 with spaces) or Arabic-Indic numerals. The mismatched text node
 * triggers React hydration error #418.
 */
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}


export default function ProductPage({ product, addons, deliveryPrices }: { product: Product; addons: { id: string; name: string; max_quantity: number; tiers: { min_quantity: number; price_per_unit: number }[] }[]; deliveryPrices: { home:number; office:number } }) {
  const { t } = useTranslation('common')
  const { addToCart, isInCart } = useCart()
  const [imgIdx, setImgIdx] = useState(0)
  const [mode, setMode] = useState<'info' | 'order'>('info')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumbers, setOrderNumbers] = useState<string[]>([])
  const [addonQtys, setAddonQtys] = useState<Record<string, number>>({})
  const [qty, setQty] = useState(1)
  const inCart = isInCart(product.id)

  const hasPromo = product.promo_price && product.promo_price < product.price
  const activeVariants = (product.variants || []).filter(v => v.is_active)
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(
    activeVariants.length > 0 ? 0 : null
  )
  const selectedVariant = selectedVariantIdx !== null ? activeVariants[selectedVariantIdx] : null
  const variantPrice = selectedVariant?.promo_price ?? selectedVariant?.price ?? null
  const variantStock = selectedVariant?.stock ?? null
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock
  const isOutOfStock = effectiveStock <= 0
  const bundles = product.has_bundles && product.bundles?.length
    ? product.bundles.filter(b => b.is_active !== false && (selectedVariant ? (!b.variant_id || b.variant_id === selectedVariant.name) : !b.variant_id))
    : null
  const [selectedBundleIdx, setSelectedBundleIdx] = useState<number | null>(null)
  const selectedBundle = bundles && selectedBundleIdx !== null ? bundles[selectedBundleIdx] : null
  const bundlePrice = selectedBundle && variantPrice
    ? getBundlePrice(selectedBundle, variantPrice)
    : selectedBundle?.price ?? null

  const displayPrice = bundlePrice ?? variantPrice ?? (hasPromo ? product.promo_price! : product.price)
  const currentTotal = selectedBundle && selectedBundle.quantity_trigger
    ? qty <= selectedBundle.quantity_trigger
      ? bundlePrice!
      : bundlePrice! + (qty - selectedBundle.quantity_trigger) * (selectedVariant?.extra_unit_price ?? 0)
    : displayPrice * qty
  const addonsTotal = addons.reduce((s, a) => {
    const { total } = computeAddonTotal(a.tiers, addonQtys[a.id] || 0)
    return s + total
  }, 0)
  const grandTotal = currentTotal + addonsTotal
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213795653670'
  const waMessage = `Bonjour ! Je voudrais commander le produit suivant :\n\n📦 ${product.name}\n💰 Prix : ${fmt(displayPrice)} DA\n\nMerci de me contacter.`

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(t('outOfStock'))
      return
    }
    const selectedAddons = addons.filter(a => (addonQtys[a.id] || 0) > 0).map(a => {
      const { price_per_unit, total } = computeAddonTotal(a.tiers, addonQtys[a.id])
      return { name: a.name, quantity: addonQtys[a.id], price_per_unit, total }
    })
    const vName = selectedVariant?.name || undefined
    addToCart({
      id: `${product.id}-cart${vName ? '-' + vName : ''}`,
      product_id: product.id,
      name: selectedBundle ? `${product.name} (${selectedBundle.name})` : product.name,
      price: bundlePrice ?? variantPrice ?? product.price,
      promo_price: bundlePrice ? null : (variantPrice ? (selectedVariant?.promo_price || null) : product.promo_price),
      image: product.images?.[0] || '/placeholder.jpg',
      slug: product.slug || product.id,
      bundles: bundles ?? undefined,
      applied_bundle_idx: selectedBundleIdx,
      base_name: product.name,
      base_price: product.price,
      base_promo_price: product.promo_price,
      extra_unit_price: selectedVariant?.extra_unit_price ?? undefined,
      addons: selectedAddons,
      variant_name: vName,
      variant_price: variantPrice ?? undefined,
    }, qty)
    toast.success(t('addedToCart'))
  }

  const handleOrderSuccess = (nums: string[]) => {
    setOrderNumbers(nums)
    setOrderSuccess(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── SUCCESS PAGE ──
  if (orderSuccess) {
    return (
      <Layout title={t('orderConfirmed')}>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md animate-slide-up">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <Check size={44} className="text-white" strokeWidth={3} />
            </div>
            <div className="inline-flex items-center gap-2 text-gold-600 text-xs font-bold uppercase tracking-widest mb-3">
              <span className="w-8 h-px bg-gold-400" />{t('orderReceived')}<span className="w-8 h-px bg-gold-400" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">{t('orderConfirmed')}</h1>
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {orderNumbers.map(n => (
                <div key={n} className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2">
                  <span className="text-sm text-slate-500">{t('orderNumber')} :</span>
                  <span className="text-sm font-black text-navy-700 dark:text-white">#{n}</span>
                </div>
              ))}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
              {t('orderConfirmMsg')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="btn-primary px-8 py-3.5">{t('continueShopping')}</Link>
              <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Bonjour ! Voici ${orderNumbers.length > 1 ? 'mes commandes' : 'ma commande'} : ${orderNumbers.map(n => '#' + n).join(', ')}. Pouvez-vous confirmer ?`)}`}
                target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-3.5">
                <MessageCircle size={18} /> {t('confirmOnWhatsApp')}
              </a>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={product.name} description={product.description}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6 flex-wrap">
          <Link href="/" className="hover:text-navy-600 dark:hover:text-white transition-colors font-medium">{t('home')}</Link>
          <ChevronRight size={12} />
          {product.category && <><Link href={`/?cat=${encodeURIComponent(product.category)}`} className="hover:text-navy-600 dark:hover:text-white transition-colors font-medium">{product.category}</Link><ChevronRight size={12} /></>}
          <span className="text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 xl:gap-14">
          {/* ─── GALLERY ─── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800 group shadow-card">
              {product.images?.[imgIdx] ? (
                <Image src={product.images[imgIdx]} alt={product.name} fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">📦</div>
              )}
              {hasPromo && (
                <div className="absolute top-4 left-4 z-10 text-white text-sm font-black px-3.5 py-1.5 rounded-xl shadow-gold" style={{ background: 'linear-gradient(135deg,#b8870f,#fbc914)' }}>
                  {t('promo')}
                </div>
              )}
              {/* Nav arrows */}
              {product.images?.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(p => Math.max(0, p - 1))} disabled={imgIdx === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-full shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all disabled:opacity-30">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setImgIdx(p => Math.min(product.images.length - 1, p + 1))} disabled={imgIdx === product.images.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-full shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all disabled:opacity-30">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              {/* Share */}
              <button onClick={() => { navigator.share?.({ title: product.name, url: window.location.href }).catch(() => {}) }}
                className="absolute top-4 right-4 w-9 h-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-xl shadow-md flex items-center justify-center text-slate-600 hover:text-navy-700 transition-colors">
                <Share2 size={15} />
              </button>
            </div>

            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 relative ${i === imgIdx ? 'border-navy-600 shadow-navy scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-300'}`}>
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: Truck, text: t('fastDelivery') },
                { icon: Shield, text: t('qualityGuarantee') },
                { icon: Check, text: t('codOnly') },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <Icon size={16} className="text-navy-600 dark:text-navy-400" />
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── PRODUCT INFO + ORDER ─── */}
          <div>
            {/* Product info */}
            <div className="mb-6">
              {product.category && (
                <div className="text-xs font-bold text-navy-500 dark:text-navy-300 uppercase tracking-widest mb-2">{product.category}</div>
              )}
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-4">
                {product.name}
              </h1>

              {/* Price display */}
              {(() => {
                const originalUnitPrice = selectedVariant?.price ?? product.price
                const originalTotal = originalUnitPrice * qty
                const hasDiscount = currentTotal < originalTotal
                return (
                  <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                    <span className={`text-3xl font-black ${hasDiscount ? 'text-gold-600 dark:text-gold-400' : 'text-slate-900 dark:text-white'}`}>{fmt(currentTotal)} DA</span>
                    {hasDiscount && <span className="text-lg text-slate-400 line-through">{fmt(originalTotal)} DA</span>}
                    {hasDiscount && (
                      <span className="bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Zap size={11} className="fill-current" /> {t('promo')}
                      </span>
                    )}
                  </div>
                )
              })()}

              {/* Stock indicator */}
              <div className="flex items-center gap-2 mb-5">
                {selectedVariant ? (
                  selectedVariant.stock > 0 ? (
                    <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('inStock')} {selectedVariant.stock <= 5 && `— ${t('onlyLeft', { count: selectedVariant.stock })}`}</span></>
                  ) : (
                    <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-semibold text-red-500">{t('outOfStock')}</span></>
                  )
                ) : product.stock > 0 ? (
                  <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('inStock')} {product.stock <= 5 && `— ${t('onlyLeft', { count: product.stock })}`}</span></>
                ) : (
                  <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-semibold text-red-500">{t('outOfStock')}</span></>
                )}
              </div>

              {/* Variants */}
              {activeVariants.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t('variantsTitle') || 'Variantes'}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeVariants.map((v, i) => (
                      <button key={i} type="button" onClick={() => {
                        const next = selectedVariantIdx === i ? null : i
                        setSelectedVariantIdx(next)
                        setSelectedBundleIdx(null)
                        if (next !== null) setMode('order')
                        setQty(1)
                      }}
                        className={`w-full flex flex-col p-3 rounded-xl border-2 transition-all ${
                          selectedVariantIdx === i
                            ? 'border-navy-600 bg-navy-50 dark:bg-navy-900/30 dark:border-navy-400'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedVariantIdx === i ? 'border-navy-600 dark:border-navy-400' : 'border-slate-300'
                          }`}>
                            {selectedVariantIdx === i && <div className="w-2 h-2 rounded-full bg-navy-600 dark:bg-navy-400"/>}
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-white">{v.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 ml-6">
                          {v.promo_price ? (
                            <>
                              <span className="text-xs font-black text-gold-600">{fmt(v.promo_price)} DA</span>
                              <span className="text-[10px] text-slate-400 line-through">{fmt(v.price)} DA</span>
                            </>
                          ) : (
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{fmt(v.price)} DA</span>
                          )}
                          {v.stock <= 0 && (
                            <span className="text-[10px] text-red-500 font-semibold">{t('outOfStock')}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bundles */}
              {bundles && (
                <div className="mb-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t('bundlesTitle')}</div>
                  {bundles.map((b, i) => (
                    <button key={i} type="button" onClick={() => {
                        const idx = selectedBundleIdx === i ? null : i
                        setSelectedBundleIdx(idx)
                        if (idx !== null) setMode('order')
                        if (idx !== null && bundles?.[idx]?.quantity_trigger) {
                          setQty(bundles[idx].quantity_trigger!)
                        } else if (idx === null) {
                          setQty(1)
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                        selectedBundleIdx === i
                          ? 'border-navy-600 bg-navy-50 dark:bg-navy-900/30 dark:border-navy-400'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedBundleIdx === i ? 'border-navy-600 dark:border-navy-400' : 'border-slate-300'
                        }`}>
                          {selectedBundleIdx === i && <div className="w-2 h-2 rounded-full bg-navy-600 dark:bg-navy-400"/>}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-white">{b.name}</span>
                      </div>
                      <span className="text-sm font-black text-gold-600 dark:text-gold-400">{fmt(getBundlePrice(b, variantPrice))} DA</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Add-ons */}
              {addons.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t('addonsTitle') || 'Ajouts optionnels'}</div>
                  {addons.map(a => {
                    const qty = addonQtys[a.id] || 0
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-800 dark:text-white">{a.name}</span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {a.tiers.map((t, ti, arr) => (
                              <span key={ti}>
                                {ti > 0 && ' · '}
                                {t.min_quantity}{ti < arr.length - 1 ? `–${arr[ti + 1].min_quantity - 1}` : '+'}: {fmt(t.price_per_unit)} DA
                              </span>
                            ))}
                          </div>
                          {qty > 0 && (() => {
                            const { price_per_unit } = computeAddonTotal(a.tiers, qty)
                            return <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(price_per_unit)} DA/u × {qty} = {fmt(price_per_unit * qty)} DA</span>
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setAddonQtys(p => ({ ...p, [a.id]: Math.max(0, qty - 1) }))}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-navy-400 transition-all disabled:opacity-30"
                            disabled={qty === 0}>
                            <Minus size={11} />
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-slate-800 dark:text-white">{qty}</span>
                          <button type="button" onClick={() => setAddonQtys(p => ({ ...p, [a.id]: Math.min(a.max_quantity, qty + 1) }))}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-navy-400 transition-all disabled:opacity-30"
                            disabled={qty >= a.max_quantity}>
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {addonsTotal > 0 && (
                    <div className="text-right text-xs text-slate-500">
                      {t('addonsTotal') || 'Ajouts'} : {fmt(addonsTotal)} DA
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t('description')}</div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              {/* Mode tabs */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setMode('info')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'info' ? 'bg-navy-700 text-white shadow-navy' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  {t('information')}
                </button>
                <button onClick={() => setMode('order')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'order' ? 'bg-gold-500 text-white shadow-gold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  {t('orderNow')}
                </button>
              </div>

              {mode === 'info' ? (
                /* Cart + Buy Now buttons */
                <div className="space-y-3">
                  <button onClick={handleAddToCart} disabled={isOutOfStock}
                    className={`w-full py-4 text-base rounded-2xl transition-all ${
                      isOutOfStock
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        : inCart
                          ? 'btn-outline'
                          : 'btn-primary'
                    }`}>
                    <ShoppingCart size={20} />
                    {isOutOfStock ? t('outOfStock') : inCart ? t('inCart') : t('addToCart')}
                  </button>
                  <button onClick={() => setMode('order')} disabled={isOutOfStock}
                    className={`w-full py-4 text-base rounded-2xl transition-all ${
                      isOutOfStock
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'btn-gold'
                    }`}>
                    <Zap size={20} className={isOutOfStock ? '' : 'fill-white'} />
                    {isOutOfStock ? t('outOfStock') : t('buyNow')}
                  </button>
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full btn-whatsapp py-4 text-base rounded-2xl">
                    <MessageCircle size={20} /> {t('orderOnWhatsApp')}
                  </a>
                </div>
              ) : (
                /* Full order form */
                <div className="animate-slide-up">
                  <OrderForm
                    product={product}
                    deliveryPrices={deliveryPrices}
                    initialQty={qty}
                    selectedBundle={selectedBundle}
                    onSuccess={handleOrderSuccess}
                    bundles={bundles}
                    selectedBundleIdx={selectedBundleIdx}
                    onSelectBundle={(idx) => {
                      setSelectedBundleIdx(idx)
                      if (idx !== null && bundles?.[idx]?.quantity_trigger) {
                        setQty(bundles[idx].quantity_trigger!)
                      } else if (idx === null) {
                        setQty(1)
                      }
                    }}
                    extraUnitPrice={selectedVariant?.extra_unit_price ?? null}
                    addons={addons}
                    addonQtys={addonQtys}
                    variantPrice={variantPrice}
                  />
                  <div className="mt-4 text-center">
                    <button onClick={() => setMode('info')}
                      className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 mx-auto">
                      <ChevronLeft size={14} /> {t('backToInfo')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  const slug = params?.slug as string
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, variants:product_variants(id, name, price, promo_price, extra_unit_price, stock, is_active), bundles:product_bundles(*)')
      .eq('slug', slug)
      .eq('is_visible', true)
      .single()

    if (error) {
      console.error('Supabase product query error:', error)
      return { notFound: true }
    }
    if (!product) return { notFound: true }

    const [promotions, { data: settings }, { data: addonsData }] = await Promise.all([
      fetchActivePromotions(supabase),
      supabase
        .from('settings')
        .select('key,value')
        .in('key', ['delivery_home_price', 'delivery_office_price']),
      supabase
        .from('product_addons')
        .select('id, name, max_quantity, tiers:product_addon_tiers(min_quantity, price_per_unit)')
        .eq('product_id', product.id)
        .eq('is_active', true),
    ])

    const [promoted] = applyGlobalPromotions([product], promotions)

    return {
      props: {
        ...(await serverSideTranslations(locale || 'fr', ['common'])),
        product: promoted,
        addons: (addonsData || []).map(a => ({
          ...a,
          tiers: (a.tiers || []).map((t: any) => ({ ...t, price_per_unit: Number(t.price_per_unit) })),
        })),
        deliveryPrices: {
          home: Number(settings?.find(s => s.key === 'delivery_home_price')?.value || 400),
          office: Number(settings?.find(s => s.key === 'delivery_office_price')?.value || 250),
        },
      },
    }
  } catch (err: any) {
    console.error('Product page getServerSideProps error:', err?.message || err)
    return { notFound: true }
  }
}