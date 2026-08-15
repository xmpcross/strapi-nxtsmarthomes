import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Editorial Policy',
  description: 'How NXTSmart.Homes researches, reviews, updates and monetizes smart home guides and product content.',
  alternates: { canonical: '/editorial-policy' },
};

/** When this policy last actually changed, per the file's git history. */
const POLICY_MODIFIED_LABEL = 'Jul 30, 2026';

const principles = [
  ['Practical homeowner focus', 'We prioritize setup difficulty, compatibility, privacy, reliability, ongoing costs and day-to-day usefulness over manufacturer claims.'],
  ['Clear review criteria', 'Product coverage considers ecosystem support, installation, automation options, app quality, local-control support, subscriptions and long-term value.'],
  ['Corrections and updates', 'Smart home platforms change quickly. We update articles when product support, pricing, standards or security guidance changes, and we welcome correction requests.'],
  ['Affiliate transparency', 'Some pages may include affiliate links. Those links can earn a commission at no extra cost to readers and do not change the editorial criteria used in our recommendations.'],
];

export default function EditorialPolicyPage() {
  const policyJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', url: '/' },
        { name: 'Editorial Policy', url: '/editorial-policy' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Editorial Policy',
        description: 'How NXTSmart.Homes researches, reviews, updates and monetizes smart home guides and product content.',
        url: SITE.url + '/editorial-policy',
        isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
      },
    ],
  };

  return (
    <div data-testid="editorial-policy-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(policyJsonLd) }} />
      <section className="border-b border-ink/8 bg-gradient-to-br from-primary-soft/40 via-paper to-accent-soft/30">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Editorial standards</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Editorial Policy</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-ink-muted sm:text-lg">
            {SITE.name} publishes smart home guides, reviews and comparisons for readers who want clear, practical decisions before buying or configuring connected devices.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="space-y-6">
          {principles.map(([title, body]) => (
            <section key={title} className="rounded border border-ink/8 bg-surface p-6 shadow-card">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h2>
              <p className="mt-3 text-base leading-7 text-ink-muted">{body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded border border-ink/8 bg-surface p-6 shadow-card">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Product scoring methodology</h2>
          <p className="mt-3 text-base leading-7 text-ink-muted">
            Product scores are based on editorial research, published product specifications, compatibility documentation, manufacturer or merchant information, and visible user feedback patterns. We do not claim hands-on lab testing unless an article clearly says the product was tested by us.
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
            <li><strong className="text-ink">Compatibility:</strong> 20%</li>
            <li><strong className="text-ink">Setup and ease of use:</strong> 15%</li>
            <li><strong className="text-ink">Features and automation:</strong> 25%</li>
            <li><strong className="text-ink">Reliability signals:</strong> 15%</li>
            <li><strong className="text-ink">Privacy and security:</strong> 10%</li>
            <li><strong className="text-ink">Value:</strong> 15%</li>
          </ul>
        </section>

        <div className="mt-10 rounded border border-ink/8 bg-muted p-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Contact corrections</h2>
          <p className="mt-3 text-base leading-7 text-ink-muted">
            To request a correction or suggest an update, contact the editorial team and include the article URL plus the detail that needs review.
          </p>
          <Link href="/contact" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-emphasis">Contact us</Link>
        </div>

        {/*
          The other legal pages carry a last-updated date and this one did not,
          which is the sort of gap a reviewer notices on a page whose whole job
          is establishing editorial credibility.

          The date is when this policy last actually changed, taken from the
          file's history — not today's date. Stamping an unchanged policy as
          freshly updated is the dishonest version of this fix.
        */}
        <p className="mt-8 text-sm text-ink-faint" data-testid="editorial-policy-updated">
          Last updated: {POLICY_MODIFIED_LABEL}
        </p>
      </section>
    </div>
  );
}
