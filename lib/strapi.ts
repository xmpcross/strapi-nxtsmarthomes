import qs from 'qs';
import { RETIRED_POST_SLUGS } from "@/lib/retiredPosts";

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN;

export type StrapiImage = { url: string; alternativeText?: string; width?: number; height?: number } | null;

export type NxtSmartPostType =
  | 'product-comparison'
  | 'product-review'
  | 'product-roundup'
  | 'how-to-guide'
  | 'informative'
  | 'top-rated'
  | 'smart-home-automation'
  | 'smart-home-security'
  | 'smart-home-devices'
  | 'smart-home-entertainment'
  | 'smart-home-energy'
  | 'smart-home-integration'
  | 'other';

export type NxtSmartCategory = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string;
  order?: number;
  icon?: string;
  legacyWpId?: number;
  parent?: { id: number; name: string; slug: string } | null;
  children?: { id: number; name: string; slug: string }[];
};

export type NxtSmartAuthor = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  role?: string;
  bio?: string;
  sameAs?: string[];
  avatar?: StrapiImage;
};

export type NxtSmartComment = {
  id: number;
  documentId?: string;
  authorName: string;
  body: string;
  commentStatus: "pending" | "approved" | "rejected";
  rating?: number;
  postedAt?: string;
  createdAt?: string;
  publishedAt?: string;
  source?: string;
};

export type NxtSmartPost = {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  postType?: NxtSmartPostType;
  amazonAffiliateTag?: string;
  sourceUrl?: string;
  legacyWpId?: number;
  readingTimeMinutes?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  publishedAt: string;
  updatedAt: string;
  dateModified?: string;
  coverImage?: StrapiImage;
  coverImageUrl?: string;
  coverImageAlt?: string;
  ogImage?: StrapiImage;
  gallery?: NonNullable<StrapiImage>[];
  categories?: NxtSmartCategory[];
  comments?: NxtSmartComment[];
  author?: NxtSmartAuthor | null;
};

type ListResponse<T> = {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
};

async function strapiFetch<T>(path: string, params?: Record<string, unknown>, revalidate = 60): Promise<T> {
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

export function mediaUrl(img: StrapiImage): string | null {
  if (!img?.url) return null;
  return img.url.startsWith('http') ? img.url : `${BASE}${img.url}`;
}

export function coverImageSrc(post: NxtSmartPost): string | null {
  const fromMedia = mediaUrl(post.coverImage ?? null);
  if (fromMedia) return fromMedia;
  return post.coverImageUrl ?? null;
}

/*
 * The nxtsmart-post and nxtsmart-category types are shared with
 * nxtsmarthome.com.au. Without this filter every query here also returned that
 * site's articles, and they were being published on this domain as our own —
 * duplicate content across two domains competing for the same search results.
 *
 * Every query below must carry it. The `site` field was added on 13 Aug 2026 and
 * defaults to 'nxtsmart.homes', so existing content needs no change.
 */
const SITE = 'nxtsmart.homes';
const SITE_FILTER = { site: { $eq: SITE } } as const;

const POST_POPULATE = ["coverImage", "ogImage", "categories", "gallery", "author"];
const POST_DETAIL_POPULATE = { coverImage: true, ogImage: true, categories: true, gallery: true, author: { populate: ["avatar"] }, comments: { filters: { commentStatus: { "$eq": "approved" } }, sort: ["postedAt:desc"] } };

export async function listPosts(
  opts: { page?: number; pageSize?: number; category?: string; postType?: NxtSmartPostType; q?: string } = {},
) {
  const filters: Record<string, unknown> = { ...SITE_FILTER };
  if (opts.category) filters.categories = { slug: { $eqi: opts.category } };
  if (opts.postType) filters.postType = { $eq: opts.postType };
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    filters.$or = [
      { title: { $containsi: q } },
      { excerpt: { $containsi: q } },
      { content: { $containsi: q } },
      { categories: { name: { $containsi: q } } },
    ];
  }
  if (RETIRED_POST_SLUGS.size) {
    filters.slug = { $notIn: Array.from(RETIRED_POST_SLUGS) };
  }

  return strapiFetch<ListResponse<NxtSmartPost>>('nxtsmart-posts', {
    status: "published",
    fields: ['title', 'slug', 'excerpt', 'postType', 'legacyWpId', 'readingTimeMinutes', 'publishedAt', 'updatedAt', 'dateModified', 'coverImageUrl', 'coverImageAlt'],
    sort: ['publishedAt:desc'],
    populate: POST_POPULATE,
    pagination: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 12 },
    filters,
  });
}

export async function getPost(slug: string): Promise<NxtSmartPost | null> {
  const res = await strapiFetch<ListResponse<NxtSmartPost>>('nxtsmart-posts', {
    status: "published",
    filters: { ...SITE_FILTER, slug: { $eq: slug } },
    populate: POST_DETAIL_POPULATE,
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

export async function listCategories(): Promise<NxtSmartCategory[]> {
  const res = await strapiFetch<ListResponse<NxtSmartCategory>>('nxtsmart-categories', {
    filters: { ...SITE_FILTER },
    sort: ['order:asc', 'name:asc'],
    populate: ['parent', 'children'],
    pagination: { pageSize: 100 },
  });
  return res.data;
}

export async function getCategory(slug: string): Promise<NxtSmartCategory | null> {
  const res = await strapiFetch<ListResponse<NxtSmartCategory>>('nxtsmart-categories', {
    filters: { ...SITE_FILTER, slug: { $eqi: slug } },
    populate: ['parent', 'children'],
    pagination: { pageSize: 1 },
  });
  return res.data?.[0] ?? null;
}

export async function listAllPostSlugs(): Promise<{ slug: string; category: string; updatedAt: string }[]> {
  const all: { slug: string; category: string; updatedAt: string }[] = [];
  let page = 1;
  while (true) {
    const res = await strapiFetch<ListResponse<NxtSmartPost>>('nxtsmart-posts', {
    status: "published",
      filters: { ...SITE_FILTER },
      fields: ['slug', 'updatedAt'],
      populate: { categories: { fields: ['slug'] } },
      sort: ['publishedAt:desc'],
      pagination: { page, pageSize: 100 },
    });
    for (const p of res.data) {
      if (RETIRED_POST_SLUGS.has(p.slug)) continue;
      const cat = p.categories?.[0]?.slug ?? 'uncategorized';
      all.push({ slug: p.slug, category: cat, updatedAt: p.updatedAt });
    }
    const pageCount = res.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return all;
}
