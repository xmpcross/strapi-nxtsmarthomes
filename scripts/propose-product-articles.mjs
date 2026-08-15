/**
 * Propose product-cluster articles from the in-scope catalogue. READ-ONLY.
 *
 *   node --experimental-strip-types scripts/propose-product-articles.mjs
 *   node --experimental-strip-types scripts/propose-product-articles.mjs --category=smart-plugs
 *   node --experimental-strip-types scripts/propose-product-articles.mjs --json=reports/clusters.json
 *
 * Answers one question before a single token is spent on generation: what
 * articles would a product-first pipeline actually produce, which products
 * would each cover, and do they collide with what is already published?
 *
 * WHY CLUSTERS AND NOT ONE ARTICLE PER PRODUCT. An article per SKU, generated
 * at volume, is the shape Google's scaled-content-abuse policy targets, and it
 * has nothing to say that the merchant's own page does not. A comparison across
 * several real catalogue records does. So the unit of proposal here is a group
 * of products with something in common, never a single product.
 *
 * Scope comes from lib/commerce.ts rather than being restated, so this can
 * never drift from what the site actually renders.
 *
 * Nothing here writes to Strapi, generates text, or calls a paid API. The only
 * requests are public GETs against the CMS.
 */

import {
  CATEGORY_SLUGS,
  bestOffer,
  listProductCategories,
  listProducts,
  productImage,
} from '../lib/commerce.ts';

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const SITE = 'nxtsmart.homes';

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const ONLY_CATEGORY = flag('category', null);
const JSON_OUT = flag('json', null);

/** Cluster sizing. Two products is a coin toss, not a comparison. */
const MIN_CLUSTER = 3;
const MAX_CLUSTER = 8;

/** specs keys that are pipeline bookkeeping rather than product facts. */
const SPEC_NOISE = new Set(['source', 'importedAt', 'sourceImageUrl']);

/** Words that carry no signal when matching a product against a post title. */
const STOP = new Set([
  'the', 'and', 'for', 'with', 'your', 'best', 'top', 'review', 'reviews', 'vs',
  'a', 'an', 'of', 'to', 'in', 'on', 'is', 'it', 'gen', 'new', '2024', '2025', '2026',
]);

/**
 * Cosmetic spec keys. "Energy Monitoring: Yes" separates products in a way a
 * reader cares about; "Color: White" does not, and clustering on it produces
 * an article with no thesis.
 */
const FACET_NOISE = new Set([
  'Color', 'Colour', 'Finish', 'Material', 'Dimensions', 'Weight', 'Form Factor',
  'Included Hardware', 'Design Highlights', 'Indicator Light', 'Mounting Type',
  'Plug Type', 'Durability', 'Typical Users', 'Top Use Cases', 'Highlighted Features',
  'Power Type', 'Power Source', 'Amperage', 'Voltage', 'Wattage',
]);

function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** A token carrying a digit is almost always a model designator: p110m, kp125m, l530e. */
function isModelToken(t) {
  return /\d/.test(t) && /[a-z]/.test(t);
}

async function fetchPublishedPosts() {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const url =
      `${BASE}/api/nxtsmart-posts?status=published` +
      `&filters[site][$eq]=${SITE}` +
      `&fields[0]=title&fields[1]=slug` +
      `&pagination[page]=${page}&pagination[pageSize]=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Strapi ${res.status} listing posts`);
    const json = await res.json();
    out.push(...(json.data ?? []));
    if (page >= (json.meta?.pagination?.pageCount ?? 1)) break;
  }
  return out.map((p) => ({ title: p.title, slug: p.slug, tokens: new Set(tokens(p.title)) }));
}

async function fetchScopedProducts(categorySlug) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const { products, pageCount } = await listProducts({ category: categorySlug, page, pageSize: 100 });
    all.push(...products);
    if (page >= (pageCount || 1)) break;
  }
  return all;
}

/**
 * How complete a product's data is. A cluster of records with no offers and no
 * specs cannot support an article no matter how good the grouping is, and
 * saying so here is the whole point of running this before generating.
 */
