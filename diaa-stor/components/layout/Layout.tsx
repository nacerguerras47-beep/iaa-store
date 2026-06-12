import Navbar from './Navbar'
import Footer from './Footer'
import WhatsAppButton from '../ui/WhatsAppButton'
import Head from 'next/head'

interface Props {
  children: React.ReactNode
  title?: string
  description?: string
  noFooter?: boolean
}

export default function Layout({ children, title, description, noFooter }: Props) {
  const siteTitle = title ? `${title} — Diaa Store` : 'Diaa Store | Illuminate Your Shopping'
  const siteDesc = description || 'Boutique en ligne Diaa Store. Produits de qualité livrés partout en Algérie. Paiement à la livraison.'
  return (
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDesc} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDesc} />
        <meta name="robots" content="index, follow" />
      </Head>
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
        <Navbar />
        <main className="flex-1 page-enter">{children}</main>
        {!noFooter && <Footer />}
        <WhatsAppButton />
      </div>
    </>
  )
}
