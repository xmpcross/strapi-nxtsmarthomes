'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE, SECTIONS } from '@/lib/site';
import MobileNav from '@/components/MobileNav';
import Logo from '@/components/Logo';

// Same grouping as the footer's Editorial / Smart Home columns.
const EDITORIAL = SECTIONS.filter((s) =>
  ['product-comparisons', 'product-reviews', 'how-to-guides', 'top-rated', 'informative-articles'].includes(s.slug),
);
const SMART_HOME = SECTIONS.filter((s) => s.slug.startsWith('smart-home-'));

/** Menu entries only need a slug and a label, so product categories fit too. */
type NavItem = { slug: string; title: string; href?: string };

function NavDropdown({
  label,
  group,
  sections,
  linkTone,
  hrefBase = '/',
}: {
  label: string;
  group: string;
  sections: NavItem[];
  linkTone: string;
  /** Product categories live under /products/category/, editorial ones at the root. */
  hrefBase?: string;
}) {
  return (
    <li className="group/nav relative" data-testid={`nav-item-${group}`}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 transition-colors ${linkTone}`}
        data-testid={`nav-${group}`}
        aria-haspopup="true"
      >
        {label}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3 opacity-60"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className="invisible absolute right-0 top-full z-10 grid w-64 gap-1 rounded-2xl border border-ink/10 bg-white p-2 pt-3 opacity-0 shadow-card-hover transition duration-150 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100"
        role="menu"
        data-testid={`nav-${group}-dropdown`}
      >
        {sections.map((s) => (
          <Link
            key={s.slug}
            href={s.href ?? `${hrefBase}${s.slug}`}
            className="rounded-xl px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-muted hover:text-primary"
            role="menuitem"
            data-testid={`nav-${group}-${s.slug}`}
          >
            {s.title}
          </Link>
        ))}
      </div>
    </li>
  );
}

export default function Header({
  productCategories = [],
}: {
  /**
   * Product categories for the Products menu, read from Strapi by the layout.
   * Empty renders no Products entry at all rather than an empty dropdown, so a
   * CMS outage costs a menu item instead of showing a broken one.
   */
  productCategories?: NavItem[];
} = {}) {
  // Borderless at the top of the page; once the sticky header is pinned by
  // scrolling, elevate it with a shadow instead.
  //
  // The homepage used to be an exception: the header was positioned absolutely so
  // it floated over a dark full-bleed hero image. That no longer applies — the
  // homepage now opens on the pale gradient hero from /home-draft-2, where an
  // absolute header takes itself out of the flow (removing the gap above the hero)
  // and renders white nav text on a near-white background. It now sits in the flow
  // and takes the same treatment as every other page, /home-draft-2 included.
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // /home-draft uses a solid white bar over its light hero.
  const solidWhite = pathname === '/home-draft';
  const transparent = false;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkTone = transparent
    ? 'text-white/90 hover:bg-white/15 hover:text-white'
    : 'text-ink-muted hover:bg-primary-soft hover:text-primary';
  const headerShell = solidWhite
    ? `sticky top-0 bg-white ${scrolled ? 'shadow-card' : ''}`
    : `sticky top-0 bg-surface/90 backdrop-blur-md ${scrolled ? 'shadow-card' : ''}`;

  return (
    <header
      className={`z-50 border-0 transition-shadow duration-200 ${headerShell}`}
      data-testid="site-header"
    >
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-5 py-3.5 sm:px-6 sm:py-4">
        <Link href="/" className="block shrink-0" data-testid="logo-link" aria-label={`${SITE.name} home`}>
          <Logo tone={transparent ? 'light' : 'dark'} />
        </Link>

        <form
          action="/search"
          method="get"
          role="search"
          className={`hidden lg:flex h-10 w-full max-w-xs items-center gap-2 rounded-xl border px-3.5 transition focus-within:bg-white focus-within:shadow-glow ${
            transparent
              ? 'border-white/25 bg-white/10 focus-within:border-white/40 [&:focus-within_input]:text-ink'
              : 'border-ink/10 bg-muted/60 focus-within:border-primary/40'
          }`}
          data-testid="header-search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 shrink-0 ${transparent ? 'text-white/70' : 'text-ink-faint'}`}
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <label htmlFor="header-search-input" className="sr-only">Search {SITE.name}</label>
          <input
            id="header-search-input"
            type="search"
            name="q"
            placeholder="Search…"
            className={`h-full w-full bg-transparent text-sm outline-none ${
              transparent ? 'text-white placeholder:text-white/60' : 'text-ink placeholder:text-ink-faint'
            }`}
            data-testid="header-search-input"
          />
        </form>

        <nav className="ml-auto hidden md:block" data-testid="primary-nav">
          <ul className="flex items-center gap-0.5 text-base font-semibold">
            <li>
              <Link
                href="/"
                className={`inline-flex items-center rounded-lg px-3 py-2 transition-colors ${linkTone}`}
                data-testid="nav-home"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className={`inline-flex items-center rounded-lg px-3 py-2 transition-colors ${linkTone}`}
                data-testid="nav-about"
              >
                About
              </Link>
            </li>
            {productCategories.length > 0 && (
              <NavDropdown
                label="Products"
                group="products"
                sections={[{ slug: 'all', title: 'All products', href: '/all-products' }, ...productCategories]}
                hrefBase="/products/category/"
                linkTone={linkTone}
              />
            )}
            <NavDropdown label="Editorial" group="editorial" sections={EDITORIAL} linkTone={linkTone} />
            <NavDropdown label="Smart Home" group="smart-home" sections={SMART_HOME} linkTone={linkTone} />
            <li>
              <Link
                href="/contact"
                className={`inline-flex items-center rounded-lg px-3 py-2 transition-colors ${linkTone}`}
                data-testid="nav-contact"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <MobileNav sections={SECTIONS} />
      </div>
    </header>
  );
}
