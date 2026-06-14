import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    /*
     * suppressHydrationWarning on <Html> is REQUIRED when using next-themes.
     *
     * next-themes works by adding a `class` attribute ("light" or "dark") to
     * the <html> element on the client after reading localStorage. The server
     * cannot know which theme the user last chose, so it renders <html> with
     * no class. When React hydrates it sees:
     *
     *   Server HTML : <html lang="fr">
     *   Client VDOM : <html lang="fr" class="dark">
     *
     * This triggers React hydration error #418 (attribute mismatch) and
     * error #423 (cannot update a component while rendering a different
     * component). suppressHydrationWarning tells React to accept this one
     * specific difference silently and let next-themes manage it.
     *
     * suppressHydrationWarning on <body> covers the same scenario for any
     * theme-driven body class changes and for browser extensions that modify
     * the body before React hydrates (common in Algeria with ad-blockers /
     * translation extensions).
     */
    <Html suppressHydrationWarning>
      <Head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#1e4a8e" />
      </Head>
      <body suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
