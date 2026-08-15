import qs from 'qs';

/**
 * Strapi Commerce reader for nxtsmart.homes.
 *
 * Deliberately self-contained rather than an addition to lib/strapi.ts: that
 * module speaks the `nxtsmart-*` editorial types, this one speaks the
 * `commerce-*` catalogue types, and the two have different scoping rules.
 *
 * SCOPING IS THE WHOLE PROBLEM HERE. The commerce-* types are a shared pool —
 * 766 products at the time of writing — serving bestlooking.skin (skincare),
 * nxt.bargains (electronics) and nxtsmarthome.com.au (AU smart home). An
 * unfiltered query returns face serums and AU-priced robot vacuums alongside
 * the smart plugs we actually want.
 *
 * There is a `site` relation on commerce-product for exactly this. A
 * commerce-site row for this domain now exists — id 6, `nxtsmart.homes`,
 * US/USD, carrying these same slugs in `enabledCategories` — but **no products
 * are related to it yet**, so it cannot do any filtering. Ownership is a
 * genuine decision rather than a config step: the 58 products in these
 * categories are unscoped records sourced for nxt.bargains, and `site` is
 * manyToOne, so relating them here takes them from that catalogue rather than
 * sharing them.
 *
 * Until that is settled, CATEGORY_SLUGS below is the operative scope and every
 * exported query in this file MUST constrain by it. A query without it is a
 * cross-property content leak, the same class of bug as the editorial one that
 * put nxtsmarthome.com.au articles on this domain.
 *
 * When products are related, this collapses into a single site filter and
 * `enabledCategories` on the site row becomes the source of truth.
 */

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * The catalogue this site is allowed to show: US-market smart home.
 *
 * Excluded on purpose:
 *   - facial-*, anti-aging, moisturisers, toners-*, exfoliators-*  → bestlooking.skin
 *   - the "… AU" categories (energy-solar, hubs-platforms, climate-comfort,
 *     robot-vacuums, security-cameras, lighting, entertainment-audio)
 *     → nxtsmarthome.com.au, priced in AUD
 *   - smart-phones, laptops, tablets, smartwatches, headphones, raspberry-pi
 *     → nxt.bargains general electronics, not smart home
 */
export const CATEGORY_SLUGS = [
  'smart-light-bulbs',
  'smart-plugs',
  'smart-cameras',
  'smart-door-locks',
  'video-doorbells',
  'smart-speakers',
] as const;

/*
 * `smart-tvs` was in this list and was removed deliberately. It held 82 of the
 * 140 products — 59% of the catalogue — while yielding 3 of 34 article ideas,
 * and because listings sort by rating count it dominated /products, which read
 * as a TV shop rather than a smart home section.
 *
 * The deciding evidence was the data itself. TV records carry display
 * specifications (V-chip, HDMI Ports, Resolution, Anti-glare, Screen Form) and
 * exactly one smart-home attribute between them, so nothing written from that
 * data is smart-home content. Median offer price was $2,300 against $25-$220
 * for every other category here, and 2 of 140 published posts touch TVs at all.
 *
 * Re-add the slug if entertainment becomes a deliberate content push — the
 * products are still in Strapi and nothing else needs changing.
 */

export type CommerceMerchant = {
  id: number;
  name: string;
  slug?: string;
  websiteUrl?: string | null;
};

export type CommerceOffer = {
  id: number;
  title?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  currency?: string | null;
  discountPercent?: number | null;
  productUrl?: string | null;
  affiliateUrl?: string | null;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown' | null;
  condition?: 'new' | 'used' | 'refurbished' | 'open_box' | 'unknown' | null;
  status?: 'active' | 'expired' | 'stale' | 'error' | null;
  lastCheckedAt?: string | null;
  merchant?: CommerceMerchant | null;
};

export type CommerceCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
};

export type CommerceProduct = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  brand?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  specs?: Record<string, string> | null;
  rating?: number | null;
  ratingCount?: number | null;
  reviewSummary?: string | null;
  productStatus?: string | null;
  imageUrl?: string | null;
  primaryImage?: { url: string; alternativeText?: string } | null;
  categories?: CommerceCategory[];
  offers?: CommerceOffer[];
  updatedAt?: string;
};

type ListResponse<T> = {
  data: T[];
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
};