function readiness(p) {
  const specCount = Object.keys(p.specs ?? {}).filter((k) => !SPEC_NOISE.has(k)).length;
  return {
    image: Boolean(productImage(p)),
    offer: Boolean(bestOffer(p)),
    specs: specCount,
    rating: typeof p.rating === 'number' && p.rating > 0,
    description: Boolean(p.shortDescription || p.description),
  };
}

function isArticleReady(r) {
  // An offer or a real spec sheet — something concrete to write from.
  return r.offer || r.specs >= 5;
}

/**
 * Attribute facets worth clustering on: a spec key/value shared by at least
 * MIN_CLUSTER products but not by nearly all of them. A value every product
 * shares ("Connectivity Type: Wi-Fi" across all smart plugs) separates nothing
 * and would just reproduce the category.
 */
function findFacets(products, categoryName) {
  const counts = new Map();
  for (const p of products) {
    for (const [k, v] of Object.entries(p.specs ?? {})) {
      if (SPEC_NOISE.has(k) || FACET_NOISE.has(k)) continue;
      // Some catalogue rows carry nested objects under specs. String() turns
      // those into "[object Object]", which reached the proposed titles.
      if (typeof v !== 'string' && typeof v !== 'number') continue;
      // A brand facet just restates the brand cluster built separately.
      if (/^brand$/i.test(k)) continue;
      const value = String(v).trim();
      if (!value || value.length > 40) continue;
      // "No" says a product lacks a feature — never an article angle.
      if (/^(no|none|n\/a|false|unknown)$/i.test(value)) continue;
      const key = `${k}\t${value}`;
      if (!counts.has(key)) counts.set(key, []);
      counts.get(key).push(p);
    }
  }
  const ceiling = Math.max(MIN_CLUSTER, Math.floor(products.length * 0.8));
  return [...counts.entries()]
    .filter(([, ps]) => ps.length >= MIN_CLUSTER && ps.length <= ceiling)
    .map(([key, ps]) => {
      const [k, v] = key.split('\t');
      return { kind: 'facet', attribute: k, value: v, products: ps };
    })
    // A facet restating the category ("Subtype: Smart Plug" inside Smart Plugs)
    // proposes an article whose angle is "these smart plugs are smart plugs".
    .map((f) => ({
      // Spec keys are sometimes phrased as "With Audio", which would render as
      // "Smart Cameras with with audio". Strip the leading preposition once,
      // here, so both the title and the restating filter below see clean text.
      ...f,
      attribute: f.attribute.replace(/^with\s+/i, ''),
    }))
    .filter((f) => {
      // Crude singular/plural fold, so "Smart Plug" is recognised as restating
      // the "Smart Plugs" category rather than slipping through as an angle.
      const stem = (t) => t.replace(/s$/, '');
      const cat = tokens(categoryName).map(stem);
      // For a Yes/No attribute the angle IS the attribute ("night vision"), so
      // that is what must be tested for restating the category — otherwise
      // "Smart Door Locks with smart" survives as a proposal.
      const boolish = /^(yes|true|supported|included)$/i.test(f.value);
      const angle = tokens(boolish ? f.attribute : f.value).map(stem);
      return angle.length > 0 && !angle.every((t) => cat.includes(t));
    })
    // Biggest facets first, then capped. A category throws up dozens of
    // technically-valid groupings, and forty article ideas is not a plan.
    .sort((a, b) => b.products.length - a.products.length)
    .slice(0, 4);
}

function findBrands(products) {
  const byBrand = new Map();
  for (const p of products) {
    const b = (p.brand || '').trim();
    if (!b) continue;
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b).push(p);
  }
  return [...byBrand.entries()]
    .filter(([, ps]) => ps.length >= MIN_CLUSTER)
    .map(([brand, ps]) => ({ kind: 'brand', brand, products: ps }));
}

/**
 * Working titles are deliberately framed as comparisons drawn from specs, never
 * as reviews or "best" verdicts. Nobody here has tested these products, and the
 * published editorial policy commits to research from specifications and
 * merchant information rather than hands-on testing. A generated title that
 * implies otherwise would contradict a promise already made to readers.
 */
