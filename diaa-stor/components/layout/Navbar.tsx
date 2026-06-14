import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import {
  Sun, Moon, Menu, X, Search,
  ShoppingCart, Globe, ChevronDown,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'

export default function Navbar() {
  const router                    = useRouter()
  const { theme, setTheme }       = useTheme()
  const { count, clientReady }    = useCart()
  const [scrolled, setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const [langOpen, setLangOpen]   = useState(false)

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
                  className="object-contain"
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
                { href: '/',                    label: 'Accueil'    },
                { href: '/?section=categories', label: 'Catégories' },
                { href: '/?section=promotions', label: 'Promotions' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all ${textClass}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* ── Right actions ─────────────────────────────── */}
            <div className="flex items-center gap-1">

              {/* Search */}
              <button
                onClick={() => setSearchOpen(s => !s)}
                className={`btn-ghost p-2.5 rounded-xl ${textClass}`}
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
            <div className="pb-3 animate-slide-up">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="input-field flex-1"
                />
                <button type="submit" className="btn-primary px-5 py-2.5">
                  <Search size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
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
                { href: '/',                    label: 'Accueil'    },
                { href: '/?section=categories', label: 'Catégories' },
                { href: '/?section=promotions', label: 'Promotions' },
                /*
                 * "Panier (N)" — the count part is only shown after clientReady
                 * to avoid the server rendering "Panier (0)" while the client
                 * renders "Panier (3)" on the first paint, triggering error #418.
                 */
                {
                  href:  '/cart',
                  label: clientReady && count > 0 ? `Panier (${count})` : 'Panier',
                },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {link.label}
                </Link>
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
    </>
  )
}
