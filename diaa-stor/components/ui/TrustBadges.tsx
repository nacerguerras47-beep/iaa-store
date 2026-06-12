import { Truck, CreditCard, MessageCircle, Shield, RotateCcw } from 'lucide-react'

const badges = [
  {
    icon: Truck,
    title: 'Livraison rapide',
    desc: 'Partout en Algérie',
    color: 'text-navy-600 dark:text-navy-300',
    bg: 'bg-navy-50 dark:bg-navy-800',
  },
  {
    icon: CreditCard,
    title: 'Paiement à la livraison',
    desc: 'COD — Aucun risque',
    color: 'text-gold-600 dark:text-gold-400',
    bg: 'bg-gold-50 dark:bg-navy-800',
  },
  {
    icon: MessageCircle,
    title: 'Support WhatsApp',
    desc: 'Réponse rapide',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-navy-800',
  },
  {
    icon: Shield,
    title: 'Produits garantis',
    desc: 'Qualité certifiée',
    color: 'text-navy-600 dark:text-navy-300',
    bg: 'bg-navy-50 dark:bg-navy-800',
  },
]

export default function TrustBadges() {
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
