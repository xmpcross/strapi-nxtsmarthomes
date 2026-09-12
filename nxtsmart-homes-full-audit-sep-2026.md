# nxtsmart.homes — Full Audit, September 2026

Working reference for agents. Findings, evidence, and the live task register.

- **Audited:** 12 September 2026
- **Method:** live crawl of production (6 pages in full, complete URL inventory from `/sitemap`, all three legal pages) plus the Notion project record
- **Scores:** SEO 4/10 · GEO 4/10 · AEO 5/10
- **Notion audit page:** https://app.notion.com/p/3d9007e8eecb8133b0a1e3969fd1a6a0

> Prior work exists. An `SEO Audit & Topical Architecture Guide`, an `Action Plan`
> and a `Keyword Strategy & SEO Content Plan` from **August 2026** are in the Notion
> Doc database. This audit was run independently and does not incorporate them.
> Reconcile before creating new work.

---

## 1. The core finding

Two content tiers wearing one skin.

| | Tier A | Tier B |
|---|---|---|
| Count | 14 | 115 |
| Published | Jul 2026 | **Apr 2024** (imported Jul 2026) |
| Categories | Automation (7), Devices (4), Security (3) | Reviews (28), Informative (28), How-to (23), Comparisons (20), Top-Rated (16) |
| Titles | Full, readable | Truncated mid-word |
| Meta description | Written per page | Cut off mid-sentence |
| Images | Own CMS | Hotlinked from Amazon |
| Third-party review text | No | **Yes — republished verbatim** |
| Rating scores | No | **Yes — no methodology** |

**Tier A is the standard.** Match it. Never match Tier B for consistency.

Three empty categories — Entertainment, Energy, Integration — are linked from
every page footer and render "No posts here yet".

---

## 2. Findings by severity

### Critical

| ID | Finding | Evidence |
|---|---|---|
| C1 | AdSense is live under unresolved quality issues | `ca-pub-2867376862905050` on every page |
| C2 | Production depends on the WordPress install it replaced | Bodies load `wp.nxtsmart.homes/wp-content/plugins/content-egg/res/logos/amazon.webp` |
| C3 | Amazon customer reviews republished verbatim, unattributed | "User Reviews" block, incl. one in French |
| C4 | Rating scores with no methodology | "9.1 — Highly recommended choice"; own reader-rating count is zero |
| C5 | Category pages emit no canonical, description or OG | Confirmed on `/smart-home-security` and `/smart-home-entertainment`; all 11 |
| C6 | Legal pages name the wrong entity, country and governing law | See section 5 |
| C7 | Cookie policy describes a consent banner that does not appear to exist | No "Cookie settings" link in footer; no banner observed |

### High

| ID | Finding | Evidence |
|---|---|---|
| H1 | ~44 faceted duplicate URLs | `?view=2`, `?view=4`, `?view=list` linked, no canonical |
| H2 | Homepage category counts fabricated | Tiles show 3,4,5,6,7,8 — loop indexes. Real: 28,28,23,20,16,7 |
| H3 | Three conflicting dates for the same post | Sitemap Jul 30 2026 · category Jul 29 2026 · article & `article:published_time` Apr 18 2024 |
| H4 | Truncated titles across Tier B | `Yogasleep Hushh Sound Machine Rev`, `Robot Rumble Lefant M210 Vs`, `Omron Sc 150 Bluetooth Digital`, `Aeotec Vs Elevation C 8` |
| H5 | Truncated meta descriptions | Cut mid-word at ~160 chars: "…this compact device of" |
| H6 | Amazon PA-API breach | Hotlinked `m.media-amazon.com` images incl. as `og:image`; PA-API blocked (no qualifying sales) |

### Medium

| ID | Finding | Evidence |
|---|---|---|
| M1 | Broken internal links | `/product-reviews/ac-controller-transform-cooling-experience-smart-technology`, `/product-comparisons/fingerbot-plus-moesgo-vs-moes-hub` — neither slug exists |
| M2 | Nonsensical auto-linking | Sound machine volume control → smart doorbell settings article; "outlets" → smart plug comparison |
| M3 | Affiliate disclosure below the article | Sits after every affiliate link |
| M4 | Three empty categories linked sitewide | Entertainment, Energy, Integration |
| M5 | No comparison tables | On 20 posts explicitly framed as comparisons |
| M6 | No direct-answer paragraphs on Tier B | Posts open with marketing copy |
| M7 | Author identity weak | Display name is the username `kspellman`; no credentials |
| M8 | Off-topic health content | Infant vitals monitor, blood-pressure monitor, baby sleep, "Voice Activated Assistants Healthcare" |
| M9 | Seven titles dated 2024 or 2025 | Incl. `6 Top Smart Home Hubs 2024`, `What Is A Smart Home … 2025` |

### Low

