---
phase: 05-ssr-deploy-pipeline
plan: 01
subsystem: infra
tags: [nuxt-ssr, better-sqlite3, netlify, serverless, nitro]

# Dependency graph
requires: []
provides:
  - SSR-mode nuxt.config.ts with better-sqlite3 and @netlify/nuxt
  - netlify.toml for Netlify CI builds with Node 22
  - /api/health endpoint for SQLite runtime verification
  - Updated deploy/preview scripts for SSR workflow
affects: [05-02, 06-isr-caching, 07-monitoring]

# Tech tracking
tech-stack:
  added: [better-sqlite3@12.6.2, "@netlify/nuxt@0.2.24"]
  patterns: [SSR serverless via @netlify/nuxt, in-memory SQLite via better-sqlite3]

key-files:
  created:
    - netlify.toml
    - server/api/health.ts
  modified:
    - nuxt.config.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used better-sqlite3 ^12.5.0 (not ^11.0.0 from plan) to satisfy @nuxt/content peer dependency"
  - "Installed node-gyp globally for native module compilation on Node 24 (no prebuilt binaries)"
  - "Kept prerender for /, /404.html, /rss.xml, and per-novel RSS routes"

patterns-established:
  - "Health endpoint pattern: /api/health queries SQLite to prove runtime database connectivity"
  - "SSR deploy: pnpm build + netlify deploy --prod --build"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 5 Plan 1: SSR Build Configuration Summary

**SSR-mode Nuxt config with better-sqlite3 connector, @netlify/nuxt serverless adapter, and Netlify CI build pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T11:49:12Z
- **Completed:** 2026-02-19T11:53:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Migrated nuxt.config.ts from SSG (13K prerendered routes) to SSR mode
- Switched SQLite connector from native to better-sqlite3 (Lambda compatible)
- Added @netlify/nuxt module for serverless deployment integration
- Created netlify.toml with Node 22 runtime and pnpm build configuration
- Created /api/health endpoint for runtime SQLite verification
- Removed SSG-era artifacts (prerender:routes hook, SPA fallback _redirects, /200.html route)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate nuxt.config.ts to SSR mode and install dependencies** - `c6a90e4` (feat)
2. **Task 2: Create netlify.toml, health endpoint, and update deploy scripts** - `9842180` (feat)

## Files Created/Modified
- `nuxt.config.ts` - SSR-mode config with better-sqlite3, @netlify/nuxt, :memory: database, no prerender hook
- `package.json` - Added better-sqlite3 and @netlify/nuxt deps, updated preview/deploy scripts
- `pnpm-lock.yaml` - Updated lockfile with new dependencies
- `netlify.toml` - Netlify CI build config with Node 22 and pnpm
- `server/api/health.ts` - Health check endpoint querying SQLite collection
- `public/_redirects` - Deleted (SPA fallback no longer needed)

## Decisions Made
- Used better-sqlite3 ^12.5.0 instead of ^11.0.0 (plan spec) to match @nuxt/content peer dependency requirement (^12.5.0). Resolved v12.6.2 installed.
- Kept prerender for small static pages (/, /404.html, RSS feeds) while removing the 13K chapter enumeration hook.
- Deploy script changed to `netlify deploy --prod --build` to let Netlify package the server function.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed better-sqlite3 version to match peer dependency**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Plan specified ^11.0.0 but @nuxt/content 3.11.2 requires ^12.5.0 as peer dependency
- **Fix:** Updated version specifier to ^12.5.0, resolved to 12.6.2
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** pnpm install completes with no peer dependency warnings for better-sqlite3
- **Committed in:** c6a90e4 (Task 1 commit)

**2. [Rule 3 - Blocking] Installed node-gyp globally for native compilation**
- **Found during:** Task 1 (pnpm install)
- **Issue:** No prebuilt better-sqlite3 binaries for Node 24.13.0 arm64 darwin, and node-gyp not on PATH
- **Fix:** Ran `npm install -g node-gyp` to enable compilation from source
- **Files modified:** None (global install, not in project)
- **Verification:** better-sqlite3 compiled and installed successfully
- **Committed in:** c6a90e4 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for installation to succeed. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SSR configuration complete, ready for `nuxt build` to produce server function
- Plan 05-02 can proceed with build verification and initial deploy
- Cold start latency and SQLite performance to be validated in 05-02

## Self-Check: PASSED

- All 5 created/modified files verified on disk
- public/_redirects confirmed deleted
- Commit c6a90e4 (Task 1) verified in git log
- Commit 9842180 (Task 2) verified in git log

---
*Phase: 05-ssr-deploy-pipeline*
*Completed: 2026-02-19*
