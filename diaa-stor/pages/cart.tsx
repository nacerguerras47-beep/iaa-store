import { useState } from 'react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, Check, Loader2, AlertCircle, Home, Building2, MessageCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Layout from '../components/layout/Layout'
import { useCart } from '../context/CartContext'
import { WILAYAS, getCommunesByWilaya } from '../lib/algeria'

const schema = z.object({
  last_name: z.string().min(2, 'Min 2 caractères'),
  first_name: z.string().min(2, 'Min 2 caractères'),
  phone: z.string().regex(/^(05|06|07)\d{8}$/, 'Numéro invalide (10 chiffres, commence par 05/06/07)'),
  address: z.string().min(5, 'Adresse trop courte'),
  wilaya: z.string().min(1, 'Wilaya requise'),
  commune: z.string().min(1, 'Commune requise'),
  delivery_type: z.enum(['domicile', 'bureau']),
})
type FormData = z.infer<typeof schema>

export default function CartPage() {
  const { items, count, total, removeFromCart, updateQuantity, clearCart } = useCart()
  const [delivery, setDelivery] = useState<'domicile' | 'bureau'>('domicile')
  const [selectedWilaya, setSelectedWilaya] = useState('')
  const [communes, setCommunes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumbers, setOrderNumbers] = useState<string[]>([])

  const HOME_PRICE = 400
  const OFFICE_PRICE = 250
  const deliveryCost = delivery === 'domicile' ? HOME_PRICE : OFFICE_PRICE
  const grandTotal = total + deliveryCost

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'domicile' },
  })

  const onWilayaChange = (code: string) => {
    setSelectedWilaya(code)
    setValue('wilaya', WILAYAS.find(w => w.code === code)?.nameFr || '', { shouldValidate: true })
    setValue('commune', '')
    setCommunes(getCommunesByWilaya(code))
  }
  const onDeliveryChange = (type: 'domicile' | 'bureau') => {
    setDelivery(type)
    setValue('delivery_type', type)
  }

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) { toast.error('Votre panier est vide !'); return }
    setSubmitting(true)
    const nums: string[] = []
    try {
      for (const item of items) {
        const unitPrice = item.promo_price && item.promo_price < item.price ? item.promo_price : item.price
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: unitPrice,
            delivery_price: deliveryCost / items.length,
            total_price: unitPrice * item.quantity + deliveryCost / items.length,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Erreur')
        nums.push(result.order_number)
      }
      setOrderNumbers(nums)
      clearCart()
      setOrderSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="field-error"><AlertCircle size={11} />{msg}</p> : null

  if (orderSuccess) {
    return (
      <Layout title="Commandes confirmées">
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md animate-slide-up">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <Check size={44} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Commandes confirmées !</h1>
            <div className="space-y-1 mb-6">
              {orderNumbers.map(n => (
                <div key={n} className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 mr-2">
                  <span className="text-xs text-slate-500">N°</span>
                  <span className="text-sm font-black text-navy-700 dark:text-white">#{n}</span>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-sm mb-8">Notre équipe vous contactera prochainement pour confirmer votre livraison.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="btn-primary px-8 py-3.5">Continuer mes achats</Link>
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213XXXXXXXXX'}?text=${encodeURIComponent(`Bonjour ! Mes commandes: ${orderNumbers.map(n => '#' + n).join(', ')}`)}`}
                target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-3.5">
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Mon panier">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Mon Panier</h1>
            <p className="text-sm text-slate-400 mt-1">{count > 0 ? `${count} article${count > 1 ? 's' : ''}` : 'Panier vide'}</p>
          </div>
          {items.length > 0 && (
            <button onClick={() => { if (confirm('Vider le panier ?')) clearCart() }}
              className="text-sm text-red-400 hover:text-red-600 transition-colors font-semibold flex items-center gap-1.5">
              <Trash2 size={14} /> Vider
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-7xl mb-5">🛒</div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-3">Votre panier est vide</h2>
            <p className="text-slate-400 text-sm mb-8">Découvrez nos produits et ajoutez-les à votre panier</p>
            <Link href="/" className="btn-primary px-8 py-3.5 text-base">
              <ShoppingBag size={18} /> Explorer les produits
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-3 space-y-4">
              {items.map(item => {
                const unitPrice = item.promo_price && item.promo_price < item.price ? item.promo_price : item.price
                return (
                  <div key={item.id} className="card p-4 flex gap-4 animate-fade-in">
                    <Link href={`/product/${item.slug}`} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.slug}`}>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 hover:text-navy-600 dark:hover:text-gold-400 transition-colors">{item.name}</h3>
                      </Link>
                      {item.promo_price && item.promo_price < item.price && (
                        <div className="text-[10px] text-slate-400 line-through">{item.price.toLocaleString()} DA</div>
                      )}
                      <div className="text-sm font-black text-gold-600 dark:text-gold-400 mt-0.5">{unitPrice.toLocaleString()} DA</div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-navy-400 hover:bg-navy-50 dark:hover:bg-navy-900/20 transition-all">
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-bold text-sm text-slate-800 dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-navy-400 hover:bg-navy-50 dark:hover:bg-navy-900/20 transition-all">
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-800 dark:text-white">{(unitPrice * item.quantity).toLocaleString()} DA</span>
                          <button onClick={() => removeFromCart(item.product_id)}
                            className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order form */}
            <div className="lg:col-span-2">
              <div className="card p-5 sticky top-20">
                <h2 className="font-black text-slate-900 dark:text-white mb-5 text-lg">Informations de livraison</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

                  {/* Delivery type */}
                  <div>
                    <label className="label text-xs">Type de livraison</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => onDeliveryChange('domicile')}
                        className={`delivery-option flex-col py-3 text-center gap-1.5 ${delivery === 'domicile' ? 'delivery-option-active' : 'delivery-option-inactive'}`}>
                        <Home size={18} className={delivery === 'domicile' ? 'text-navy-600 dark:text-navy-300' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Domicile</span>
                        <span className="text-xs font-black text-gold-600">{HOME_PRICE} DA</span>
                      </button>
                      <button type="button" onClick={() => onDeliveryChange('bureau')}
                        className={`delivery-option flex-col py-3 text-center gap-1.5 ${delivery === 'bureau' ? 'delivery-option-active' : 'delivery-option-inactive'}`}>
                        <Building2 size={18} className={delivery === 'bureau' ? 'text-navy-600 dark:text-navy-300' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Bureau</span>
                        <span className="text-xs font-black text-gold-600">{OFFICE_PRICE} DA</span>
                      </button>
                    </div>
                  </div>

                  {/* Wilaya / Commune */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Wilaya *</label>
                      <select className="select-field text-xs py-2.5" value={selectedWilaya} onChange={e => onWilayaChange(e.target.value)}>
                        <option value="">Choisir...</option>
                        {WILAYAS.map(w => <option key={w.code} value={w.code}>{w.code} — {w.nameFr}</option>)}
                      </select>
                      <FieldError msg={errors.wilaya?.message} />
                    </div>
                    <div>
                      <label className="label text-xs">Commune *</label>
                      <select className="select-field text-xs py-2.5" {...register('commune')} disabled={!selectedWilaya}>
                        <option value="">Choisir...</option>
                        {communes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <FieldError msg={errors.commune?.message} />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Nom *</label>
                      <input {...register('last_name')} className="input-field text-xs py-2.5" placeholder="Nom" />
                      <FieldError msg={errors.last_name?.message} />
                    </div>
                    <div>
                      <label className="label text-xs">Prénom *</label>
                      <input {...register('first_name')} className="input-field text-xs py-2.5" placeholder="Prénom" />
                      <FieldError msg={errors.first_name?.message} />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="label text-xs">Téléphone * (10 chiffres)</label>
                    <input {...register('phone')} className="input-field text-xs py-2.5" placeholder="0612345678" maxLength={10} type="tel" inputMode="numeric" />
                    <FieldError msg={errors.phone?.message} />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="label text-xs">Adresse *</label>
                    <input {...register('address')} className="input-field text-xs py-2.5" placeholder="Adresse complète" />
                    <FieldError msg={errors.address?.message} />
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Sous-total ({count} articles)</span>
                      <span className="font-bold">{total.toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Livraison</span>
                      <span className="font-bold">{deliveryCost.toLocaleString()} DA</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Total</span>
                      <span className="text-lg font-black text-gold-600 dark:text-gold-400">{grandTotal.toLocaleString()} DA</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1">
                      💳 Paiement à la livraison uniquement
                    </div>
                  </div>

                  <button type="submit" disabled={submitting || items.length === 0} className="w-full btn-gold py-4 rounded-2xl">
                    {submitting ? <><Loader2 size={18} className="animate-spin" /> Envoi...</> : <><Check size={18} /> Confirmer — {grandTotal.toLocaleString()} DA</>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'fr', ['common'])) }
})
