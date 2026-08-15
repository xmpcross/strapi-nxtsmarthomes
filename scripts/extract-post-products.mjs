/**
 * What products do the published articles actually name, and does the catalogue
 * have them? READ-ONLY.
 *
 *   node --experimental-strip-types scripts/extract-post-products.mjs
 *   node --experimental-strip-types scripts/extract-post-products.mjs --wanted=reports/wanted.txt
 *   node --experimental-strip-types scripts/extract-post-products.mjs --json=reports/coverage.json
 *
 * This inverts how the catalogue was built. It was sourced by querying Google
 * Shopping for a category name, which returns whatever ranks today — so it holds
 * current bestsellers while the articles review specific, often older models.
 * A spot check found one weak hit in five, and that one was the wrong
 * generation ("Echo Dot Max" against an article about the Echo Dot 5th Gen).
 *
 * The demand signal is already written down: the posts name their products in
 * the title and headings. This reads them out, checks each against Strapi, and
 * sorts every candidate into one of three buckets:
 *
 *   in scope        already usable — the post could carry a ::product:: marker today
 *   out of scope    the product exists in Strapi but this site cannot show it,
 *                   so the fix is scope or categorisation, not sourcing
 *   missing         a genuine sourcing gap — these become the wanted list
 *
 * Only the third bucket costs money to fix, and sourcing by exact product name
 * is the path the sourcing repo measured at 0% mismatch, against 4.8-6.0% for
 * keyword matching.
 *
 * Nothing here writes to Strapi or calls a paid API.
 */

import { CATEGORY_SLUGS } from '../lib/commerce.ts';
import { isModelToken, prepare, textNamesProduct, tokens } from './lib/product-identity.mjs';

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const SITE = 'nxtsmart.homes';

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const WANTED_OUT = flag('wanted', null);
const JSON_OUT = flag('json', null);
const LIMIT = Number(flag('limit', 0)) || 0;

/**
 * Headings that are article furniture rather than product names. Matched whole,
 * lowercased — a heading merely *containing* "features" may well name a product
 * ("Nest Doorbell features"), so substring matching would throw away real hits.
 */
const FURNITURE = new Set([
  'final thoughts', 'conclusion', 'introduction', 'overview', 'summary',
  'key takeaways', 'key terms to understand', 'pros and cons', 'pros', 'cons',
  'what to look for', 'buying guide', 'how we test', 'faq', 'faqs',
  'user-friendly features', 'installation and support', 'reliability and durability',
  'frequently asked questions', 'related posts', 'further reading',
]);

/**
 * Trailing marketing clause separators used in this site's titles.
 * The leading space is optional so "Honeywell: Step-by-Step Guide" splits,
 * while a hyphen inside a model name ("U-Bolt") does not — that needs
 * whitespace after the separator, which a model designator never has.
 */
const TITLE_SPLIT = /\s*[-–—:|]\s+/;

/** Openers that mark a line as advice rather than a product name. */
const PROSE_OPENER =
  /^(benefits?|advantages?|drawbacks?|disadvantages?|how|why|what|when|where|which|choosing|choose|common|exploring|understanding|tips?|setting|set up|installing|install|connect|download|using|use|troubleshooting|comparing|introduction|final|key|frequently|adjusting|optimi[sz]e|fine|personali[sz]ed|enhancing|instructions?|getting|making|maintaining|maintain|top|understand|understanding|unlocking|unlock|discover|transform|elevate|boost|revolutioni[sz]e|everything|inside|meet|introducing|ultimate|essential|must|access|accessing|adding|add|pairing|pair|resetting|reset|updating|update)\b/i;

function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    // Some imported headings carry literal markdown emphasis.
    .replace(/[*_]{1,3}/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAll(path, params) {
  const out = [];
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(`${BASE}/api/${path}?${params}&pagination[page]=${page}&pagination[pageSize]=100`);
    if (!res.ok) throw new Error(`Strapi ${res.status} on ${path}`);
    const json = await res.json();
    out.push(...(json.data ?? []));
    if (page >= (json.meta?.pagination?.pageCount ?? 1)) break;
  }
  return out;
}

/**
 * Candidate product names in one post.
 *
 * Three sources, because no single one is reliable:
 *
 *   1. The title up to its first separator. This site titles posts
 *      "<Product> - <marketing clause>", so the head is usually the product.
 *   2. h2/h3 headings that are not article furniture. A review repeats the
 *      product as a heading, and roundups list each product as a heading.
 *   3. Any heading or title fragment containing a model designator, which
 *      catches products whose brand is absent from the catalogue entirely —
 *      exactly the gaps worth finding.
 *
 * Brand vocabulary is used to *rank*, never to filter. Filtering by known brands
 * would discard every product from a brand not yet stocked, which is precisely
 * the set this report exists to surface.
 */