async function commerceFetch<T>(path: string, params?: Record<string, unknown>, revalidate = 300): Promise<T> {
  const query = params ? '?' + qs.stringify(params, { encodeValuesOnly: true }) : '';
  const url = `${BASE}/api/${path}${query}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Strapi ${res.status} on ${url}: ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

/** Products are only ever fetched with the fields the UI actually renders. */
const PRODUCT_POPULATE = {
  categories: { fields: ['name', 'slug'] },
  primaryImage: { fields: ['url', 'alternativeText'] },
  offers: {
    fields: [
      'price',
      'originalPrice',
      'currency',
      'discountPercent',
      'productUrl',
      'affiliateUrl',
      'availability',
      'condition',
      'status',
      'lastCheckedAt',
    ],
    populate: { merchant: { fields: ['name', 'slug', 'websiteUrl'] } },
  },
} as const;

/** The scope filter. Never build a product query without it — see the file header. */
function scopeFilter(extra: Record<string, unknown> = {}) {
  return {
    productStatus: { $eq: 'active' },
    categories: { slug: { $in: [...CATEGORY_SLUGS] } },
    ...extra,
  };
}

export function productPath(slug: string): string {
  return `/products/${slug}`;
}

export function productCategoryPath(slug: string): string {
  return `/products/category/${slug}`;
}

/**
 * Prefers the Strapi media file over the external `imageUrl`.
 *
 * `imageUrl` on catalogue rows sourced from Google Shopping points at
 * encrypted-tbn*.gstatic.com thumbnails, which are small, hotlinked and not in
 * next.config's remotePatterns. primaryImage is a real upload on our own CMS.
 */
export function productImage(p: CommerceProduct): string | null {
  const media = p.primaryImage?.url;
  if (media) return media.startsWith('http') ? media : `${BASE}${media}`;
  return p.imageUrl || null;
}

/**
 * The offer a buy button should point at: cheapest active, in-stock, new.
 *
 * Condition matters. The catalogue carries resale listings (Poshmark, Mercari,
 * eBay) whose prices undercut retail, so ranking on price alone would send a
 * reader after a used unit from a marketplace when the article is reviewing a
 * new one. Used offers are kept — they are shown on the product page — but they
 * never become the headline price.
 */
export function bestOffer(p: CommerceProduct): CommerceOffer | null {
  const usable = (p.offers ?? []).filter(
    (o) =>
      o.status === 'active' &&
      o.availability !== 'out_of_stock' &&
      typeof o.price === 'number' &&
      (o.affiliateUrl || o.productUrl),
  );
  if (!usable.length) return null;
  const isNew = (o: CommerceOffer) => o.condition === 'new' || o.condition == null || o.condition === 'unknown';
  const pool = usable.filter(isNew).length ? usable.filter(isNew) : usable;
  return pool.sort((a, b) => (a.price as number) - (b.price as number))[0];
}

export function offerUrl(o: CommerceOffer): string | null {
  return o.affiliateUrl || o.productUrl || null;
}

export function formatPrice(price?: number | null, currency?: string | null): string | null {
  if (typeof price !== 'number') return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency || 'USD'} ${price.toFixed(2)}`;
  }
}

/** The product categories this site shows, in the order CATEGORY_SLUGS lists them. */
export async function listProductCategories(): Promise<CommerceCategory[]> {
  const res = await commerceFetch<ListResponse<CommerceCategory>>('commerce-categories', {
    filters: { slug: { $in: [...CATEGORY_SLUGS] } },
    fields: ['name', 'slug', 'description', 'icon'],
    pagination: { pageSize: CATEGORY_SLUGS.length },
  });
  const order = new Map(CATEGORY_SLUGS.map((s, i) => [s, i]));
  return (res.data ?? []).sort(
    (a, b) => (order.get(a.slug as never) ?? 99) - (order.get(b.slug as never) ?? 99),
  );
}

export async function getProductCategory(slug: string): Promise<CommerceCategory | null> {
  if (!(CATEGORY_SLUGS as readonly string[]).includes(slug)) return null;
  const res = await commerceFetch<ListResponse<CommerceCategory>>('commerce-categories', {
    filters: { slug: { $eq: slug } },
    fields: ['name', 'slug', 'description', 'icon'],
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

export async function listProducts(
  opts: { category?: string; page?: number; pageSize?: number } = {},
): Promise<{ products: CommerceProduct[]; total: number; pageCount: number }> {
  // An unknown category must return nothing rather than falling back to the
  // whole catalogue, which would silently ignore the scope.
  if (opts.category && !(CATEGORY_SLUGS as readonly string[]).includes(opts.category)) {
    return { products: [], total: 0, pageCount: 0 };
  }
  const filters = opts.category
    ? scopeFilter({ categories: { slug: { $eq: opts.category } } })
    : scopeFilter();

  const res = await commerceFetch<ListResponse<CommerceProduct>>('commerce-products', {
    status: 'published',
    filters,
    populate: PRODUCT_POPULATE,
    sort: ['ratingCount:desc', 'name:asc'],
    pagination: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 24 },
  });
  return {
    products: res.data ?? [],
    total: res.meta?.pagination?.total ?? 0,
    pageCount: res.meta?.pagination?.pageCount ?? 0,
  };
}

export async function getProduct(slug: string): Promise<CommerceProduct | null> {
  const res = await commerceFetch<ListResponse<CommerceProduct>>('commerce-products', {
    status: 'published',
    filters: scopeFilter({ slug: { $eq: slug } }),
    populate: PRODUCT_POPULATE,
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

/**
 * Batched lookup for the inline `::product:slug::` markers in an article.
 *
 * One request for every marker on the page rather than one per marker — an
 * article with six product boxes would otherwise make six round trips to a CMS
 * that is already a per-request dependency.
 */
export async function getProductsBySlugs(slugs: string[]): Promise<CommerceProduct[]> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (!unique.length) return [];
  const res = await commerceFetch<ListResponse<CommerceProduct>>('commerce-products', {
    status: 'published',
    filters: scopeFilter({ slug: { $in: unique } }),
    populate: PRODUCT_POPULATE,
    pagination: { pageSize: unique.length },
  });
  return res.data ?? [];
}

/** Slugs for generateStaticParams / sitemap. Scope-filtered like everything else. */
export async function listAllProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const out: { slug: string; updatedAt: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await commerceFetch<ListResponse<CommerceProduct>>('commerce-products', {
      status: 'published',
      filters: scopeFilter(),
      fields: ['slug', 'updatedAt'],
      pagination: { page, pageSize: 100 },
    });
    out.push(...(res.data ?? []).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt ?? '' })));
    if (page >= (res.meta?.pagination?.pageCount ?? 1)) break;
  }
  return out;
}
