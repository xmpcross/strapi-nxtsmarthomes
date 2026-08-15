/**
 * Deciding whether a piece of text names a given product.
 *
 * Shared by the cluster report and the post-coverage extractor, because the two
 * asking the same question differently is how they end up disagreeing about
 * whether an article already covers a product.
 *
 * The rules here were arrived at by watching the naive versions fail:
 *
 *   - Plain shared-token overlap matched "Amazon Basics Smart Plug" to "Amazon
 *     Smart Thermostat". `amazon` and `smart` are category vocabulary.
 *   - Scoring by token rarity fixed that but then missed the real match between
 *     the product "Amazon Smart Plug" and the post "Amazon Smart Plug Review",
 *     because a wholly generic name contains no rare token to key on.
 *
 * So identity is decided by whether the name carries a model designator:
 *
 *   with one    (p110m, kp125m, l530e) → only a shared model designator counts,
 *                which is what keeps "Echo Dot 5th Gen" apart from "Echo Dot Max"
 *   without one (Amazon Smart Plug)    → the text must contain the whole name
 *
 * The sourcing repo has a richer matcher at nxt-sourcing/scripts/lib/
 * product-match.mjs (isSameProduct, variantSet, capacityOf …). It belongs to a
 * different repo and solves a harder problem — reconciling merchant listings.
 * This is the small, self-contained version for text-vs-catalogue questions.
 */

/** Words carrying no identity signal in a product name or a post title. */
export const STOP = new Set([
  'the', 'and', 'for', 'with', 'your', 'best', 'top', 'review', 'reviews', 'vs',
  'a', 'an', 'of', 'to', 'in', 'on', 'is', 'it', 'gen', 'new', '2024', '2025', '2026',
]);

export function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** A token mixing letters and digits is almost always a model designator. */
export function isModelToken(t) {
  return /\d/.test(t) && /[a-z]/.test(t);
}

/**
 * Does `text` name `productName`?
 *
 * Both arguments are raw strings; tokenisation happens here so callers cannot
 * accidentally apply different rules. Pass `textTokens` as a prepared Set when
 * matching one name against many texts in a loop.
 */
export function textNamesProduct(productName, text, textTokens = null) {
  const pt = tokens(productName);
  if (pt.length < 2) return false;
  const set = textTokens ?? new Set(tokens(text));

  const models = pt.filter(isModelToken);
  if (models.length) return models.some((m) => set.has(m));
  return pt.every((t) => set.has(t));
}

/** Prepared token set for text that will be tested against many product names. */
export function prepare(text) {
  return new Set(tokens(text));
}
