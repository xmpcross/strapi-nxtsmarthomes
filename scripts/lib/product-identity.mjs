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

/**
 * Alphanumeric tokens that look like model designators but identify nothing.
 *
 * Ordinals are the worst offenders: "2nd" mixes a digit and letters, so a naive
 * check called it a model designator and every "… 2nd Gen" product matched every
 * other. That is how "Google Nest Mini 2nd Gen" in an article was matched to the
 * catalogue's Google Nest Cam Outdoor 2nd Gen.
 *
 * Lamp bases and bulb shapes are the same problem one step subtler — A19, E27
 * and BR30 are open standards every manufacturer builds to, so matching on them
 * paired a GE CYNC A19 article with a Philips Hue A19 record.
 */
const NON_MODEL = /^(\d+(st|nd|rd|th)|a1[59]|a60|b\d{2}|br\d{2}|e1[24]|e2[67]|par\d{2}|gu10|mr16|\d+w|\d+k|\d+v|\d+ch|\d+mp|\d+p|\d+lm|\d+lux|4k|8k|1080p?|720p?)$/;

/**
 * Words that pick one product out of a range: Echo Dot vs Echo Dot Max, Ring
 * Battery Doorbell Pro vs Ring Video Doorbell Pro, 2nd Gen vs 5th Gen. These
 * are the tokens whose absence matters most, so a plain overlap ratio treats
 * them as ordinary words and quietly conflates generations.
 */
const VARIANT = new Set([
  'max', 'pro', 'plus', 'mini', 'ultra', 'lite', 'air', 'elite', 'premium',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  // Lamp shapes and bases discriminate exactly like variants. They are excluded
  // from model designators above because every manufacturer builds to them, but
  // two bulbs differing only in shape are still different products: "Philips
  // Hue Essential A19" is not "Philips Hue Essential BR30", and word overlap
  // alone happily conflated them.
  'a19', 'a21', 'a60', 'br30', 'br40', 'st19', 'st64', 'g25', 'g95',
  'e26', 'e27', 'e12', 'e14', 'gu10', 'mr16', 'par20', 'par30', 'par38',
]);

/** True when both names name a variant and they share none of them. */
function variantsConflict(productTokens, textTokens) {
  const a = productTokens.filter((t) => VARIANT.has(t));
  if (!a.length) return false;
  const b = [...textTokens].filter((t) => VARIANT.has(t));
  if (!b.length) return false;
  return !a.some((t) => b.includes(t));
}

/** A token mixing letters and digits is usually a model designator — with exceptions. */
export function isModelToken(t) {
  if (!/\d/.test(t) || !/[a-z]/.test(t)) return false;
  return !NON_MODEL.test(t);
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

  if (models.length) {
    // A true model designator (p110m, kp125m) is near-unique, so a shared one
    // plus any other shared word is enough. The ordinals and lamp-base codes
    // that used to cause false matches never reach here — NON_MODEL excludes
    // them, so this path now sees only genuinely distinctive designators.
    if (!models.some((m) => set.has(m))) return false;
    const rest = pt.filter((t) => !isModelToken(t));
    return rest.length === 0 || rest.some((t) => set.has(t));
  }

  /*
   * No model designator, so identity rests on the words alone.
   *
   * Requiring every token was too strict — "Google Nest Cam Outdoor 2nd Gen
   * Wired" then failed to match an article about the Google Nest Cam Outdoor
   * 2nd Gen, purely on the trailing "Wired". But three quarters was too loose:
   * "Amazon Echo Dot Max" matched a heading about the "Amazon Echo Dot 5th Gen
   * Clock" on 3 of 4 tokens, and a Ring Battery Doorbell Pro matched a Ring
   * Video Doorbell Pro heading the same way. In both, the single missing token
   * WAS the product's identity.
   *
   * So: four fifths, plus an explicit check that the variant words do not
   * contradict each other. Where both names carry a variant and they share
   * none, they are different products however much else lines up.
   */
  if (variantsConflict(pt, set)) return false;
  const present = pt.filter((t) => set.has(t)).length;
  return present / pt.length >= 0.8;
}

/** Prepared token set for text that will be tested against many product names. */
export function prepare(text) {
  return new Set(tokens(text));
}
