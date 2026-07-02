import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'next-i18next'
import Layout from '../components/layout/Layout'

export default function NotFound() {
  const { t } = useTranslation('common')
  return (
    <Layout title={t('pageNotFound')}>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center animate-slide-up">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Image src="/logo.png" alt="Diaa Store" fill className="object-contain opacity-30"/>
          </div>
          <h1 className="text-8xl font-black text-navy-800 dark:text-white mb-4">404</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">
            {t('pageNotFoundDesc')}
          </p>
          <Link href="/" className="btn-primary px-8 py-3.5 text-base">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </Layout>
  )
}
