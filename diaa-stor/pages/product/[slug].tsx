import { useState } from 'react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingCart, Zap, Check, MessageCircle, Share2, Shield, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'
import OrderForm from '../../components/product/OrderForm'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../context/CartContext'

interface Product { id:string; name:string; slug:string; description?:string; price:number; promo_price?:number|null; images:string[]; stock:number; category?:string; is_visible:boolean }
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


export default function ProductPage({ product, deliveryPrices }: { product: Product; deliveryPrices: { home:number; office:number } }) {
  const { addToCart, isInCart } = useCart()
  const [imgIdx, setImgIdx] = useState(0)
  const [mode, setMode] = useState<'info' | 'order'>('info')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const inCart = isInCart(product.id)

  const hasPromo = product.promo_price && product.promo_price < product.price
  const displayPrice = hasPromo ? product.promo_price! : product.price
  const discount = hasPromo ? Math.round(((product.price - product.promo_price!) / product.price) * 100) : 0
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213XXXXXXXXX'
  const waMessage = `Bonjour ! Je voudrais commander le produit suivant :\n\n📦 ${product.name}\n💰 Prix : ${fmt(displayPrice)} DA\n\nMerci de me contacter.`

  const handleAddToCart = () => {
    addToCart({
      id: `${product.id}-cart`,
      product_id: product.id,
      name: product.name,
      price: product.price,
      promo_price: product.promo_price,
      image: product.images?.[0] || '/placeholder.jpg',
      slug: product.slug || product.id,
    })
    toast.success('Ajouté au panier !')
  }

  const handleOrderSuccess = (num: string) => {
    setOrderNumber(num)
    setOrderSuccess(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── SUCCESS PAGE ──
  if (orderSuccess) {
    return (
      <Layout title="Commande confirmée">
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md animate-slide-up">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <Check size={44} className="text-white" strokeWidth={3} />
            </div>
            <div className="inline-flex items-center gap-2 text-gold-600 text-xs font-bold uppercase tracking-widest mb-3">
              <span className="w-8 h-px bg-gold-400" />✦ Commande reçue ✦<span className="w-8 h-px bg-gold-400" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Commande confirmée !</h1>
            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 mb-5">
              <span className="text-sm text-slate-500">N° commande :</span>
              <span className="text-sm font-black text-navy-700 dark:text-white">#{orderNumber}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
              Votre commande a été enregistrée avec succès. Notre équipe vous contactera sur le numéro fourni pour confirmer la livraison.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="btn-primary px-8 py-3.5">Continuer mes achats</Link>
              <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Bonjour ! J'ai passé la commande #${orderNumber}. Pouvez-vous confirmer ?`)}`}
                target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-3.5">
                <MessageCircle size={18} /> Confirmer sur WhatsApp
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
          <Link href="/" className="hover:text-navy-600 dark:hover:text-white transition-colors font-medium">Accueil</Link>
          <ChevronRight size={12} />
          {product.category && <><span className="text-slate-400">{product.category}</span><ChevronRight size={12} /></>}
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
                  -{discount}%
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
                { icon: Truck, text: 'Livraison rapide' },
                { icon: Shield, text: 'Garantie qualité' },
                { icon: Check, text: 'COD uniquement' },
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
              <div className="flex items-baseline gap-3 mb-3">
                {hasPromo ? (
                  <>
                    <span className="text-3xl font-black text-gold-600 dark:text-gold-400">{fmt(displayPrice)} DA</span>
                    <span className="text-lg text-slate-400 line-through">{fmt(product.price)} DA</span>
                    <span className="bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Zap size={11} className="fill-current" /> PROMO
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{fmt(displayPrice)} DA</span>
                )}
              </div>

              {/* Stock indicator */}
              <div className="flex items-center gap-2 mb-5">
                {product.stock > 0 ? (
                  <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">En stock {product.stock <= 5 && `— seulement ${product.stock} restants`}</span></>
                ) : (
                  <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-semibold text-red-500">Rupture de stock</span></>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              {/* Mode tabs */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setMode('info')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'info' ? 'bg-navy-700 text-white shadow-navy' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  Informations
                </button>
                <button onClick={() => setMode('order')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'order' ? 'bg-gold-500 text-white shadow-gold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  Commander maintenant
                </button>
              </div>

              {mode === 'info' ? (
                /* Cart + Buy Now buttons */
                <div className="space-y-3">
                  <button onClick={handleAddToCart}
                    className={`w-full ${inCart ? 'btn-outline' : 'btn-primary'} py-4 text-base rounded-2xl`}>
                    <ShoppingCart size={20} />
                    {inCart ? 'Déjà dans le panier — Ajouter encore' : 'Ajouter au panier'}
                  </button>
                  <button onClick={() => setMode('order')}
                    className="w-full btn-gold py-4 text-base rounded-2xl">
                    <Zap size={20} className="fill-white" />
                    Acheter maintenant
                  </button>
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full btn-whatsapp py-4 text-base rounded-2xl">
                    <MessageCircle size={20} /> Contacter via WhatsApp
                  </a>
                </div>
              ) : (
                /* Full order form */
                <div className="animate-slide-up">
                  <OrderForm
                    product={product}
                    deliveryPrices={deliveryPrices}
                    onSuccess={handleOrderSuccess}
                  />
                  <div className="mt-4 text-center">
                    <button onClick={() => setMode('info')}
                      className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 mx-auto">
                      <ChevronLeft size={14} /> Retour aux informations
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
  const { data: product } = await supabase
    .from('products').select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .eq('is_visible', true).single()
  if (!product) return { notFound: true }
  const { data: settings } = await supabase.from('settings').select('key,value').in('key', ['delivery_home_price', 'delivery_office_price'])
  return {
    props: {
      ...(await serverSideTranslations(locale || 'fr', ['common'])),
      product,
      deliveryPrices: {
        home: Number(settings?.find(s => s.key === 'delivery_home_price')?.value || 400),
        office: Number(settings?.find(s => s.key === 'delivery_office_price')?.value || 250),
      },
    },
  }
}
