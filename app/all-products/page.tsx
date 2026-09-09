import Link from 'next/link';
import type { Metadata } from 'next';
import {
  listCategoryBrands,
  listProductCategories,
  listProducts,
  PRODUCT_SORTS,
  type ProductSort,
} from '@/lib/commerce';
import ProductBox from '@/components/ProductBox';
import ProductFilters from '@/components/ProductFilters';
import SectionHeader from '@/components/SectionHeader';
import { breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const revalidate = 300;

const PAGE_SIZE = 24;
const BASE_PATH = '/all-products';

const DESCRIPTION =
  'Smart home devices we track — plugs, bulbs, cameras, locks, doorbells, speakers and TVs, with current prices from the merchants selling them.';

type SearchParams = { page?: string; brand?: string | string[]; sort?: string };

/** `?brand=` repeats for multiple selections; Next hands that back as an array. */
function toBrands(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((b) => b.trim()).filter(Boolean);
}

function toSort(raw: string | undefined): ProductSort {
  return raw && raw in PRODUCT_SORTS ? (raw as ProductSort) : 'popular';
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { page: pageRaw, brand: brandRaw, sort: sortRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const filtered = toBrands(brandRaw).length > 0 || toSort(sortRaw) !== 'popular';
  return {
    title: `Smart Home Products${page > 1 ? ` — Page ${page}` : ''}`,
    description: DESCRIPTION,
    alternates: { canonical: `${BASE_PATH}${page > 1 ? `?page=${page}` : ''}` },
    // Brand and sort combinations multiply into near-duplicate URLs over the
    // same products, so a filtered view canonicalises back here and stays out
    // of the index — matching the category pages.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductsIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageRaw, brand: brandRaw, sort: sortRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const brands = toBrands(brandRaw);
  const sort = toSort(sortRaw);

  // All three fail soft: the catalogue is a separate CMS collection from the
  // editorial content, and an empty products page is better than a 500 on a
  // site whose main job is articles.
  const [categories, listing, brandFacets] = await Promise.all([
    listProductCategories().catch(() => []),
    listProducts({ page, pageSize: PAGE_SIZE, brands, sort }).catch(() => ({
      products: [],
      total: 0,
      pageCount: 0,
    })),
    listCategoryBrands().catch(() => []),
  ]);
  const { products, total, pageCount } = listing;

  // Filters live in the query string, so pagination has to carry them or
  // page 2 silently drops back to the unfiltered set.
  const pageHref = (n: number) => {
    const qs = new URLSearchParams();
    for (const b of brands) qs.append('brand', b);
    if (sort !== 'popular') qs.set('sort', sort);
    if (n > 1) qs.set('page', String(n));
    const s = qs.toString();
    return s ? `${BASE_PATH}?${s}` : BASE_PATH;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbJsonLd([
              { name: 'Home', url: '/' },
              { name: 'Products', url: BASE_PATH },
            ]),
          ),
        }}
      />

      <SectionHeader eyebrow="Catalogue" title="Smart Home Products" subtitle={DESCRIPTION} />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-10">
        <ProductFilters
          basePath={BASE_PATH}
          categories={categories}
          brands={brandFacets}
          activeBrands={brands}
          activeSort={sort}
          total={total}
        />

        <div className="min-w-0 flex-1">
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {products.map((p) => (
                  <ProductBox key={p.slug} product={p} variant="tile" />
                ))}
              </div>

              <p className="mt-6 text-sm text-ink-muted">
                {total} {total === 1 ? 'product' : 'products'}
                {brands.length ? ` from ${brands.join(', ')}` : ''}
                {pageCount > 1 ? ` — page ${page} of ${pageCount}` : ''}.
              </p>

              {pageCount > 1 && (
                <nav className="mt-6 flex items-center gap-3" aria-label="Pagination">
                  {page > 1 && (
                    <Link
                      href={pageHref(page - 1)}
                      className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
                    >
                      Previous
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link
                      href={pageHref(page + 1)}
                      className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          ) : brands.length ? (
            // An over-narrow filter is a dead end without a way back out.
            <div className="rounded-2xl border border-ink/10 bg-surface p-8 text-center">
              <p className="text-sm text-ink-muted">No products from {brands.join(', ')}.</p>
              <Link
                href={BASE_PATH}
                className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No products are available right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
