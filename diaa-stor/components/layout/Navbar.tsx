import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import {
  Sun, Moon, Menu, X, Search,
  ShoppingCart, Globe, ChevronDown, MoreHorizontal,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useTranslation } from 'next-i18next'
import { supabase } from '../../lib/supabase'
import { fetchActivePromotions, applyGlobalPromotions } from '../../lib/pricing'

export default function Navbar() {
  const router                    = useRouter()
  const { t } = useTranslation('common')
   const { theme, setTheme }       = useTheme()
  const { count, clientReady }    = useCart()
  const [scrolled, setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const [langOpen, setLangOpen]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchShow, setSearchShow]       = useState(false)
  const [navSearchPos, setNavSearchPos]   = useState({ top: 0, left: 0, width: 0 })
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navSearchTimer = useRef<ReturnType<typeof setTimeout>>()

  const nav = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const hash = href.split('#')[1]
    if (router.pathname === '/' && !hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (router.pathname === '/' && hash) {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push(href)
    }
  }

  /*
   * `mounted` guards two things that must not render on the server:
   *
   *   1. The theme toggle icon (Sun/Moon) — useTheme() returns undefined theme
   *      on the server. Rendering conditionally on theme before mounted causes
   *      error #418 because server and client output differ.
   *
   *   2. The cart badge and "Panier (N)" label — cart count comes from
   *      localStorage which is unavailable on the server. The server always
   *      renders count=0. If localStorage had items, the client renders a
   *      non-zero badge immediately after hydration, causing error #418.
   *      We use `clientReady` from CartContext (set after the localStorage read
   *      useEffect completes) rather than a local mounted flag, so the two are
   *      in sync.
   *
   * Both `mounted` (for theme) and `clientReady` (for cart) become true only
   * inside useEffect, which never runs on the server. This guarantees the
   * server-rendered HTML and the initial client render (before effects) are
   * identical, satisfying React's hydration requirement.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Debounce search input
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 300)
    return () => clearTimeout(t)
  }, [searchQ])

  // Live search
  useEffect(() => {
    if (debouncedQ.length < 1) { setSearchResults([]); setSearchLoading(false); setSearchShow(false); return }
    setSearchLoading(true)
    setSearchShow(true)
    const timer = setTimeout(async () => {
      const [promotions, { data }] = await Promise.all([
        fetchActivePromotions(supabase),
        supabase
          .from('products')
          .select('id, name, slug, price, promo_price, images')
          .or(`name.ilike.%${debouncedQ}%,description.ilike.%${debouncedQ}%`)
          .eq('is_visible', true)
          .limit(8),
      ])
      setSearchResults(applyGlobalPromotions(data || [], promotions))
      setSearchLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [debouncedQ])

  // Update portal position
  useEffect(() => {
    if (searchShow) {
      const el = searchInputRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        setNavSearchPos({ top: r.bottom + 4, left: r.left, width: r.width })
      }
    }
  }, [searchShow])

  // Close results on scroll/resize
  useEffect(() => {
    if (!searchOpen) return
    const fn = () => { setSearchShow(false); setSearchResults([]); setSearchOpen(false); (document.activeElement as HTMLElement)?.blur() }
    window.addEventListener('scroll', fn, true)
    window.addEventListener('resize', fn)
    return () => {
      window.removeEventListener('scroll', fn, true)
      window.removeEventListener('resize', fn)
    }
  }, [searchOpen])

  // Click outside to close results
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([])
        setSearchShow(false)
      }
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  const isHome   = router.pathname === '/'
  const navClass = scrolled || !isHome ? 'navbar-solid' : 'navbar-transparent'
  const textClass = !isHome || scrolled
    ? 'text-slate-700 dark:text-slate-200'
    : 'text-white'

  const langs = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية',  flag: '🇩🇿' },
    { code: 'en', label: 'English',  flag: '🇬🇧' },
  ]

  const switchLang = (code: string) => {
    router.push(router.pathname, router.asPath, { locale: code })
    setLangOpen(false)
    setMobileOpen(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQ.trim())}`)
      setSearchOpen(false)
      setSearchQ('')
    }
  }

  return (
    <>
      <nav className={`navbar ${navClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ─────────────────────────────────────── */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Diaa Store"
                  fill
                  className="object-contain rounded-xl"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <div className={`font-black text-lg leading-none ${!isHome || scrolled ? 'text-navy-800 dark:text-white' : 'text-white'}`}>
                  Diaa <span className="text-gold-500">Store</span>
                </div>
                <div className={`text-[9px] tracking-widest uppercase font-medium ${!isHome || scrolled ? 'text-slate-400 dark:text-slate-500' : 'text-white/60'}`}>
                  Illuminate Your Shopping
                </div>
              </div>
            </Link>

            {/* ── Desktop nav links ─────────────────────────── */}
            <div className="hidden md:flex items-center gap-1">
              {[
                 { href: '/', label: t('home') },
                 { href: '/#categories', label: t('categories') },
                 { href: '/#promotions', label: t('promotions') }
               ]	.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={nav(link.href)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all ${textClass}`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* ── Right actions ─────────────────────────────── */}
            <div className="flex items-center gap-1">

              {/* Search */}
              <button
                onClick={() => setSearchOpen(s => !s)}
                className={`btn-ghost p-2.5 rounded-xl outline-none focus:outline-none focus:ring-0 ${textClass}`}
                aria-label="Rechercher"
              >
                <Search size={18} />
              </button>

              {/* Cart icon + badge
                  Rendered unconditionally so server and client agree on the
                  icon itself. The badge (count) is suppressed until clientReady
                  because the server always sees count=0 and the client may see
                  a non-zero value after reading localStorage. */}
              <Link
                href="/cart"
                className={`relative btn-ghost p-2.5 rounded-xl ${textClass}`}
                aria-label="Panier"
              >
                <ShoppingCart size={18} />
                {clientReady && count > 0 && (
                  <span className="cart-badge">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>

              {/* Language switcher */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setLangOpen(s => !s)}
                  className={`btn-ghost p-2 rounded-xl flex items-center gap-1 text-xs font-bold ${textClass}`}
                >
                  <Globe size={15} />
                  <span className="uppercase">{router.locale}</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${langOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {langOpen && (
                  <div className="absolute top-full right-0 mt-2 w-40 card py-1 z-50 animate-fade-in">
                    {langs.map(l => (
                      <button
                        key={l.code}
                        onClick={() => switchLang(l.code)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                          router.locale === l.code
                            ? 'font-bold text-navy-700 dark:text-gold-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme toggle
                  Only rendered after mount. On the server (and during the first
                  client render before effects) this slot is empty — both sides
                  agree. After mount the button appears without a hydration
                  conflict because React does not diff already-hydrated nodes
                  against new additions from useEffect. */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`btn-ghost p-2.5 rounded-xl ${textClass}`}
                  aria-label="Changer le thème"
                >
                  {theme === 'dark'
                    ? <Sun  size={18} className="text-gold-400" />
                    : <Moon size={18} />
                  }
                </button>
              )}

              {/* Three-dots menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(s => !s)}
                  className={`btn-ghost p-2.5 rounded-xl ${textClass}`}
                  aria-label="Plus d'options"
                >
                  <MoreHorizontal size={18} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-44 card py-1 z-50 animate-fade-in">
                      <Link href="/admin" target="_blank"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        ⚙️ لوحة التحكم
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(s => !s)}
                className={`btn-ghost p-2.5 rounded-xl md:hidden ${textClass}`}
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* ── Inline search bar ─────────────────────────── */}
          {searchOpen && (
            <div className="pb-3 animate-slide-up" ref={searchRef}
              onMouseLeave={() => {
                navSearchTimer.current = setTimeout(() => {
                  setSearchShow(false)
                  setSearchResults([])
                  setSearchOpen(false)
                  ;(document.activeElement as HTMLElement)?.blur()
                }, 300)
              }}
              onMouseEnter={() => clearTimeout(navSearchTimer.current)}
            >
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    autoFocus
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all duration-200 text-sm outline-none"
                    style={{ outline: 'none', boxShadow: 'none' }}
                  />
                </div>
                <button type="submit" className="btn-primary px-5 py-2.5">
                  <Search size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchShow(false) }}
                  className="btn-ghost px-3 rounded-xl border border-slate-200 dark:border-slate-600"
                >
                  <X size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Mobile menu ───────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="px-4 py-3 space-y-1">
                {[
                  { href: '/', label: t('home') },
                  { href: '/#categories', label: t('categories') },
                  { href: '/#promotions', label: t('promotions') },
                  {
                    href: '/cart',
                    label:
                      clientReady && count > 0
                        ? `${t('cart')} (${count})`
                        : t('cart'),
                  },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => { setMobileOpen(false); nav(link.href)(e) }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}

              {/* Language switcher in mobile menu */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                {langs.map(l => (
                  <button
                    key={l.code}
                    onClick={() => switchLang(l.code)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      router.locale === l.code
                        ? 'bg-navy-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {l.flag} {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer — only on non-home pages where the navbar is solid */}
      <div className={isHome ? '' : 'h-16'} />

      {/* Navbar search portal — renders outside navbar container */}
      {mounted && searchShow && createPortal(
        <div
          style={{ position: 'fixed', top: navSearchPos.top, left: navSearchPos.left, width: navSearchPos.width }}
          className="z-[9999]"
          onMouseEnter={() => clearTimeout(navSearchTimer.current)}
          onMouseLeave={() => {
            navSearchTimer.current = setTimeout(() => {
              setSearchShow(false)
              setSearchResults([])
              setSearchOpen(false)
              ;(document.activeElement as HTMLElement)?.blur()
            }, 300)
          }}
        >
          {searchLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-400">
              Recherche...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto">
              {searchResults.map(p => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  onClick={() => { setSearchOpen(false); setSearchQ(''); setSearchResults([]); setSearchShow(false) }}
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
    </>
  )
}
