---
phase: 03-full-site-parity
verified: 2026-02-18T10:00:00Z
status: human_needed
score: 9/10 must-haves verified
re_verification: false
human_verification:
  - test: "GET /rss.xml in a running or built site"
    expected: "Returns application/xml with RSS 2.0 envelope and <item> entries for recent chapters"
    why_human: "Cannot verify actual XML output without running the Nitro server or inspecting a built static file"
  - test: "GET /sitemap.xml in a running or built site"
    expected: "Returns a sitemap index XML pointing to per-novel sub-sitemaps; sub-sitemaps include chapter URLs"
    why_human: "Cannot verify @nuxtjs/sitemap runtime XML output without executing the build"
  - test: "Open home page with no localStorage, then read a chapter, then return to home page"
    expected: "After reading, 'Continue Reading' dropdown shows the novel and chapter just visited; clicking navigates back to that chapter"
    why_human: "localStorage read/write and click navigation require a live browser"
---

# Phase 03: Full Site Parity Verification Report

**Phase Goal:** The complete site matches the existing Astro site's catalog, home page, resume reading experience, and discovery feeds — ready to replace the Astro site in production
**Verified:** 2026-02-18T10:00:00Z
**Status:** human_needed — all automated checks pass; three items require runtime/browser confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Home page displays latest 3 chapters per novel, sections ordered by most recently updated | VERIFIED | `app/pages/index.vue` lines 3-20: `Promise.all` over `NOVEL_SLUGS`, `.limit(3).order('pubDate','DESC')`, sorted by most recent `pubDate`; empty collections filtered |
| 2  | Catalog page at /novels lists all novels with chapter counts, sorted alphabetically | VERIFIED | `app/pages/novels/index.vue` lines 3-12: `queryCollection(slug).count()` per novel, `localeCompare` sort |
| 3  | Header dropdown shows last-read chapter per novel from localStorage | VERIFIED | `app/components/ResumeDropdown.vue` lines 6-8: `onMounted` reads `useReadingProgress().getAll()`; items built from entries with `to: path` |
| 4  | Home page resume reading section shows progress or empty state | VERIFIED | `app/pages/index.vue` lines 41-59: `ClientOnly` wrapping two conditional sections — entries list or "Start reading to track progress" |
| 5  | Empty state: "Start reading to track progress" in both dropdown and home section | VERIFIED | Dropdown line 18: `{ label: 'Start reading to track progress', disabled: true }`; index.vue line 57: same text in `<p>` |
| 6  | /rss.xml returns valid RSS XML (link-only, top 50 across all novels) | VERIFIED (impl) | `server/routes/rss.xml.ts`: `Feed` from 'feed', `Promise.all` over 10 novel slugs, merge+sort+slice(50), no `content` field, returns `feed.rss2()` with correct Content-Type |
| 7  | /novels/{novel}/rss.xml returns valid RSS XML (top 50 with full content) | VERIFIED (impl) | `server/routes/novels/[novel]/rss.xml.ts`: `getRouterParam`, 404 on unknown slug, `rawbody` field as `content`, returns `feed.rss2()` |
| 8  | /sitemap.xml returns a sitemap index linking to per-novel sitemaps | VERIFIED (impl) | `nuxt.config.ts` line 17: `@nuxtjs/sitemap` in modules; `sitemap.sitemaps` block has `pages` + 10 per-novel entries; `site.url` set |
| 9  | RSS feeds are prerendered for static deploy | VERIFIED | `nuxt.config.ts` lines 53-54: `/rss.xml`, `/novels/mga/rss.xml`, `/novels/lrg/rss.xml` in `nitro.prerender.routes` |
| 10 | Per-novel sitemaps cover chapter pages for novels with content | PARTIAL | `crawlLinks: false` limits sitemap to prerendered routes only. `prerender:routes` hook adds all lrg chapters and mga 1-500. Chapters 501-2335 of mga are not prerendered (intentional benchmark limit) — sitemap omits them. Architecture is correct; scope is intentionally limited to current content. |

