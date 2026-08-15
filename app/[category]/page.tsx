import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategory, listPosts } from '@/lib/strapi';
import { SECTIONS, SITE } from '@/lib/site';
import PostCard from '@/components/PostCard';
import { breadcrumbJsonLd, jsonLd } from "@/lib/seo";

export const revalidate = 60;
export const dynamicParams = true;

const PAGE_SIZE = 9;
const RESERVED = new Set(['about', 'search', 'feed.xml', 'sitemap.xml', 'robots.txt']);

type Params = { category: string };
type SearchParams = { page?: string; view?: string };

function isReserved(slug: string) {
  return RESERVED.has(slug);
}

async function resolveCategoryName(slug: string): Promise<string> {
  const fromCms = await getCategory(slug).catch(() => null);
  if (fromCms?.name) return fromCms.name;
  const fromConfig = SECTIONS.find((s) => s.slug === slug);
  return fromConfig?.title ?? slug.replace(/-/g, ' ');
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { category } = await params;
  if (isReserved(category)) return {};
  const { page: pageRaw, view: viewRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const hasViewParam = viewRaw === "2" || viewRaw === "4" || viewRaw === "list";
  const sectionMeta = SECTIONS.find((s) => s.slug === category);
  const categoryRecord = await getCategory(category).catch(() => null);
  if (!categoryRecord && !sectionMeta) return { title: "Not found" };
  const name = categoryRecord?.name ?? sectionMeta?.title ?? category.replace(/-/g, " ");
  const baseDescription = sectionMeta?.blurb || categoryRecord?.description || `${name} from ${SITE.name} — ${SITE.tagline}`;
  const pageSuffix = page > 1 ? ` — Page ${page}` : "";
  const canonical = `/${category}${page > 1 ? `?page=${page}` : ""}`;

  /*
   * An empty category archive is a thin-content signal sitting in the index,
   * and five of them were live and indexable: /uncategorized,
   * /coupons-and-deals, /smart-home-energy, /smart-home-integration and
   * /smart-home-entertainment, all at zero published posts.
   *
   * Derived from the post count rather than a hardcoded list, so a category
   * starts being indexed the moment it has content and needs no follow-up
   * deploy — and so a category that empties out is covered too. `follow` stays
   * true: there is nothing worth indexing here, but the links out are still
   * worth crawling.
   */
  const { meta } = await listPosts({ category, pageSize: 1 }).catch(() => ({ meta: null }));
  const isEmpty = meta?.pagination?.total === 0;

  return {
    title: `${name}${pageSuffix}`,
    description: page > 1 ? `${baseDescription} Page ${page}.` : baseDescription,
    alternates: { canonical },
    robots: hasViewParam || isEmpty ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { category } = await params;
  if (isReserved(category)) notFound();

  const { page: pageRaw, view: viewRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const view = viewRaw === '2' || viewRaw === '4' || viewRaw === 'list' ? viewRaw : '3';
  const viewHref = (nextView: '2' | '3' | '4' | 'list') => '/' + category + (nextView === '3' ? '' : '?view=' + nextView);
  const pageHref = (nextPage: number) => { const params = new URLSearchParams(); if (view !== '3') params.set('view', view); if (nextPage > 1) params.set('page', String(nextPage)); const query = params.toString(); return '/' + category + (query ? '?' + query : ''); };

  const [categoryRecord, res] = await Promise.all([
    getCategory(category).catch(() => null),
    listPosts({ category, page, pageSize: PAGE_SIZE }).catch(() => null),
  ]);

  const sectionMeta = SECTIONS.find((s) => s.slug === category);
  if (!categoryRecord && !sectionMeta) notFound();
  const name = categoryRecord?.name ?? sectionMeta?.title ?? category.replace(/-/g, " ");
  const intro = sectionMeta?.blurb ?? categoryRecord?.description;
  const posts = res?.data ?? [];
  const pageCount = res?.meta?.pagination?.pageCount ?? 1;
  const total = res?.meta?.pagination?.total ?? posts.length;

  if (page > 1 && posts.length === 0) notFound();

  return (
    <div className="bg-paper text-ink" data-testid={`category-${category}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd([{ name: "Home", url: "/" }, { name, url: "/" + category }])) }} />
      <div className="border-b border-ink/8 bg-[#f9f9f9]">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-4 text-[14px] text-ink-faint sm:px-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <span className="text-ink-muted">{name}</span>
        </nav>
      </div>
      <section className="relative isolate overflow-hidden bg-white" style={{ boxShadow: "inset 0 -56px 96px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)" }}>
        
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <span className="inline-flex rounded-full border border-primary/15 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">Category</span>
          <h1 className="mt-5 max-w-4xl font-display text-[2rem] font-bold leading-tight tracking-tight text-ink">{name}</h1>
          {intro && (
            <p className="mt-5 max-w-4xl text-base leading-7 text-ink-muted">{intro}</p>
          )}
          {total > 0 && (
            <p className="mt-6 inline-flex rounded border border-primary/10 bg-white/80 px-3 py-1 text-sm font-semibold text-ink-muted">{total} article{total === 1 ? '' : 's'}</p>
          )}
        </div>
      </section>


      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Categories">
            <div className="rounded border border-primary/10 bg-primary-soft/55 p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Categories</p>
              <nav className="mt-4 grid gap-2">
                {SECTIONS.map((item) => (
                  <Link key={item.slug} href={"/" + item.slug} className={"rounded border px-4 py-3 text-sm font-semibold transition " + (item.slug === category ? "border-primary bg-primary text-white" : "border-ink/10 bg-white/80 text-ink-muted hover:border-primary/25 hover:bg-white hover:text-primary")}>{item.title}</Link>
                ))}
              </nav>
            </div>
          </aside>
          <div className="min-w-0">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-ink/8 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">View posts</p>
                <p className="mt-1 text-sm text-ink-muted">Choose a layout for this category.</p>
              </div>
              <div className="flex items-center gap-2" aria-label="Post view options">
                <Link href={viewHref('2')} title='2 columns' aria-label='Display posts in 2 columns' className={'grid h-10 w-10 place-items-center rounded border text-sm font-bold transition ' + (view === '2' ? 'border-primary bg-primary text-white' : 'border-ink/10 bg-white text-ink-muted hover:border-primary/25 hover:text-primary')}>▦</Link>
                <Link href={viewHref('3')} title='3 columns' aria-label='Display posts in 3 columns' className={'grid h-10 w-10 place-items-center rounded border text-sm font-bold transition ' + (view === '3' ? 'border-primary bg-primary text-white' : 'border-ink/10 bg-white text-ink-muted hover:border-primary/25 hover:text-primary')}>▦</Link>
                <Link href={viewHref('4')} title='4 columns' aria-label='Display posts in 4 columns' className={'grid h-10 w-10 place-items-center rounded border text-sm font-bold transition ' + (view === '4' ? 'border-primary bg-primary text-white' : 'border-ink/10 bg-white text-ink-muted hover:border-primary/25 hover:text-primary')}>▦</Link>
                <Link href={viewHref('list')} title='List' aria-label='Display posts as a list' className={'grid h-10 w-10 place-items-center rounded border text-sm font-bold transition ' + (view === 'list' ? 'border-primary bg-primary text-white' : 'border-ink/10 bg-white text-ink-muted hover:border-primary/25 hover:text-primary')}>☰</Link>
              </div>
            </div>
            {posts.length === 0 ? (
          <div className="rounded-4xl border border-dashed border-ink/15 bg-muted/40 px-6 py-20 text-center">
            <p className="font-display text-xl font-bold text-ink">No posts here yet</p>
            <p className="mt-2 text-sm text-ink-muted">Check back soon — or browse another section.</p>
            <Link href="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-emphasis">
              Back to home
            </Link>
          </div>
        ) : (
          <div className={view === 'list' ? 'grid gap-4' : view === '4' ? 'grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : view === '2' ? 'grid gap-x-6 gap-y-10 sm:grid-cols-2' : 'grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3'}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} variant={view === 'list' ? 'horizontal' : 'tile'} thumbBg={view === 'list' ? 'bg-muted/50' : 'none'} hideExcerpt compactTitle hideCategoryBadge />
            ))}
          </div>
        )}


            {pageCount > 1 && (
              <nav className="mt-14 flex justify-end" data-testid="pagination" aria-label="Pagination">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <Link
                      key={pageNumber}
                      href={pageHref(pageNumber)}
                      aria-current={pageNumber === page ? "page" : undefined}
                      className={
                        "grid h-10 w-10 place-items-center rounded border transition " +
                        (pageNumber === page
                          ? "border-primary bg-primary text-white"
                          : "border-ink/15 bg-white text-ink hover:border-primary hover:text-primary")
                      }
                    >
                      {pageNumber}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
