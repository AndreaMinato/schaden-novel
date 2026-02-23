# Schaden Novel

## What This Is

A 10-novel, 13,318-chapter reading site built with Nuxt 4 + Nuxt UI + Nuxt Content v3. Deployed to Netlify as an SPA with selective prerendering. Features clean reading typography, chapter navigation with prefetch/cache for instant navigation, reading progress tracking, RSS feeds, and sitemaps. Content imported from Google Docs via custom scripts.

## Core Value

Readers can find and read novel chapters with a smooth, uninterrupted reading experience.

## Requirements

### Validated

- ✓ Site built with Nuxt 4 + Nuxt UI, deployed as static site — v1.0
- ✓ Nuxt Content v3 handles 13K markdown chapters with per-novel collections — v1.0
- ✓ Build completes in ~10 min for 13K chapters (26,694 routes) — v1.0
- ✓ Netlify deployment with Node 22.5+ and nativeSqlite — v1.0
- ✓ Content queries use useAsyncData (no SQLite dump in browser) — v1.0
- ✓ Home page with latest chapters grouped by novel — v1.0
- ✓ Novel catalog page with chapter counts — v1.0
- ✓ Novel detail page with full chapter listing (natural sort) — v1.0
- ✓ Chapter reader with clean prose typography (65ch, readable line-height) — v1.0
- ✓ Prev/next chapter navigation via buttons — v1.0
- ✓ Keyboard navigation (Cmd+Arrow for prev/next) — v1.0
- ✓ Mobile-responsive reader — v1.0
- ✓ Reading progress persistence in localStorage — v1.0
- ✓ Resume reading dropdown in header — v1.0
- ✓ RSS feeds (global + per-novel) — v1.0
- ✓ Sitemap generation (multi-sitemap, per-novel) — v1.0
- ✓ Google Docs import script ported with error handling — v1.0
- ✓ Import script surfaces errors visibly (no silent failures) — v1.0
- ✓ All 13,318 chapters migrated to Nuxt Content structure — v1.0
- ✓ Build produces individual JSON body files for all 13,318 chapters — v1.1
- ✓ SQL dump body-stripped at parse time (64MB → 2.7MB) — v1.1
- ✓ Only ~14 shell pages prerendered (not 26K routes) — v1.1
- ✓ Build completes in 87 seconds — v1.1
- ✓ SPA fallback routing for chapter deep links — v1.1
- ✓ Split-fetch chapter reader (SQLite metadata + JSON body) — v1.1
- ✓ Loading skeleton while chapter body fetches — v1.1
- ✓ Next-chapter prefetch for instant navigation — v1.1
- ✓ LRU body cache for visited chapters — v1.1
- ✓ Programmatic sitemap sources for all 13,318 chapters — v1.1
- ✓ RSS feeds functional in SPA mode — v1.1

### Active

(None — define next milestone with `/gsd:new-milestone`)

### Out of Scope

- Authentication/user accounts — static reading site, no login needed
- Comments or social features — reading-focused
- Full-text search across chapters — 170MB content impractical for client-side
- Offline / PWA mode — content too large for browser cache
- Mobile app — web is sufficient
- Real-time notifications — RSS is the notification primitive
- SSR rendering — OOM at 8GB (64MB database module), Lambda bundle 78MB > 50MB limit

## Context

**Current state:** v1.1 shipped. SPA mode with selective prerendering. 12 source files changed from v1.0 (355 insertions, 242 deletions). 13,318 markdown chapters (170MB). Build produces 14 HTML pages + 13,318 JSON body files in 87 seconds. SQL dumps body-stripped from 64MB to 2.7MB. Chapter reader uses split-fetch: WASM SQLite metadata (instant) + JSON body (skeleton → content). LRU cache (5 entries) + next-chapter prefetch for instant navigation.

**Tech stack:** Nuxt 4.3.1, Nuxt UI, Nuxt Content v3, @nuxtjs/sitemap, feed (RSS), Netlify
**Content:** 10 novels — atg, cd, htk, issth, lrg, mga, mw, overgeared, rtw, tmw
**Build:** `nuxt generate` → `.output/public/` → `netlify deploy --prod --no-build`
**Import:** `node scripts/import.mjs` (Google Docs → markdown chapters)

**Known tech debt:**
- Pre-existing typecheck errors in `modules/body-extractor.ts` and `server/routes/*/rss.xml.ts`
- 5 human verification items (deep link test, loading template visual, prefetch feel, cache DevTools, Search Console)

## Constraints

- **Stack**: Nuxt 4 + Nuxt UI
- **Hosting**: Netlify (static deploy, no SSR)
- **Content**: 13K markdown chapters, SQLite connector (native Node 22.5+)
- **Build**: 87s with body extraction, body-stripped SQL dumps essential
- **No auth**: Static site, no server-side user state

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nuxt 4 + Nuxt UI over Astro | Better UI components, Vue ecosystem | ✓ Good |
| Keep Netlify hosting | Already configured, familiar | ✓ Good |
| Migrate markdown content | 13K chapters of proven content | ✓ Good |
| Per-novel content collections | Each novel is a separate Nuxt Content collection | ✓ Good |
| SPA fallback for chapters | Prerender all routes, /200.html fallback | ✓ Good |
| Client-side localeCompare sort | Content v3 SQL sorts alphabetically, not numerically | ✓ Good |
| rAF-throttled scroll for auto-hide header | Avoids @vueuse/core dependency | ✓ Good |
| Per-novel RSS link-only | rawbody not available in Nuxt Content v3 server queries | ✓ Good |
| Filesystem-based prerender routes | readdirSync reads actual filenames, no hardcoded ranges | ✓ Good |
| SPA mode over SSR | SSR hit OOM + Lambda limits; CSR avoids server entirely | ✓ Good |
| Body extraction via afterParse hook | Reversal of v1.0 post-build approach; parse-time is cleaner | ✓ Good |
| Staging dir in node_modules/.cache | buildDir gets cleaned mid-build; external staging persists | ✓ Good |
| netlify.toml over _redirects | Structured format, more extensible | ✓ Good |
| Split-fetch chapter reader | Await metadata (fast WASM), skeleton for body (network) | ✓ Good |
| Module-level Map for body cache | Survives SPA navigation, lost on refresh (acceptable) | ✓ Good |
| Prefetch next only (not prev/N+2) | Simple, predictable, covers primary reading direction | ✓ Good |
| Per-child sitemap sources | Top-level sources ignored in multi-sitemap mode | ✓ Good |

---
*Last updated: 2026-02-23 after v1.1 milestone*
