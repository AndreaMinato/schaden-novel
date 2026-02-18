---
phase: 03-full-site-parity
plan: 01
subsystem: ui
tags: [nuxt-pages, nuxt-content-v3, nuxt-ui, localStorage, composables, navigation]

requires:
  - phase: 02-chapter-reader
    provides: useReadingProgress composable, chapter reader pages, novel detail pages
  - phase: 01-infrastructure-foundation
    provides: Nuxt Content v3 collections for 10 novels, layout with auto-hide header
provides:
  - Home page with per-novel sections showing latest chapters
  - Catalog page at /novels with chapter counts
  - useNovelMeta composable with NOVEL_NAMES map and getNovelName helper
  - Extended useReadingProgress with getAll() method
  - ResumeDropdown component for header navigation
  - Layout with Home/Novels nav links and resume reading dropdown
affects: [03-02, rss-feeds, sitemap]

tech-stack:
  added: []
  patterns:
    - "Multi-collection aggregation via Promise.all over NOVEL_SLUGS"
    - "Client-only resume reading via onMounted + ClientOnly wrapper"
    - "Central novel metadata via useNovelMeta composable"

key-files:
  created:
    - app/composables/useNovelMeta.ts
    - app/components/ResumeDropdown.vue
    - app/pages/novels/index.vue
  modified:
    - app/composables/useReadingProgress.ts
    - app/pages/index.vue
    - app/layouts/default.vue

key-decisions:
  - "Central NOVEL_NAMES map in useNovelMeta for consistent display names across all pages"
  - "UDropdownMenu with nested item arrays for resume reading dropdown"
  - "ClientOnly wrapper for all localStorage-dependent UI sections"

patterns-established:
  - "Multi-collection query: Promise.all(NOVEL_SLUGS.map(slug => queryCollection(slug as any)...))"
  - "Empty collection handling: filter(n => n.chapters.length > 0) after aggregation"
  - "Novel name resolution: getNovelName(slug) with toUpperCase fallback"

requirements-completed: [CATL-01, CATL-02, PROG-02]

duration: 3min
completed: 2026-02-18
---

# Phase 3 Plan 1: Home Page, Catalog, and Resume Reading Summary

**Home page with per-novel latest chapters, catalog page with chapter counts, and resume reading dropdown using UDropdownMenu and localStorage**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T09:05:18Z
- **Completed:** 2026-02-18T09:07:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Home page displays latest 3 chapters per novel, sections sorted by most recently updated
- Catalog page at /novels lists novels with chapter counts, sorted alphabetically
- Resume reading dropdown in header shows progress from localStorage with empty state
- Resume reading section on home page mirrors dropdown data
- Empty collections (8 of 10 novels) gracefully filtered out

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useNovelMeta, extend useReadingProgress, build ResumeDropdown** - `eb6b64a` (feat)
2. **Task 2: Rewrite home page, create catalog page, update layout** - `fb90021` (feat)

## Files Created/Modified
- `app/composables/useNovelMeta.ts` - Novel name map (NOVEL_NAMES), slug list (NOVEL_SLUGS), getNovelName helper
- `app/composables/useReadingProgress.ts` - Added getAll() method returning full localStorage progress object
- `app/components/ResumeDropdown.vue` - UDropdownMenu-based resume reading dropdown with empty state
- `app/pages/index.vue` - Home page with resume reading section and per-novel latest chapters
- `app/pages/novels/index.vue` - Catalog page with chapter counts sorted alphabetically
- `app/layouts/default.vue` - Added Home/Novels nav links and ClientOnly ResumeDropdown

## Decisions Made
- Used central useNovelMeta composable rather than inline name maps -- single source of truth for novel display names
- UDropdownMenu with nested item arrays (Nuxt UI v4 pattern) for the resume dropdown
- Wrapped all localStorage-dependent UI in ClientOnly to prevent SSR hydration mismatches
- Chapter extraction from path uses simple split('/').pop() rather than regex

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Home page, catalog, and resume reading complete
- Ready for Plan 02: RSS feeds and sitemap generation
- useNovelMeta composable available for use in RSS server routes

## Self-Check: PASSED

- All 6 files verified present on disk
- Commit `eb6b64a` verified in git log
- Commit `fb90021` verified in git log
- `nuxi prepare` completed without errors

---
*Phase: 03-full-site-parity*
*Completed: 2026-02-18*
