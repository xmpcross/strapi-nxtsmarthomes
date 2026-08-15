import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CATEGORY_SLUGS,
  getProductCategory,
  listProducts,
  productCategoryPath,
} from '@/lib/commerce';
import ProductBox from '@/components/ProductBox';
import SectionHeader from '@/components/SectionHeader';
import { SITE } from '@/lib/site';
import { breadcrumbJsonLd, jsonLd, trimDescription } from '@/lib/seo';

export const revalidate = 300;
// The catalogue is a fixed, small allowlist, so every valid category is known at
// build time. Anything else is a 404 rather than an on-demand render.
export const dynamicParams = false;

const PAGE_SIZE = 24;

type Params = { slug: string };
type SearchParams = { page?: string };

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
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
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const suffix = page > 1 ? ` — Page ${page}` : '';
  return {
    title: `${category.name}${suffix}`,
    description: trimDescription(
      category.description || `${category.name} for the smart home, with current prices from the merchants selling them.`,
    ),
    alternates: {
      canonical: `${productCategoryPath(slug)}${page > 1 ? `?page=${page}` : ''}`,
    },
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
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const category = await getProductCategory(slug).catch(() => null);
  if (!category) notFound();

  const { products, total, pageCount } = await listProducts({
    category: slug,
    page,
    pageSize: PAGE_SIZE,
  }).catch(() => ({ products: [], total: 0, pageCount: 0 }));

  // A page number past the end is a 404, not an empty grid — otherwise
  // ?page=999 is an infinite supply of thin, indexable pages.
  if (page > 1 && !products.length) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {jsonLd(
        breadcrumbJsonLd([
          { name: 'Home', url: SITE.url },
          { name: 'Products', url: `${SITE.url}/products` },
          { name: category.name, url: `${SITE.url}${productCategoryPath(slug)}` },
        ]),
      )}

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

      {products.length > 0 ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {products.map((p) => (
              <ProductBox key={p.slug} product={p} variant="tile" />
            ))}
          </div>

          <p className="mt-6 text-sm text-ink-muted">
            {total} {total === 1 ? 'product' : 'products'} in {category.name}
            {pageCount > 1 ? ` — page ${page} of ${pageCount}` : ''}.
          </p>

          {pageCount > 1 && (
            <nav className="mt-6 flex items-center gap-3" aria-label="Pagination">
              {page > 1 && (
                <Link
                  href={`${productCategoryPath(slug)}${page - 1 > 1 ? `?page=${page - 1}` : ''}`}
                  className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
                >
                  Previous
                </Link>
              )}
              {page < pageCount && (
                <Link
                  href={`${productCategoryPath(slug)}?page=${page + 1}`}
                  className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <p className="mt-8 text-sm text-ink-muted">No products in this category right now.</p>
      )}
    </div>
  );
}
