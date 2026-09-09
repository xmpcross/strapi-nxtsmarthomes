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

/** The domain whose commerce-site row owns this site's category list. */
const SITE_DOMAIN = 'nxtsmart.homes';

let scopeCache: { slugs: string[]; at: number } | null = null;

/**
 * Which product categories this site shows — read from Strapi.
 *
 * The commerce-site row for nxtsmart.homes carries them in `enabledCategories`,
 * so adding or removing a category is a CMS edit rather than a deploy. That row
 * is the control point; CATEGORY_SLUGS above is only the fallback.
 *
 * The fallback matters more than it looks. Product listings fail closed on an
 * empty scope, so if the site row were unreachable and this returned nothing,
 * every product page would render "no products" while the build still reported
 * success — the same silent-empty failure mode the CMS has caused here before.
 * Falling back to the last known-good list keeps the site up.
 *
 * That guard covered two cases — row unreachable, and `enabledCategories` empty
 * — and missed the one that actually happened. On 2026-09-09 the row was
 * rewritten to four `smart-home-*` slugs that exist as categories but contain
 * no products at all. A perfectly valid, non-empty scope that matches nothing:
 * the guard passed it straight through and the whole storefront went dark while
 * the build reported success, exactly the failure the comment above describes.
 *
 * So a scope now has to hold at least one product to be believed. If the CMS
 * names categories that are all empty, that is a misconfiguration rather than
 * an editorial decision to sell nothing, and the built-in list is the better
 * answer. An intentionally empty storefront is not a thing this site supports.
 */
export async function getScopeSlugs(): Promise<string[]> {
  if (scopeCache && Date.now() - scopeCache.at < 300_000) return scopeCache.slugs;
  const fallback = [...CATEGORY_SLUGS];
  try {
    const res = await commerceFetch<ListResponse<{ enabledCategories?: string[] | null }>>(
      'commerce-sites',
      {
        filters: { domain: { $eq: SITE_DOMAIN } },
        fields: ['enabledCategories'],
        pagination: { pageSize: 1 },
      },
    );
    const raw = res.data?.[0]?.enabledCategories;
    const slugs = Array.isArray(raw) ? raw.filter((s) => typeof s === 'string' && s) : [];
    if (slugs.length && (await scopeHasProducts(slugs))) {
      scopeCache = { slugs, at: Date.now() };
      return slugs;
    }
  } catch {
    // fall through to the built-in list
  }
  scopeCache = { slugs: fallback, at: Date.now() };
  return fallback;
}

/** Does this set of category slugs contain any published product at all? */
async function scopeHasProducts(slugs: string[]): Promise<boolean> {
  try {
    const res = await commerceFetch<ListResponse<{ slug: string }>>('commerce-products', {
      filters: { productStatus: { $eq: 'active' }, categories: { slug: { $in: slugs } } },
      fields: ['slug'],
      pagination: { pageSize: 1 },
    });
    return (res.meta?.pagination?.total ?? res.data?.length ?? 0) > 0;
  } catch {
    // If the check itself fails, trust the CMS rather than override it on a
    // network blip — a wrong scope is recoverable, a flapping one is not.
    return true;
  }
}

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
async function scopeFilter(extra: Record<string, unknown> = {}) {
  return {
    productStatus: { $eq: 'active' },
    categories: { slug: { $in: await getScopeSlugs() } },
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
  const slugs = await getScopeSlugs();
  const res = await commerceFetch<ListResponse<CommerceCategory>>('commerce-categories', {
    filters: { slug: { $in: slugs } },
    fields: ['name', 'slug', 'description', 'icon'],
    pagination: { pageSize: Math.max(slugs.length, 1) },
  });
  // Rendered in the order the CMS lists them, so the site row controls
  // presentation order as well as membership.
  const order = new Map(slugs.map((s, i) => [s, i]));
  return (res.data ?? []).sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
}

export async function getProductCategory(slug: string): Promise<CommerceCategory | null> {
  if (!(await getScopeSlugs()).includes(slug)) return null;
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
  if (opts.category && !(await getScopeSlugs()).includes(opts.category)) {
    return { products: [], total: 0, pageCount: 0 };
  }
  const filters = opts.category
    ? await scopeFilter({ categories: { slug: { $eq: opts.category } } })
    : await scopeFilter();

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
    filters: await scopeFilter({ slug: { $eq: slug } }),
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
    filters: await scopeFilter({ slug: { $in: unique } }),
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
      filters: await scopeFilter(),
      fields: ['slug', 'updatedAt'],
      pagination: { page, pageSize: 100 },
    });
    out.push(...(res.data ?? []).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt ?? '' })));
    if (page >= (res.meta?.pagination?.pageCount ?? 1)) break;
  }
  return out;
}
