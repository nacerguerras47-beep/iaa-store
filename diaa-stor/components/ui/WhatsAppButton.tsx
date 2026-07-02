import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'next-i18next'

interface Props { message?: string }

export default function WhatsAppButton({ message }: Props) {
  const { t } = useTranslation('common')
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213795653670'
  const defaultMsg = encodeURIComponent(t('defaultWaMessage'))
  const href = `https://wa.me/${number}?text=${message ? encodeURIComponent(message) : defaultMsg}`

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="whatsapp-float group" aria-label={t('whatsappSupport')}>
      <div className="relative flex-shrink-0">
        <MessageCircle size={22} className="fill-white" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-[#25D366] animate-ping" />
      </div>
      <span className="text-sm hidden sm:block">{t('whatsappSupport')}</span>
    </a>
  )
}
