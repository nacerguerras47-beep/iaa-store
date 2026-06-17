import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2, Check, Home, Building2, MessageCircle, AlertCircle, Minus, Plus } from 'lucide-react'
import { WILAYAS, getCommunesByWilaya } from '../../lib/algeria'

const schema = z.object({
  last_name:     z.string().min(2, 'Minimum 2 caractères'),
  first_name:    z.string().min(2, 'Minimum 2 caractères'),
  phone:         z.string().regex(/^(05|06|07)\d{8}$/, 'Numéro invalide (ex: 0612345678 — 10 chiffres)'),
  address:       z.string().min(5, 'Adresse trop courte'),
  wilaya:        z.string().min(1, 'Wilaya requise'),
  commune:       z.string().min(1, 'Commune requise'),
  delivery_type: z.enum(['domicile', 'bureau']),
})

type FormData = z.infer<typeof schema>
/**
 * fmt — always passes 'fr-FR' explicitly to toLocaleString.
 * See pages/product/[slug].tsx for full explanation of why this is required
 * to avoid React hydration error #418 between Node SSR and browser locales.
 */
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}


interface Props {
  product: { id: string; name: string; price: number; promo_price?: number | null; images: string[] }
  deliveryPrices: { home: number; office: number }
  initialQty?: number
  onSuccess?: (orderNumber: string) => void
}

export default function OrderForm({ product, deliveryPrices, initialQty = 1, onSuccess }: Props) {
  const [qty, setQty] = useState(initialQty)
  const [delivery, setDelivery] = useState<'domicile' | 'bureau'>('domicile')
  const [selectedWilaya, setSelectedWilaya] = useState('')
  const [communes, setCommunes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'domicile' },
  })

  const unitPrice = (product.promo_price && product.promo_price < product.price) ? product.promo_price : product.price
  const deliveryCost = delivery === 'domicile' ? deliveryPrices.home : deliveryPrices.office
  const total = unitPrice * qty + deliveryCost

  const onWilayaChange = (code: string) => {
    setSelectedWilaya(code)
    const name = WILAYAS.find(w => w.code === code)?.nameFr || ''
    setValue('wilaya', name, { shouldValidate: true })
    setValue('commune', '', { shouldValidate: false })
    setCommunes(getCommunesByWilaya(code))
  }

  const onDeliveryChange = (type: 'domicile' | 'bureau') => {
    setDelivery(type)
    setValue('delivery_type', type)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          product_id: product.id,
          product_name: product.name,
          quantity: qty,
          unit_price: unitPrice,
          delivery_price: deliveryCost,
          total_price: total,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur serveur')
      onSuccess?.(result.order_number)
    } catch (err: any) {
      toast.error(err.message || 'Erreur. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="field-error"><AlertCircle size={11} />{msg}</p> : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* Quantity */}
      <div>
        <label className="label">Quantité</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-11 h-11 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-navy-500 hover:bg-navy-50 dark:hover:bg-navy-900/30 transition-all font-bold text-slate-600 dark:text-slate-300">
            <Minus size={16} />
          </button>
          <span className="w-14 text-center font-black text-xl text-slate-900 dark:text-white">{qty}</span>
          <button type="button" onClick={() => setQty(q => q + 1)}
            className="w-11 h-11 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-navy-500 hover:bg-navy-50 dark:hover:bg-navy-900/30 transition-all font-bold text-slate-600 dark:text-slate-300">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Delivery type */}
      <div>
        <label className="label">Type de livraison</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onDeliveryChange('domicile')}
            className={`delivery-option flex-col text-center gap-2 ${delivery === 'domicile' ? 'delivery-option-active' : 'delivery-option-inactive'}`}>
            <Home size={20} className={delivery === 'domicile' ? 'text-navy-700 dark:text-navy-300' : 'text-slate-400'} />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">À domicile</div>
              <div className="text-xs font-black text-gold-600 dark:text-gold-400">{fmt(deliveryPrices.home)} DA</div>
            </div>
          </button>
          <button type="button" onClick={() => onDeliveryChange('bureau')}
            className={`delivery-option flex-col text-center gap-2 ${delivery === 'bureau' ? 'delivery-option-active' : 'delivery-option-inactive'}`}>
            <Building2 size={20} className={delivery === 'bureau' ? 'text-navy-700 dark:text-navy-300' : 'text-slate-400'} />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">Au bureau</div>
              <div className="text-xs font-black text-gold-600 dark:text-gold-400">{fmt(deliveryPrices.office)} DA</div>
            </div>
          </button>
        </div>
      </div>

      {/* Wilaya / Commune */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Wilaya <span className="text-red-500">*</span></label>
          <select className="select-field" value={selectedWilaya} onChange={e => onWilayaChange(e.target.value)}>
            <option value="">Sélectionner...</option>
            {WILAYAS.map(w => (
              <option key={w.code} value={w.code}>{w.code} — {w.nameFr}</option>
            ))}
          </select>
          <FieldError msg={errors.wilaya?.message} />
        </div>
        <div>
          <label className="label">Commune <span className="text-red-500">*</span></label>
          <select className="select-field" {...register('commune')} disabled={!selectedWilaya}>
            <option value="">Sélectionner...</option>
            {communes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <FieldError msg={errors.commune?.message} />
        </div>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nom <span className="text-red-500">*</span></label>
          <input {...register('last_name')} className="input-field" placeholder="Votre nom" />
          <FieldError msg={errors.last_name?.message} />
        </div>
        <div>
          <label className="label">Prénom <span className="text-red-500">*</span></label>
          <input {...register('first_name')} className="input-field" placeholder="Prénom" />
          <FieldError msg={errors.first_name?.message} />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="label">Téléphone <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs">(10 chiffres)</span></label>
        <input {...register('phone')} className="input-field" placeholder="0612345678" maxLength={10} type="tel" inputMode="numeric" />
        <FieldError msg={errors.phone?.message} />
      </div>

      {/* Address */}
      <div>
        <label className="label">Adresse complète <span className="text-red-500">*</span></label>
        <input {...register('address')} className="input-field" placeholder="N° rue, quartier, bâtiment..." />
        <FieldError msg={errors.address?.message} />
      </div>

      {/* Order summary box */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 rounded-2xl p-5 text-white border border-white/10">
        <div className="text-[10px] font-bold uppercase tracking-widest text-navy-300 mb-4">📋 Récapitulatif de commande</div>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between text-navy-200">
            <span className="truncate mr-2">{product.name} × {qty}</span>
            <span className="font-bold flex-shrink-0">{fmt(unitPrice * qty)} DA</span>
          </div>
          <div className="flex justify-between text-navy-200">
            <span>Livraison ({delivery === 'domicile' ? 'Domicile' : 'Bureau'})</span>
            <span className="font-bold">{fmt(deliveryCost)} DA</span>
          </div>
          <div className="border-t border-navy-600 pt-2 flex justify-between items-center">
            <span className="font-bold">Total à payer</span>
            <span className="text-xl font-black text-gold-400">{fmt(total)} DA</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-300 bg-navy-900/50 rounded-xl p-2.5">
          <span>💳</span>
          <span>Paiement à la livraison uniquement — aucun paiement à l'avance</span>
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={submitting}
        className="w-full btn-gold py-4 text-base rounded-2xl">
        {submitting ? (
          <><Loader2 size={20} className="animate-spin" /> Envoi en cours...</>
        ) : (
          <><Check size={20} /> Confirmer ma commande — {fmt(total)} DA</>
        )}
      </button>
    </form>
  )
}
