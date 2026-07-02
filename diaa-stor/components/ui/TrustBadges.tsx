import { Truck, CreditCard, MessageCircle, Shield, RotateCcw } from 'lucide-react'
import { useTranslation } from 'next-i18next'

export default function TrustBadges() {
  const { t } = useTranslation('common')
  const badges = [
    { icon: Truck, title: t('fastDelivery'), desc: t('algeriaCovered'), color: 'text-navy-600 dark:text-navy-300', bg: 'bg-navy-50 dark:bg-navy-800' },
    { icon: CreditCard, title: t('trustPayment'), desc: t('trustPaymentDesc'), color: 'text-gold-600 dark:text-gold-400', bg: 'bg-gold-50 dark:bg-navy-800' },
    { icon: MessageCircle, title: t('whatsappSupport'), desc: t('support247'), color: 'text-green-600', bg: 'bg-green-50 dark:bg-navy-800' },
    { icon: Shield, title: t('trustGuarantee'), desc: t('trustGuaranteeDesc'), color: 'text-navy-600 dark:text-navy-300', bg: 'bg-navy-50 dark:bg-navy-800' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
      {badges.map((badge) => {
        const Icon = badge.icon
        return (
          <div key={badge.title} className="trust-badge">
            <div className={`w-10 h-10 rounded-xl ${badge.bg} flex items-center justify-center ${badge.color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-navy-800 dark:text-white leading-tight">
                {badge.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {badge.desc}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
