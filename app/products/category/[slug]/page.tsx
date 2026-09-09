import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getScopeSlugs,
  getProductCategory,
  listCategoryBrands,
  listProductCategories,
  listProducts,
  productCategoryPath,
  PRODUCT_SORTS,
  type ProductSort,
} from '@/lib/commerce';
import ProductBox from '@/components/ProductBox';
import ProductFilters from '@/components/ProductFilters';
import SectionHeader from '@/components/SectionHeader';
import { breadcrumbJsonLd, jsonLd, trimDescription } from '@/lib/seo';

export const revalidate = 300;
// Categories come from the CMS now, so one added in Strapi after a build must
// render on demand rather than 404 until the next deploy.
export const dynamicParams = true;

const PAGE_SIZE = 24;

type Params = { slug: string };
type SearchParams = { page?: string; brand?: string | string[]; sort?: string };

/** `?brand=` repeats for multiple selections; Next hands that back as an array. */
function toBrands(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((b) => b.trim()).filter(Boolean);
}

function toSort(raw: string | undefined): ProductSort {
  return raw && raw in PRODUCT_SORTS ? (raw as ProductSort) : 'popular';
}

export async function generateStaticParams() {
  return (await getScopeSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getProductCategory(slug).catch(() => null);
  if (!category) return { title: 'Not found' };
  const { page: pageRaw, brand: brandRaw, sort: sortRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const filtered = toBrands(brandRaw).length > 0 || toSort(sortRaw) !== 'popular';
  const suffix = page > 1 ? ` — Page ${page}` : '';
  return {
    title: `${category.name}${suffix}`,
    description: trimDescription(
      category.description || `${category.name} for the smart home, with current prices from the merchants selling them.`,
    ),
    alternates: {
      // A filtered view canonicalises to the unfiltered page: brand and sort
      // combinations multiply into near-duplicate URLs over the same products.
      canonical: `${productCategoryPath(slug)}${page > 1 ? `?page=${page}` : ''}`,
    },
    // ...and is kept out of the index outright, the same reasoning that makes
    // ?page past the end a 404 rather than an empty grid.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { page: pageRaw, brand: brandRaw, sort: sortRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const brands = toBrands(brandRaw);
  const sort = toSort(sortRaw);

  const category = await getProductCategory(slug).catch(() => null);
  if (!category) notFound();

  const [{ products, total, pageCount }, brandFacets, allCategories] = await Promise.all([
    listProducts({ category: slug, page, pageSize: PAGE_SIZE, brands, sort }).catch(() => ({
      products: [],
      total: 0,
      pageCount: 0,
    })),
    listCategoryBrands(slug).catch(() => []),
    listProductCategories().catch(() => []),
  ]);

  const basePath = productCategoryPath(slug);
  // Filters live in the query string, so pagination has to carry them or
  // page 2 silently drops back to the unfiltered set.
  const pageHref = (n: number) => {
    const qs = new URLSearchParams();
    for (const b of brands) qs.append('brand', b);
    if (sort !== 'popular') qs.set('sort', sort);
    if (n > 1) qs.set('page', String(n));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // A page number past the end is a 404, not an empty grid — otherwise
  // ?page=999 is an infinite supply of thin, indexable pages.
  if (page > 1 && !products.length) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbJsonLd([
              { name: 'Home', url: '/' },
              { name: 'Products', url: '/products' },
              { name: category.name, url: productCategoryPath(slug) },
            ]),
          ),
        }}
      />

      <nav className="mb-4 text-sm text-ink-muted" aria-label="Breadcrumb">
        <Link href="/products" className="font-semibold text-primary hover:underline">
          Products
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{category.name}</span>
      </nav>

      <SectionHeader
        eyebrow="Category"
        title={category.name}
        subtitle={category.description || undefined}
      />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-10">
        <ProductFilters
          basePath={basePath}
          categories={allCategories}
          activeCategory={slug}
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
                {total} {total === 1 ? 'product' : 'products'} in {category.name}
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
              <p className="text-sm text-ink-muted">
                No {category.name.toLowerCase()} from {brands.join(', ')}.
              </p>
              <Link
                href={basePath}
                className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No products in this category right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
