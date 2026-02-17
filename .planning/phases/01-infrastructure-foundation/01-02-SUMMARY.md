---
phase: 01-infrastructure-foundation
plan: 02
subsystem: infra
tags: [nuxt4, static-site, netlify, prerender, sqlite, benchmark, spa-fallback]

# Dependency graph
requires:
  - phase: 01-01
    provides: Nuxt 4 scaffold with content collections, pages, and static build
provides:
  - Validated static build pipeline with 2,419 chapters (lrg + mga)
  - Selective prerender via nitro prerender:routes hook with filesystem-based route generation
  - Measured SQLite dump sizes (491KB lrg, 7.4MB mga, 7.9MB total)
  - Build time benchmark (40s for 2,419 files, 1,186 prerendered routes)
  - Netlify production deployment with SPA fallback
  - Content path routing fix (/{novel}/{slug} vs /novels/{novel}/{slug})
affects: [02-reading-experience, 03-content-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [filesystem-based-prerender-routes, spa-fallback-redirects, content-path-vs-route-path]

key-files:
  created:
    - public/_redirects
    - content/mga/ (2,335 chapters)
  modified:
    - nuxt.config.ts
    - app/pages/novels/[novel]/[...slug].vue
    - app/pages/novels/[novel]/index.vue
    - app/pages/index.vue
    - package.json

key-decisions:
  - "Filesystem-based route generation for prerender — avoids hardcoded chapter ranges, reads actual filenames via readdirSync"
  - "Netlify _redirects for SPA fallback — /* -> /200.html 200 enables client-side routing for non-prerendered pages"
  - "Content path format is /{novel}/{slug}, page URLs are /novels/{novel}/{slug} — fixed page queries to derive content path from route params"
  - "SQLite dump 7.9MB for 2,419 chapters — projects to ~42MB for 13K, below concern threshold with mixed-size chapters"

patterns-established:
  - "Content path derivation: pages at /novels/{novel}/{slug} query content at /{novel}/{slug} — never use route.path for content queries"
  - "Prerender route hook: nitro prerender:routes receives Set<string>, use routes.add() to add custom routes"
  - "SPA fallback: public/_redirects with /* /200.html 200 catches non-prerendered routes on Netlify"

requirements-completed: [INFRA-01, INFRA-03, INFRA-04]

# Metrics
duration: 17min
completed: 2026-02-17
---

# Phase 1 Plan 2: Build Pipeline Validation Summary

**Static build benchmark with 2,419 chapters (40s build, 7.9MB SQLite dump), selective prerendering of 584 pages, and Netlify deployment with SPA fallback**

## Performance

- **Duration:** 17 min
- **Started:** 2026-02-17T14:24:04Z
- **Completed:** 2026-02-17T14:41:11Z
- **Tasks:** 3
- **Files modified:** 2,339

## Build Metrics

### lrg Only (84 chapters)
- **Build time:** ~12s total (client 3.5s + server 4.1s + prerender 3.9s)
- **Total output size:** 4.1MB
- **SQLite dump (lrg):** 491KB (~5.85KB/chapter)
- **Prerendered routes:** 14
- **Dump assessment:** Well under 10MB threshold

### lrg + mga (2,419 chapters)
- **Build time:** 40s total (prerender 19.2s for 1,186 routes)
- **Total output size:** 31MB
- **SQLite dump (lrg):** 491KB (5.85KB/chapter)
- **SQLite dump (mga):** 7.4MB (3.17KB/chapter)
- **Total SQLite dump:** 7.9MB
- **Prerendered routes:** 1,186 (84 lrg + 500 mga + listing pages + payloads + home/errors)
- **Dump assessment:** Under 10MB threshold for 2,419 chapters

### Extrapolation for 13K Chapters
- **SQLite dump estimate:** ~3.5KB/chapter average * 13,000 = ~45.5MB
  - lrg chapters are larger (~5.85KB/ch), mga chapters smaller (~3.17KB/ch)
  - Mixed average depends on novel content lengths
  - Still needs body-stripping for production (content:file:afterParse hook)
- **Build time estimate:** ~40s * (13,000/2,419) = ~215s (~3.6 minutes) for content processing
  - Prerender time scales linearly with prerendered page count
  - Full 13K prerender (if desired): ~19s * (13,000/584) = ~7 minutes
- **Memory:** No OOM issues at 8GB heap with 2,419 chapters

### Dump Size Decision
The 7.9MB total dump for 2,419 chapters is under the 10MB concern threshold. However, extrapolating to 13K gives ~45.5MB which is significant. The body-stripping strategy (content:file:afterParse hook) identified in Plan 01 remains recommended for Phase 3 content migration.

## Accomplishments
- Static build pipeline validated end-to-end: build, serve, deploy
- Selective prerendering working via nitro prerender:routes hook
- SQLite dump sizes measured at both small (84 ch) and medium (2,419 ch) scale
- Netlify deployment live at https://schaden-novel.netlify.app
- SPA fallback confirmed for non-prerendered routes (client-side hydration)
- Fixed content path routing bug from Plan 01

## Task Commits

Each task was committed atomically:

1. **Task 1: Run static build with lrg and measure SQLite dump size** - `ef6c2cd` (chore)
2. **Task 2: Scale benchmark with mga and selective prerendering** - `ee98807` (feat)
3. **Task 3: Deploy to Netlify and verify live site** - `0659694` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `nuxt.config.ts` - Added nitro prerender:routes hook with filesystem-based route generation, node:fs imports
- `app/pages/novels/[novel]/[...slug].vue` - Fixed content path query to use /{novel}/{slug} instead of route.path
- `app/pages/novels/[novel]/index.vue` - Fixed NuxtLink to prepend /novels/ to content paths
- `app/pages/index.vue` - Fixed NuxtLink to prepend /novels/ to content paths
- `public/_redirects` - Netlify SPA fallback rule (* -> /200.html)
- `content/mga/*.md` - 2,335 mga chapter files copied for benchmarking
- `package.json` - CLI commands updated from nuxi to nuxt (Nuxt 4 convention)

## Decisions Made
- **Filesystem-based route generation:** Used `readdirSync` to read actual chapter filenames instead of hardcoded sequential ranges. lrg chapters have gaps (no 7, 9-11, etc.) making sequential generation impossible.
- **Netlify _redirects for SPA fallback:** Added `/* /200.html 200` rule so non-prerendered chapter routes serve the SPA shell for client-side hydration instead of 404.
- **Content path vs route path distinction:** Nuxt Content v3 assigns paths based on file location (`/lrg/1`), but page routes are at `/novels/lrg/1`. Page components must derive content path from route params, not use `route.path` directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed nitro prerender:routes hook API**
- **Found during:** Task 2 (first build attempt)
- **Issue:** Plan suggested `ctx.routes.add()` but the hook passes routes as a `Set<string>` directly, not wrapped in ctx
- **Fix:** Changed function signature from `(ctx)` to `(routes: Set<string>)` and called `routes.add()` directly
- **Files modified:** nuxt.config.ts
- **Verification:** Build completes without hook error
- **Committed in:** ee98807 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed content path mismatch in chapter reader page**
- **Found during:** Task 2 (lrg chapters returning 404 during prerender)
- **Issue:** Page component used `route.path` (/novels/lrg/1) to query content, but Nuxt Content v3 paths are /lrg/1. All lrg chapter routes returned 404.
- **Fix:** Derived content path from route params: `/${novel}/${slug}` instead of using route.path
- **Files modified:** app/pages/novels/[novel]/[...slug].vue
- **Verification:** All 84 lrg chapters prerender successfully with 200 status
- **Committed in:** ee98807 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed NuxtLink hrefs missing /novels/ prefix**
- **Found during:** Task 2 (discovered alongside path mismatch)
- **Issue:** Home page and novel listing linked to content paths (/lrg/1) which don't match any page route. Should link to /novels/lrg/1.
- **Fix:** Prepended `/novels` to all NuxtLink :to bindings using content paths
- **Files modified:** app/pages/index.vue, app/pages/novels/[novel]/index.vue
- **Verification:** curl confirms home page links include /novels/ prefix
- **Committed in:** ee98807 (Task 2 commit)

**4. [Rule 1 - Bug] Fixed sequential route generation for non-sequential chapter files**
- **Found during:** Task 2 (lrg routes 7, 9-11, 13-17 etc. don't exist)
- **Issue:** Plan assumed lrg chapters were numbered 1-84 sequentially, but actual files have gaps and go up to 1887
- **Fix:** Created getChapterSlugs() helper using readdirSync to read actual filenames
- **Files modified:** nuxt.config.ts
- **Verification:** All lrg routes map to actual content files
- **Committed in:** ee98807 (Task 2 commit)

**5. [Rule 2 - Missing Critical] Added Netlify _redirects for SPA fallback**
- **Found during:** Task 3 (non-prerendered routes returning 404 on Netlify)
- **Issue:** Without _redirects, Netlify returns 404 for any route without a prerendered file. SPA navigation to non-prerendered chapters fails.
- **Fix:** Created public/_redirects with `/* /200.html 200` rule
- **Files modified:** public/_redirects (created)
- **Verification:** curl to non-prerendered route returns 200 with SPA shell
- **Committed in:** 0659694 (Task 3 commit)

---

**Total deviations:** 5 auto-fixed (4 Rule 1 bugs, 1 Rule 2 missing critical)
**Impact on plan:** All fixes necessary for correct operation. The content path mismatch was a pre-existing bug from Plan 01 that blocked prerendering. The SPA fallback is essential for non-prerendered routes on Netlify. No scope creep.

## Issues Encountered
- **Port 8080 in use:** Local verification had to use port 3456 instead of 8080 (occupied by another service). No impact on results.
- **Netlify trailing slash redirect:** Netlify returns 301 redirecting /novels/lrg/1 to /novels/lrg/1/ (directory-style). Functional but adds a redirect hop.

## User Setup Required

None - Netlify was already authenticated and linked.

## Next Phase Readiness
- Build pipeline fully validated through Netlify deployment
- Selective prerendering working with measured metrics
- SPA fallback strategy confirmed for non-prerendered routes
- Body-stripping strategy still recommended before migrating all 13K chapters (Phase 3)
- Content path routing is now correct for all page types
- Ready for Phase 2 (reading experience features)

## Self-Check: PASSED

All 7 key files verified present. All 3 commit hashes found. 2,335 mga content files confirmed.

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-02-17*
