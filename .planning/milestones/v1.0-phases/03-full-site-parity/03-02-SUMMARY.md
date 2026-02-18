---
phase: 03-full-site-parity
plan: 02
subsystem: infra
tags: [rss, sitemap, feed, nuxt-sitemap, seo, xml, server-routes]

requires:
  - phase: 01-infrastructure-foundation
    provides: "Nuxt config with nitro prerender, content collections for 10 novels"
  - phase: 02-chapter-reader
    provides: "Chapter pages at /novels/{novel}/{slug} for RSS link targets"
provides:
  - "Global RSS feed at /rss.xml (top 50 chapters, link-only)"
  - "Per-novel RSS feed at /novels/{novel}/rss.xml (top 50 chapters, full content)"
  - "Sitemap index at /sitemap.xml with per-novel sub-sitemaps"
  - "RSS prerender routes for static deploy"
affects: [03-full-site-parity]

tech-stack:
  added: [feed@5.2.0, "@nuxtjs/sitemap@7.6.0"]
  patterns: [nitro-server-routes, queryCollection-server-side, multi-sitemap]

key-files:
  created:
    - server/routes/rss.xml.ts
    - server/routes/novels/[novel]/rss.xml.ts
  modified:
    - nuxt.config.ts
    - package.json

key-decisions:
  - "Global RSS is link-only (no full content) to keep feed size small"
  - "Per-novel RSS includes rawbody markdown as content for full-text readers"
  - "Multi-sitemap with per-novel sub-sitemaps for scalability across 10 novels"
  - "Only mga and lrg RSS routes prerendered (novels with current content)"

patterns-established:
  - "Nitro server routes pattern: server/routes/{path}.ts with defineEventHandler"
  - "Server-side queryCollection with Promise.all for parallel multi-collection queries"
  - "Graceful RSS error handling: return minimal valid RSS XML on any error"

requirements-completed: [DISC-01, DISC-02]

duration: 3min
completed: 2026-02-18
---

# Phase 3 Plan 2: RSS & Sitemap Summary

**Global + per-novel RSS feeds via feed library, @nuxtjs/sitemap multi-sitemap with 10 per-novel sub-sitemaps, RSS prerender routes for static deploy**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T09:05:05Z
- **Completed:** 2026-02-18T09:08:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Global RSS feed queries all 10 novel collections in parallel, merges top 50 chapters by date
- Per-novel RSS feed with full markdown content and 404 validation for unknown novel slugs
- Sitemap index with dedicated sub-sitemaps per novel for scalable chapter discovery
- RSS routes prerendered for static Netlify deploy alongside existing chapter routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create RSS feed server routes** - `3f6dac5` (feat)
2. **Task 2: Configure sitemap module and add RSS prerender routes** - `06e6de2` (feat)

## Files Created/Modified
- `server/routes/rss.xml.ts` - Global RSS feed: top 50 chapters across all novels, link-only
- `server/routes/novels/[novel]/rss.xml.ts` - Per-novel RSS feed: top 50 chapters with full markdown content
- `nuxt.config.ts` - Added @nuxtjs/sitemap module, site URL, multi-sitemap config, RSS prerender routes
- `package.json` - Added feed@5.2.0 and @nuxtjs/sitemap@7.6.0 dependencies
- `.nuxtignore` - Existing file committed alongside config changes

## Decisions Made
- Global RSS is link-only (no full text) to keep feed size manageable across 10 novels
- Per-novel RSS includes rawbody markdown as content for feed readers that support full-text
- Multi-sitemap architecture with per-novel sub-sitemaps -- pages sitemap for static pages, individual novel sitemaps for chapter discovery
- Only mga and lrg RSS routes prerendered currently (novels with migrated content); comment marks where to add more

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RSS and sitemap infrastructure complete
- Feed readers can subscribe to global or per-novel chapter updates
- Search engines can discover all chapter pages via sitemap index
- Ready for remaining Phase 3 plans

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 03-full-site-parity*
*Completed: 2026-02-18*
