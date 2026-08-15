import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { listProductCategories } from '@/lib/commerce';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
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

  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen flex flex-col font-sans font-normal" data-testid="app-shell">
        <Header productCategories={productCategories} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }} />
      </body>
    </html>
  );
}
