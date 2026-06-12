import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Instagram, Facebook, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213XXXXXXXXX'
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-11 h-11 bg-white/10 rounded-xl p-1.5">
                <Image src="/logo.png" alt="Diaa Store" fill className="object-contain" />
              </div>
              <div>
                <div className="font-black text-white text-base">Diaa <span className="text-gold-400">Store</span></div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Illuminate Your Shopping</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Votre boutique en ligne de confiance. Produits de qualité, livrés partout en Algérie.
            </p>
            <div className="flex gap-2.5">
              <a href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-navy-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><Facebook size={15} /></a>
              <a href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-navy-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><Instagram size={15} /></a>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/40 flex items-center justify-center text-[#25D366] transition-colors"><MessageCircle size={15} /></a>
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Navigation</h3>
            <ul className="space-y-2.5">
              {[['/', 'Accueil'], ['/?section=categories', 'Catégories'], ['/?section=promotions', 'Promotions'], ['/cart', 'Mon panier']].map(([href, label]) => (
                <li key={href}><Link href={href} className="text-xs text-slate-500 hover:text-gold-400 transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-gold-600 flex-shrink-0" />{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Livraison</h3>
            <ul className="space-y-2.5 text-xs text-slate-500">
              {['Livraison à domicile disponible', 'Livraison au bureau (Stop-Desk)', '58 wilayas couvertes', 'Paiement à la livraison (COD)'].map(t => (
                <li key={t} className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-gold-600 flex-shrink-0 mt-1.5" />{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs text-slate-500 hover:text-[#25D366] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366] flex-shrink-0"><MessageCircle size={14} /></div>
                  WhatsApp Support
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-500">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Phone size={14} /></div>
                +{wa}
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-500">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin size={14} /></div>
                Algérie — Livraison nationale
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Diaa Store. Tous droits réservés.</p>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Paiement 100% à la livraison · Aucun risque
          </div>
        </div>
      </div>
    </footer>
  )
}