| ID | Finding | Evidence |
|---|---|---|
| L1 | Unlabelled numbers glued to bylines | Homepage: `Jul 30, 2026` then `31136` |
| L2 | Ordered lists render `1. 1. 1.` | Markdown conversion bug |
| L3 | Empty heading sections | `## Review of Yogasleep Hushh…for Babies` in TOC, nothing beneath |
| L4 | Literal trailing `…` in standfirsts | |
| L5 | "All systems operational" in footer | Status-page component on a blog |
| L6 | www/non-www mismatch in legal text | Legal pages say `www.nxtsmart.homes`; canonical is non-www |

---

## 3. Site inventory

129 posts, 8 populated categories, 3 empty, plus utility and legal pages.

| Category | Posts |
|---|---|
| Smart Home Automation | 7 |
| Smart Home Devices | 4 |
| Smart Home Security | 3 |
| Product Reviews | 28 |
| Informative Articles | 28 |
| How-to Guides | 23 |
| Product Comparisons | 20 |
| Top-Rated Products | 16 |
| Smart Home Entertainment | 0 |
| Smart Home Energy | 0 |
| Smart Home Integration | 0 |

---

## 4. Not assessed

Do not treat these as clean — they were never checked.

| Signal | How to get it |
|---|---|
| Search Console data | Export Performance (16mo), Pages coverage |
| AdSense status, revenue, Policy Center | Export from AdSense |
| Core Web Vitals | `pagespeed.web.dev` |
| JSON-LD schema | Rich Results Test, one page per template |
| Whether ad units actually serve | Load the site and look |
| Whether `wp.nxtsmart.homes` is public | Open it in a browser |
| `/about`, `/editorial-policy`, `/contact`, `/author/kspellman` | Second pass |
| Backlinks | Ahrefs / GSC Links |

---

## 5. Legal review

All three legal pages dated 2 May 2026. Drafting quality is high — correct GDPR
article references, real CCPA/CPRA section, other US state laws, SCCs, GPC,
COPPA. The substance is good. The identity and jurisdiction are wrong.

**Wrong entity.** All three open with *"owned and operated by FXN Holdings, a
registered business in Australia"*. Privacy names the controller as "FXN Holdings,
Western Australia". The actual operator is **FXN Holdings Limited, England &
Wales, company no. 16134139, ICO registration ZB940664**.

Downstream:

| Page | States | Should be |
|---|---|---|
| Privacy | Australian Privacy Act 1988 primary | UK GDPR primary |
| Privacy | Complaints to the OAIC | ICO |
| Terms | Governed by the laws of Western Australia | England & Wales |
| Terms | Venue WA courts, mediation in Perth | England & Wales |
| Terms | Copyright under the laws of Australia | UK / international |
| All | No company number, ICO number or registered office | All three required |

**Unfilled placeholders live in production:**

- `FXN Holdings (ABN )` — empty field
- "providing FXN Holdings with days' notice" — missing number
- "price comparisions" — typo, and the site does not do price comparison
- "whilst you are a Member" — no membership concept exists

**Template disclaimers still published:** both policies end with *"provided as a
general template … does not constitute legal advice"*. The cookie version adds
that it *"assumes a working cookie-consent banner is deployed"*.

**Consent banner.** The cookie policy promises one plus a "Cookie settings" footer
link. Neither observed. With AdSense live and EEA/UK traffic, Google's EU User
Consent Policy requires a certified CMP. Verify from an EEA/UK IP before
concluding it is absent — it may be geo-gated.

**Google never named.** No advertising vendor appears in either policy. The cookie
policy's third-party list has no advertising category at all.

**Contradictions.** Terms §10 says the site is "intended to be viewed by residents
of Australia" while the privacy policy runs full GDPR and CCPA provisions and the
site targets US/UK/AU. Privacy also claims to collect payment info, billing and
shipping addresses "for our e-commerce operations including NXT Smart Home and
NXT Outlet" — this is a blog with no checkout.

**No standalone disclosure page.** Affiliate disclosure exists only as privacy §13.
bestlooking.skin has `/legal/disclosure`; this site does not.

> **Do not fix legal pages by editing text.** A UK solicitor must review the
> framework, not just the country name. Flag and stop.

---

## 6. Task register

Live in the Notion Tasks database. Update these rather than creating duplicates.

- **Data source:** `collection://3af007e8-eecb-80df-a2d1-000b6e65fcd0`
- **Project relation:** `https://app.notion.com/p/3b2007e8eecb81119de6c2510d843a9a`
- **Status values:** `Not started` · `Up next` · `In progress` · `Done`

