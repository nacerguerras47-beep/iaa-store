import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Loader2, Check, Home, Building2, AlertCircle, Minus, Plus } from 'lucide-react'
import { WILAYAS, getCommunesByWilaya, getDeliveryPrice } from '../../lib/algeria'
import type { Commune } from '../../lib/algeria'
import { useCart } from '../../context/CartContext'
import { computeBundleTotal, computeAddonTotal, getBundlePrice } from '../../lib/pricing'

function getSchema(t: (k: string) => string) {
  return z.object({
    last_name:     z.string().min(2, t('minName')),
    first_name:    z.string().min(2, t('minName')),
    phone:         z.string().regex(/^(05|06|07)\d{8}$/, t('invalidPhone')),
    address:       z.string().optional(),
    wilaya:        z.string().min(1, t('wilayaRequired')),
    commune:       z.string().min(1, t('communeRequired')),
    delivery_type: z.enum(['domicile', 'bureau']),
  })
}

type FormData = z.infer<ReturnType<typeof getSchema>>
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
  selectedBundle?: { name: string; price: number; quantity_trigger?: number | null; discount_percent?: number | null } | null
  onSuccess?: (orderNumbers: string[]) => void
  bundles?: { name: string; price: number; quantity_trigger?: number | null; discount_percent?: number | null }[] | null
  selectedBundleIdx?: number | null
  onSelectBundle?: (idx: number | null) => void
  extraUnitPrice?: number | null
  addons?: { id: string; name: string; max_quantity: number; tiers: { min_quantity: number; price_per_unit: number }[] }[]
  addonQtys?: Record<string, number>
  variantPrice?: number | null
}

export default function OrderForm({ product, deliveryPrices, initialQty = 1, selectedBundle, onSuccess, bundles, selectedBundleIdx, onSelectBundle, extraUnitPrice = null, addons = [], addonQtys = {}, variantPrice = null }: Props) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const locale = router.locale || 'fr'
  const { items: cartItems, clearCart } = useCart()
  const [qty, setQty] = useState(initialQty)
  useEffect(() => { setQty(initialQty) }, [initialQty])
  const [delivery, setDelivery] = useState<'domicile' | 'bureau'>('domicile')
  const [selectedWilaya, setSelectedWilaya] = useState('')
  const [communes, setCommunes] = useState<Commune[]>([])
  const [submitting, setSubmitting] = useState(false)

  const schema = useMemo(() => getSchema(t), [t])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'domicile' },
  })

  const hasManualBundle = selectedBundle != null && bundles?.some(b => b.name === selectedBundle.name && b.quantity_trigger == null)
  const productTotal = (extraUnitPrice != null && !hasManualBundle)
    ? computeBundleTotal(qty, product.price, product.promo_price, bundles, extraUnitPrice, variantPrice)
    : (selectedBundle
        ? (variantPrice ? getBundlePrice(selectedBundle, variantPrice) : selectedBundle.price) * qty
        : (variantPrice ? variantPrice : (product.promo_price && product.promo_price < product.price ? product.promo_price : product.price)) * qty)
  const addonsTotal = addons.reduce((s, a) => {
    const { total } = computeAddonTotal(a.tiers, addonQtys[a.id] || 0)
    return s + total
  }, 0)
  const deliveryCost =
  selectedWilaya
    ? getDeliveryPrice(selectedWilaya, delivery)
    : 0
  const total = productTotal + addonsTotal + deliveryCost