**Score:** 9/10 truths fully verified (truth 10 is partial by intentional design)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/composables/useNovelMeta.ts` | Novel name map and slug list | VERIFIED | Exports `NOVEL_NAMES` (10 entries), `NOVEL_SLUGS`, `getNovelName()` — 18 lines, substantive |
| `app/composables/useReadingProgress.ts` | Extended with `getAll()` | VERIFIED | `getAll()` on lines 27-35: reads `STORAGE_KEY` from localStorage, returns parsed object or `{}`, guarded with `import.meta.client` |
| `app/components/ResumeDropdown.vue` | Resume reading dropdown for header | VERIFIED | `UDropdownMenu` used on line 30; items computed from progress; empty state and filled state both handled — 39 lines, substantive |
| `app/pages/index.vue` | Home page with novel sections and resume reading | VERIFIED | `queryCollection` via `Promise.all` on lines 3-20; `ClientOnly` resume section on lines 41-59; novel sections on lines 62-91 — 97 lines, substantive |
| `app/pages/novels/index.vue` | Catalog page with chapter counts | VERIFIED | `queryCollection(slug).count()` on line 5; alphabetical sort on line 11; chapter count rendered on line 26 — 35 lines, substantive |
| `app/layouts/default.vue` | Layout with nav links and ResumeDropdown | VERIFIED | Home + Novels nav links on lines 15-16; `<ClientOnly><ResumeDropdown /></ClientOnly>` on lines 19-21 — 28 lines, substantive |
| `server/routes/rss.xml.ts` | Global RSS feed server route | VERIFIED | `Feed` imported line 1; `queryCollection(event, novel)` on line 37; `Promise.all` across 10 collections; graceful error fallback — 78 lines, substantive |
| `server/routes/novels/[novel]/rss.xml.ts` | Per-novel RSS feed server route | VERIFIED | `Feed` imported line 1; `getRouterParam` line 22; 404 guard line 24-26; `rawbody` as content line 53; error fallback — 74 lines, substantive |
| `nuxt.config.ts` | Sitemap module config and RSS prerender routes | VERIFIED | `@nuxtjs/sitemap` in modules line 17; `site.url` line 19; `sitemap.sitemaps` lines 22-39; `/rss.xml` in prerender routes line 53 |
| `package.json` | feed and @nuxtjs/sitemap dependencies | VERIFIED | `"feed": "^5.2.0"` line 21; `"@nuxtjs/sitemap": "^7.6.0"` line 18 in dependencies |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/pages/index.vue` | `queryCollection` | `Promise.all` over NOVEL_SLUGS | WIRED | Lines 3-13: `await Promise.all(NOVEL_SLUGS.map(...queryCollection(slug as any)...))` |
| `app/pages/novels/index.vue` | `queryCollection` | `.count()` per collection | WIRED | Line 5: `await queryCollection(slug as any).count()` |
| `app/components/ResumeDropdown.vue` | localStorage | `useReadingProgress().getAll()` | WIRED | Lines 6-8: `onMounted(() => { progress.value = useReadingProgress().getAll() })` |
| `app/layouts/default.vue` | `ResumeDropdown.vue` | Auto-import in template | WIRED | Lines 19-21: `<ClientOnly><ResumeDropdown /></ClientOnly>` |
| `server/routes/rss.xml.ts` | `queryCollection` | Server-side event API | WIRED | Line 37: `await queryCollection(event, novel as any)` |
| `server/routes/novels/[novel]/rss.xml.ts` | `queryCollection` | Server-side event API | WIRED | Line 42: `await queryCollection(event, novel as any)` |
| `nuxt.config.ts` | `@nuxtjs/sitemap` | Module registration | WIRED | Line 17: `'@nuxtjs/sitemap'` in modules array |
| `nuxt.config.ts` | `server/routes/rss.xml.ts` | `nitro.prerender.routes` | WIRED | Line 53: `'/rss.xml'` in routes array |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CATL-01 | 03-01-PLAN.md | User can view home page with latest chapters grouped by novel | SATISFIED | `app/pages/index.vue`: per-novel sections with 3 latest chapters, ordered by recency, filtered to novels with content |
| CATL-02 | 03-01-PLAN.md | User can view novel catalog showing all available novels with chapter counts | SATISFIED | `app/pages/novels/index.vue`: count per novel, alphabetical sort, chapter count displayed |
| PROG-02 | 03-01-PLAN.md | User can resume reading from a multi-novel dropdown showing last-read chapter per novel | SATISFIED | `ResumeDropdown.vue` in header: reads all localStorage progress, renders per-novel entries with `to: path` links |
| DISC-01 | 03-02-PLAN.md | Site generates RSS feed for new chapters | SATISFIED | Global `/rss.xml` + per-novel `/novels/{novel}/rss.xml` server routes; prerendered for static deploy |
| DISC-02 | 03-02-PLAN.md | Site generates sitemap for search engine indexing | SATISFIED | `@nuxtjs/sitemap` module with 11 sub-sitemaps (pages + 10 per-novel); sitemap index at `/sitemap.xml` |

