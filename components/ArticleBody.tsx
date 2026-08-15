import PostContent from '@/components/PostContent';
import ProductBox from '@/components/ProductBox';
import type { CommerceProduct } from '@/lib/commerce';

/**
 * Renders post content, replacing inline product markers with real ProductBoxes.
 *
 * An editor puts a marker on its own line at the end of the section that
 * discusses a product:
 *
 *     ::product:amazon-smart-plug::
 *
 * The slug is the `commerce-product` slug. The content is split on those
 * markers and the segments interleaved with the component, so the buy box lands
 * beside the prose that earned it rather than in a block at the foot of the page.
 *
 * WHY THE MARKER IS MATCHED WITH AN OPTIONAL <p> WRAPPER: posts on this site
 * arrive from Strapi as either HTML (the WordPress import) or markdown (anything
 * authored since), and PostContent branches on `looksLikeHtml`. In the HTML case
 * the marker is already `<p>::product:slug::</p>`; in the markdown case it is a
 * bare line that would only become a paragraph *after* PostContent converts it —
 * which is downstream of this split. Matching both shapes here means an editor
 * writes the same marker either way.
 *
 * A marker whose product is missing, unpublished, or outside this site's
 * catalogue scope renders nothing at all rather than leaking the raw token onto
 * the page. That is the safe direction: a silently absent box is a formatting
 * disappointment, a visible `::product:foo::` is a broken page.
 */

const MARKER = /(?:<p>\s*)?::product:([a-z0-9-]+)::(?:\s*<\/p>)?/g;

/** Slugs referenced by a post body, for a single batched catalogue lookup. */
export function extractProductSlugs(content: string): string[] {
  const slugs: string[] = [];
  const re = new RegExp(MARKER.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) slugs.push(m[1]);
  return [...new Set(slugs)];
}

type Part = { type: 'html'; value: string } | { type: 'product'; slug: string };

export default function ArticleBody({
  content,
  products,
}: {
  content: string;
  products: CommerceProduct[];
}) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const parts: Part[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MARKER.source, 'g');

  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) parts.push({ type: 'html', value: content.slice(lastIndex, m.index) });
    parts.push({ type: 'product', slug: m[1] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: 'html', value: content.slice(lastIndex) });

  // No markers: render exactly as before, one PostContent over the whole body.
  // Worth keeping as its own path — splitting content into segments means each
  // segment is normalised independently, and there is no reason to take that
  // risk on the overwhelming majority of posts that carry no products at all.
  if (!parts.some((p) => p.type === 'product')) {
    return <PostContent html={content} />;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'html') {
          return part.value.trim() ? <PostContent key={`html-${i}`} html={part.value} /> : null;
        }
        const product = bySlug.get(part.slug);
        return product ? <ProductBox key={`product-${i}-${part.slug}`} product={product} /> : null;
      })}
    </>
  );
}
