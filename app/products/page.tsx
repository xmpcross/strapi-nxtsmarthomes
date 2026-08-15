import Link from 'next/link';
import type { Metadata } from 'next';
import { listProductCategories, listProducts, productCategoryPath } from '@/lib/commerce';
import ProductBox from '@/components/ProductBox';
import SectionHeader from '@/components/SectionHeader';
import { SITE } from '@/lib/site';
import { breadcrumbJsonLd, jsonLd } from '@/lib/seo';

export const revalidate = 300;

const DESCRIPTION =
  'Smart home devices we track — plugs, bulbs, cameras, locks, doorbells, speakers and TVs, with current prices from the merchants selling them.';

export const metadata: Metadata = {
  title: 'Smart Home Products',
  description: DESCRIPTION,
  alternates: { canonical: '/products' },
};

export default async function ProductsIndexPage() {
  // Both fail soft: the catalogue is a separate CMS collection from the
  // editorial content, and an empty products page is better than a 500 on a
  // site whose main job is articles.
  const [categories, featured] = await Promise.all([
    listProductCategories().catch(() => []),
    listProducts({ pageSize: 12 }).catch(() => ({ products: [], total: 0, pageCount: 0 })),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {jsonLd(
        breadcrumbJsonLd([
          { name: 'Home', url: SITE.url },
          { name: 'Products', url: `${SITE.url}/products` },
        ]),
      )}

      <SectionHeader
        eyebrow="Catalogue"
        title="Smart Home Products"
        subtitle={DESCRIPTION}
      />

      {categories.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Product categories">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={productCategoryPath(c.slug)}
              className="rounded-full border border-ink/10 bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/30 hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {featured.products.length > 0 ? (
        <>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.products.map((p) => (
              <ProductBox key={p.slug} product={p} variant="tile" />
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-muted">
            Showing {featured.products.length} of {featured.total} products.
          </p>
        </>
      ) : (
        <p className="mt-10 text-sm text-ink-muted">No products are available right now.</p>
      )}
    </div>
  );
}
