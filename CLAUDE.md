# CLAUDE.md — nxtsmart.homes

Context for working on this repo. Read this before making changes.

Last updated: 12 September 2026, from the full SEO/GEO/AEO and legal audit.

---

## Start here — read the audit first

Before planning or changing anything on this site, read:

```
nxtsmart-homes-full-audit-sep-2026.md
```

It sits alongside this file and contains the full findings, the evidence behind
each one, and the **live task register with Notion page IDs**. This file tells you
how the site works; that file tells you what is wrong with it and what is already
being tracked.

If a request maps to something in the audit, work from the audit's finding IDs
(C1–C7, H1–H6, M1–M9, L1–L6) rather than re-deriving the problem.

If the audit file is missing, say so rather than guessing — do not reconstruct
the task list from this file.

## Keeping Notion in sync

The audit's task register is live in the Notion Tasks database. Update it as work
lands, rather than leaving it to drift.

- **Data source:** `collection://3af007e8-eecb-80df-a2d1-000b6e65fcd0`
- **Project relation:** `https://app.notion.com/p/3b2007e8eecb81119de6c2510d843a9a`
- **Status values:** `Not started` · `Up next` · `In progress` · `Done`
- **Naming:** `P0 · NXTSmart · <what>` — keep the prefix and the site token

**When you start a task**, set `Status` to `In progress`.

**When you finish one**, set `Status` to `Done` and append a short note to the task
page body: what changed, which files, and how it was verified.

**When you find something the audit missed**, create a new task in the same
database with the same naming convention and the project relation set. Add it to
the audit file's register too, with its new page ID.

### Rules

- **Update the existing task, never create a duplicate.** Look it up by page ID
  from the audit register first.
- **Never mark a task `Done` you have not verified.** Code merged is not the same
  as deployed and checked. If you changed the template but did not confirm the
  output, it is `In progress`.
- **Never delete a task.** If something is obsolete, set it to `Done` and say why
  in the body.
- **Leave the `Source` field blank.** It controls Google Tasks sync and setting it
  moves the task between accounts.
- **Do not reprioritise on your own.** The P0–P5 order encodes risk, not
  convenience. If you think something is misprioritised, say so rather than
  silently changing it.
- **Ask before bulk edits.** Updating one task as you complete it is routine;
  changing status on many at once is not.

---

## What this is

A smart-home editorial site — guides, device reviews, comparisons, how-to
walkthroughs. Markets: US, UK, AU (global English). Monetised by **affiliate
links and live AdSense**.

Operated by Kritin under FXN Holdings Limited, as part of a multi-site portfolio
sharing one Strapi backend.

## Do not confuse this with nxtsmarthome.com.au

There are **two smart-home sites in this portfolio** and they are different
projects with different stacks:

| | This site | The other one |
|---|---|---|
| Domain | `nxtsmart.homes` | `nxtsmarthome.com.au` |
| Market | US / UK / AU | AU only |
| Stack | Next.js + shared Strapi | Next.js 15 **static export**, markdown via gray-matter, no CMS |
| Deploy | systemd + nginx, own server | nginx from `/var/www/html`, manual `npm run deploy` |
| Source | `/opt/projects/nxtsmart.homes` | `/opt/nxtsmarthome.com.au` |
| Affiliates | Amazon US (`fxnholdings-20`), eBay, Takeads | AU retailers, Commission Factory, IDs still blank |

Check the domain before acting on anything.

## Stack

| | |
|---|---|
| Framework | Next.js, server-rendered |
| Host | Own server — `/opt/projects/nxtsmart.homes` |
| Service | `nxtsmart-homes.service` on `127.0.0.1:3004`, behind nginx |
| TLS | Its own Let's Encrypt certificate |
| CMS | Shared FXN Strapi |
| Media | `cms.fxnstudio.com/uploads/` |
| Canonical host | `https://nxtsmart.homes` — **non-`www`, no trailing slash** |

**Repo is not confirmed in this file.** The Notion project page documents the
deploy path but the audit did not verify a GitHub remote. Check before assuming —
the sibling site bestlooking.skin had a wrong repo owner recorded in Notion for
weeks. Confirm and fill this in.

### Verification tags in `<head>` — do not remove

