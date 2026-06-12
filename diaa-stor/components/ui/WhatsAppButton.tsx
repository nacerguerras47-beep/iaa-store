import { MessageCircle } from 'lucide-react'

interface Props { message?: string }

export default function WhatsAppButton({ message }: Props) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213XXXXXXXXX'
  const defaultMsg = encodeURIComponent('Bonjour ! Je visite Diaa Store et j\'ai une question.')
  const href = `https://wa.me/${number}?text=${message ? encodeURIComponent(message) : defaultMsg}`

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="whatsapp-float group" aria-label="Contact WhatsApp">
      <div className="relative flex-shrink-0">
        <MessageCircle size={22} className="fill-white" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-[#25D366] animate-ping" />
      </div>
      <span className="text-sm hidden sm:block">Support</span>
    </a>
  )
}
