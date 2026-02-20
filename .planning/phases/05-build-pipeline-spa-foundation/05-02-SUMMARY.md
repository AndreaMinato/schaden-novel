---
phase: 05-build-pipeline-spa-foundation
plan: 02
subsystem: infra
tags: [netlify, spa, redirects, loading-template]

# Dependency graph
requires:
  - phase: 05-01
    provides: "nuxt.config.ts spaLoadingTemplate setting pointing to app/spa-loading-template.html"
provides:
  - "netlify.toml with /novels/*/* rewrite to 200.html for chapter deep links"
  - "Branded SPA loading template (dark theme, spinner, site name)"
  - "Removal of legacy public/_redirects catch-all"
affects: [06-chapter-reading-spa, 07-deploy-verify]

# Tech tracking
tech-stack:
  added: []
  patterns: ["netlify.toml redirects over _redirects file", "force=false to preserve static file serving"]

key-files:
  created: [netlify.toml, app/spa-loading-template.html]
  modified: []

key-decisions:
  - "Used netlify.toml over _redirects for redirect config (structured, extensible)"
  - "Targeted /novels/*/* pattern instead of catch-all /* to preserve static file routing"
  - "force=false ensures prerendered files served directly, only missing routes fall back to SPA shell"

patterns-established:
  - "Netlify redirects via netlify.toml: all routing rules live here, not in _redirects"
  - "SPA loading template: inline CSS only, no external deps, auto-removed by Nuxt on mount"

requirements-completed: [SPA-01]

# Metrics
duration: 1min
completed: 2026-02-20
---

# Phase 5 Plan 2: SPA Fallback Routing Summary

**Netlify rewrite rule serving 200.html for chapter deep links with branded dark-theme loading spinner**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-20T12:41:21Z
- **Completed:** 2026-02-20T12:41:58Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created netlify.toml with `/novels/*/*` rewrite to 200.html (status 200, force=false)
- Built branded SPA loading template with "Schaden Novel" text, subtle spinner, dark background (#0a0a0a)
- Removed legacy `public/_redirects` catch-all rule in favor of targeted toml redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Netlify SPA redirect and branded loading template** - `4d289d1` (feat)

## Files Created/Modified
- `netlify.toml` - Netlify redirect rule: /novels/*/* -> /200.html (status 200, force=false)
- `app/spa-loading-template.html` - Branded SPA loading page with dark theme, site name, CSS spinner
- `public/_redirects` - Deleted (replaced by netlify.toml)

## Decisions Made
- Used netlify.toml instead of _redirects for redirect configuration (structured format, more extensible)
- Targeted `/novels/*/*` pattern rather than catch-all `/*` to avoid interfering with other static routes
- Set `force = false` so Netlify serves existing prerendered files directly, only falling back to 200.html for chapter routes without static files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SPA fallback routing infrastructure complete
- Requires Plan 05-01 to configure `spaLoadingTemplate` in nuxt.config.ts and run `nuxt generate` to produce 200.html with embedded loading template
- Ready for chapter reading SPA implementation (Phase 6)

## Self-Check: PASSED

- FOUND: netlify.toml
- FOUND: app/spa-loading-template.html
- CONFIRMED DELETED: public/_redirects
- FOUND: commit 4d289d1

---
*Phase: 05-build-pipeline-spa-foundation*
*Completed: 2026-02-20*
