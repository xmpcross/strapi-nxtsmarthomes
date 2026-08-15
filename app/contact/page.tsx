import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with the ${SITE.name} editorial team — story tips, partnership questions, corrections.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="bg-paper text-ink" data-testid="contact-page">
      <section className="relative isolate overflow-hidden border-b border-primary/10 bg-white">
        
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <p className="inline-flex rounded-full border border-primary/15 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">Contact</p>
          <h1 className="mt-5 font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
            Get in touch
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg">
            Story tips, partnership questions, corrections, or just hello — we read everything that comes through.
          </p>
        </div>
      </section>

      <section className="bg-surface py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Send a message</p>
            <h2 className="mt-3 font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">
              Tell us what&apos;s on your mind
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-muted">
              Fill in the form and we&apos;ll get back to you by email. Please include the product, guide, or page URL if your message is about a specific article.
            </p>
            <p className="mt-6 text-sm text-ink-faint">
              Prefer email?{' '}
              <a href="mailto:hello@nxtsmart.homes" className="font-semibold text-primary hover:underline">
                hello@nxtsmart.homes
              </a>
            </p>

            {/*
              The operator was named only in the legal pages, so the two pages a
              reader or an affiliate reviewer checks first — About and Contact —
              said nothing verifiable about who runs the site. Entity and
              jurisdiction are stated here exactly as they appear in the Terms
              and Privacy pages, so the three cannot drift apart.
            */}
            <div className="mt-8 rounded-xl border border-ink/8 bg-muted/60 p-5" data-testid="contact-operator">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Who runs this site</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {SITE.name} is published by <strong className="text-ink">FXN Holdings</strong>, a business
                based in Western Australia. Our{' '}
                <Link href="/editorial-policy" className="font-semibold text-primary hover:underline">editorial policy</Link>
                {' '}explains how we research and score products, and our{' '}
                <Link href="/legal/terms" className="font-semibold text-primary hover:underline">terms</Link>
                {' '}and{' '}
                <Link href="/legal/privacy" className="font-semibold text-primary hover:underline">privacy policy</Link>
                {' '}set out the legal detail.
              </p>
            </div>
          </div>
          <ContactForm />
        </div>

        <div className="mx-auto mt-16 max-w-3xl px-5 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Looking for something specific?</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-ink-muted">
            Browse the full archive or jump to a section.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-emphasis">
              Home
            </Link>
            <Link href="/sitemap" className="inline-flex items-center rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-primary hover:text-primary">
              Site map
            </Link>
            <Link href="/about" className="inline-flex items-center rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold text-ink transition hover:border-primary hover:text-primary">
              About us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