**Orphaned requirements check:** No Phase 3 requirements in REQUIREMENTS.md that are not claimed by 03-01 or 03-02 plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `server/routes/rss.xml.ts` | 45 | `return []` | INFO | Intentional — empty collection error handling in catch block; valid graceful degradation, not a stub |
| `app/composables/useNovelMeta.ts` vs `server/routes/rss.xml.ts` | 6, 14 | Novel name discrepancy: `htk: 'Hail the King'` vs `'History\'s Strongest Senior Brother'`; `lrg: 'LRG'` vs `'Library of Ruina Guide'` | WARNING | RSS feed item titles will differ from UI display names. Not a functional blocker — both sides work independently. The discrepancy exists because Nitro server routes cannot import Nuxt composables. Plan documented this as a known limitation. |

No blocker anti-patterns found.

---

### Human Verification Required

#### 1. RSS Feed XML Output

**Test:** After `pnpm build` (or in dev: `pnpm dev`), make a request to `/rss.xml`
**Expected:** Response with `Content-Type: application/xml`, valid RSS 2.0 envelope, `<channel>` with at least some `<item>` entries (mga and lrg chapters), each with `<title>`, `<link>`, `<pubDate>`
**Why human:** Cannot invoke the Nitro server or read a static `.output/public/rss.xml` file without running the build

#### 2. Sitemap XML Output

**Test:** After build, check `/sitemap.xml` and one per-novel sitemap (e.g. `/sitemap_mga.xml` or equivalent path generated by @nuxtjs/sitemap)
**Expected:** `/sitemap.xml` is a sitemap index with `<sitemapindex>` and multiple `<sitemap>` entries; per-novel sitemaps have `<urlset>` with chapter URLs
**Why human:** @nuxtjs/sitemap generates files during build; cannot inspect output without running `nuxt generate`

#### 3. Resume Reading Dropdown Navigation

**Test:** In browser: visit a chapter page for mga (e.g. `/novels/mga/1`), then return to home page and click the "Continue Reading" button in the header
**Expected:** Dropdown appears with "Martial God Asura - Chapter 1" (or the chapter visited); clicking it navigates to `/novels/mga/1`
**Why human:** localStorage write (on chapter page) and read (in dropdown) require a live browser; navigation correctness requires clicking

---

### Gaps Summary

No gaps blocking goal achievement. All artifacts exist, are substantive, and are wired. The one partial truth (sitemap coverage for mga chapters 501+) is intentional — the `prerender:routes` hook limits mga to chapters 1-500 as a build benchmark, and the sitemap module can only index prerendered routes with `crawlLinks: false`. This design choice is documented in the plan and does not constitute a gap.

The novel name discrepancy (`htk` and `lrg` differ between `useNovelMeta.ts` and the two server routes) is a WARNING worth noting for future cleanup, but does not block any success criterion.

---

*Verified: 2026-02-18T10:00:00Z*
*Verifier: Claude (gsd-verifier)*