```
google-adsense-account   ca-pub-2867376862905050
mitgo-verification       f6e9656d-cf32-4c1d-a474-77787ef6cfab
msvalidate.01            057158952120360611CA2F41AD7D5B50
```

---

## The two things that make this site different

### 1. AdSense is LIVE

`ca-pub-2867376862905050` is verified on every page. This changes the risk
calculus completely versus the other portfolio sites, which have not applied.

Quality problems here are not a rejection risk — they are **live policy
exposure** under an active account. Two open issues are squarely in scope:
republished Amazon review text, and rating scores with no methodology.

**Before any content work, check the AdSense Policy Center.** If there are
existing warnings, they reorder everything.

### 2. The site still runs on the WordPress install it replaced

Article bodies load images from:

```
https://wp.nxtsmart.homes/wp-content/plugins/content-egg/...
```

Production has a hard runtime dependency on legacy infrastructure. Retire that
WordPress install today and images break across 115 articles.

The subdomain may also be publicly indexable — a full duplicate of the content on
another host. Verify before doing anything else.

Content Egg is also the origin of the affiliate blocks, the scraped reviews and
the 9.1-style scores. When you see those patterns, that plugin is why.

---

## Content model

`bls`-style Strapi collections, one site among several sharing the backend.

**129 posts across 8 populated categories**, plus **3 empty categories linked
sitewide**.

| Category | Posts | Tier |
|---|---|---|
| Smart Home Automation | 7 | A |
| Smart Home Devices | 4 | A |
| Smart Home Security | 3 | A |
| Product Reviews | 28 | B |
| Informative Articles | 28 | B |
| How-to Guides | 23 | B |
| Product Comparisons | 20 | B |
| Top-Rated Products | 16 | B |
| Smart Home Entertainment | **0** | — |
| Smart Home Energy | **0** | — |
| Smart Home Integration | **0** | — |

### The two tiers

| | Tier A | Tier B |
|---|---|---|
| Count | 14 | 115 |
| Real publish date | Jul 2026 | **Apr 2024** |
| Titles | Full, readable | Truncated mid-word |
| Meta description | Written | Cut off mid-sentence |
| Images | Own CMS | **Hotlinked from Amazon** |
| Third-party review text | No | **Yes — republished** |

**Tier A is the standard.** The July 2026 Automation, Devices and Security posts
are the model — match them, never Tier B.

---

## Known-broken things

Do not reintroduce these.

- **Category pages emit no metadata.** No canonical, no meta description, no
  Open Graph — on all 11. Articles have all three; the category template doesn't
  set them. These are the pages that should rank for head terms.
- **Faceted duplicate URLs.** Categories link `?view=2`, `?view=4`, `?view=list`
  as crawlable URLs with no canonical. ~44 near-identical URLs.
- **Homepage category counts are fabricated.** Tiles show 3, 4, 5, 6, 7, 8 —
  loop indexes, not counts. Real figures are 28, 28, 23, 20, 16, 7.
- **Three conflicting dates for the same post.** Sitemap says Jul 30 2026,
  category says Jul 29 2026, article and `article:published_time` say Apr 18 2024.
  The 2026 dates are the import timestamp.
- **Unlabelled numbers glued to bylines.** Homepage renders `Jul 30, 2026`
  immediately followed by `31136`.
- **Broken internal links.** `/product-reviews/ac-controller-transform-cooling-experience-smart-technology`
  and `/product-comparisons/fingerbot-plus-moesgo-vs-moes-hub` — neither slug exists.
- **Nonsensical auto-linking.** Internal links are generated on single-word
  keyword match. A sound machine's volume control links to an article about smart
  doorbell settings. Turn this off or curate it.
- **Empty heading sections.** At least one H2 appears in the TOC and renders with
  nothing beneath it.
- **Ordered lists render `1. 1. 1.`**
- **Truncated titles and meta descriptions** across Tier B.
- **Affiliate disclosure sits below the article**, after every affiliate link.

---

## Content rules

### Never republish third-party review text

Tier B contains a "User Reviews" block reproducing Amazon customer reviews
verbatim, including one in French, unattributed. This is the clearest scraped-
content exposure on a site with live AdSense, and a copyright problem
independently.

Do not generate, restore, or paraphrase these blocks. If reader sentiment is
wanted, use the site's own moderated rating system.

### Never publish a rating score without a methodology

