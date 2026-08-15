/**
 * Mirror this site's post categories as commerce categories, and file the
 * existing catalogue into them. DRY RUN unless --write is passed.
 *
 *   node --experimental-strip-types scripts/sync-product-categories.mjs
 *   node --experimental-strip-types scripts/sync-product-categories.mjs --write
 *
 * WHY. The product section used nxt.bargains' taxonomy — Smart Plugs, Smart
 * Cameras, Video Doorbells — while the articles use this site's own topics:
 * Smart Home Automation, Smart Home Security, and so on. Two taxonomies over
 * one body of content means a category page can never show both.
 *
 * So the six topic categories from `nxtsmart-categories` get a matching
 * `commerce-category`, and every in-scope product is filed into the one that
 * fits. The five format categories (Product Reviews, How-to Guides, Top Rated,
 * Product Comparisons, Informative Articles) are deliberately NOT mirrored:
 * they describe an article's shape, not a kind of device, and a product cannot
 * belong to them.
 *
 * SAFETY. `categories` on commerce-product is manyToMany, so products are ADDED
 * to the new categories and keep their existing ones. nxt.bargains queries its
 * own slugs and is unaffected. Nothing is removed and nothing is renamed; the
 * script is idempotent and can be re-run.
 *
 * These are shared CMS records. Run the dry run and read it before --write.
 */

import { getScopeSlugs } from '../lib/commerce.ts';

const BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.fxnstudio.com').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_API_TOKEN;
const WRITE = process.argv.includes('--write');

/**
 * Post category → the catalogue categories whose products belong under it.
 *
 * Smart Home Devices is the catch-all: the post category is broad, so it takes
 * everything rather than being left empty or given an arbitrary slice.
 *
 * Smart Home Integration has no entry on purpose. Hubs and bridges are the
 * products that would fill it and none are in scope — they sit in the AU-only
 * `hubs-platforms` category. An empty category is better than a dishonest one,
 * and it becomes real as soon as hubs are sourced.
 */
const MAPPING = {
  'smart-home-security': ['smart-cameras', 'smart-door-locks', 'video-doorbells'],
  'smart-home-automation': ['smart-plugs', 'smart-light-bulbs'],
  'smart-home-entertainment': ['smart-speakers'],
  'smart-home-devices': '*',
};

/**
 * Energy is a capability rather than a product type, so membership is derived.
 *
 * The specs cannot be trusted for it: the two plugs literally named "(Energy
 * Monitoring)" carry no energy spec key at all, while others carry the key set
 * to "No". So the product name is the primary signal and the spec is a
 * secondary one, not the other way round.
 */
const IS_ENERGY = (p) =>
  /energy monitoring/i.test(p.name || '') ||
  Object.entries(p.specs ?? {}).some(
    ([k, v]) => /energy monitoring/i.test(k) && /^(yes|true)$/i.test(String(v)),
  );

/** Below this a category page is too thin to publish, so it is not created. */
const MIN_PRODUCTS = 3;