function extractCandidates(post, brands) {
  const found = new Map();
  const add = (raw, source) => {
    let name = String(raw || '').replace(/\s+/g, ' ').trim().replace(/[.,;:!?]+$/, '');
    // "Aeotec Smart Home Hub Overview" and "... Review" name the same product
    // as the bare form; sourcing wants the product, not the article's framing.
    name = name.replace(/\s+(review|overview|features?|specs?|app|guide|setup)$/i, '').trim();
    if (name.length < 6 || name.length > 90) return;
    const t = tokens(name);
    if (t.length < 2) return;
    const key = t.join(' ');
    if (!found.has(key)) found.set(key, { name, sources: new Set() });
    found.get(key).sources.add(source);
  };

  /**
   * One test for titles and headings alike. An earlier version applied the
   * prose filters only to headings, so titles like "How do smart speakers use
   * artificial intelligence" sailed into the wanted list as products to source.
   */
  const qualifies = (text) => {
    if (!text || /\?$/.test(text) || PROSE_OPENER.test(text)) return false;
    const phrase = tokens(text).join(' ');
    if (!phrase) return false;
    const hasBrand = [...brands].some(
      (b) => phrase === b || phrase.startsWith(b + ' ') || phrase.includes(' ' + b + ' '),
    );
    return hasBrand || tokens(text).some(isModelToken);
  };

  // A comparison names two products: "SmartThings Station vs. Sengled Z01".
  // Sourcing needs both, so each side is emitted as its own candidate.
  const sides = (text) => String(text).split(/\s+vs\.?\s+/i);

  const titleHead = String(post.title || '').split(TITLE_SPLIT)[0];
  for (const part of sides(titleHead)) if (qualifies(part)) add(part, 'title');

  const html = post.content || '';
  for (const m of html.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    let text = stripTags(m[2]);
    if (!text || FURNITURE.has(text.toLowerCase())) continue;

    // "Example: Philips Hue Smart Lighting System" names a product; the label
    // is scaffolding, so strip it rather than discarding the heading.
    text = text.replace(/^(example|option \d+|pick \d+|\d+)\s*[:.)-]\s*/i, '').trim();

    const head = text.split(TITLE_SPLIT)[0];
    for (const part of sides(head)) if (qualifies(part)) add(part, 'heading');
  }

  // Collapse candidates that are prefixes of a longer one: a review yields both
  // "ULTRALOQ U-Bolt Pro WiFi" (title) and "ULTRALOQ U-Bolt Pro WiFi Smart
  // Lock" (heading). Sourcing wants the fuller name, and two lines for one
  // product would overstate the size of the gap.
  const all = [...found.values()].map((c) => ({ name: c.name, sources: [...c.sources], t: tokens(c.name) }));
  const kept = all.filter(
    (c) => !all.some((o) => o !== c && o.t.length > c.t.length && c.t.every((tok) => o.t.includes(tok))),
  );
  return kept.map((c) => ({ name: c.name, sources: c.sources }));
}

// ── run ──────────────────────────────────────────────────────────────────────

console.log('reading catalogue and posts…');

const [posts, allProducts, brandRows] = await Promise.all([
  fetchAll('nxtsmart-posts', `status=published&filters[site][$eq]=${SITE}&fields[0]=title&fields[1]=slug&fields[2]=content`),
  fetchAll(
    'commerce-products',
    'filters[productStatus][$eq]=active&fields[0]=name&fields[1]=slug&fields[2]=brand&populate[categories][fields][0]=slug',
  ),
  fetchAll('commerce-brands', 'fields[0]=name'),
]);

const inScope = allProducts.filter((p) =>
  (p.categories ?? []).some((c) => CATEGORY_SLUGS.includes(c.slug)),
);

/**
 * Brand vocabulary, as whole normalised names rather than loose tokens.
 *
 * Splitting brands into tokens looked reasonable and was badly wrong: the
 * catalogue contains a brand literally called "Smart Home Hub", so `smart`
 * became a brand token and every prose heading on a smart home site matched.
 * Phrase matching keeps "tp link" and "philips" while making "smart" inert.
 */
const GENERIC = new Set([
  'smart', 'home', 'hub', 'plug', 'light', 'bulb', 'lock', 'camera', 'doorbell',
  'speaker', 'wifi', 'system', 'systems', 'device', 'security', 'video', 'wireless', 'pro',
  'lighting', 'solution', 'solutions', 'thermostat', 'vacuum', 'outlet',
  'max', 'mini', 'plus', 'air', 'control', 'sensor', 'switch', 'kit',
]);
const brands = new Set();
for (const raw of [...brandRows.map((b) => b.name), ...allProducts.map((p) => p.brand)]) {
  const phrase = tokens(raw).join(' ');
  if (phrase.length < 3) continue;
  if (tokens(raw).every((t) => GENERIC.has(t))) continue;
  brands.add(phrase);
}

