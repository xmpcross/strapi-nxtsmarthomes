import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  bestOffer,
  formatPrice,
  getProduct,
  offerUrl,
  productCategoryPath,
  productImage,
  type CommerceOffer,
} from '@/lib/commerce';
import SectionHeader from '@/components/SectionHeader';
import { SITE } from '@/lib/site';
import { absoluteUrl, breadcrumbJsonLd, jsonLd, trimDescription } from '@/lib/seo';

export const revalidate = 300;

type Params = { slug: string };

const CONDITION_LABEL: Record<string, string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
  open_box: 'Open box',
  unknown: '',
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: 'Not found' };
  const description = trimDescription(
    product.shortDescription || product.description || `${product.name} — specifications, prices and where to buy.`,
  );
  const img = productImage(product);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      url: absoluteUrl(`/products/${product.slug}`),
      ...(img ? { images: [{ url: img, alt: product.name }] } : {}),
    },
  };
}

function OfferRow({ offer }: { offer: CommerceOffer }) {
  const url = offerUrl(offer);
  const price = formatPrice(offer.price, offer.currency);
  const condition = CONDITION_LABEL[offer.condition ?? 'unknown'] || '';
  const outOfStock = offer.availability === 'out_of_stock';

  return (
    <tr className="border-t border-ink/8">
      <td className="py-3 pr-4">
        <span className="font-semibold text-ink">{offer.merchant?.name ?? 'Merchant'}</span>
        {condition && condition !== 'New' && (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            {condition}
          </span>
        )}
        {outOfStock && (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            Out of stock
          </span>
        )}
      </td>
      <td className="py-3 pr-4 font-display font-bold text-ink">{price ?? '—'}</td>
      <td className="py-3 text-right">
        {url && !outOfStock ? (
          <a
            href={url}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-emphasis"
          >
            Check price
          </a>
        ) : (
          <span className="text-sm text-ink-faint">Unavailable</span>
        )}
      </td>
    </tr>
  );
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  const img = productImage(product);
  const headline = bestOffer(product);
  const headlinePrice = formatPrice(headline?.price, headline?.currency);
  const headlineUrl = headline ? offerUrl(headline) : null;
  const category = product.categories?.[0];

  // Sorted for the reader, not by whatever order Strapi returned: usable offers
  // cheapest-first, then anything out of stock or unpriced at the bottom.
  const offers = [...(product.offers ?? [])]
    .filter((o) => o.status === 'active')
    .sort((a, b) => {
      const aOut = a.availability === 'out_of_stock' || typeof a.price !== 'number';
      const bOut = b.availability === 'out_of_stock' || typeof b.price !== 'number';
      if (aOut !== bOut) return aOut ? 1 : -1;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });

  const specs = Object.entries(product.specs ?? {}).filter(
    // Pipeline bookkeeping, not specifications the reader wants.
    ([k]) => !['source', 'importedAt', 'sourceImageUrl'].includes(k),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {jsonLd(
        breadcrumbJsonLd([
          { name: 'Home', url: SITE.url },
          { name: 'Products', url: `${SITE.url}/products` },
          ...(category
            ? [{ name: category.name, url: `${SITE.url}${productCategoryPath(category.slug)}` }]
            : []),
          { name: product.name, url: `${SITE.url}/products/${product.slug}` },
        ]),
      )}
      {jsonLd({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
        ...(img ? { image: img } : {}),
        ...(product.shortDescription || product.description
          ? { description: trimDescription(product.shortDescription || product.description || '', 300) }
          : {}),
        // Only emitted when the catalogue actually carries a rating and a count.
        // A fabricated aggregateRating is both a lie to the reader and a
        // structured-data penalty waiting to happen.
        ...(typeof product.rating === 'number' && product.rating > 0 && (product.ratingCount ?? 0) > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                ratingCount: product.ratingCount,
              },
            }
          : {}),
        ...(headline && typeof headline.price === 'number'
          ? {
              offers: {
                '@type': 'Offer',
                price: headline.price,
                priceCurrency: headline.currency || 'USD',
                availability:
                  headline.availability === 'out_of_stock'
                    ? 'https://schema.org/OutOfStock'
                    : 'https://schema.org/InStock',
                ...(headlineUrl ? { url: headlineUrl } : {}),
                ...(headline.merchant?.name
                  ? { seller: { '@type': 'Organization', name: headline.merchant.name } }
                  : {}),
              },
            }
          : {}),
      })}

      <nav className="mb-4 text-sm text-ink-muted" aria-label="Breadcrumb">
        <Link href="/products" className="font-semibold text-primary hover:underline">
          Products
        </Link>
        {category && (
          <>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href={productCategoryPath(category.slug)} className="font-semibold text-primary hover:underline">
              {category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex items-center justify-center rounded-2xl border border-ink/8 bg-surface p-6 shadow-card">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={product.name} className="max-h-[420px] w-auto max-w-full object-contain" />
          ) : (
            <div className="h-72 w-full rounded-xl bg-gradient-to-br from-primary-soft to-primary/20" />
          )}
        </div>

        <div>
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{product.brand}</p>
          )}
          <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            {product.name}
          </h1>

          {typeof product.rating === 'number' && product.rating > 0 && (
            <p className="mt-3 text-sm text-ink-muted">
              <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
              <span aria-hidden="true" className="text-amber-500"> ★</span>
              {(product.ratingCount ?? 0) > 0
                ? <> from {product.ratingCount!.toLocaleString('en-US')} shopper ratings</>
                : <> shopper rating</>}
            </p>
          )}

          {(product.shortDescription || product.description) && (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              {product.shortDescription || product.description}
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-ink/8 bg-surface p-5 shadow-card">
            {headlinePrice ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Best price we can see
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold text-ink">{headlinePrice}</p>
                {headline?.merchant?.name && (
                  <p className="mt-1 text-sm text-ink-muted">at {headline.merchant.name}</p>
                )}
                {headlineUrl && (
                  <a
                    href={headlineUrl}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="mt-4 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-primary-emphasis"
                  >
                    Check price at {headline?.merchant?.name ?? 'merchant'}
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-muted">No current offers for this product.</p>
            )}
            <p className="mt-3 text-[11px] text-ink-faint">
              Prices and availability come from the merchants and change often. We may earn a commission
              from these links, at no extra cost to you.
            </p>
          </div>
        </div>
      </div>

      {product.reviewSummary && (
        <section className="mt-12">
          <SectionHeader eyebrow="Reviews" title="What shoppers say" />
          <div className="mt-4 rounded-2xl border border-ink/8 bg-surface p-5 shadow-card">
            <p className="text-sm leading-relaxed text-ink-muted">{product.reviewSummary}</p>
            <p className="mt-3 text-[11px] text-ink-faint">
              Summarised automatically from published merchant reviews. It is not a review by NXTSmart.Homes
              and no one here has tested this product.
            </p>
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <section className="mt-12">
          <SectionHeader eyebrow="Where to buy" title={`${offers.length} ${offers.length === 1 ? 'offer' : 'offers'}`} />
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/8 bg-surface shadow-card">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-semibold">Merchant</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="[&>tr>td:first-child]:pl-5 [&>tr>td:last-child]:pr-5">
                {offers.map((o) => (
                  <OfferRow key={o.id} offer={o} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {specs.length > 0 && (
        <section className="mt-12">
          <SectionHeader eyebrow="Details" title="Specifications" />
          <div className="mt-4 overflow-hidden rounded-2xl border border-ink/8 bg-surface shadow-card">
            <dl className="divide-y divide-ink/8">
              {specs.map(([key, value]) => (
                <div key={key} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-semibold text-ink">{key.replace(/<wbr>/g, '')}</dt>
                  <dd className="text-sm text-ink-muted sm:col-span-2">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}
