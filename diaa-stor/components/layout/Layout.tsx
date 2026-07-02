import Navbar from './Navbar'
import Footer from './Footer'
import WhatsAppButton from '../ui/WhatsAppButton'
import Head from 'next/head'
import { useTranslation } from 'next-i18next'

interface Props {
  children: React.ReactNode
  title?: string
  description?: string
  noFooter?: boolean
}

export default function Layout({ children, title, description, noFooter }: Props) {
  const { t } = useTranslation('common')
  const siteTitle = title ? `${title} — ${t('storeName')}` : `${t('storeName')} | ${t('tagline')}`
  const siteDesc = description || t('storeDescription')
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