function proposeTitle(cluster, categoryName) {
  const n = cluster.products.length;
  if (cluster.kind === 'brand') return `${cluster.brand} ${categoryName.toLowerCase()} compared: ${n} models side by side`;
  if (cluster.kind === 'facet') {
    // A "Yes" value means the attribute itself is the angle: the cluster is
    // "cameras WITH night vision", not "cameras with Yes night vision".
    const boolish = /^(yes|true|supported|included)$/i.test(cluster.value);
    const angle = boolish ? cluster.attribute.toLowerCase() : `${cluster.value} ${cluster.attribute.toLowerCase()}`;
    return `${categoryName} with ${angle}: ${n} compared`;
  }
  return `${categoryName} compared: ${n} models and what the specs say`;
}

function clusterKey(cluster) {
  return cluster.products.map((p) => p.slug).sort().join('|');
}

/**
 * Existing posts that already cover a cluster's products.
 *
 * Naive token overlap does not work here and the failure is not subtle: an
 * earlier version matched "Amazon Basics Smart Plug" to "Amazon Smart
 * Thermostat", because `amazon` and `smart` are shared. Both are category
 * vocabulary, not identity.
 *
 * So a match needs evidence that is actually distinctive:
 *
 *   - a shared model designator (p110m, kp125m, l530e) — decisive on its own; or
 *   - two shared tokens that are RARE across the corpus, where rarity is
 *     measured against the titles themselves rather than guessed at with a
 *     hand-written stop list. `amazon` appears in dozens of titles and is
 *     therefore worthless; `ultraloq` appears in one and is conclusive.
 *
 * Where the product name carries a model token and the post does not share it,
 * the two are treated as different products even if everything else matches —
 * that is what keeps "Echo Dot 5th Gen" apart from "Echo Dot Max".
 */