| Task | Notion page ID | Finding |
|---|---|---|
| P0 · Check AdSense Policy Center for existing actions | `3d9007e8-eecb-810b-8536-e19da7862290` | C1 |
| P0 · Check whether wp.nxtsmart.homes is publicly indexable | `3d9007e8-eecb-81ca-9cdf-c2a97ddeb7b6` | C2 |
| P0 · Remove republished third-party review text | `3d9007e8-eecb-812c-bcc1-d31b7dacd882` | C3 |
| P0 · Remove or justify the unearned rating scores | `3d9007e8-eecb-8136-8084-e59dd7aea67d` | C4 |
| P0 · Add canonical, description and OG to the category template | `3d9007e8-eecb-8144-9266-e5e065a8bc6a` | C5 |
| P0 · Legal pages name the wrong entity, country and governing law | `3d9007e8-eecb-81e2-8194-eeb1414b18ba` | C6 |
| P0 · Verify the cookie consent banner exists | `3d9007e8-eecb-814c-b8a0-f44926a1ba8d` | C7 |
| P0 · Remove template disclaimers and unfilled placeholders | `3d9007e8-eecb-814c-b102-dfc2b218ef61` | C6 |
| P1 · Canonicalise the ?view= faceted category URLs | `3d9007e8-eecb-81cb-8db7-e12d8c49f410` | H1 |
| P1 · Remove Amazon hotlinked images and non-compliant blocks | `3d9007e8-eecb-813f-af98-ceb5329086ab` | H6 |
| P1 · Fix fabricated homepage category counts | `3d9007e8-eecb-8191-9945-e0d677a4b103` | H2 |
| P1 · Reconcile the three conflicting date sources | `3d9007e8-eecb-81de-89ad-f8d4d2ab4ccf` | H3 |
| P1 · Fix truncated titles and meta descriptions | `3d9007e8-eecb-816d-9e76-f8838958c211` | H4, H5 |
| P1 · Disclose Google AdSense in the privacy and cookie policies | `3d9007e8-eecb-81b6-a5f6-ca22832d22ba` | C6 |
| P1 · Fix legal pages that contradict the actual business | `3d9007e8-eecb-8101-87f2-efae96333340` | C6 |
| P2 · Remove the WordPress asset dependency | `3d9007e8-eecb-8175-b179-d9c23abdf296` | C2 |
| P2 · Fill or unlink the three empty categories | `3d9007e8-eecb-8113-8fa0-eb8609eb8c65` | M4 |
| P2 · Fix broken and nonsensical internal links | `3d9007e8-eecb-8122-9493-d762cf998b10` | M1, M2 |
| P2 · Move affiliate disclosure above the content | `3d9007e8-eecb-81e1-afdc-f369b4841954` | M3 |
| P2 · Give authors real display names and credentials | `3d9007e8-eecb-8135-9969-e2f1159581ed` | M7 |
| P2 · Create a standalone affiliate disclosure page | `3d9007e8-eecb-8140-91e0-c60d23af61a0` | C6 |
| P3 · Add comparison tables to the 20 comparison posts | `3d9007e8-eecb-81dc-97a8-f435f8fc7569` | M5 |
| P3 · Add direct-answer paragraphs to legacy posts | `3d9007e8-eecb-814b-a6c2-f1574f3bd0cf` | M6 |
| P3 · Export Search Console baseline | `3d9007e8-eecb-81d7-934e-ecd50db7394e` | — |
| P3 · Remove off-topic health and baby-device content | `3d9007e8-eecb-81d6-9ec4-eac60644dd3b` | M8 |
| P3 · Fix www/non-www mismatch in legal page text | `3d9007e8-eecb-81d5-8309-e8b5b71af81f` | L6 |
| P4 · Rewrite the seven titles dated 2024 and 2025 | `3d9007e8-eecb-8189-a299-d762563be95d` | M9 |
| P4 · Fix import rendering bugs | `3d9007e8-eecb-814e-90d0-f7d52dc51e2a` | L1–L5 |
| P4 · Verify structured data across all templates | `3d9007e8-eecb-8166-9ccd-e655569d1331` | — |
| P4 · Reconcile with the August 2026 audit and action plan | `3d9007e8-eecb-817b-b3da-e192df33aabb` | — |
| P5 · Expand the editorial policy into a methodology page | `3d9007e8-eecb-8169-8798-df823773f623` | C4 |
| P5 · Portfolio · Set one policy for imported legacy content | `3d9007e8-eecb-8146-a1e4-c2aa44077348` | — |

---

## 7. Suggested sequence

1. **Verify before fixing.** AdSense Policy Center, `wp.nxtsmart.homes` indexability, consent banner from an EEA/UK IP. All three change the plan.
2. **Template fixes.** Category metadata, `?view=` canonicals, homepage counts, date reconciliation. Low effort, site-wide effect.
3. **Compliance content.** Remove republished reviews, remove or justify scores, remove Amazon hotlinks.
4. **Legal.** Flag to a UK solicitor. Do not edit.
5. **Content debt.** Titles and descriptions, then direct answers and comparison tables, prioritised by Search Console impressions.
6. **Structural.** WordPress dependency, empty categories, author credentials.