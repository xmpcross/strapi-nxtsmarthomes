/**
 * Normalises links inside imported article bodies, at render time.
 *
 * WHY THIS IS NOT A CMS MIGRATION. Every one of the 140 published posts carries
 * internal links written by the WordPress export: absolute, host-qualified, and
 * trailing-slashed — `https://www.nxtsmart.homes/how-to-guides/foo/`. This site
 * serves canonical URLs without a trailing slash and 301s `www.` to the apex, so
 * each of those links costs the reader up to two redirect hops, and wastes the
 * same on every crawl.
 *
 * Rewriting 140 records in Strapi would fix it once and risk mangling content
 * that no longer has a backup. Doing it here is reversible — delete this module
 * and the original markup renders again — and it cannot corrupt the source.
 *
 * Three transformations, in order:
 *
 *   1. Absolute self-links (with or without `www.`) become root-relative, which
 *      removes the host hop entirely and survives a domain change.
 *   2. Trailing slashes are stripped from internal paths, matching the canonical
 *      form already emitted by `alternates.canonical`.
 *   3. GreenShift fragment anchors (`#ld-gsbp-…`) are unwrapped to plain text.
 *      They are artefacts of the page-builder the old site used: mid-sentence
 *      links pointing at a block ID on the same page, which read as manipulative
 *      and take the reader nowhere useful.
 *
 * External links are untouched — an outbound URL's trailing slash is the
 * merchant's business, and stripping it can break signed affiliate URLs.
 */

const HOSTS = ['nxtsmart.homes', 'www.nxtsmart.homes'];

/** Absolute links to our own host, with or without www. */
const SELF_HOST = new RegExp(
  `href="https?://(?:${HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')})(/[^"]*)?"`,
  'gi',
);

/** A root-relative internal path ending in a slash — but never bare "/". */
const TRAILING_SLASH = /href="(\/[^"?#]*[^/"?#])\/(?=["?#])/gi;

/** GreenShift page-builder anchors: <a href="#ld-gsbp-xxxx">text</a> */
const GSBP_ANCHOR = /<a\b[^>]*href="#ld-gsbp-[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

export function normaliseInternalLinks(html: string): string {
  return String(html || '')
    // Root-relative, so no host hop and no www redirect. A bare origin link
    // ("https://nxtsmart.homes") has no path and becomes "/".
    .replace(SELF_HOST, (_m, path) => `href="${path || '/'}"`)
    .replace(TRAILING_SLASH, 'href="$1')
    .replace(GSBP_ANCHOR, '$1');
}
