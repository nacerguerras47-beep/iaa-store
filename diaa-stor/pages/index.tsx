import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, ChevronRight, MessageCircle, Zap,
  X, Sparkles, ShoppingBag,
} from 'lucide-react'
import Layout from '../components/layout/Layout'
import ProductCard from '../components/product/ProductCard'
// Import ONLY the public supabase client — never supabaseAdmin in a page component.
// supabaseAdmin uses SUPABASE_SERVICE_ROLE_KEY which is undefined on the client bundle.
// @supabase/supabase-js v2 throws "supabaseKey is required" when the key is falsy,
// crashing the entire module at load time and producing React errors #418 / #423.
import { supabase } from '../lib/supabase'
import { fetchActivePromotions, applyGlobalPromotions } from '../lib/pricing'

interface Product {
  id: string; name: string; slug: string; price: number
  promo_price?: number | null; images: string[]
  category?: string; is_new?: boolean; stock?: number
  has_bundles?: boolean; bundles?: { name: string; price: number; quantity_trigger?: number | null }[]; extra_unit_price?: number | null
}
interface Category { id: string; name: string; icon: string; slug: string }
interface Banner {
  id: string; title: string; subtitle: string
  button_text: string; link: string; image_url?: string
}
interface Props {
  initialProducts: Product[]
  categories:      Category[]
  banners:         Banner[]
}

/**
 * fmt — always passes 'fr-FR' explicitly to toLocaleString.
 * Without an explicit locale, Node.js on Netlify uses 'en-US' (1,500 with commas)
 * while Algerian browsers use 'fr-FR' (1 500 with spaces), producing a text-node
 * mismatch that triggers React hydration error #418.
 */
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

