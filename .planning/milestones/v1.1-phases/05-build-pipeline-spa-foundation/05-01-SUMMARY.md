---
phase: 05-build-pipeline-spa-foundation
plan: 01
subsystem: infra
tags: [nuxt-module, body-extraction, build-pipeline, minimark, static-generation]

# Dependency graph
requires: []
provides:
  - "body-extractor Nuxt module extracting 13,318 chapter bodies to JSON files"
  - "Body-stripped SQL dumps (2.7MB vs ~64MB)"
  - "SPA-ready build pipeline with ~25 prerendered shell pages"
  - "bodies-manifest.json with file count, paths, and sizes"
  - "nuxt generate build completing in ~87 seconds"
affects: [06-chapter-reading-spa, 07-deploy-verify]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Nuxt module body extraction via content:file:afterParse hook", "Content cache clearing for deterministic builds", "Staging directory outside buildDir for persistence across build phases"]

key-files:
  created: [modules/body-extractor.ts]
  modified: [nuxt.config.ts, content.config.ts, package.json]

key-decisions:
  - "Stage body files outside buildDir (node_modules/.cache/body-extract) because buildDir gets cleaned during build"
  - "Clear content cache on every generate to ensure afterParse hook fires (cached content skips hook)"
  - "spaLoadingTemplate: true instead of path string (~ alias not resolved for this config option in Nuxt 4)"
  - "Nuxt auto-scans root modules/ directory; no explicit module registration needed in nuxt.config"
  - "Original chapter stems (no zero-padding) to avoid build/runtime path mismatch"

patterns-established:
  - "Body extraction: afterParse hook extracts, close hook copies to output"
  - "Content cache clearing: module deletes .data/content and buildDir/content at setup time during generate"
  - "Modules array ordering: sitemap before content for asSitemapCollection to work"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03, BUILD-04]

# Metrics
duration: 10min
completed: 2026-02-20
---

# Phase 5 Plan 1: Build Pipeline + Body Extractor Summary

**Body-extractor Nuxt module extracting 13,318 minimark bodies to JSON, body-stripped SQL dumps at 2.7MB, 14 prerendered shell pages in 87 seconds**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-20T12:44:42Z
- **Completed:** 2026-02-20T12:54:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created body-extractor Nuxt module with two-phase extraction: afterParse extracts + strips, close copies to output
- Reconfigured build from 26K prerendered routes to ~25 shell pages (87s vs ~10min)
- SQL dumps body-stripped at parse time (2.7MB total, down from ~64MB)
- 13,318 body JSON files produced with bodies-manifest.json for validation
- Wrapped content collections with asSitemapCollection for chapter URL discovery without prerendering

## Task Commits

Each task was committed atomically:

1. **Task 1: Create body-extractor Nuxt module** - `4391581` (feat)
2. **Task 2: Reconfigure build pipeline and clean up deprecated files** - `eae8547` (feat)

## Files Created/Modified
- `modules/body-extractor.ts` - Nuxt module: afterParse body extraction + close hook copy + manifest generation
- `nuxt.config.ts` - Removed getChapterSlugs/prerender:routes hook, added spaLoadingTemplate, reordered modules
- `content.config.ts` - Wrapped collections with asSitemapCollection for sitemap URL discovery
- `package.json` - Changed build script from `nuxt build` to `nuxt generate`
- `scripts/strip-dump-bodies.mjs` - Deleted (replaced by body-extractor module)

## Decisions Made
- Used `spaLoadingTemplate: true` instead of path string because Nuxt 4's config resolution doesn't expand `~` alias for this option
- Staged body files in `node_modules/.cache/body-extract/` instead of buildDir because Nuxt cleans buildDir between content compilation and close hook
- Added content cache clearing (`.data/content/` and `buildDir/content/`) to ensure afterParse hook fires on every generate (cached content skips the hook entirely)
- Relied on Nuxt's auto-scanning of root `modules/` directory instead of explicit module registration (resolves Nuxt 4 srcDir=app/ path issue)
- Used original chapter stems (no zero-padding) per plan recommendation to avoid build/runtime path mismatch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed module path resolution for Nuxt 4 srcDir**
- **Found during:** Task 2 (build verification)
- **Issue:** `~/modules/body-extractor` resolved to `app/modules/body-extractor` because `~` maps to srcDir (`app/`) in Nuxt 4, not rootDir
- **Fix:** Removed explicit module registration from modules array; Nuxt auto-scans root `modules/` directory
- **Files modified:** nuxt.config.ts
- **Verification:** Build succeeds without module load error
- **Committed in:** eae8547

**2. [Rule 1 - Bug] Fixed spaLoadingTemplate path resolution**
- **Found during:** Task 2 (build verification)
- **Issue:** `~/spa-loading-template.html` resolved literally as `app/~/spa-loading-template.html` instead of expanding the alias
- **Fix:** Changed to `spaLoadingTemplate: true` which auto-detects `app/spa-loading-template.html`
- **Files modified:** nuxt.config.ts
- **Verification:** 200.html contains "Schaden Novel" loading template
- **Committed in:** eae8547

**3. [Rule 1 - Bug] Fixed staging directory persistence across build phases**
- **Found during:** Task 2 (build verification)
- **Issue:** Body files written to buildDir staging got cleaned when Nuxt rebuilt client/server bundles, causing close hook ENOENT
- **Fix:** Changed staging to `node_modules/.cache/body-extract/` (outside buildDir)
- **Files modified:** modules/body-extractor.ts
- **Verification:** Close hook successfully copies 13,318 files to output
- **Committed in:** eae8547

**4. [Rule 1 - Bug] Fixed content cache preventing body extraction on rebuilds**
- **Found during:** Task 2 (build verification)
- **Issue:** Cached content (13,318 cached, 0 parsed) skipped afterParse hook entirely, producing zero body files
- **Fix:** Module clears `.data/content/` and `buildDir/content/` at setup time during generate
- **Files modified:** modules/body-extractor.ts
- **Verification:** Fresh parse triggers afterParse for all 13,318 files
- **Committed in:** eae8547

---

**Total deviations:** 4 auto-fixed (4 bugs)
**Impact on plan:** All fixes necessary for correct build pipeline operation. No scope creep.

## Issues Encountered
- Content compilation takes ~74 seconds (was cached at ~1.6s before cache clearing was added). Total build still under 2 minutes target.
- Body files total 149.8MB (not ~200MB as estimated). 10 novel directories with JSON files.
- Nuxt prerendered 60 routes (not 25) because it includes _payload.json, SQL dumps, sitemaps, and style.xsl in addition to HTML pages. Only 14 actual HTML pages.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build pipeline produces SPA-ready output: body JSONs + stripped SQL dumps + shell pages
- 200.html with branded loading template ready for SPA deep-link fallback
- Netlify redirect rule (from Plan 05-02) routes chapter URLs to 200.html
- Ready for Phase 6: chapter reading SPA implementation (fetch body JSON, render with ContentRenderer)
- **Risk**: ContentRenderer compatibility with extracted minimark body format needs Phase 6 validation

## Self-Check: PASSED

- FOUND: modules/body-extractor.ts
- FOUND: nuxt.config.ts
- FOUND: content.config.ts
- CONFIRMED DELETED: scripts/strip-dump-bodies.mjs
- FOUND: commit 4391581
- FOUND: commit eae8547

---
*Phase: 05-build-pipeline-spa-foundation*
*Completed: 2026-02-20*
