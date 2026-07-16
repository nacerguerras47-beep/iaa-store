import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { appWithTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import Head from 'next/head'
import { CartProvider } from '../context/CartContext'
import '../styles/globals.css'

function App({ Component, pageProps }: AppProps) {
  const { locale } = useRouter()

  /*
   * RTL / lang attribute — applied in useEffect (client-only) so it never
   * causes a mismatch. The server renders <html> with whatever lang Next.js
   * sets via i18n config; the client then synchronises dir and lang after
   * hydration. Because these are on <html> which has suppressHydrationWarning
   * in _document.tsx, React accepts the difference silently.
   */
  useEffect(() => {
    const isRTL = locale === 'ar'
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = locale || 'fr'
  }, [locale])

  // Capture fbclid from URL and store fbclid|timestamp in cookie for 7 days
  const fbclidCaptured = useRef(false)
  useEffect(() => {
    if (fbclidCaptured.current) return
    const params = new URLSearchParams(window.location.search)
    const fbclid = params.get('fbclid')
    if (fbclid) {
      const existing = document.cookie
        .split('; ')
        .find(row => row.startsWith('_fbc_captured='))
      const newValue = `${fbclid}|${Date.now()}`
      if (!existing || decodeURIComponent(existing.split('=')[1]) !== newValue) {
        document.cookie = `_fbc_captured=${encodeURIComponent(newValue)}; max-age=604800; path=/; SameSite=Lax`
      }
      fbclidCaptured.current = true
    }
  }, [])

  return (
    /*
     * ThemeProvider configuration for zero hydration errors:
     *
     *   attribute="class"  — adds "dark" / "light" class to <html>
     *   defaultTheme="light" — consistent server default
     *   enableSystem={false} — disabling system detection prevents the server
     *                          and client from computing different defaults
     *                          (server has no OS preference, client might).
     *                          Users can still toggle manually.
     *   disableTransitionOnChange — prevents a flash of wrong theme on load
     *
     * suppressHydrationWarning on <Html> and <body> in _document.tsx handles
     * the class attribute mismatch that next-themes introduces.
     */
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
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
              borderRadius:  '14px',
              padding:       '14px 18px',
              fontWeight:    '600',
              fontSize:      '14px',
              boxShadow:     '0 8px 32px rgba(15,35,71,0.18)',
            },
            success: { style: { background: '#0f2347', color: '#fff' } },
            error:   { style: { background: '#ef4444', color: '#fff' } },
          }}
        />
      </CartProvider>
    </ThemeProvider>
  )
}

export default appWithTranslation(App)
