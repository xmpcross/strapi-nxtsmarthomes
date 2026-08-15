import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import SectionHeader from '@/components/SectionHeader';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    `${SITE.name} — your independent, tech-savvy companions in smart electronics and home gadgets. Comprehensive guides, price comparisons and up-to-the-minute information.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="bg-paper text-ink" data-testid="about-page">
      <Hero />
      <Mission />
      <Vision />
      <Community />
      <ThankYou />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-primary/10 bg-white text-ink">
      
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <p className="inline-flex rounded-full border border-primary/15 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">About</p>
          <h1 className="mt-5 font-display text-[2rem] font-bold leading-tight tracking-tight">
            About Us
          </h1>
          <h2 className="mt-6 font-display text-[2rem] font-bold leading-tight">
            Your trusted guide to the smart technology universe
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
            At {SITE.name}, we&apos;re more than just a website — we&apos;re your independent, tech-savvy
            companions in the exciting world of smart electronics and home gadgets.
          </p>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about/about_image_bg.png"
            alt=""
            aria-hidden
            className="mx-auto h-auto w-full max-w-md object-contain opacity-90"
          />
        </div>
      </div>
    </section>
  );
}

function Mission() {
  const pillars = [
    {
      title: 'Comprehensive, easy-to-digest guides',
      body:
        'Our in-depth articles break down the complexities of smart products — from the latest TVs and sound systems to cutting-edge security and automation.',
    },
    {
      title: 'Powerful price comparisons',
      body:
        'We scour the web to find the best deals on the products you want, saving you time and money with up-to-date sales and discounts.',
    },
    {
      title: 'Up-to-the-minute information',
      body:
        'Our team constantly researches and updates content so you&apos;re always in the know about the latest trends and innovations.',
    },
  ];

  return (
    <section className="bg-paper py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-16">
        <div className="lg:sticky lg:top-24">
          <SectionHeader
            eyebrow="Our mission"
            title="Simplify, inform, empower"
            subtitle="Navigating smart technology can feel overwhelming. Three pillars drive everything we publish."
          />
          <div className="mt-8 hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/about/about_left_01-al.png"
              alt=""
              aria-hidden
              className="h-auto w-full max-w-xs object-contain mix-blend-multiply"
            />
          </div>
        </div>
        <ol className="space-y-5">
          {pillars.map((p, i) => (
            <li
              key={p.title}
              className="relative rounded border border-primary/10 bg-surface p-6 shadow-card transition hover:shadow-card-hover sm:p-8"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-primary-soft font-display text-sm font-bold text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-ink sm:text-2xl">{p.title}</h3>
              <p className="mt-3 text-base leading-7 text-ink-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Vision() {
  return (
    <section className="border-y border-primary/10 bg-primary-soft/55 py-20 text-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-16">
        <div>
          <SectionHeader
            eyebrow="Our vision"
            title="The future of smart-tech shopping"
            subtitle="We envision a future where everyone can confidently embrace smart technology, regardless of their tech knowledge."
          />
        </div>
        <div className="relative flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about/about_right_image-al.png"
            alt=""
            aria-hidden
            className="h-auto w-full max-w-sm object-contain"
          />
        </div>
      </div>
    </section>
  );
}

function Community() {
  return (
    <section className="bg-paper py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-16">
        <div className="order-2 flex justify-center lg:order-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about/about_left_02-al.png"
            alt=""
            aria-hidden
            className="h-auto w-full max-w-sm object-contain mix-blend-multiply"
          />
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeader
            eyebrow="The community"
            title="More than a source — a community"
            subtitle={`${SITE.name} is a place to share thoughts, ask questions, and explore the endless possibilities of the smart-tech universe — whether you're a seasoned expert or just starting out.`}
          />

          {/*
            The About page carried mission and vision but nothing verifiable:
            no operating entity, no jurisdiction and no route to a human. That
            is the first page a reader or an affiliate reviewer checks, so it
            now states the operator in the same terms as the legal pages.

            Named authors are deliberately absent rather than invented — that
            item stays open until there are real people to name.
          */}
          <div className="mt-8 rounded-xl border border-ink/8 bg-surface p-6 shadow-card" data-testid="about-operator">
            <h3 className="font-display text-xl font-bold tracking-tight text-ink">Who we are</h3>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              {SITE.name} is published by <strong className="text-ink">FXN Holdings</strong>, a business
              based in Western Australia. We research smart home products from published specifications,
              compatibility documentation and merchant information — our{' '}
              <Link href="/editorial-policy" className="font-semibold text-primary hover:underline">
                editorial policy
              </Link>{' '}
              sets out the scoring criteria and says plainly where we have not tested a device ourselves.
            </p>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              Questions or corrections go to our{' '}
              <Link href="/contact" className="font-semibold text-primary hover:underline">contact page</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThankYou() {
  return (
    <section className="bg-surface py-20">
      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/about/about_image_floweral.png"
          alt=""
          aria-hidden
          className="mx-auto mb-6 h-12 w-auto object-contain opacity-80"
        />
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Thank you</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Let&apos;s get smart together
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg">
          Thank you for choosing {SITE.name} as your trusted source for all things smart tech.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/product-comparisons"
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-emphasis"
          >
            Browse comparisons
          </Link>
          <Link
            href="/product-reviews"
            className="inline-flex items-center rounded-full border border-primary/20 bg-white px-6 py-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          >
            Read reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
