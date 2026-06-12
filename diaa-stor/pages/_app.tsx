import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { appWithTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Head from 'next/head'
import { CartProvider } from '../context/CartContext'
import '../styles/globals.css'

function App({ Component, pageProps }: AppProps) {
  const { locale } = useRouter()
  const isRTL = locale === 'ar'

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = locale || 'fr'
  }, [locale, isRTL])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <CartProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="theme-color" content="#1e4a8e" />
        </Head>
        <Component {...pageProps} />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '14px',
              padding: '14px 18px',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 8px 32px rgba(15,35,71,0.18)',
            },
            success: { style: { background: '#0f2347', color: '#fff' } },
            error: { style: { background: '#ef4444', color: '#fff' } },
          }}
        />
      </CartProvider>
    </ThemeProvider>
  )
}

export default appWithTranslation(App)
