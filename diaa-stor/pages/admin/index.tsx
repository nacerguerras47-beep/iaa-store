import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Megaphone,
  ImageIcon, Settings, LogOut, Sun, Moon, Plus, Search,
  Edit2, Trash2, Eye, EyeOff, Upload, X, ChevronDown,
  Check, TrendingUp, DollarSign, Clock, RefreshCw, Menu,
  Save, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Minus, ArrowUpDown, ExternalLink,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────
interface Product {
  id: string; name: string; slug: string; description?: string
  price: number; promo_price?: number | null; images: string[]
  category?: string; stock: number; is_visible: boolean; is_new?: boolean
  created_at: string
}
interface Order {
  id: string; order_number: string; product_name: string; quantity: number
  unit_price: number; delivery_price: number; total_price: number
  last_name: string; first_name: string; phone: string
  wilaya: string; commune: string; address: string
  delivery_type: string; status: string; nombre?: number | null
  created_at: string
}
interface Category { id: string; name: string; icon: string; slug: string }
interface Banner {
  id: string; title: string; subtitle: string; button_text: string
  link: string; image_url?: string; is_active: boolean; order_index: number
}
interface Promotion {
  id: string; label: string; discount_percent?: number; product_id?: string
  starts_at?: string; ends_at?: string; is_active: boolean
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente', cls: 'status-pending'   },
  confirmed: { label: 'Confirmé',   cls: 'status-confirmed' },
  shipped:   { label: 'Expédié',    cls: 'status-shipped'   },
  delivered: { label: 'Livré',      cls: 'status-delivered' },
  cancelled: { label: 'Annulé',     cls: 'status-cancelled' },
}