export default function Home({ initialProducts, categories, banners }: Props) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [products, setProducts]               = useState<Product[]>(initialProducts)
  const [loading, setLoading]                 = useState(false)
  const [search, setSearch]                   = useState((router.query.search as string) || '')
  const [activeCategory, setActiveCategory]   = useState((router.query.cat as string) || 'all')
  const [bannerIdx, setBannerIdx]             = useState(0)
  const [hasMounted, setHasMounted]           = useState(false)
  const productsRef                            = useRef<HTMLDivElement>(null)
  const heroInputRef                           = useRef<HTMLInputElement>(null)
  const heroCloseTimer                         = useRef<ReturnType<typeof setTimeout>>()
  const [heroResults, setHeroResults]          = useState<any[]>([])
  const [heroLoading, setHeroLoading]          = useState(false)
  const [heroPos, setHeroPos]                  = useState({ top: 0, left: 0, width: 0 })
  const [heroShow, setHeroShow]                = useState(false)

  // Debounce for hero autocomplete
  const [heroDebounced, setHeroDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setHeroDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Update portal position when results appear
  useEffect(() => {
    if (heroResults.length > 0 || heroDebounced.length >= 1) {
      const el = heroInputRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        setHeroPos({ top: r.bottom + 4, left: r.left, width: r.width })
      }
    }
  }, [heroResults, heroDebounced])

  // Live search from hero
  useEffect(() => {
    if (heroDebounced.length < 1) { setHeroResults([]); setHeroLoading(false); setHeroShow(false); return }
    setHeroLoading(true)
    setHeroShow(true)
    const timer = setTimeout(async () => {
      const [promotions, { data }] = await Promise.all([
        fetchActivePromotions(supabase),
        supabase
          .from('products')
          .select('id, name, slug, price, promo_price, images, has_bundles, bundles, extra_unit_price')
          .or(`name.ilike.%${heroDebounced}%,description.ilike.%${heroDebounced}%`)
          .eq('is_visible', true)
          .limit(8),
      ])
      setHeroResults(applyGlobalPromotions(data || [], promotions))
      setHeroLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [heroDebounced])

  // Click outside to close hero results
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (heroInputRef.current && !heroInputRef.current.parentElement?.contains(e.target as Node)) {
        setHeroShow(false)
        setHeroResults([])
      }
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  // Close results on scroll/resize
  useEffect(() => {
    const fn = () => { setHeroShow(false); setHeroResults([]) }
    window.addEventListener('scroll', fn, true)
    window.addEventListener('resize', fn)
    return () => {
      window.removeEventListener('scroll', fn, true)
      window.removeEventListener('resize', fn)
    }
  }, [])

  // Mark as mounted after hydration is complete
  useEffect(() => { setHasMounted(true) }, [])

  // Banner auto-rotate — safe: only touches UI state, not product data
  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setBannerIdx(p => (p + 1) % banners.length), 5500)
    return () => clearInterval(t)
  }, [banners.length])

  // Smooth scroll to hash after navigation (from other pages)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash)
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 80
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 200)
    }
  }, [])

  // Sync activeCategory from URL ?cat=...
  useEffect(() => {
    const cat = router.query.cat as string
    if (cat) {
      setActiveCategory(cat)
      setTimeout(() => productsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
  }, [router.query.cat])

  // Product filter / search — only runs after mount AND when user changes filter
  useEffect(() => {
    // Skip on the initial mount: SSR already provided the correct product list.
    // Only re-fetch when the user actively changes search or category.
    if (!hasMounted) return

    const timer = setTimeout(async () => {
      setLoading(true)
      let q = supabase
        .from('products')
        .select('id,name,slug,price,promo_price,images,category,is_new,stock,has_bundles,bundles,extra_unit_price')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
      if (search)                   q = q.ilike('name', `%${search}%`)
      if (activeCategory !== 'all') q = q.eq('category', activeCategory)
      const [{ data }, promotions] = await Promise.all([
        q.limit(24),
        fetchActivePromotions(supabase),
      ])
      setProducts(applyGlobalPromotions(data || [], promotions))
      setLoading(false)
    }, search ? 400 : 0)

    return () => clearTimeout(timer)
  }, [search, activeCategory, hasMounted])

  const promoProducts = products
    .filter(p => p.promo_price && p.promo_price < p.price)
    .slice(0, 8)

  const banner   = banners[bannerIdx]
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213795653670'

  return (
    <Layout>
      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />

        {/* Decorative orbs */}
        <div className="hero-orb w-[600px] h-[600px] bg-gold-500/20 -top-40 -right-40 animate-float"
          style={{ animationDelay: '0s' }} />
        <div className="hero-orb w-[400px] h-[400px] bg-navy-400/20 -bottom-20 -left-20 animate-float"
          style={{ animationDelay: '2s' }} />
        <div className="hero-orb w-[200px] h-[200px] bg-gold-400/15 top-1/3 left-1/3 animate-float"
          style={{ animationDelay: '4s' }} />

        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />

        {banner?.image_url && (
          <div className="absolute inset-0">
            <Image src={banner.image_url} alt="" fill
              className="object-cover opacity-15" priority />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — text */}
            <div>
              <div className="flex items-center gap-4 mb-8 animate-fade-in">
                         <div className="relative w-16 h-16 rounded-2xl overflow-hidden">
                            <Image
                              src="/logo.png"
                              alt="Diaa Store"
                              fill
                              className="object-cover"
                             />
                          </div>
                <div>
                  <div className="text-white/60 text-xs tracking-widest uppercase font-medium">
                    {t('welcome')}
                  </div>
                  <div className="text-white text-2xl font-black">
                    Diaa <span className="gradient-text-gold">Store</span>
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6 animate-slide-up">
                {banner?.title
                  ? <span>{banner.title}</span>
                  : <><span className="gradient-text-gold">Illuminate</span><br />Your Shopping</>
                }
              </h1>

              <p className="text-lg text-white/70 mb-8 max-w-md leading-relaxed animate-slide-up"
                style={{ animationDelay: '0.1s' }}>
                {banner?.subtitle || t('heroSubtitle')}
              </p>

              <div
                className="relative mb-8 animate-slide-up"
                style={{ animationDelay: '0.15s' }}
                onMouseLeave={() => {
                  heroCloseTimer.current = setTimeout(() => {
                    setHeroShow(false)
                    setHeroResults([])
                  }, 300)
                }}
                onMouseEnter={() => clearTimeout(heroCloseTimer.current)}
              >
                <Search size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 z-10" />
                <input
                  ref={heroInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => {
                    if (heroDebounced.length >= 1) {
                      setHeroShow(true)
                      const el = heroInputRef.current!
                      const r = el.getBoundingClientRect()
                      setHeroPos({ top: r.bottom + 4, left: r.left, width: r.width })
                    }
                  }}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-12 pr-28 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:bg-white/15 transition-all text-sm"
                />
                {search && (
                  <button onClick={() => { setSearch(''); setHeroResults([]) }}
                    className="absolute right-20 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
                    <X size={15} />
                  </button>
                )}
                <button
                  onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-gold-500 hover:bg-gold-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors">
                  {t('searchButton')}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <button
                  onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-gold px-7 py-3.5 text-base">
                  <ShoppingBag size={18} />
                  {banner?.button_text || t('exploreProducts')}
                </button>
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Bonjour ! Je voudrais en savoir plus sur vos produits.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-whatsapp px-7 py-3.5 text-base">
                  <MessageCircle size={18} /> {t('orderOnWhatsApp')}
                </a>
              </div>
            </div>

            {/* Right — floating product previews */}
            <div className="hidden lg:flex flex-col items-center justify-center relative h-80">
              {initialProducts.slice(0, 3).map((p, i) => (
                <div
                  key={p.id}
                  className="absolute card p-3 w-52 shadow-xl animate-float"
                  style={{
                    top:            `${i * 28}%`,
                    left:           `${i * 15}%`,
                    animationDelay: `${i * 0.8}s`,
                    zIndex:         3 - i,
                    opacity:        1 - i * 0.15,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={p.images?.[0] || '/placeholder.jpg'}
                        alt={p.name} fill className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-xs font-black text-gold-600">
                        {fmt(p.promo_price || p.price)} DA
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {banners.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setBannerIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === bannerIdx ? 'w-8 bg-gold-400' : 'w-2 bg-white/30'
                  }`} />
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-transparent to-transparent" />
      </section>

      {/* ─── TRUST BADGES ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-2 relative z-10 mb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: '🚚', title: t('trustDelivery'),        desc: t('trustDeliveryDesc')       },
            { emoji: '💳', title: t('trustPayment'),         desc: t('trustPaymentDesc')        },
            { emoji: '💬', title: t('trustSupport'),         desc: t('trustSupportDesc')        },
            { emoji: '🛡️', title: t('trustGuarantee'),       desc: t('trustGuaranteeDesc')      },
          ].map((b, i) => (
            <div key={b.title}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:border-gold-400 hover:shadow-gold transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="text-2xl flex-shrink-0">{b.emoji}</div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                  {b.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CATEGORIES ─────────────────────────────────────── */}
      {categories.length > 0 && (
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400 mb-1">
                {t('browse')}
              </div>
              <h2 className="section-title">{t('categories')}</h2>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            <button onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeCategory === 'all'
                  ? 'bg-navy-700 text-white shadow-navy'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}>
              🏪 {t('all')}
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeCategory === cat.name
                    ? 'bg-navy-700 text-white shadow-navy'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── PROMOTIONS ─────────────────────────────────────── */}
      {promoProducts.length > 0 && activeCategory === 'all' && !search && (
        <section id="promotions" className="bg-gradient-hero py-14 mb-14 relative overflow-hidden">
          <div className="hero-orb w-64 h-64 bg-gold-400/10 -top-10 right-10" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 text-gold-400 text-xs font-bold uppercase tracking-widest mb-1">
                  <Zap size={12} className="fill-gold-400" /> {t('limitedOffers')}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  <span className="gradient-text-gold">{t('specialPromotions')}</span>
                </h2>
              </div>
              <button
                onClick={() => { setActiveCategory('all'); productsRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                className="text-gold-400 hover:text-gold-300 text-sm font-bold flex items-center gap-1 transition-colors">
                {t('seeAll')} <ChevronRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {promoProducts.map((p, i) => (
                <div key={p.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
        </section>
      )}

      {/* ─── ALL PRODUCTS ───────────────────────────────────── */}
      <section ref={productsRef} id="products" className="max-w-7xl mx-auto px-4 sm:px-6 mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {t('catalog')}
              </div>
              <h2 className="section-title">
                {search
                  ? `${t('resultsFor')} : "${search}"`
                  : activeCategory !== 'all'
                    ? activeCategory
                    : t('allProducts')}
            </h2>
          </div>
          {(search || activeCategory !== 'all') && (
            <button onClick={() => { setSearch(''); setActiveCategory('all') }}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors font-semibold">
                <X size={14} /> {t('reset')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                {t('noProductsFound')}
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                {t('tryAnotherTerm')}
              </p>
              <button onClick={() => { setSearch(''); setActiveCategory('all') }} className="btn-primary">
                {t('seeAllProducts')}
              </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <div key={p.id} className="animate-slide-up"
                style={{ animationDelay: `${(i % 8) * 0.05}s` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── BOTTOM CTA ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="relative bg-gradient-hero rounded-3xl overflow-hidden p-10 md:p-14 text-center">
          <div className="hero-orb w-60 h-60 bg-gold-400/20 -top-10 right-10" />
          <div className="absolute inset-0 border border-white/10 rounded-3xl" />
          <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-400/30 rounded-full px-4 py-1.5 mb-5">
                  <Sparkles size={12} className="text-gold-400" />
                  <span className="text-gold-400 text-xs font-bold uppercase tracking-wider">
                    {t('nationalDelivery')}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                  {t('orderNow')},<br />
                  <span className="gradient-text-gold">{t('payOnDelivery')}</span>
                </h2>
                <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
                  {t('deliveryDesc')}
                </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-gold px-8 py-4 text-base">
                  <ShoppingBag size={18} /> {t('viewProducts')}
              </button>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Bonjour ! Je veux passer une commande.')}`}
                target="_blank" rel="noopener noreferrer"
                  className="btn-whatsapp px-8 py-4 text-base">
                  <MessageCircle size={18} /> {t('orderOnWhatsApp')}
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* Hero search portal — renders outside overflow-hidden section */}
      {hasMounted && heroShow && createPortal(
        <div
          style={{ position: 'fixed', top: heroPos.top, left: heroPos.left, width: heroPos.width }}
          className="z-[9999]"
          onMouseEnter={() => clearTimeout(heroCloseTimer.current)}
          onMouseLeave={() => {
            heroCloseTimer.current = setTimeout(() => {
              setHeroShow(false)
              setHeroResults([])
            }, 300)
          }}
        >
          {heroLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-400">
              Recherche...
            </div>
          ) : heroResults.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto">
              {heroResults.map(p => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  onClick={() => { setSearch(''); setHeroResults([]) }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">{p.name}</div>
                    <div className="text-xs font-bold text-gold-600 dark:text-gold-400">
                      {p.promo_price && p.promo_price < p.price ? (
                        <><span>{Number(p.promo_price).toLocaleString('fr-FR')} DA</span><span className="text-slate-400 line-through ml-1.5 font-normal">{Number(p.price).toLocaleString('fr-FR')} DA</span></>
                      ) : (
                        <>{Number(p.price).toLocaleString('fr-FR')} DA</>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-400">
              Aucun produit trouvé
            </div>
          )}
        </div>,
        document.body
      )}
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  const searchQuery = (query.search as string) || ''
  const catQuery    = (query.cat as string) || ''
  try {
    const [
      { data: products },
      { data: categories },
      { data: banners },
      promotions,
    ] = await Promise.all([
      (async () => {
        let q = supabase.from('products').select('id,name,slug,price,promo_price,images,category,is_new,stock,has_bundles,bundles,extra_unit_price,variants:product_variants(id,name,price,promo_price,stock,is_active)').eq('is_visible', true)
        if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)
        if (catQuery)    q = q.eq('category', catQuery)
        return q.order('created_at', { ascending: false }).limit(24)
      })(),
      supabase.from('categories').select('*').order('name'),
      supabase.from('banners').select('*').eq('is_active', true).order('order_index'),
      fetchActivePromotions(supabase),
    ])

    return {
      props: {
        ...(await serverSideTranslations(locale || 'fr', ['common'])),
        initialProducts: applyGlobalPromotions(products   || [], promotions),
        categories:      categories || [],
        banners:         banners    || [],
      },
    }
  } catch {
    return {
      props: {
        ...(await serverSideTranslations(locale || 'fr', ['common'])),
        initialProducts: [],
        categories:      [],
        banners:         [],
      },
    }
  }
}
