---
phase: 06-chapter-reader
plan: 01
subsystem: ui
tags: [spa, split-fetch, skeleton-loading, content-renderer, reactive-params, minimark]

# Dependency graph
requires:
  - phase: 05-build-pipeline-spa-foundation
    provides: "Body-extractor producing 13,318 chapter JSON files at /content/novels/{novel}/{stem}.json"
provides:
  - "Split-fetch chapter reader: SQLite metadata (instant) + JSON body (skeleton loading)"
  - "Reactive SPA navigation with computed route params and useAsyncData watch"
  - "USkeleton loading placeholder (10 bars, varied widths)"
  - "Inline error state with silent auto-retry and manual retry button"
affects: [07-deploy-verify]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Split-fetch SPA: await metadata + non-await body with skeleton", "Reactive composable params via Ref/ComputedRef + toValue()", "useAsyncData watch option for SPA chapter navigation"]

key-files:
  created: []
  modified: [app/composables/useChapterNav.ts, app/pages/novels/[novel]/[...slug].vue]

key-decisions:
  - "Pass bodyData directly to ContentRenderer (not composed with metadata) since page renders title/nav separately"
  - "await metadata useAsyncData (fast WASM SQLite) but NOT body useAsyncData (show skeleton while fetching)"
  - "Reading progress saved via watch on contentPath for every chapter navigation, plus onMounted for initial load"

patterns-established:
  - "Split-fetch SPA pattern: metadata from SQLite (await) + body from static JSON (no await, skeleton)"
  - "Reactive route params: computed(() => route.params.x) + watch option in useAsyncData"
  - "Composable reactive params: accept Ref/ComputedRef, use toValue() internally"

requirements-completed: [READ-01, READ-02]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 6 Plan 1: Chapter Reader SPA Summary

**Split-fetch chapter reader with USkeleton loading, reactive SPA navigation, and inline error retry using ContentRenderer for minimark body JSON**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T15:27:04Z
- **Completed:** 2026-02-20T15:28:48Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Refactored useChapterNav to accept reactive Ref/ComputedRef params with toValue() and watch option
- Split chapter page into metadata query (SQLite, await) and body fetch (JSON, no await with skeleton)
- Added 10-bar USkeleton loading placeholder with varied widths (100%, 90%, 75%, 60%)
- Added inline error state with silent auto-retry after 2s and manual retry button
- Made all route params reactive via computed() for SPA chapter-to-chapter navigation
- Reading progress now saves on every chapter navigation (watch + onMounted)

## Task Commits

Each task was committed atomically:

1. **Task 1: Make useChapterNav reactive for SPA navigation** - `7033461` (feat)
2. **Task 2: Refactor chapter page for split-fetch SPA rendering with skeleton** - `b8e7680` (feat)

## Files Created/Modified
- `app/composables/useChapterNav.ts` - Reactive composable: Ref/ComputedRef params, toValue(), watch option, non-async
- `app/pages/novels/[novel]/[...slug].vue` - Split-fetch SPA chapter page: reactive params, skeleton loading, error retry, ContentRenderer with bodyData

## Decisions Made
- Pass `bodyData` directly to ContentRenderer (Option A from research) since title/nav are rendered separately from metadata
- Use `await` for metadata SQLite query (fast WASM, sub-50ms after init) but no `await` for body JSON fetch (show skeleton)
- Save reading progress via `watch(contentPath)` for SPA navigation reactivity, plus `onMounted` for initial page load
- Error state covers both `bodyError` and `metaError` with same inline pattern per user decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing typecheck errors in `modules/body-extractor.ts` (missing @nuxt/kit types) and `server/routes/*/rss.xml.ts` (argument mismatch) -- not caused by this plan's changes. Logged as out-of-scope deferred items.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Chapter reader SPA is fully implemented with split-fetch, skeleton loading, and error handling
- ContentRenderer compatibility with standalone minimark body objects confirmed working (Phase 5 risk resolved)
- Ready for Phase 7: deploy verification (test on Netlify with real network body fetches)
- Pre-existing typecheck errors should be addressed separately (not blocking)

## Self-Check: PASSED

- FOUND: app/composables/useChapterNav.ts
- FOUND: app/pages/novels/[novel]/[...slug].vue
- FOUND: commit 7033461
- FOUND: commit b8e7680

---
*Phase: 06-chapter-reader*
*Completed: 2026-02-20*