const onWilayaChange = (code: string) => {
  setSelectedWilaya(code)
  const w = WILAYAS.find(x => x.code === code)
  if (w) {
    setValue('wilaya', locale === 'ar' ? w.nameAr : w.nameFr, { shouldValidate: true })
  }
  setValue('commune', '')
  setCommunes(getCommunesByWilaya(code))
}
  const onDeliveryChange = (type: 'domicile' | 'bureau') => {
    setDelivery(type)
    setValue('delivery_type', type)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const selectedAddons = addons.filter(a => (addonQtys[a.id] || 0) > 0).map(a => {
        const { price_per_unit, total } = computeAddonTotal(a.tiers, addonQtys[a.id])
        return { name: a.name, quantity: addonQtys[a.id], price_per_unit, total }
      })
    const itemsPayload = [
        {
          product_id: product.id,
          product_name: product.name + (selectedAddons.length > 0 ? ' + ' + selectedAddons.map(sa => sa.name + ' × ' + sa.quantity).join(' + ') : ''),
          quantity: qty,
          unit_price: qty > 0 ? Math.round((productTotal + addonsTotal) / qty) : product.price,
          delivery_price: 0,
          total_price: productTotal + addonsTotal,
          bundle_name: selectedBundle?.name || null,
          addons: selectedAddons,
        },
        ...cartItems.map(item => {
          const vPrice = item.variant_price || null
          const itemTotal = computeBundleTotal(item.quantity, item.base_price || item.price, item.base_promo_price ?? item.promo_price, item.bundles, item.extra_unit_price, vPrice)
          return {
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.quantity > 0 ? Math.round(itemTotal / item.quantity) : item.price,
            delivery_price: 0,
            total_price: itemTotal,
            variant_name: item.variant_name || undefined,
          }
        }),
      ]
      const totalDelivery = deliveryCost || 0
      const itemsCount = itemsPayload.length
      itemsPayload.forEach(ip => {
        ip.delivery_price = Math.round(totalDelivery / itemsCount)
        ip.total_price = ip.total_price + ip.delivery_price
      })

      const res = await fetch('/api/orders/create-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, items: itemsPayload, total_delivery: deliveryCost }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || t('serverError'))
      if (result.sheet_error) {
        console.warn('Google Sheets error:', result.sheet_error)
        toast.error('Google Sheets: ' + result.sheet_error)
      }
      clearCart()
      onSuccess?.(result.order_numbers)
    } catch (err: any) {
      toast.error(err.message || t('retryError'))
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
        <label className="label">{t('quantity')}</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQty(q => {
            const newQty = Math.max(1, q - 1)
            if (bundles && onSelectBundle) {
              let bestIdx = -1, bestTrigger = -1
              for (let i = 0; i < bundles.length; i++) {
                const b = bundles[i]
                if (b.quantity_trigger != null && newQty >= b.quantity_trigger && b.quantity_trigger > bestTrigger) {
                  bestTrigger = b.quantity_trigger; bestIdx = i
                }
              }
              onSelectBundle(bestIdx !== -1 ? bestIdx : null)
            }
            return newQty
          })}
            className="w-11 h-11 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-navy-500 hover:bg-navy-50 dark:hover:bg-navy-900/30 transition-all font-bold text-slate-600 dark:text-slate-300">
            <Minus size={16} />
          </button>
          <span className="w-14 text-center font-black text-xl text-slate-900 dark:text-white">{qty}</span>
          <button type="button" onClick={() => setQty(q => {
            const newQty = q + 1
            if (bundles && onSelectBundle) {
              let bestIdx = -1, bestTrigger = -1
              for (let i = 0; i < bundles.length; i++) {
                const b = bundles[i]
                if (b.quantity_trigger != null && newQty >= b.quantity_trigger && b.quantity_trigger > bestTrigger) {
                  bestTrigger = b.quantity_trigger; bestIdx = i
                }
              }
              onSelectBundle(bestIdx !== -1 ? bestIdx : null)
            }
            return newQty
          })}
            className="w-11 h-11 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center hover:border-navy-500 hover:bg-navy-50 dark:hover:bg-navy-900/30 transition-all font-bold text-slate-600 dark:text-slate-300">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Delivery type */}
      <div>
        <label className="label">{t('deliveryType')}</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onDeliveryChange('domicile')}
            className={`delivery-option flex-col text-center gap-2 ${delivery === 'domicile' ? 'delivery-option-active' : 'delivery-option-inactive'}`}>
            <Home size={20} className={delivery === 'domicile' ? 'text-navy-700 dark:text-navy-300' : 'text-slate-400'} />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">{t('atHome')}</div>
              <div className="text-xs font-black text-gold-600 dark:text-gold-400">
                        {fmt(
                          selectedWilaya
                            ? getDeliveryPrice(selectedWilaya, 'domicile')
                            : deliveryPrices.home
                        )} DA
                       </div>
            </div>
          </button>
          <button type="button" onClick={() => onDeliveryChange('bureau')}
            className={`delivery-option flex-col text-center gap-2 ${delivery === 'bureau' ? 'delivery-option-active' : 'delivery-option-inactive'}`}>
            <Building2 size={20} className={delivery === 'bureau' ? 'text-navy-700 dark:text-navy-300' : 'text-slate-400'} />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">{t('atOffice')}</div>
              <div className="text-xs font-black text-gold-600 dark:text-gold-400">
                        {fmt(
                          selectedWilaya
                            ? getDeliveryPrice(selectedWilaya, 'bureau')
                            : deliveryPrices.office
                         )} DA
                       </div>
            </div>
          </button>
        </div>
      </div>

      {/* Wilaya / Commune */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('wilaya')} <span className="text-red-500">*</span></label>
          <select className="select-field" value={selectedWilaya} onChange={e => onWilayaChange(e.target.value)}>
                   <option value="">{t('chooseWilaya')}</option>
                   {WILAYAS.map((w) => (
                     <option key={w.code} value={w.code}>
                      {w.code} — {locale === 'ar' ? w.nameAr : w.nameFr}
                     </option>
                   ))}
                 </select>
                 <input type="hidden" {...register('wilaya')} />
          <FieldError msg={errors.wilaya?.message} />
        </div>
        <div>
          <label className="label">{t('commune')} <span className="text-red-500">*</span></label>
          <select className="select-field" {...register('commune')} disabled={!selectedWilaya}>
            <option value="">{t('selectCommune')}</option>
            {communes.map(c => <option key={c.nameFr} value={c.nameFr}>{locale === 'ar' ? c.nameAr : c.nameFr}</option>)}
          </select>
          <FieldError msg={errors.commune?.message} />
        </div>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('lastName')} <span className="text-red-500">*</span></label>
          <input {...register('last_name')} className="input-field" placeholder={t('lastNamePlaceholder')} />
          <FieldError msg={errors.last_name?.message} />
        </div>
        <div>
          <label className="label">{t('firstName')} <span className="text-red-500">*</span></label>
          <input {...register('first_name')} className="input-field" placeholder={t('firstNamePlaceholder')} />
          <FieldError msg={errors.first_name?.message} />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="label">{t('phone')} <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs">({t('phoneHint')})</span></label>
        <input {...register('phone')} className="input-field" placeholder="0612345678" maxLength={10} type="tel" inputMode="numeric" />
        <FieldError msg={errors.phone?.message} />
      </div>

      {/* Address */}
      <div>
        <label className="label">{t('address')}</label>
        <input {...register('address')} className="input-field" placeholder={t('addressPlaceholder')} />
        <FieldError msg={errors.address?.message} />
      </div>

      {/* Order summary box */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 rounded-2xl p-5 text-white border border-white/10">
        <div className="text-[10px] font-bold uppercase tracking-widest text-navy-300 mb-4">{t('orderSummary')}</div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-navy-200">
              <span className="truncate mr-2">{product.name} × {qty}</span>
              <span className="font-bold flex-shrink-0">{fmt(productTotal)} DA</span>
            </div>
            {addons.map(a => {
              const aqty = addonQtys[a.id] || 0
              if (aqty === 0) return null
              const { price_per_unit, total } = computeAddonTotal(a.tiers, aqty)
              return (
                <div key={a.id} className="flex justify-between text-navy-300 text-xs pl-2">
                  <span className="truncate mr-2">+ {a.name} × {aqty}</span>
                  <span className="font-bold flex-shrink-0">{fmt(total)} DA</span>
                </div>
              )
            })}
            <div className="flex justify-between text-navy-200">
              <span>{t('deliveryLabel')} ({delivery === 'domicile' ? t('homeShort') : t('officeShort')})</span>
              <span className="font-bold">{fmt(deliveryCost)} DA</span>
            </div>
          <div className="border-t border-navy-600 pt-2 flex justify-between items-center">
            <span className="font-bold">{t('totalToPay')}</span>
            <span className="text-xl font-black text-gold-400">{fmt(total)} DA</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-300 bg-navy-900/50 rounded-xl p-2.5">
          <span>💳</span>
          <span>{t('codNotice')}</span>
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={submitting}
        className="w-full btn-gold py-4 text-base rounded-2xl">
        {submitting ? (
          <><Loader2 size={20} className="animate-spin" /> {t('sendingOrder')}</>
        ) : (
          <><Check size={20} /> {t('confirmOrder')} — {fmt(total)} DA</>
        )}
      </button>
    </form>
  )
}
