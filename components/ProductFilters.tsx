import Link from 'next/link';
import type { CommerceCategory } from '@/lib/commerce';
import { productCategoryPath } from '@/lib/commerce';

/**
 * Left-hand filter rail for the product listings.
 *
 * Deliberately a server component driven entirely by the query string: every
 * control is a <Link>, so filtering works with JavaScript disabled, each filtered
 * view has its own shareable URL, and the browser Back button steps through
 * filter changes the way a reader expects. A client-side filter would also have
 * to re-implement pagination, since the grid is paginated server-side.
 *
 * Selecting a filter always resets to page 1 — carrying `page` across a filter
 * change lands the reader on an empty page whenever the narrower result set has
 * fewer pages than the one they were on.
 */

export type BrandFacet = { name: string; count: number };

function buildHref(
  basePath: string,
  { brands, sort }: { brands: string[]; sort?: string },
): string {
  const params = new URLSearchParams();
  for (const b of brands) params.append('brand', b);
  if (sort && sort !== 'popular') params.set('sort', sort);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const SORTS: { value: string; label: string }[] = [
  { value: 'popular', label: 'Most reviewed' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'newest', label: 'Recently updated' },
];

export default function ProductFilters({
  basePath,
  categories,
  activeCategory,
  brands,
  activeBrands,
  activeSort,
  total,
}: {
  basePath: string;
  categories: CommerceCategory[];
  activeCategory?: string;
  brands: BrandFacet[];
  activeBrands: string[];
  activeSort: string;
  total: number;
}) {
  const selected = new Set(activeBrands.map((b) => b.toLowerCase()));
  const hasFilters = selected.size > 0 || activeSort !== 'popular';

  return (
    <aside
      className="lg:w-64 lg:shrink-0"
      aria-label="Product filters"
      data-testid="product-filters"
    >
      <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">Filters</h2>
          {hasFilters && (
            <Link
              href={basePath}
              className="text-xs font-semibold text-primary hover:underline"
              data-testid="filters-clear"
            >
              Clear all
            </Link>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-faint">
          {total} {total === 1 ? 'product' : 'products'}
        </p>

        {categories.length > 0 && (
          <section className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Category
            </h3>
            <ul className="mt-2 space-y-0.5">
              <li>
                <Link
                  href="/products"
                  aria-current={!activeCategory ? 'page' : undefined}
                  className={`block rounded-lg px-2 py-1.5 text-sm transition ${
                    !activeCategory
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'text-ink-muted hover:bg-muted hover:text-ink'
                  }`}
                >
                  All products
                </Link>
              </li>
              {categories.map((c) => {
                const active = c.slug === activeCategory;
                return (
                  <li key={c.slug}>
                    <Link
                      href={productCategoryPath(c.slug)}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-lg px-2 py-1.5 text-sm transition ${
                        active
                          ? 'bg-primary-soft font-semibold text-primary'
                          : 'text-ink-muted hover:bg-muted hover:text-ink'
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {brands.length > 1 && (
          <section className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Brand</h3>
            <ul className="mt-2 space-y-0.5">
              {brands.map((b) => {
                const key = b.name.toLowerCase();
                const on = selected.has(key);
                // Each link toggles its own brand and leaves the rest intact,
                // so the rail behaves like a checkbox group without any JS.
                const next = on
                  ? activeBrands.filter((x) => x.toLowerCase() !== key)
                  : [...activeBrands, b.name];
                return (
                  <li key={b.name}>
                    <Link
                      href={buildHref(basePath, { brands: next, sort: activeSort })}
                      aria-pressed={on}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                        on ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-muted hover:text-ink'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold leading-none ${
                          on
                            ? 'border-primary bg-primary text-white'
                            : 'border-ink/20 bg-surface text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span className={`flex-1 truncate ${on ? 'font-semibold' : ''}`}>{b.name}</span>
                      <span className="text-xs text-ink-faint">{b.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Sort by</h3>
          <ul className="mt-2 space-y-0.5">
            {SORTS.map((s) => {
              const on = s.value === activeSort;
              return (
                <li key={s.value}>
                  <Link
                    href={buildHref(basePath, { brands: activeBrands, sort: s.value })}
                    aria-current={on ? 'true' : undefined}
                    className={`block rounded-lg px-2 py-1.5 text-sm transition ${
                      on
                        ? 'bg-primary-soft font-semibold text-primary'
                        : 'text-ink-muted hover:bg-muted hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );
}
