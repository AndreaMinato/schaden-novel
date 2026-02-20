# Schaden Novel

## What This Is

A 10-novel, 13,318-chapter reading site built with Nuxt 4 + Nuxt UI + Nuxt Content v3. Deployed to Netlify as a fully prerendered static site. Features clean reading typography, chapter navigation, reading progress tracking, RSS feeds, and sitemaps. Content imported from Google Docs via custom scripts.

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

### Active

**Current Milestone: v1.1 SPA Migration**

**Goal:** Eliminate 10-minute builds by switching from full SSG (26K prerendered routes) to SPA mode with on-demand chapter body loading. Build drops to under 2 minutes.

- [ ] SPA mode with client-side rendering
- [ ] Chapter bodies served as individual static JSON files
- [ ] Stripped SQL dump for metadata queries (~2.6MB)
- [ ] All existing reading features preserved
- [ ] Sitemaps still generated at build time

### Out of Scope

- Authentication/user accounts — static reading site, no login needed
- Comments or social features — reading-focused
- Full-text search across chapters — 170MB content impractical for client-side
- Offline / PWA mode — content too large for browser cache
- Mobile app — web is sufficient
- Real-time notifications — RSS is the notification primitive

## Context

**Current state:** v1.0 shipped. 1,096 LOC across TypeScript, Vue, and MJS. 13,318 markdown chapters (170MB). Static site with 26,694 prerendered routes. SQL dumps body-stripped from 64MB to 2.6MB for client-side queries. SSR migration attempted but hit OOM (64MB database module) and Lambda size limits (78MB > 50MB).

**Tech stack:** Nuxt 4.3.1, Nuxt UI, Nuxt Content v3, @nuxtjs/sitemap, feed (RSS), Netlify
**Content:** 10 novels — atg, cd, htk, issth, lrg, mga, mw, overgeared, rtw, tmw
**Build:** `nuxt generate` → `.output/public/` → `netlify deploy --prod --no-build`
**Import:** `node scripts/import.mjs` (Google Docs → markdown chapters)

## Constraints

- **Stack**: Nuxt 4 + Nuxt UI
- **Hosting**: Netlify (static deploy, no SSR)
- **Content**: 13K markdown chapters, SQLite connector (native Node 22.5+)
- **Build**: ~10 min for full site, body-stripped SQL dumps essential for localStorage limits
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
| Post-build SQL dump body stripping | afterParse hook breaks pre-rendering | ✓ Good |
| Per-novel RSS link-only | rawbody not available in Nuxt Content v3 server queries | ✓ Good |
| Filesystem-based prerender routes | readdirSync reads actual filenames, no hardcoded ranges | ✓ Good |

| SPA mode over SSR | SSR hit OOM + Lambda limits; CSR avoids server entirely | — Pending |

---
*Last updated: 2026-02-20 after v1.1 milestone start*