// ─── Root ─────────────────────────────────────────────────────
export default function AdminPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [token, setToken] = useState('')
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [logging, setLogging] = useState(false)
  const [tab, setTab] = useState<'dashboard'|'products'|'orders'|'categories'|'promotions'|'banners'|'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Read localStorage only on client. Setting mounted=true AFTER reading
    // ensures the first client render matches the server render (both show
    // a neutral loading state), satisfying React hydration.
    const saved = localStorage.getItem('ds_admin_token')
    if (saved) { setToken(saved); setAuthed(true) }
    setMounted(true)
  }, [])

  const apiHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLogging(true); setPwErr('')
    try {
      const r = await fetch('/api/admin/products?limit=1', {
        headers: { Authorization: `Bearer ${pw}` }
      })
      if (r.status === 401) { setPwErr('Mot de passe incorrect'); return }
      setToken(pw); setAuthed(true)
      localStorage.setItem('ds_admin_token', pw)
    } catch { setPwErr('Erreur réseau') } finally { setLogging(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('ds_admin_token')
    setAuthed(false); setToken(''); setPw('')
  }

  // ── Loading state (server render + first client render before effects) ──
  // Both server and client render this neutral screen, so they agree.
  // After useEffect runs (client-only), mounted becomes true and we show
  // either the login form or the dashboard — no hydration mismatch.
  if (!mounted) return (
    <>
      <Head><title>Admin — Diaa Store</title></Head>
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <Image src="/logo.png" alt="Diaa Store" fill className="object-contain" />
          </div>
          <div className="w-8 h-8 border-4 border-white/20 border-t-gold-400 rounded-full animate-spin" />
        </div>
      </div>
    </>
  )

  // ── Login screen ──
  if (!authed) return (
    <>
      <Head><title>Admin — Diaa Store</title></Head>
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-8">
            <div className="relative w-20 h-20 bg-white/10 rounded-2xl p-3 mx-auto mb-4 border border-white/20">
              <Image src="/logo.png" alt="Diaa Store" fill className="object-contain p-1" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Administration</h1>
            <p className="text-white/50 text-sm">Diaa Store Dashboard</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label">Mot de passe</label>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                  className="input-field" placeholder="••••••••" autoFocus />
                {pwErr && <p className="field-error mt-1.5"><AlertCircle size={12}/>{pwErr}</p>}
              </div>
              <button type="submit" disabled={logging || !pw} className="w-full btn-primary py-3.5">
                {logging ? <><Loader2 size={16} className="animate-spin"/>Vérification...</> : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )

  const navItems = [
    { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'products',   label: 'Produits',         icon: Package         },
    { id: 'orders',     label: 'Commandes',        icon: ShoppingBag     },
    { id: 'categories', label: 'Catégories',       icon: Tag             },
    { id: 'promotions', label: 'Promotions',       icon: Megaphone       },
    { id: 'banners',    label: 'Bannières',        icon: ImageIcon       },
    { id: 'settings',   label: 'Paramètres',       icon: Settings        },
  ] as const

  return (
    <>
      <Head><title>Admin — Diaa Store</title></Head>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
        {/* ── Sidebar ── */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 shadow-card
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0
        `}>
          {/* Logo */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image src="/logo.png" alt="" fill className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm text-slate-900 dark:text-white">Diaa <span className="text-gold-500">Store</span></div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest truncate">Administration</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
              <X size={16}/>
            </button>
          </div>
          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <button key={item.id}
                  onClick={() => { setTab(item.id as any); setSidebarOpen(false) }}
                  className={`admin-nav-item ${tab === item.id ? 'admin-nav-active' : 'admin-nav-inactive'}`}>
                  <Icon size={17}/>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
          {/* Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="admin-nav-item admin-nav-inactive">
                {theme === 'dark'
                  ? <Sun size={17} className="text-gold-400"/>
                  : <Moon size={17}/>}
                <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
            )}
            <Link href="/" target="_blank"
              className="admin-nav-item admin-nav-inactive">
              <ExternalLink size={17}/><span>Voir la boutique</span>
            </Link>
            <button onClick={handleLogout}
              className="admin-nav-item text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full">
              <LogOut size={17}/><span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}/>
        )}

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 shadow-soft">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden btn-ghost p-2 rounded-lg">
              <Menu size={18}/>
            </button>
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              {navItems.find(n => n.id === tab)?.label}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </span>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {tab === 'dashboard'  && <DashTab  apiHeaders={apiHeaders}/>}
            {tab === 'products'   && <ProdTab  apiHeaders={apiHeaders}/>}
            {tab === 'orders'     && <OrdTab   apiHeaders={apiHeaders}/>}
            {tab === 'categories' && <CatTab   apiHeaders={apiHeaders}/>}
            {tab === 'promotions' && <PromoTab apiHeaders={apiHeaders}/>}
            {tab === 'banners'    && <BannerTab apiHeaders={apiHeaders}/>}
            {tab === 'settings'   && <SettingsTab apiHeaders={apiHeaders}/>}
          </main>
        </div>
      </div>
    </>
  )
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient, sub }: {
  label:string; value:string|number; icon:any; gradient:string; sub?:string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${gradient}`}>
        <Icon size={20}/>
      </div>
      <div className="min-w-0">
        <div className="text-xl font-black text-slate-900 dark:text-white truncate">{value}</div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────
function DashTab({ apiHeaders }: { apiHeaders: any }) {
  const [stats, setStats] = useState({ orders:0, pending:0, revenue:0, products:0 })
  const [recent, setRecent] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders?limit=10',   { headers: apiHeaders }).then(r => r.json()),
      fetch('/api/admin/products?limit=1', { headers: apiHeaders }).then(r => r.json()),
    ]).then(([ord, prod]) => {
      const orders: Order[] = ord.orders || []
      setRecent(orders)
      setStats({
        orders:   ord.total   || 0,
        pending:  orders.filter((o:Order) => o.status === 'pending').length,
        revenue:  orders.reduce((s:number, o:Order) => s + (o.total_price||0), 0),
        products: prod.total  || 0,
      })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_,i) => <div key={i} className="card p-5 h-24 skeleton"/>)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total commandes"   value={stats.orders}   icon={ShoppingBag}   gradient="bg-gradient-to-br from-navy-600 to-navy-800" sub="Toutes les commandes"/>
        <StatCard label="En attente"        value={stats.pending}  icon={Clock}          gradient="bg-gradient-to-br from-amber-500 to-amber-600" sub="À traiter"/>
        <StatCard label="Chiffre d'affaires" value={`${stats.revenue.toLocaleString()} DA`} icon={DollarSign} gradient="bg-gradient-to-br from-gold-500 to-gold-600" sub="Total des ventes"/>
        <StatCard label="Produits"          value={stats.products} icon={Package}        gradient="bg-gradient-to-br from-navy-700 to-navy-900" sub="Dans le catalogue"/>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Dernières commandes</h2>
          <span className="text-xs text-slate-400">{recent.length} affichées</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-3 text-left">N° Cde</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Produit</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Wilaya</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr></thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-navy-600 dark:text-navy-300">#{o.order_number?.slice(-8)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 dark:text-white text-xs">{o.last_name} {o.first_name}</div>
                    <div className="text-[10px] text-slate-400">{o.phone}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400 max-w-[140px] truncate">{o.product_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{o.wilaya}</td>
                  <td className="px-4 py-3 text-right font-bold text-xs text-slate-800 dark:text-white whitespace-nowrap">{o.total_price?.toLocaleString()} DA</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge px-2 py-0.5 text-[10px] font-bold rounded-lg ${STATUS_MAP[o.status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_MAP[o.status]?.label || o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Aucune commande</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Products Tab ─────────────────────────────────────────────
function ProdTab({ apiHeaders }: { apiHeaders: any }) {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Product|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) p.append('search', search)
    const r = await fetch(`/api/admin/products?${p}`, { headers: apiHeaders })
    const d = await r.json()
    setProducts(d.products || [])
    setTotal(d.total || 0)
    setLoading(false)
  }, [page, search, apiHeaders])

  useEffect(() => { load() }, [load])

  const toggleVis = async (p: Product) => {
    await fetch('/api/admin/products', {
      method: 'PUT', headers: apiHeaders,
      body: JSON.stringify({ id: p.id, is_visible: !p.is_visible }),
    })
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_visible: !x.is_visible } : x))
    toast.success(p.is_visible ? 'Produit masqué' : 'Produit visible')
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer ce produit définitivement ?')) return
    const r = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE', headers: apiHeaders })
    if (r.ok) { toast.success('Supprimé'); load() }
    else toast.error('Erreur lors de la suppression')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Produits</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total} produit{total!==1?'s':''} au total</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary text-sm">
          <Plus size={15}/> Ajouter un produit
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher un produit..." className="input-field pl-9 text-sm py-2.5"/>
        </div>
        <button onClick={load} className="btn-ghost px-3 rounded-xl border border-slate-200 dark:border-slate-600">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-3 text-left">Produit</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Catégorie</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Prix</th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">Stock</th>
              <th className="px-4 py-3 text-center">Visible</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr></thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_,i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                      <td colSpan={6} className="px-4 py-3"><div className="skeleton h-9 w-full"/></td>
                    </tr>
                  ))
                : products.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                            {p.images?.[0]
                              ? <Image src={p.images[0]} alt={p.name} fill className="object-cover"/>
                              : <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-[180px]">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">#{p.id.slice(0,8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {p.category
                          ? <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg">{p.category}</span>
                          : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {p.promo_price ? (
                          <div>
                            <div className="text-xs font-black text-gold-600 dark:text-gold-400">{p.promo_price.toLocaleString()} DA</div>
                            <div className="text-[10px] text-slate-400 line-through">{p.price.toLocaleString()} DA</div>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.price.toLocaleString()} DA</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                          p.stock > 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : p.stock > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleVis(p)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          {p.is_visible
                            ? <Eye size={15} className="text-emerald-500"/>
                            : <EyeOff size={15} className="text-slate-400"/>
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditing(p); setShowForm(true) }}
                            className="w-7 h-7 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-800 flex items-center justify-center text-navy-600 dark:text-navy-300 transition-colors">
                            <Edit2 size={13}/>
                          </button>
                          <button onClick={() => del(p.id)}
                            className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-red-500 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
              {!loading && products.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center">
                  <Package size={28} className="mx-auto mb-2 text-slate-300"/>
                  <p className="text-sm text-slate-400">Aucun produit trouvé</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400">Page {page} · {total} produits</span>
            <div className="flex gap-1.5">
              <button disabled={page===1} onClick={() => setPage(p => p-1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronLeft size={13}/>
              </button>
              <button disabled={page*20>=total} onClick={() => setPage(p => p+1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ProductFormModal
          product={editing}
          apiHeaders={apiHeaders}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Product Form Modal ───────────────────────────────────────
function ProductFormModal({ product, apiHeaders, onClose, onSaved }: {
  product: Product|null; apiHeaders:any; onClose:()=>void; onSaved:()=>void
}) {
  const [form, setForm] = useState({
    name:        product?.name        || '',
    description: product?.description || '',
    price:       product?.price?.toString()       || '',
    promo_price: product?.promo_price?.toString() || '',
    category:    product?.category    || '',
    stock:       product?.stock?.toString()       || '0',
    is_visible:  product?.is_visible  !== false,
    is_new:      product?.is_new      || false,
  })
  const [images, setImages]     = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async ev => {
        const base64 = ev.target?.result as string
        const r = await fetch('/api/admin/upload', {
          method: 'POST', headers: apiHeaders,
          body: JSON.stringify({ base64, filename: file.name, contentType: file.type }),
        })
        const d = await r.json()
        if (d.url) { setImages(prev => [...prev, d.url]); toast.success('Image uploadée !') }
        else toast.error(d.error || 'Erreur upload')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch { toast.error('Erreur upload'); setUploading(false) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    if (!form.price || isNaN(Number(form.price))) { toast.error('Prix invalide'); return }
    setSaving(true)

    const body = {
      ...(product ? { id: product.id } : {}),
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       Number(form.price),
      promo_price: form.promo_price ? Number(form.promo_price) : null,
      category:    form.category.trim() || null,
      stock:       Number(form.stock) || 0,
      is_visible:  form.is_visible,
      is_new:      form.is_new,
      images,
    }

    const r = await fetch('/api/admin/products', {
      method: product ? 'PUT' : 'POST',
      headers: apiHeaders,
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (r.ok) { toast.success(product ? 'Produit modifié !' : 'Produit créé !'); onSaved() }
    else toast.error(d.error || 'Erreur')
    setSaving(false)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl animate-slide-up">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-3xl z-10">
          <h2 className="font-black text-slate-900 dark:text-white">
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
            <X size={16}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Images */}
          <div>
            <label className="label">Images produit</label>
            <div className="flex flex-wrap gap-2.5">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-600 group">
                  <Image src={img} alt="" fill className="object-cover"/>
                  <button type="button" onClick={() => setImages(prev => prev.filter((_,idx) => idx!==i))}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-navy-500 flex flex-col items-center justify-center text-slate-400 hover:text-navy-600 transition-colors gap-1">
                {uploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                <span className="text-[10px] font-semibold">{uploading ? 'Upload...' : 'Ajouter'}</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
          </div>

          {/* Name */}
          <div>
            <label className="label">Nom du produit *</label>
            <input type="text" value={form.name} onChange={set('name')}
              className="input-field" placeholder="Ex: Lampe de table dorée LED" required/>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={set('description')}
              className="input-field resize-none" rows={3} placeholder="Décrivez le produit..."/>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prix (DA) *</label>
              <input type="number" value={form.price} onChange={set('price')}
                className="input-field" placeholder="2500" min="0" required/>
            </div>
            <div>
              <label className="label">Prix promo (DA) <span className="text-slate-400 font-normal text-xs">optionnel</span></label>
              <input type="number" value={form.promo_price} onChange={set('promo_price')}
                className="input-field" placeholder="1999" min="0"/>
            </div>
          </div>

          {/* Category & Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie</label>
              <input type="text" value={form.category} onChange={set('category')}
                className="input-field" placeholder="Électronique, Mode..."/>
            </div>
            <div>
              <label className="label">Stock</label>
              <input type="number" value={form.stock} onChange={set('stock')}
                className="input-field" min="0"/>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            {[
              { key: 'is_visible', label: 'Visible sur le site' },
              { key: 'is_new',     label: 'Badge "Nouveau"'     },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, [key]: !(f as any)[key] }))}
                  className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${(form as any)[key] ? 'bg-navy-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${(form as any)[key] ? 'translate-x-5' : 'translate-x-1'}`}/>
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-outline py-3">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
              {saving ? <><Loader2 size={15} className="animate-spin"/>Sauvegarde...</> : <><Save size={15}/>Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────
function OrdTab({ apiHeaders }: { apiHeaders: any }) {
  const [orders, setOrders]   = useState<Order[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('all')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), limit: '25', status: statusF })
    if (search) p.append('search', search)
    const r = await fetch(`/api/admin/orders?${p}`, { headers: apiHeaders })
    const d = await r.json()
    setOrders(d.orders || [])
    setTotal(d.total || 0)
    setLoading(false)
  }, [page, search, statusF, apiHeaders])

  useEffect(() => { load() }, [load])

  const updateOrder = async (id: string, updates: any) => {
    const r = await fetch('/api/admin/orders', {
      method: 'PUT', headers: apiHeaders,
      body: JSON.stringify({ id, ...updates }),
    })
    if (r.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
      toast.success('Mis à jour')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Commandes</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total} commande{total!==1?'s':''} au total</p>
        </div>
        <button onClick={load} className="btn-ghost border border-slate-200 dark:border-slate-600 px-3 py-2 rounded-xl text-sm gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Actualiser
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Nom, téléphone, N° commande..." className="input-field pl-9 text-sm py-2.5"/>
        </div>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1) }}
          className="select-field sm:w-44 text-sm py-2.5">
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-3 text-left">N° / Date</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Produit</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Localisation</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Total</th>
              <th className="px-4 py-3 text-center hidden xl:table-cell" title="Nombre (tri admin)">
                <div className="flex items-center justify-center gap-1"><ArrowUpDown size={11}/>Nb.</div>
              </th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-center">Détails</th>
            </tr></thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_,i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                      <td colSpan={8} className="px-4 py-3"><div className="skeleton h-9 w-full"/></td>
                    </tr>
                  ))
                : orders.map(o => (
                  <>
                    <tr key={o.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-navy-600 dark:text-navy-300">#{o.order_number?.slice(-8)}</div>
                        <div className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-xs text-slate-800 dark:text-white">{o.last_name} {o.first_name}</div>
                        <div className="text-[10px] text-slate-400">{o.phone}</div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{o.product_name}</div>
                        <div className="text-[10px] text-slate-400">×{o.quantity}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-slate-500 dark:text-slate-400">{o.wilaya}</div>
                        <div className="text-[10px] text-slate-400">{o.delivery_type === 'domicile' ? '🏠 Domicile' : '🏢 Bureau'}</div>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell whitespace-nowrap font-bold text-xs text-slate-800 dark:text-white">
                        {o.total_price?.toLocaleString()} DA
                      </td>
                      <td className="px-4 py-3 text-center hidden xl:table-cell">
                        <input
                          type="number"
                          defaultValue={o.nombre ?? ''}
                          onBlur={e => updateOrder(o.id, { nombre: e.target.value === '' ? null : Number(e.target.value) })}
                          className="w-14 text-center text-xs input-field py-1.5 px-2"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={o.status}
                          onChange={e => updateOrder(o.id, { status: e.target.value })}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${STATUS_MAP[o.status]?.cls || ''}`}>
                          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors mx-auto">
                          {expanded === o.id ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                        </button>
                      </td>
                    </tr>
                    {expanded === o.id && (
                      <tr key={`${o.id}-exp`} className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div><span className="text-slate-400 block mb-0.5 font-semibold uppercase tracking-wide text-[10px]">Adresse</span><span className="text-slate-700 dark:text-slate-200">{o.address}</span></div>
                            <div><span className="text-slate-400 block mb-0.5 font-semibold uppercase tracking-wide text-[10px]">Commune</span><span className="text-slate-700 dark:text-slate-200">{o.commune}</span></div>
                            <div><span className="text-slate-400 block mb-0.5 font-semibold uppercase tracking-wide text-[10px]">Livraison</span><span className="text-slate-700 dark:text-slate-200">{o.delivery_price?.toLocaleString()} DA</span></div>
                            <div><span className="text-slate-400 block mb-0.5 font-semibold uppercase tracking-wide text-[10px]">Prix unitaire</span><span className="text-slate-700 dark:text-slate-200">{o.unit_price?.toLocaleString()} DA</span></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              }
              {!loading && orders.length === 0 && (
                <tr><td colSpan={8} className="py-14 text-center">
                  <ShoppingBag size={28} className="mx-auto mb-2 text-slate-300"/>
                  <p className="text-sm text-slate-400">Aucune commande trouvée</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 25 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400">Page {page} · {total} commandes</span>
            <div className="flex gap-1.5">
              <button disabled={page===1} onClick={() => setPage(p => p-1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronLeft size={13}/>
              </button>
              <button disabled={page*25>=total} onClick={() => setPage(p => p+1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────────
function CatTab({ apiHeaders }: { apiHeaders: any }) {
  const [cats, setCats]   = useState<Category[]>([])
  const [name, setName]   = useState('')
  const [icon, setIcon]   = useState('📦')
  const [saving, setSaving] = useState(false)
  const EMOJIS = ['📦','👕','👟','💄','🏠','🔧','📱','💻','🎮','🍳','🌿','⚡','🛁','🎒','🧴','✨','🪴','🎁','🧸','💡','🔑','⌚','👜','🕶️','🏋️','🎵']

  useEffect(() => {
    fetch('/api/admin/categories', { headers: apiHeaders })
      .then(r => r.json()).then(d => setCats(Array.isArray(d) ? d : []))
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const r = await fetch('/api/admin/categories', {
      method: 'POST', headers: apiHeaders,
      body: JSON.stringify({ name: name.trim(), icon }),
    })
    const d = await r.json()
    if (r.ok) { setCats(prev => [...prev, d]); setName(''); toast.success('Catégorie ajoutée !') }
    else toast.error(d.error || 'Erreur')
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    const r = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE', headers: apiHeaders })
    if (r.ok) { setCats(prev => prev.filter(c => c.id !== id)); toast.success('Supprimée') }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <h2 className="text-xl font-black text-slate-900 dark:text-white">Catégories</h2>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white">Nouvelle catégorie</h3>
        <form onSubmit={add} className="space-y-4">
          <div>
            <label className="label">Icône</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setIcon(e)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${icon === e ? 'bg-navy-700 shadow-navy scale-110' : 'bg-slate-100 dark:bg-slate-700 hover:scale-105'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Nom *</label>
            <div className="flex gap-2">
              <span className="w-10 h-11 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{icon}</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="input-field flex-1" placeholder="Électronique, Mode, Maison..." required/>
              <button type="submit" disabled={saving} className="btn-primary px-4">
                {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        {cats.length === 0
          ? <div className="py-10 text-center text-slate-400 text-sm"><Tag size={24} className="mx-auto mb-2 opacity-30"/>Aucune catégorie</div>
          : cats.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{c.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-white">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{c.slug}</div>
                  </div>
                </div>
                <button onClick={() => del(c.id)}
                  className="w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))
        }
      </div>
    </div>
  )
}

// ─── Promotions Tab ───────────────────────────────────────────
function PromoTab({ apiHeaders }: { apiHeaders: any }) {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [form, setForm]     = useState({ label: '', discount_percent: '', starts_at: '', ends_at: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const r = await fetch('/api/admin/promotions', { headers: apiHeaders })
    const d = await r.json()
    setPromos(Array.isArray(d) ? d : [])
  }
  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) return
    setSaving(true)
    const r = await fetch('/api/admin/promotions', {
      method: 'POST', headers: apiHeaders,
      body: JSON.stringify({
        label:            form.label.trim(),
        discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
        starts_at:        form.starts_at || null,
        ends_at:          form.ends_at   || null,
        is_active:        form.is_active,
      }),
    })
    if (r.ok) { toast.success('Promotion créée !'); setForm({ label:'', discount_percent:'', starts_at:'', ends_at:'', is_active:true }); load() }
    else { const d = await r.json(); toast.error(d.error || 'Erreur') }
    setSaving(false)
  }

  const toggle = async (id: string, val: boolean) => {
    await fetch('/api/admin/promotions', {
      method: 'PUT', headers: apiHeaders,
      body: JSON.stringify({ id, is_active: val }),
    })
    setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: val } : p))
    toast.success(val ? 'Activée' : 'Désactivée')
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette promotion ?')) return
    const r = await fetch(`/api/admin/promotions?id=${id}`, { method: 'DELETE', headers: apiHeaders })
    if (r.ok) { setPromos(prev => prev.filter(p => p.id !== id)); toast.success('Supprimée') }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <h2 className="text-xl font-black text-slate-900 dark:text-white">Promotions</h2>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white">Créer une promotion</h3>
        <form onSubmit={add} className="space-y-4">
          <div>
            <label className="label">Label *</label>
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="input-field" placeholder="Soldes d'été, -20% sur tout..." required/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Réduction (%)</label>
              <input type="number" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                className="input-field" placeholder="20" min="1" max="100"/>
            </div>
            <div>
              <label className="label">Début</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="input-field text-xs"/>
            </div>
            <div>
              <label className="label">Fin</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className="input-field text-xs"/>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${form.is_active ? 'bg-navy-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`}/>
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.is_active ? 'Active' : 'Inactive'}</span>
            <button type="submit" disabled={saving} className="ml-auto btn-primary text-sm px-5">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Créer
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        {promos.length === 0
          ? <div className="py-10 text-center text-slate-400 text-sm"><Megaphone size={24} className="mx-auto mb-2 opacity-30"/>Aucune promotion</div>
          : promos.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}/>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-white">{p.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {p.discount_percent && `-${p.discount_percent}%`}
                      {p.ends_at && ` · Fin: ${new Date(p.ends_at).toLocaleDateString('fr-FR')}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(p.id, !p.is_active)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    {p.is_active
                      ? <ToggleRight size={18} className="text-emerald-500"/>
                      : <ToggleLeft  size={18} className="text-slate-400"/>
                    }
                  </button>
                  <button onClick={() => del(p.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

// ─── Banners Tab ──────────────────────────────────────────────
function BannerTab({ apiHeaders }: { apiHeaders: any }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [form, setForm]       = useState({ title:'', subtitle:'', button_text:'Explorer', link:'/', image_url:'', order_index:'0', is_active:true })
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const r = await fetch('/api/admin/banners', { headers: apiHeaders })
    const d = await r.json()
    setBanners(Array.isArray(d) ? d : [])
  }
  useEffect(() => { load() }, [])

  const uploadImg = async (file: File) => {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const r = await fetch('/api/admin/upload', {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({ base64: ev.target?.result, filename: file.name, contentType: file.type }),
      })
      const d = await r.json()
      if (d.url) { setForm(f => ({ ...f, image_url: d.url })); toast.success('Image uploadée !') }
      else toast.error(d.error || 'Erreur')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const r = await fetch('/api/admin/banners', {
      method: 'POST', headers: apiHeaders,
      body: JSON.stringify({ ...form, order_index: Number(form.order_index) }),
    })
    if (r.ok) { toast.success('Bannière créée !'); setForm({ title:'', subtitle:'', button_text:'Explorer', link:'/', image_url:'', order_index:'0', is_active:true }); load() }
    else { const d = await r.json(); toast.error(d.error || 'Erreur') }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette bannière ?')) return
    const r = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE', headers: apiHeaders })
    if (r.ok) { setBanners(prev => prev.filter(b => b.id !== id)); toast.success('Supprimée') }
  }

  const toggle = async (b: Banner) => {
    const r = await fetch('/api/admin/banners', {
      method: 'PUT', headers: apiHeaders,
      body: JSON.stringify({ id: b.id, is_active: !b.is_active }),
    })
    if (r.ok) { setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !x.is_active } : x)); toast.success('Mis à jour') }
  }

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <h2 className="text-xl font-black text-slate-900 dark:text-white">Bannières homepage</h2>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white">Nouvelle bannière</h3>
        <form onSubmit={add} className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="label">Image de fond <span className="text-slate-400 font-normal text-xs">optionnel</span></label>
            {form.image_url && (
              <div className="relative h-24 rounded-xl overflow-hidden mb-2 border border-slate-200 dark:border-slate-600">
                <Image src={form.image_url} alt="" fill className="object-cover"/>
                <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white">
                  <X size={13}/>
                </button>
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-outline text-sm px-4 py-2">
              {uploading ? <><Loader2 size={13} className="animate-spin"/>Upload...</> : <><Upload size={13}/>Choisir une image</>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f); e.target.value = '' }}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Titre *</label>
              <input type="text" value={form.title} onChange={setF('title')} className="input-field" placeholder="Illuminate Your Shopping" required/>
            </div>
            <div className="col-span-2">
              <label className="label">Sous-titre</label>
              <input type="text" value={form.subtitle} onChange={setF('subtitle')} className="input-field" placeholder="Description courte de la bannière"/>
            </div>
            <div>
              <label className="label">Texte bouton</label>
              <input type="text" value={form.button_text} onChange={setF('button_text')} className="input-field" placeholder="Explorer"/>
            </div>
            <div>
              <label className="label">Lien bouton</label>
              <input type="text" value={form.link} onChange={setF('link')} className="input-field" placeholder="/"/>
            </div>
            <div>
              <label className="label">Ordre d'affichage</label>
              <input type="number" value={form.order_index} onChange={setF('order_index')} className="input-field" min="0"/>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`w-10 h-6 rounded-full relative transition-colors ${form.is_active ? 'bg-navy-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`}/>
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Active</span>
              </label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm w-full py-3">
            {saving ? <><Loader2 size={14} className="animate-spin"/>Sauvegarde...</> : <><Plus size={14}/>Créer la bannière</>}
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {banners.length === 0
          ? <div className="py-10 text-center text-slate-400 text-sm"><ImageIcon size={24} className="mx-auto mb-2 opacity-30"/>Aucune bannière</div>
          : banners.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {b.image_url && (
                  <div className="relative w-16 h-10 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={b.image_url} alt="" fill className="object-cover"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 dark:text-white truncate">{b.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{b.subtitle}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${b.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                  {b.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggle(b)} className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-navy-600 transition-colors">
                    {b.is_active ? <ToggleRight size={15} className="text-emerald-500"/> : <ToggleLeft size={15}/>}
                  </button>
                  <button onClick={() => del(b.id)} className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────
function SettingsTab({ apiHeaders }: { apiHeaders: any }) {
  const [vals, setVals] = useState({
    delivery_home_price:   '400',
    delivery_office_price: '250',
    whatsapp_number:       '',
    telegram_bot_token:    '',
    telegram_chat_id:      '',
    store_name:            'Diaa Store',
    store_email:           '',
  })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings', { headers: apiHeaders })
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object') {
          setVals(prev => ({ ...prev, ...d }))
        }
        setLoaded(true)
      })
  }, [])

  const saveAll = async () => {
    setSaving(true)
    const r = await fetch('/api/admin/settings', {
      method: 'PUT', headers: apiHeaders,
      body: JSON.stringify(vals),
    })
    if (r.ok) toast.success('Paramètres enregistrés !')
    else { const d = await r.json(); toast.error(d.error || 'Erreur') }
    setSaving(false)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVals(v => ({ ...v, [k]: e.target.value }))

  if (!loaded) return <div className="card p-8 skeleton h-64"/>

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card p-5 space-y-4">
      <h3 className="font-bold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3">{title}</h3>
      {children}
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <h2 className="text-xl font-black text-slate-900 dark:text-white">Paramètres</h2>

      <Section title="🚚 Prix de livraison">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Livraison à domicile (DA)</label>
            <input type="number" value={vals.delivery_home_price} onChange={set('delivery_home_price')} className="input-field" min="0"/>
          </div>
          <div>
            <label className="label">Livraison au bureau (DA)</label>
            <input type="number" value={vals.delivery_office_price} onChange={set('delivery_office_price')} className="input-field" min="0"/>
          </div>
        </div>
      </Section>

      <Section title="💬 WhatsApp">
        <div>
          <label className="label">Numéro WhatsApp <span className="text-slate-400 font-normal text-xs">(sans le +, ex: 213661234567)</span></label>
          <input type="text" value={vals.whatsapp_number} onChange={set('whatsapp_number')} className="input-field" placeholder="213661234567"/>
        </div>
      </Section>

      <Section title="📬 Telegram">
        <div>
          <label className="label">Bot Token</label>
          <input type="text" value={vals.telegram_bot_token} onChange={set('telegram_bot_token')} className="input-field font-mono text-xs" placeholder="1234567890:AAF..."/>
        </div>
        <div>
          <label className="label">Chat ID</label>
          <input type="text" value={vals.telegram_chat_id} onChange={set('telegram_chat_id')} className="input-field font-mono text-xs" placeholder="-100xxxxxxxxx"/>
        </div>
        <p className="text-xs text-slate-400">
          Pour obtenir votre Chat ID: créez un bot avec @BotFather, envoyez un message, puis visitez
          <code className="ml-1 bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">api.telegram.org/bot&#123;TOKEN&#125;/getUpdates</code>
        </p>
      </Section>

      <Section title="🏪 Informations boutique">
        <div>
          <label className="label">Nom de la boutique</label>
          <input type="text" value={vals.store_name} onChange={set('store_name')} className="input-field" placeholder="Diaa Store"/>
        </div>
        <div>
          <label className="label">Email de contact</label>
          <input type="email" value={vals.store_email} onChange={set('store_email')} className="input-field" placeholder="contact@diaastore.dz"/>
        </div>
      </Section>

      <button onClick={saveAll} disabled={saving} className="w-full btn-primary py-4 text-base">
        {saving ? <><Loader2 size={18} className="animate-spin"/>Enregistrement...</> : <><Save size={18}/>Enregistrer tous les paramètres</>}
      </button>
    </div>
  )
}
