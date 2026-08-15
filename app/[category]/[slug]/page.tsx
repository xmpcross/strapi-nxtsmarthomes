import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, listPosts, mediaUrl, coverImageSrc, type NxtSmartPost } from '@/lib/strapi';
import { DEFAULT_AUTHOR, SECTIONS, SITE } from '@/lib/site';
import { fmtDate, primaryCategorySlug, postPath } from '@/lib/format';
import ArticleBody, { extractProductSlugs } from '@/components/ArticleBody';
import { getProductsBySlugs } from '@/lib/commerce';
import PostSidebar from '@/components/PostSidebar';
import CommentsSection from '@/components/CommentsSection';
import PostGallery from '@/components/PostGallery';
import PostShareBar from '@/components/PostShareBar';
import PostShareRail from '@/components/PostShareRail';
import { breadcrumbJsonLd, jsonLd, personJsonLd, publisherJsonLd } from '@/lib/seo';
import { sanitizeCommerceClaims } from '@/lib/sanitizeCommerce';
import { extractToc, isWpImportedContent, transformWpContent } from '@/lib/wpContent';
import { normaliseInternalLinks } from '@/lib/internalLinks';

export const revalidate = 60;
export const dynamicParams = true;

type Params = { category: string; slug: string };

function categoryName(slug?: string): string {
  if (!slug) return '';
  return SECTIONS.find((s) => s.slug === slug)?.title ?? slug.replace(/-/g, ' ');
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, category } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) return { title: 'Not found' };

  const cover = coverImageSrc(post) || mediaUrl(post.ogImage ?? null);
  const modifiedTime = post.dateModified || post.updatedAt;
  const description = post.seoDescription || post.excerpt || SITE.description;

  return {
    title: post.seoTitle || post.title,
    description,
    alternates: { canonical: `/${category}/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.seoTitle || post.title,
      description,
      url: `${SITE.url}/${category}/${post.slug}`,
      images: cover ? [{ url: cover }] : undefined,
      publishedTime: post.publishedAt,
      modifiedTime,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: post.seoTitle || post.title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug, category } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) notFound();

  const canonicalCat = primaryCategorySlug(post);
  if (canonicalCat !== category) {
    const { redirect } = await import('next/navigation');
    redirect(postPath(post));
  }

  // One category listing serves three jobs: the neighbouring articles for the
  // prev/next pair, the "Read Next" grid, and the sidebar's featured posts.
  const [inCategory, recent] = await Promise.all([
    listPosts({ category, pageSize: 60 })
      .then((r) => r.data)
      .catch(() => [] as NxtSmartPost[]),
    listPosts({ pageSize: 8 })
      .then((r) => r.data.filter((p) => p.id !== post.id).slice(0, 4))
      .catch(() => [] as NxtSmartPost[]),
  ]);

  const index = inCategory.findIndex((p) => p.id === post.id);
  // The list runs newest first, so the *next* article is the one above it.
  const nextPost = index > 0 ? inCategory[index - 1] : null;
  const previousPost = index >= 0 && index < inCategory.length - 1 ? inCategory[index + 1] : null;
  const related = inCategory.filter((p) => p.id !== post.id).slice(0, 3);

  const comments = post.comments ?? [];
  const cover = coverImageSrc(post);
  const modifiedTime = post.dateModified || post.updatedAt;
  const cat = post.categories?.[0];
  const author = post.author ?? DEFAULT_AUTHOR;
  const authorSlug = author.slug ?? DEFAULT_AUTHOR.slug;
  const postUrl = `${SITE.url}/${category}/${post.slug}`;

  // Every post type goes through the same transform now, so a review renders
  // with the same markup — and the same typography — as an informative post.
  const useWpTransform = isWpImportedContent(post.content);
  // Link normalisation runs on both branches: the WordPress transform and the
  // plain sanitiser produce the same trailing-slashed, host-qualified links,
  // so fixing it inside either one would miss half the posts.
  const contentHtml = normaliseInternalLinks(
    useWpTransform ? transformWpContent(post.content) : sanitizeCommerceClaims(post.content),
  );
  const toc = extractToc(contentHtml);
  // Inline product boxes. One batched catalogue lookup for every ::product:
  // marker in the body; a post with no markers makes no request at all. A
  // catalogue outage must not take the article down with it, so this degrades
  // to prose rather than throwing — the same posture as the sidebar fetch.
  const productSlugs = extractProductSlugs(contentHtml);
  const inlineProducts = productSlugs.length
    ? await getProductsBySlugs(productSlugs).catch(() => [])
    : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags: string[] = (post as any).tags ?? [];
  const chips = [
    ...(post.categories ?? []).map((c) => ({ label: c.name, href: `/${c.slug}` })),
    ...tags.map((t) => ({ label: t, href: null })),
  ].slice(0, 4);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: cover ? [cover] : undefined,
    datePublished: post.publishedAt,
    dateModified: modifiedTime,
    publisher: publisherJsonLd(),
    author: personJsonLd(author),
    mainEntityOfPage: postUrl,
  };

  const byline = (
    <p className="text-[15px] font-semibold text-[#696981]">
      <Link href={`/author/${authorSlug}`} className="text-[#5955d1] transition hover:text-[#4a47c4]">
        {author.name}
      </Link>{' '}
      on{' '}
      <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
    </p>
  );

  return (
    <article
      className="bg-[#f8f7ff] pb-16"
      data-testid={`post-${post.slug}`}
      data-category={category}
      data-post-type={post.postType}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbJsonLd([
              { name: 'Home', url: '/' },
              { name: cat?.name ?? categoryName(category), url: `/${category}` },
              { name: post.title, url: `/${category}/${post.slug}` },
            ]),
          ),
        }}
      />

      <div className="mx-auto w-full max-w-[1296px] px-5 sm:px-6">
        {/* ── Breadcrumbs ──────────────────────────────────────── */}
        <nav
          className="flex items-center gap-2 py-5 text-[13px] text-[#696981]"
          aria-label="Breadcrumb"
          data-testid="breadcrumb"
        >
          <Link href="/" className="transition hover:text-[#5955d1]">Home</Link>
          <span aria-hidden="true" className="text-[#c9c9d6]">›</span>
          <Link href={`/${category}`} className="transition hover:text-[#5955d1]">
            {cat?.name ?? categoryName(category)}
          </Link>
          <span aria-hidden="true" className="text-[#c9c9d6]">›</span>
          <span className="min-w-0 truncate text-[#29294b]" aria-current="page">{post.title}</span>
        </nav>

        {/* ── Split header: text left, cover right ─────────────── */}
        <header
          className="grid gap-6 border-b border-[#e1e1e8] pb-10 lg:grid-cols-[minmax(0,504fr)_minmax(0,720fr)] lg:items-stretch lg:gap-6 lg:pb-12"
          data-testid="post-header"
        >
          <div className="flex flex-col">
            {byline}

            <h1 className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.04em] text-[#29294b] sm:text-[2.75rem] lg:text-[3.25rem] lg:leading-[1.2] lg:tracking-[-0.05em]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 max-w-[46ch] text-[18px] leading-[1.55] text-[#696981]">{post.excerpt}</p>
            )}

            {chips.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2 lg:mt-auto lg:pt-10">
                {chips.map((chip) =>
                  chip.href ? (
                    <Link
                      key={chip.label}
                      href={chip.href}
                      className="rounded-md border border-[#e1e1e8] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#29294b] transition hover:border-[#5955d1] hover:text-[#5955d1]"
                    >
                      {chip.label}
                    </Link>
                  ) : (
                    <span
                      key={chip.label}
                      className="rounded-md border border-[#e1e1e8] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#696981]"
                    >
                      {chip.label}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>

          {cover && (
            <div className="overflow-hidden rounded-2xl bg-[#eceaff]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={post.coverImage?.alternativeText || post.coverImageAlt || post.title}
                width={post.coverImage?.width}
                height={post.coverImage?.height}
                className="aspect-[16/9] h-full w-full object-cover"
              />
            </div>
          )}
        </header>

        {/* ── Body: rail + article + sidebar ───────────────────── */}
        <div className="grid items-start gap-y-12 pt-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-x-8 lg:pt-12">
          <div className="min-w-0 lg:grid lg:grid-cols-[88px_minmax(0,1fr)] lg:gap-x-6">
            <PostShareRail title={post.title} url={postUrl} readingMinutes={post.readingTimeMinutes} />

            <div className="min-w-0 lg:max-w-[680px]">
              {toc.length >= 3 && (
                <nav className="post-toc mb-8" data-testid="post-toc" aria-label="On this page">
                  <p className="post-toc__label">On this page</p>
                  <ol>
                    {toc.map((entry) => (
                      <li key={entry.id}>
                        <a href={`#${entry.id}`}>{entry.text}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <ArticleBody content={contentHtml} products={inlineProducts} />

              <PostGallery images={post.gallery} postTitle={post.title} />

              {/* ── Post footer ───────────────────────────────── */}
              <footer className="mt-12" data-testid="post-footer">
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e1e1e8] pt-6">
                  {byline}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {chips.map((chip) =>
                        chip.href ? (
                          <Link
                            key={chip.label}
                            href={chip.href}
                            className="rounded-md border border-[#e1e1e8] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#29294b] transition hover:border-[#5955d1] hover:text-[#5955d1]"
                          >
                            {chip.label}
                          </Link>
                        ) : (
                          <span
                            key={chip.label}
                            className="rounded-md border border-[#e1e1e8] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#696981]"
                          >
                            {chip.label}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Horizontal share row — the rail is hidden on small screens. */}
                <div className="mt-6 lg:hidden">
                  <PostShareBar title={post.title} url={postUrl} />
                </div>

                {(previousPost || nextPost) && (
                  <nav className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="More articles in this category">
                    {previousPost ? (
                      <Link
                        href={postPath(previousPost)}
                        className="group rounded-xl border border-[#e1e1e8] bg-white px-5 py-5 text-center transition hover:border-[#5955d1]/50 hover:shadow-[0_6px_20px_rgba(41,41,75,0.06)]"
                      >
                        <span className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#696981]">
                          <span aria-hidden="true">‹</span> Previous article
                        </span>
                        <span className="mt-2 block text-[15px] font-bold leading-snug text-[#29294b] transition group-hover:text-[#5955d1]">
                          {previousPost.title}
                        </span>
                      </Link>
                    ) : (
                      <span />
                    )}

                    {nextPost && (
                      <Link
                        href={postPath(nextPost)}
                        className="group rounded-xl border border-[#e1e1e8] bg-white px-5 py-5 text-center transition hover:border-[#5955d1]/50 hover:shadow-[0_6px_20px_rgba(41,41,75,0.06)]"
                      >
                        <span className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#696981]">
                          Next article <span aria-hidden="true">›</span>
                        </span>
                        <span className="mt-2 block text-[15px] font-bold leading-snug text-[#29294b] transition group-hover:text-[#5955d1]">
                          {nextPost.title}
                        </span>
                      </Link>
                    )}
                  </nav>
                )}

                <p className="mt-8 rounded-xl border border-[#e1e1e8] bg-white px-5 py-4 text-[13px] leading-6 text-[#696981]">
                  <strong className="font-semibold text-[#29294b]">Affiliate disclosure.</strong>{' '}
                  {SITE.name} earns a commission when you buy through links on this page, at no extra cost to you.
                </p>

                <p className="mt-8">
                  <a
                    href="#comments"
                    className="text-[15px] font-semibold text-[#5955d1] underline underline-offset-4 transition hover:text-[#4a47c4]"
                  >
                    View Comments ({comments.length})
                  </a>
                </p>

                <section className="mt-8 scroll-mt-28" id="comments" data-testid="reviews-container">
                  <CommentsSection comments={comments} postId={post.documentId ?? post.id} />
                </section>
              </footer>
            </div>
          </div>

          {/* ── Sidebar ──────────────────────────────────────────
              Deliberately not sticky: in the reference layout the widget
              column is static and scrolls away with the article, while the
              share rail on the left is the part that follows you down. */}
          <div>
            <PostSidebar
              recent={recent}
              author={{
                name: author.name,
                slug: authorSlug,
                bio: author.bio,
                role: (author as { role?: string }).role ?? DEFAULT_AUTHOR.role,
              }}
            />
          </div>
        </div>

        {/* ── Read Next ────────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-[#e1e1e8] pt-12" data-testid="related-posts">
            <h2 className="text-[2rem] font-bold tracking-[-0.04em] text-[#29294b]">Read Next</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => {
                const pImg = coverImageSrc(p);
                const pCats = (p.categories ?? []).slice(0, 2);
                return (
                  <article key={p.id} className="group flex flex-col">
                    <Link href={postPath(p)} className="relative block overflow-hidden rounded-2xl bg-[#eceaff]">
                      {pImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pImg}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="block aspect-[16/10] w-full bg-gradient-to-br from-[#eceaff] to-[#e1e1e8]" />
                      )}
                      {pCats.length > 0 && (
                        <span className="absolute left-3 top-3 flex gap-2">
                          {pCats.map((c) => (
                            <span
                              key={c.slug}
                              className="rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#29294b]"
                            >
                              {c.name}
                            </span>
                          ))}
                        </span>
                      )}
                    </Link>

                    <p className="mt-4 text-[13px] font-semibold text-[#696981]">
                      <span className="text-[#5955d1]">{author.name}</span> on {fmtDate(p.publishedAt)}
                    </p>

                    <h3 className="mt-2 text-[18px] font-bold leading-snug tracking-[-0.02em] text-[#29294b]">
                      <Link href={postPath(p)} className="transition hover:text-[#5955d1]">
                        {p.title}
                      </Link>
                    </h3>

                    {p.excerpt && (
                      <p className="mt-3 text-[14px] leading-[1.6] text-[#696981] line-clamp-3">{p.excerpt}</p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
