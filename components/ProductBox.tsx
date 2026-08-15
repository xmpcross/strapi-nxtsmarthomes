import Link from 'next/link';
import {
  bestOffer,
  formatPrice,
  offerUrl,
  productImage,
  productPath,
  type CommerceProduct,
} from '@/lib/commerce';

/**
 * The inline buy box an article drops next to the prose that discusses a
 * product. Also used as the grid tile on the product listing pages.
 *
 * Two things here are deliberate rather than stylistic:
 *
 * 1. The rating is labelled "shopper ratings", never presented bare. The
 *    numbers come from aggregated merchant reviews in the catalogue, not from
 *    anyone here using the device. An unqualified star rating inside an article
 *    reads as "we tested this", which would be a claim this site has not earned.
 *
 * 2. Outbound offer links carry rel="sponsored nofollow noopener". These are
 *    monetised links and search engines require them to be marked as such.
 */

type Props = {
  product: CommerceProduct;
  /** 'inline' sits inside article prose; 'tile' is a grid cell. */
  variant?: 'inline' | 'tile';
};

function Rating({ rating, count }: { rating: number; count?: number | null }) {
  return (
    <p className="mt-1 text-xs text-ink-muted">
      <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
      <span aria-hidden="true" className="text-amber-500"> ★</span>
      {typeof count === 'number' && count > 0 ? (
        <> from {count.toLocaleString('en-US')} shopper ratings</>
      ) : (
        <> shopper rating</>
      )}
    </p>
  );
}

export default function ProductBox({ product, variant = 'inline' }: Props) {
  const img = productImage(product);
  const offer = bestOffer(product);
  const href = productPath(product.slug);
  const price = formatPrice(offer?.price, offer?.currency);
  const url = offer ? offerUrl(offer) : null;
  const merchant = offer?.merchant?.name;
  const blurb = product.shortDescription || product.description || '';

  if (variant === 'tile') {
    return (
      <article
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/8 bg-surface shadow-card transition hover:border-primary/20 hover:shadow-card-hover"
        data-testid={`product-tile-${product.slug}`}
      >
        <Link href={href} className="block bg-muted p-4">
          <div className="flex h-40 items-center justify-center">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={product.name}
                className="max-h-40 w-auto max-w-full object-contain transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-primary-soft to-primary/20" />
            )}
          </div>
        </Link>
        <div className="flex flex-1 flex-col p-4">
          {product.brand && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{product.brand}</p>
          )}
          <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-snug text-ink transition group-hover:text-primary">
            <Link href={href}>{product.name}</Link>
          </h3>
          {typeof product.rating === 'number' && product.rating > 0 && (
            <Rating rating={product.rating} count={product.ratingCount} />
          )}
          <div className="mt-auto pt-3">
            {price ? (
              <p className="font-display text-lg font-bold text-ink">{price}</p>
            ) : (
              <p className="text-xs text-ink-faint">No current offer</p>
            )}
            <Link
              href={href}
              className="mt-2 block rounded-xl bg-primary px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-primary-emphasis"
            >
              View details
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <aside
      className="not-prose my-8 overflow-hidden rounded-2xl border border-ink/8 bg-surface shadow-card"
      data-testid={`product-box-${product.slug}`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-6">
        <Link
          href={href}
          className="flex h-40 w-full shrink-0 items-center justify-center rounded-xl bg-muted p-3 sm:h-36 sm:w-40"
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={product.name}
              className="max-h-full w-auto max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full rounded-lg bg-gradient-to-br from-primary-soft to-primary/20" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          {product.brand && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{product.brand}</p>
          )}
          <h3 className="mt-1 font-display text-base font-bold leading-snug text-ink sm:text-lg">
            <Link href={href} className="transition hover:text-primary">
              {product.name}
            </Link>
          </h3>
          {typeof product.rating === 'number' && product.rating > 0 && (
            <Rating rating={product.rating} count={product.ratingCount} />
          )}
          {blurb && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{blurb}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {price && <span className="font-display text-xl font-bold text-ink">{price}</span>}
            {url && merchant ? (
              <a
                href={url}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-emphasis"
              >
                Check price at {merchant}
              </a>
            ) : (
              <Link
                href={href}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-emphasis"
              >
                View details
              </Link>
            )}
            <Link href={href} className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              Full details
            </Link>
          </div>

          {price && (
            <p className="mt-2 text-[11px] text-ink-faint">
              Price and availability are pulled from the merchant and can change. We may earn a commission.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
