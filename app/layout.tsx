import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { listProductCategories } from '@/lib/commerce';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { jsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE } from '@/lib/site';

// Site typeface — Geist, the family the /home-draft-2 design is built on.
// next/font fetches it at build time and serves it from our own origin, so a
// pageload still makes zero requests to fonts.gstatic.com. Every font token in
// globals.css and tailwind.config.ts resolves through --font-geist.
const geist = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-geist',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: `${SITE.name} RSS` }],
    },
  },
  verification: {
    other: {
      'msvalidate.01': '057158952120360611CA2F41AD7D5B50',
      'google-adsense-account': 'ca-pub-2867376862905050',
      // Mitgo (Takeads' parent) site verification.
      'mitgo-verification': 'f6e9656d-cf32-4c1d-a474-77787ef6cfab',
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Product categories for the header menu, read from the commerce-site row's
  // enabledCategories. Failing soft costs a menu entry; throwing would take
  // every page on the site down with the CMS.
  const productCategories = (await listProductCategories().catch(() => [])).map((c) => ({
    slug: c.slug,
    title: c.name,
  }));

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  return (
    <html lang="en" className={geist.variable}>
      <head>
        {/*
          Google tag (GA4), first in <head> and in the server HTML so Google's tag check finds it.
          Consent Mode: every storage type starts denied, so no cookies are set until the visitor
          accepts on the cookie banner. A returning visitor who accepted is granted here, before
          'config'; a choice made on the page is relayed by <GoogleAnalytics />. The library is
          injected after the defaults: a plain <script async src> would be hoisted above them by
          React and could run unconsented.
        */}
        {gaId ? (
          <script
            dangerouslySetInnerHTML={{
              __html:
                `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
                `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',` +
                `analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',` +
                `security_storage:'granted',wait_for_update:500});` +
                `try{if(localStorage.getItem('cookie-consent')==='accepted'){gtag('consent','update',{analytics_storage:'granted',` +
                `ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}}catch(e){}` +
                `gtag('js',new Date());gtag('config','${gaId}');` +
                `(function(){var s=document.createElement('script');s.async=true;` +
                `s.src='https://www.googletagmanager.com/gtag/js?id=${gaId}';document.head.appendChild(s);})();`,
            }}
          />
        ) : null}
        {/* Impact.com site verification. Written verbatim with `value`, as Impact
            provides it; the metadata API would rewrite `value` to `content`. */}
        <meta {...({ name: 'impact-site-verification', value: 'f5831ed8-a4bd-4ceb-a40e-be808fe75270' } as Record<string, string>)} />
      </head>
      <body className="min-h-screen flex flex-col font-sans font-normal" data-testid="app-shell">
        <Header productCategories={productCategories} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
        <GoogleAnalytics />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }} />
      </body>
    </html>
  );
}
