---
phase: 02-chapter-reader
plan: 01
subsystem: ui
tags: [nuxt-layout, auto-hide-header, scroll-behavior, natural-sort, chapter-listing]

requires:
  - phase: 01-infrastructure-foundation
    provides: "Nuxt 4 + Content v3 + Nuxt UI project with build pipeline and content collections"
provides:
  - "Default layout with auto-hide header for all pages"
  - "Scroll-to-top router config for page transitions"
  - "Novel detail page with descending chapter listing using natural numeric sort"
  - "useAutoHideHeader composable for scroll direction detection"
affects: [02-chapter-reader]

tech-stack:
  added: []
  patterns: [client-side-natural-sort, raf-throttled-scroll, css-transform-toggle]

key-files:
  created:
    - app/composables/useAutoHideHeader.ts
    - app/router.options.ts
    - app/layouts/default.vue
  modified:
    - app/app.vue
    - app/pages/novels/[novel]/index.vue

key-decisions:
  - "Client-side localeCompare({ numeric: true }) for chapter sort instead of SQL ORDER BY"
  - "rAF throttling for scroll detection instead of adding @vueuse/core dependency"

patterns-established:
  - "Natural sort pattern: [...items].sort((a, b) => b.stem.localeCompare(a.stem, undefined, { numeric: true, sensitivity: 'base' }))"
  - "Auto-hide header pattern: scroll direction detection via rAF-throttled window scroll listener"

requirements-completed: [CATL-03]

duration: 3min
completed: 2026-02-18
---

# Phase 02 Plan 01: Layout and Chapter Listing Summary

**Default layout with auto-hide header, scroll-to-top navigation, and novel detail page with descending natural-sort chapter listing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T07:46:45Z
- **Completed:** 2026-02-18T07:49:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created default layout with fixed header that auto-hides on scroll down and reappears on scroll up
- Added scroll-to-top router config so page transitions always start at top
- Rewrote novel detail page with client-side natural numeric sort (descending, latest first)
- Verified descending order: LRG shows 1887, 1886, ... and MGA shows 2337, 2336, ...

## Task Commits

Each task was committed atomically:

1. **Task 1: Create default layout with auto-hide header and scroll-to-top router config** - `11aafcb` (feat)
2. **Task 2: Rewrite novel detail page with natural sort descending and styled listing** - `6faa246` (feat)

## Files Created/Modified
- `app/composables/useAutoHideHeader.ts` - Scroll direction detection composable using rAF throttling
- `app/router.options.ts` - Router scroll behavior returning top:0 with instant behavior
- `app/layouts/default.vue` - Default layout with fixed header, auto-hide CSS transform, and main content slot
- `app/app.vue` - Wrapped NuxtPage in NuxtLayout
- `app/pages/novels/[novel]/index.vue` - Novel detail page with descending chapter listing using localeCompare

## Decisions Made
- Used client-side `localeCompare({ numeric: true })` for chapter sorting instead of SQL `ORDER BY` (which sorts alphabetically in Content v3)
- Used `requestAnimationFrame` throttling for scroll detection instead of adding `@vueuse/core` as a direct dependency (15-line composable is simpler)
- Sort descending (b before a in comparator) per user decision -- latest chapters appear first

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Layout infrastructure ready for chapter reader page (02-02)
- useAutoHideHeader composable available globally via Nuxt auto-imports
- Natural sort pattern established for reuse in useChapterNav composable
- Router scroll-to-top active for chapter-to-chapter navigation

## Self-Check: PASSED

All files found. All commits found.

---
*Phase: 02-chapter-reader*
*Completed: 2026-02-18*