Tier B shows scores like "9.1 — Highly recommended choice" with no testing, no
reviewer and no rubric, while the site's own reader-rating count is zero.

Either the rubric is published on `/editorial-policy` and applied honestly, or
there is no number. Do not invent scores.

Also check whether these emit `AggregateRating` schema — if so, that is a
structured-data policy violation on top.

### Amazon — do not add anything new

- The tag is `fxnholdings-20`. That part is correct.
- **PA-API access is blocked** (no qualifying sales), so hotlinking
  `m.media-amazon.com` images and displaying prices breaches the Associates
  Operating Agreement. Tier B does both.
- Never add a new Amazon image or price widget. Existing ones are being removed.

### Stay on topic

Smart home only. Tier B drifted into health and baby devices — an infant vitals
monitor, a blood-pressure monitor, baby sleep products, "Voice Activated
Assistants Healthcare". Those carry a health-content evidential bar this site
cannot meet. Do not add more.

---

## Legal pages — currently wrong, being fixed

All three legal pages state the site is *"owned and operated by FXN Holdings, a
registered business in Australia"*.

**That is wrong.** The operator is **FXN Holdings Limited, England & Wales,
company no. 16134139, ICO registration ZB940664**.

Downstream errors: privacy runs on the Australian Privacy Act with complaints to
the OAIC instead of the ICO; Terms are governed by the laws of Western Australia
with mediation in Perth; no company number or registered office appears anywhere.

Also live in production:

- `FXN Holdings (ABN )` — empty field
- "providing FXN Holdings with days' notice" — missing number
- Both policies carry the generator's disclaimer: *"provided as a general
  template … does not constitute legal advice"*
- The cookie policy describes a consent banner and a "Cookie settings" footer
  link **that do not appear to exist**
- Google/AdSense is never named, despite being the live ad network

**Do not attempt to fix these by editing text.** A UK solicitor needs to review
the framework, not just the country name. If asked to edit legal pages, say so.

---

## The post template (Tier A)

1. Breadcrumb, then byline with author link and date
2. H1
3. **A 40–60 word direct answer paragraph** — not optional; it is what wins
   snippets and gets cited by AI search
4. Cover image on `cms.fxnstudio.com`, read time, table of contents
5. Affiliate disclosure callout **above** the content
6. Body with question-phrased H2s and clean anchor slugs
7. Comparison table for any `X vs Y` post
8. FAQ section
9. Author bio block

## Conventions

- **Canonical host is non-`www`, no trailing slash.** Internal links root-relative.
- **Every page needs a canonical, meta description and og:image** — categories
  included.
- **Cover images on `cms.fxnstudio.com`**, never hotlinked from a merchant.
- **No years in titles.** Seven still say 2024 or 2025.
- **Comparison posts get a comparison table.** None of the 20 have one.
- **Never link a category that has no posts.**
- Authors need real display names, not usernames. `kspellman` is a username.

## Before shipping

- Canonical, description and og:image present — including on category pages
- No `?view=` variant left uncanonicalised
- Direct-answer paragraph on any explainer
- No merchant-hotlinked images
- No republished review text, no unearned scores
- No empty headings
- Internal links resolve
- Run the Rich Results Test if you touched a template

---

## Where things live

- **Audit — read this first** — `nxtsmart-homes-full-audit-sep-2026.md`, alongside
  this file. Findings, evidence, and the task register with Notion page IDs.
- **Audit (Notion mirror)** — `Full Audit → Full Audit — nxtsmart.homes (Sep 2026)`
- **Tasks** — Notion Tasks database, `collection://3af007e8-eecb-80df-a2d1-000b6e65fcd0`
- **Project record** — Notion, `Projects → nxtsmart.homes`
- **Prior work** — an `SEO Audit & Topical Architecture Guide`, an `Action Plan`
  and a `Keyword Strategy & SEO Content Plan` from **August 2026** exist in the Doc
  database. The September audit was run independently and does not incorporate
  them. Reconcile before creating work.

If the local audit file and the Notion page disagree, Notion is authoritative for
task status; the local file is authoritative for findings and evidence.

## Scores at last audit

SEO 4/10 · GEO 4/10 · AEO 5/10

14 good posts, 115 imported ones that haven't caught up, and a live AdSense
account sitting on top of the gap.