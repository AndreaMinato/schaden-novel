---
phase: 07-seo-reading-optimization
plan: 01
subsystem: seo
tags: [sitemap, rss, nuxtjs-sitemap, multi-sitemap, content-v3]

# Dependency graph
requires:
  - phase: 05-build-pipeline-spa-foundation
    provides: SPA build pipeline with selective prerendering
provides:
  - Programmatic sitemap URL source endpoint for all 13,318 chapters
  - Per-novel sub-sitemaps with chapter URLs and lastmod dates
  - Sitemap index listing all per-novel sitemaps + pages sitemap
affects: [deploy, seo]

# Tech tracking
tech-stack:
  added: []
  patterns: [defineSitemapEventHandler for programmatic sitemap sources, per-child sources in multi-sitemap mode]

key-files:
  created: [server/api/__sitemap__/urls.ts]
  modified: [nuxt.config.ts, content.config.ts]

key-decisions:
  - "Per-child sources required: top-level sitemap.sources is ignored in multi-sitemap mode"
  - "Removed asSitemapCollection: ineffective in SPA mode where chapter routes are not prerendered"

patterns-established:
  - "Programmatic sitemap sources: use defineSitemapEventHandler + queryCollection to provide URLs for non-prerendered content routes"
  - "Multi-sitemap sources: sources must be on each child sitemap config, not top-level"

requirements-completed: [SEO-01, SEO-02]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 7 Plan 1: Sitemap + RSS Summary

**Programmatic sitemap sources via defineSitemapEventHandler providing 13,318 chapter URLs across 10 per-novel sub-sitemaps; RSS feeds verified functional**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T10:47:26Z
- **Completed:** 2026-02-21T10:53:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 13,318 chapters discoverable via per-novel sitemaps with lastmod dates
- Sitemap index at /sitemap_index.xml lists all 11 sub-sitemaps (10 novels + pages)
- RSS feeds (global + 10 per-novel) confirmed functional with valid XML and correct link format
- Build completes in ~6 seconds (prerender phase), well under 2-minute target

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sitemap URL source endpoint and update sitemap config** - `e90ae14` (feat)
2. **Task 2: Verify RSS feeds functional in SPA mode** - No commit (verify-only, no code changes)

## Files Created/Modified
- `server/api/__sitemap__/urls.ts` - Programmatic sitemap URL source querying all 10 content collections
- `nuxt.config.ts` - Added per-child sources config, static page URLs for pages sitemap
- `content.config.ts` - Removed asSitemapCollection wrapper (ineffective in SPA mode)

## Decisions Made
- **Per-child sources in multi-sitemap mode:** Top-level `sitemap.sources` is explicitly ignored by @nuxtjs/sitemap v7.6.0 in multi-sitemap mode. Moved `sources` to each per-novel child sitemap config.
- **Removed asSitemapCollection:** The wrapper adds no value when using programmatic sources and was ineffective anyway since chapter routes are not prerendered in SPA mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved sources from top-level to per-child sitemap config**
- **Found during:** Task 1 (first build attempt)
- **Issue:** Plan specified top-level `sources: ['/api/__sitemap__/urls']` in sitemap config. @nuxtjs/sitemap v7.6.0 warns: "You are using multiple-sitemaps but have provided sitemap.sources in your Nuxt config. This will be ignored." Per-novel sitemaps were empty.
- **Fix:** Moved `sources` to each per-novel child sitemap: `mga: { sources: ['/api/__sitemap__/urls'], include: ['/novels/mga/**'] }`
- **Files modified:** nuxt.config.ts
- **Verification:** Rebuild confirmed 13,318 URLs across all novel sitemaps, no warnings
- **Committed in:** e90ae14

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Config placement fix required for correct operation. No scope creep.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sitemaps fully functional, ready for deployment
- RSS feeds confirmed working, no changes needed
- Plan 07-02 (body prefetching/caching) can proceed independently

## Self-Check: PASSED

- FOUND: server/api/__sitemap__/urls.ts
- FOUND: 07-01-SUMMARY.md
- FOUND: commit e90ae14
- FOUND: sitemap_index.xml (build output)
- FOUND: mga.xml with 2,335 URLs
- FOUND: rss.xml with 50 items

---
*Phase: 07-seo-reading-optimization*
*Completed: 2026-02-21*