console.log(`posts            : ${posts.length}`);
console.log(`catalogue        : ${allProducts.length} active (${inScope.length} in this site's scope)`);
console.log(`brand vocabulary : ${brands.size} tokens`);
console.log('');

const target = LIMIT ? posts.slice(0, LIMIT) : posts;

const rows = [];
for (const post of target) {
  const candidates = extractCandidates(post, brands);
  for (const c of candidates) {
    const cset = prepare(c.name);
    // Match the candidate text against catalogue names, not the reverse: the
    // heading is the longer string and contains the product name.
    const hitScoped = inScope.find((p) => textNamesProduct(p.name, c.name, cset));
    const hitAny = hitScoped ?? allProducts.find((p) => textNamesProduct(p.name, c.name, cset));
    rows.push({
      post: post.title,
      slug: post.slug,
      candidate: c.name,
      sources: c.sources,
      status: hitScoped ? 'in-scope' : hitAny ? 'out-of-scope' : 'missing',
      product: hitAny ? { name: hitAny.name, slug: hitAny.slug, categories: (hitAny.categories ?? []).map((x) => x.slug) } : null,
    });
  }
}

const byStatus = (s) => rows.filter((r) => r.status === s);
const postsWithScoped = new Set(byStatus('in-scope').map((r) => r.slug));
const postsWithNothing = new Set(target.map((p) => p.slug));
for (const r of rows) if (r.status !== 'missing') postsWithNothing.delete(r.slug);

console.log('── coverage');
console.log(`   candidates extracted : ${rows.length} across ${target.length} posts`);
console.log(`   in scope             : ${byStatus('in-scope').length}  (post could carry a marker today)`);
console.log(`   out of scope         : ${byStatus('out-of-scope').length}  (in Strapi, this site cannot show it)`);
console.log(`   missing              : ${byStatus('missing').length}  (sourcing gap)`);
console.log('');
console.log(`   posts already linkable : ${postsWithScoped.size}/${target.length}`);
console.log(`   posts with no catalogue match at all : ${postsWithNothing.size}`);

const scopedExamples = byStatus('in-scope').slice(0, 8);
if (scopedExamples.length) {
  console.log('');
  console.log('── ready to link now');
  for (const r of scopedExamples) {
    console.log(`   ${r.product.slug}`);
    console.log(`     in: ${r.post.slice(0, 66)}`);
  }
}

const outOfScope = byStatus('out-of-scope');
if (outOfScope.length) {
  console.log('');
  console.log('── in Strapi but out of scope (fix by categorisation, not sourcing)');
  const seen = new Set();
  for (const r of outOfScope) {
    if (seen.has(r.product.slug)) continue;
    seen.add(r.product.slug);
    console.log(`   ${r.product.name.slice(0, 54)}  [${r.product.categories.join(',') || 'no category'}]`);
    if (seen.size >= 10) break;
  }
}

// The wanted list: distinct missing candidates, most-cited first. A product
// named by several posts is the one worth sourcing first.
const missingCounts = new Map();
for (const r of byStatus('missing')) {
  const key = tokens(r.candidate).join(' ');
  if (!missingCounts.has(key)) missingCounts.set(key, { name: r.candidate, posts: new Set() });
  missingCounts.get(key).posts.add(r.post);
}
let wanted = [...missingCounts.values()].map((w) => ({ name: w.name, posts: [...w.posts], t: tokens(w.name) }));
// Collapse across posts too: "Aeotec Smart Hub" and "Aeotec Smart Home Hub"
// are one product to source, and two lines would overstate the gap.
wanted = wanted
  .filter((w) => !wanted.some((o) => o !== w && o.t.length > w.t.length && w.t.every((tok) => o.t.includes(tok))))
  .map((w) => ({ name: w.name, posts: w.posts }))
  .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));

console.log('');
console.log(`── wanted list: ${wanted.length} distinct products named by posts but absent from Strapi`);
for (const w of wanted.slice(0, 20)) {
  console.log(`   ${w.posts.length > 1 ? `${w.posts.length}×` : '  '} ${w.name}`);
}
if (wanted.length > 20) console.log(`   … and ${wanted.length - 20} more`);

if (WANTED_OUT) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(WANTED_OUT), { recursive: true });
  // Same shape as nxt-sourcing/data/*-wanted.txt: one product name per line.
  fs.writeFileSync(WANTED_OUT, wanted.map((w) => w.name).join('\n') + '\n');
  console.log(`\nwrote ${WANTED_OUT} (${wanted.length} lines, nxt-sourcing wanted-list format)`);
}

if (JSON_OUT) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify({ site: SITE, posts: target.length, rows, wanted }, null, 2));
  console.log(`wrote ${JSON_OUT}`);
}