function buildRarity(posts, products) {
  const df = new Map();
  const docs = [...posts.map((p) => p.title), ...products.map((p) => p.name)];
  for (const d of docs) {
    for (const t of new Set(tokens(d))) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const total = docs.length || 1;
  // A token in more than 4% of titles is vocabulary, not identity.
  return (t) => (df.get(t) ?? 0) / total <= 0.04;
}

function findOverlaps(cluster, posts, isRare) {
  const byPost = new Map();
  for (const product of cluster.products) {
    const pt = tokens(product.name);
    if (pt.length < 2) continue;
    const models = pt.filter(isModelToken);

    for (const post of posts) {
      const shared = pt.filter((t) => post.tokens.has(t));
      const sharedModels = shared.filter(isModelToken);

      let matched = false;
      if (models.length) {
        // The product names a model. Only a post naming the same model is about
        // the same product — this is what keeps "Echo Dot 5th Gen" apart from
        // "Echo Dot Max", and Tapo P110M apart from Tapo L530E.
        matched = sharedModels.length > 0;
      } else {
        // No model designator, so the name is generic vocabulary ("Amazon Smart
        // Plug") and rare-token scoring finds nothing to hold on to. Require the
        // title to contain the WHOLE product name instead: "Amazon Smart Plug
        // Review" contains all of [amazon, smart, plug] and matches, while
        // "Amazon Smart Thermostat" is missing [plug] and does not.
        matched = pt.every((t) => post.tokens.has(t));
      }
      if (!matched) continue;

      // One row per post, listing every product it collides with.
      if (!byPost.has(post.slug)) byPost.set(post.slug, { post: post.title, slug: post.slug, products: [] });
      byPost.get(post.slug).products.push(product.name);
    }
  }
  return [...byPost.values()];
}

// ── run ──────────────────────────────────────────────────────────────────────

const targetSlugs = ONLY_CATEGORY
  ? CATEGORY_SLUGS.filter((s) => s === ONLY_CATEGORY)
  : [...CATEGORY_SLUGS];

if (!targetSlugs.length) {
  console.error(`No category matched "${ONLY_CATEGORY}". Available:\n  ${CATEGORY_SLUGS.join('\n  ')}`);
  process.exit(1);
}

const [categories, posts] = await Promise.all([listProductCategories(), fetchPublishedPosts()]);
// Rarity is measured across every in-scope product name and post title, so the
// matcher learns that `amazon` is vocabulary and `ultraloq` is identity rather
// than being told so by a hand-written list that would rot.
const allScoped = (await Promise.all(CATEGORY_SLUGS.map((s) => fetchScopedProducts(s)))).flat();
const isRare = buildRarity(posts, allScoped);
const nameBySlug = new Map(categories.map((c) => [c.slug, c.name]));

console.log(`catalogue scope : ${targetSlugs.length} categor${targetSlugs.length === 1 ? 'y' : 'ies'}`);
console.log(`published posts : ${posts.length} (site=${SITE})`);
console.log('');

const report = [];
let totalProducts = 0;
let totalReady = 0;

for (const slug of targetSlugs) {
  const categoryName = nameBySlug.get(slug) ?? slug;
  const products = await fetchScopedProducts(slug);
  totalProducts += products.length;

  const ready = products.filter((p) => isArticleReady(readiness(p)));
  totalReady += ready.length;

  console.log(`── ${categoryName} (${slug})`);
  console.log(`   ${products.length} products, ${ready.length} with enough data to write from`);

  if (ready.length < MIN_CLUSTER) {
    console.log(`   SKIPPED — fewer than ${MIN_CLUSTER} article-ready products, nothing to compare\n`);
    report.push({ category: slug, categoryName, products: products.length, ready: ready.length, clusters: [] });
    continue;
  }

  const candidates = [
    { kind: 'category', products: ready },
    ...findBrands(ready),
    ...findFacets(ready, categoryName),
  ];

  // Same membership proposed twice (a brand that happens to be the whole
  // category, say) is one article, not two. First one wins.
  const seen = new Set();
  const clusters = [];
  for (const c of candidates) {
    const trimmed = { ...c, products: c.products.slice(0, MAX_CLUSTER) };
    const key = clusterKey(trimmed);
    if (seen.has(key) || trimmed.products.length < MIN_CLUSTER) continue;
    seen.add(key);
    clusters.push(trimmed);
  }

  const rows = [];
  for (const c of clusters) {
    const overlaps = findOverlaps(c, posts, isRare);
    const title = proposeTitle(c, categoryName);
    const withOffer = c.products.filter((p) => bestOffer(p)).length;

    console.log('');
    console.log(`   • ${title}`);
    console.log(`     ${c.products.length} products · ${withOffer} with a live offer` +
      (overlaps.length ? ` · ⚠ ${overlaps.length} existing post${overlaps.length === 1 ? '' : 's'} already cover this ground` : ''));
    for (const p of c.products) console.log(`       - ${p.name}`);
    for (const o of overlaps.slice(0, 4)) {
      console.log(`       ⚠ ${p_short(o.post)}`);
      console.log(`         covers: ${o.products.map(p_short).join(', ')}`);
    }

    rows.push({
      title,
      kind: c.kind,
      attribute: c.attribute ?? null,
      value: c.value ?? c.brand ?? null,
      products: c.products.map((p) => ({ slug: p.slug, name: p.name, hasOffer: Boolean(bestOffer(p)) })),
      markers: c.products.map((p) => `::product:${p.slug}::`),
          overlaps: overlaps.map((o) => ({ post: o.post, slug: o.slug, products: o.products })),
    });
  }

  console.log('');
  report.push({ category: slug, categoryName, products: products.length, ready: ready.length, clusters: rows });
}

function p_short(s) {
  return s.length > 58 ? s.slice(0, 57) + '…' : s;
}

const clusterCount = report.reduce((n, r) => n + r.clusters.length, 0);
const clean = report.reduce((n, r) => n + r.clusters.filter((c) => !c.overlaps.length).length, 0);

console.log('────────────────────────────────────────────────────────');
console.log(`products in scope   : ${totalProducts}`);
console.log(`article-ready       : ${totalReady}`);
console.log(`clusters proposed   : ${clusterCount}`);
console.log(`without overlap     : ${clean}`);
console.log(`needing a decision  : ${clusterCount - clean} (overlap an existing post — rewrite, merge or skip)`);

if (JSON_OUT) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify({ site: SITE, generatedFrom: BASE, report }, null, 2));
  console.log(`\nwrote ${JSON_OUT}`);
}
