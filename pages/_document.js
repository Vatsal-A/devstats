import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⌖</text></svg>"
        />
        <meta name="description" content="DevStats — instant GitHub analytics for any public profile." />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="color-scheme" content="dark" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="DevStats — GitHub Analytics" />
        <meta property="og:description" content="Contribution heatmap, language breakdown, repo sparklines." />
        <meta property="og:image" content="/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="DevStats" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DevStats — GitHub Analytics" />
        <meta name="twitter:description" content="Instant analytics for any public GitHub profile." />
        <meta name="twitter:image" content="/api/og" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