async function api(path, params = '') {
  const res = await fetch(`${BASE}/api/${path}${params}`, {
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
  });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

async function send(method, path, data) {
  if (!TOKEN) throw new Error('No STRAPI_WRITE_TOKEN / STRAPI_API_TOKEN in the environment');
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

async function fetchAll(path, params) {
  const out = [];
  for (let page = 1; page <= 30; page++) {
    const json = await api(path, `?${params}&pagination[page]=${page}&pagination[pageSize]=100`);
    out.push(...(json.data ?? []));
    if (page >= (json.meta?.pagination?.pageCount ?? 1)) break;
  }
  return out;
}

// ── plan ─────────────────────────────────────────────────────────────────────

const scope = await getScopeSlugs();

const postCategories = (
  await fetchAll('nxtsmart-categories', 'fields[0]=name&fields[1]=slug&fields[2]=site')
).filter((c) => c.site === 'nxtsmart.homes' && (MAPPING[c.slug] || c.slug === 'smart-home-energy'));

const existingCommerce = await fetchAll('commerce-categories', 'fields[0]=name&fields[1]=slug');
const commerceBySlug = new Map(existingCommerce.map((c) => [c.slug, c]));

const products = await fetchAll(
  'commerce-products',
  'filters[productStatus][$eq]=active&fields[0]=name&fields[1]=slug&fields[2]=specs&populate[categories][fields][0]=slug',
);
const inScope = products.filter((p) => (p.categories ?? []).some((c) => scope.includes(c.slug)));

console.log(`mode            : ${WRITE ? 'WRITE' : 'dry run'}`);
console.log(`scope           : ${scope.length} catalogue categories, ${inScope.length} products`);
console.log(`post categories : ${postCategories.length} to mirror`);
console.log('');

const plan = [];
for (const pc of postCategories) {
  const rule = MAPPING[pc.slug];
  let members;
  if (pc.slug === 'smart-home-energy') members = inScope.filter(IS_ENERGY);
  else if (rule === '*') members = inScope;
  else members = inScope.filter((p) => (p.categories ?? []).some((c) => rule.includes(c.slug)));

  const exists = commerceBySlug.get(pc.slug);
  const toAdd = members.filter((p) => !(p.categories ?? []).some((c) => c.slug === pc.slug));

  const thin = members.length < MIN_PRODUCTS;
  if (!thin) plan.push({ pc, exists, members, toAdd });
  console.log(`── ${pc.name}  (${pc.slug})`);
  console.log(`   commerce category : ${exists ? `exists (id ${exists.id})` : 'CREATE'}`);
  console.log(`   products          : ${members.length} matched, ${toAdd.length} to file`);
  if (thin) console.log(`   SKIPPED — ${members.length} product(s), below the ${MIN_PRODUCTS} needed for a page worth publishing`);
  console.log('');
}

if (!WRITE) {
  console.log('dry run only. re-run with --write to apply.');
  process.exit(0);
}

// ── apply ────────────────────────────────────────────────────────────────────

// Categories first, so every documentId exists before any product is written.
for (const item of plan) {
  if (item.exists) continue;
  item.exists = await send('POST', 'commerce-categories', {
    name: item.pc.name,
    slug: item.pc.slug,
    description: `${item.pc.name} products for nxtsmart.homes.`,
    categoryStatus: 'active',
  });
  console.log(`created category ${item.pc.slug} (id ${item.exists.id})`);
}

/*
 * One PUT per product, carrying its complete final category set.
 *
 * The obvious shape — loop the categories, and for each one write its members —
 * is wrong here, and quietly so. `categories` is manyToMany, and Strapi
 * REPLACES a manyToMany on update rather than appending, so each write has to
 * send the full set. Writing category by category means every write is built
 * from the pre-run snapshot, and the last category to touch a product wins
 * while the earlier ones are silently dropped.
 *
 * That is exactly what happened on the first run: smart-home-automation
 * finished with 0 products and smart-home-devices with 16 of 58, because the
 * security and entertainment passes overwrote them. The original nxt.bargains
 * categories survived only because they were in the snapshot every time.
 *
 * Accumulating per product and writing once makes the result independent of
 * ordering, and re-running it repairs a partial state rather than compounding.
 */
const desired = new Map();
for (const item of plan) {
  for (const p of item.members) {
    if (!desired.has(p.documentId)) {
      desired.set(p.documentId, {
        name: p.name,
        ids: new Set((p.categories ?? []).map((c) => c.documentId).filter(Boolean)),
        before: new Set((p.categories ?? []).map((c) => c.slug)),
      });
    }
    desired.get(p.documentId).ids.add(item.exists.documentId);
  }
}

let written = 0;
for (const [documentId, want] of desired) {
  const targetSlugs = plan.filter((i) => i.members.some((m) => m.documentId === documentId)).map((i) => i.pc.slug);
  if (targetSlugs.every((s) => want.before.has(s))) continue; // already correct
  await send('PUT', `commerce-products/${documentId}`, { categories: [...want.ids] });
  written++;
}

console.log(`\nwrote ${written} products (${desired.size} in the plan, the rest already correct)`);
for (const item of plan) console.log(`  ${item.pc.slug}: ${item.members.length} expected`);
console.log('\ndone. Remember to add the new slugs to enabledCategories on the site row.');
