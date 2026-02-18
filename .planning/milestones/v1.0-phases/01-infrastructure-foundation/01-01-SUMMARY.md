---
phase: 01-infrastructure-foundation
plan: 01
subsystem: infra
tags: [nuxt4, nuxt-content-v3, nuxt-ui, tailwindcss, sqlite, vue, static-site]

# Dependency graph
requires: []
provides:
  - Nuxt 4 project scaffold with Nuxt Content v3 and Nuxt UI
  - Per-novel collection definitions for all 10 novels
  - useAsyncData query patterns for content pages
  - 84 lrg test chapters in content/lrg/
  - Home page, novel listing, and chapter reader pages
affects: [01-02, 02-reading-experience, 03-content-migration]

# Tech tracking
tech-stack:
  added: [nuxt@4.3.1, "@nuxt/content@3.11.2", "@nuxt/ui@4.4.0", tailwindcss@4.1.18, zod@3.24.4, shiki@3.22.0]
  patterns: [per-novel-collections, useAsyncData-wrapping, select-excluding-body, ContentRenderer]

key-files:
  created:
    - nuxt.config.ts
    - content.config.ts
    - app/app.vue
    - app/assets/css/main.css
    - app/pages/index.vue
    - app/pages/novels/[novel]/index.vue
    - app/pages/novels/[novel]/[...slug].vue
    - content/lrg/ (84 chapters)
  modified:
    - package.json
    - tsconfig.json
    - .gitignore

key-decisions:
  - "Pinned zod@3.24.4 — zod 3.25.x (v4 compat) has broken CJS resolution with jiti"
  - "Added @shikijs/langs and shiki as direct deps — pnpm strict hoisting prevented Nitro from resolving them"
  - "Disabled content.watch and added vite src/ ignore — 13K files in src/content/novels/ cause EMFILE in dev server"
  - "Used 'as any' type assertion for dynamic queryCollection(novel) — TypeScript requires static collection names"

patterns-established:
  - "useAsyncData wrapping: Every queryCollection() call wrapped in useAsyncData() for payload extraction"
  - "Metadata-only listings: .select('title', 'path', 'stem') excludes body from listing queries"
  - "Per-novel collections: novelCollection() helper creates typed collections per novel directory"
  - "Native SQLite: sqliteConnector: 'native' avoids better-sqlite3 native compilation issues"

requirements-completed: [INFRA-01, INFRA-02, INFRA-05]

# Metrics
duration: 26min
completed: 2026-02-17
---

# Phase 1 Plan 1: Nuxt 4 Scaffold Summary

**Nuxt 4 + Nuxt Content v3 + Nuxt UI project with per-novel collections, useAsyncData query patterns, and 84 lrg test chapters generating static output**

## Performance

- **Duration:** 26 min
- **Started:** 2026-02-17T13:53:33Z
- **Completed:** 2026-02-17T14:19:40Z
- **Tasks:** 2
- **Files modified:** 98

## Accomplishments
- Nuxt 4 project fully scaffolded with Nuxt Content v3, Nuxt UI, and Tailwind CSS 4
- Per-novel collection definitions for all 10 novels with shared chapterSchema (title, pubDate, tags)
- Three page types created: home page, novel listing (metadata-only), chapter reader (with ContentRenderer)
- Static build (`nuxi generate`) completes successfully — 84 files processed, 14 routes prerendered
- SQL dump measured at 502KB for 84 chapters (~6KB/chapter, projecting ~78MB for 13K)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace Astro with Nuxt 4 + Nuxt UI + Nuxt Content v3** - `b3b391b` (feat)
2. **Task 2: Copy test content and create pages with useAsyncData queries** - `0e55904` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `nuxt.config.ts` - Nuxt config with native SQLite, crawlLinks disabled, selective prerender
- `content.config.ts` - 10 novel collections with shared chapterSchema helper
- `app/app.vue` - Root component with UApp and NuxtPage
- `app/assets/css/main.css` - Tailwind + Nuxt UI CSS imports
- `app/pages/index.vue` - Home page with queryCollection('lrg').limit(10)
- `app/pages/novels/[novel]/index.vue` - Chapter listing with .select() excluding body
- `app/pages/novels/[novel]/[...slug].vue` - Chapter reader with ContentRenderer
- `content/lrg/*.md` - 84 test chapters copied from Astro content
- `package.json` - Nuxt dependencies replacing Astro
- `tsconfig.json` - Extends .nuxt/tsconfig.json
- `.gitignore` - Added .nuxt/, .output/, .data/

## Decisions Made
- **Pinned zod@3.24.4**: zod 3.25.x (the v4 transitional release) has broken CJS module resolution when loaded via jiti in content.config.ts. Pinning to 3.24.4 avoids this.
- **Direct shiki dependencies**: Added @shikijs/langs@3.22.0 and shiki@3.22.0 as direct deps because pnpm strict hoisting prevented Nitro from resolving them as transitive deps of @nuxt/content.
- **Disabled content watching**: The project has 13K markdown files in src/content/novels/ which causes EMFILE (too many open files) errors on the dev server. Content watching disabled; vite configured to ignore src/ directory.
- **Type assertion for dynamic collections**: `queryCollection(novel as any)` used because TypeScript requires statically-known collection names. Noted for potential improvement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed zod CJS resolution error in content.config.ts**
- **Found during:** Task 1 (dev server startup)
- **Issue:** zod 3.25.x installed by default; its v3 compat layer has broken `require()` paths causing `Cannot find module '../ZodError.cjs'`
- **Fix:** Pinned zod@3.24.4 as direct dependency
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `nuxi generate` completes without zod errors
- **Committed in:** 0e55904 (part of Task 2 commit)

**2. [Rule 3 - Blocking] Fixed @shikijs/langs not found during Nitro prerender**
- **Found during:** Task 2 (first build attempt)
- **Issue:** @shikijs/langs 3.7.0 hoisted to node_modules instead of 3.22.0; missing typescript.mjs file
- **Fix:** Added @shikijs/langs@3.22.0 and shiki@3.22.0 as direct dependencies
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `nuxi generate` prerender completes successfully
- **Committed in:** 0e55904 (part of Task 2 commit)

**3. [Rule 3 - Blocking] EMFILE error on dev server from 13K files in src/content/**
- **Found during:** Task 2 (dev server verification)
- **Issue:** macOS kernel limit of 61K file descriptors per process exceeded by Vite/Nuxt watching 13K legacy Astro content files
- **Fix:** Disabled content.watch, added vite.server.watch.ignored for src/ directory. Verified project via `nuxi generate` + static serve instead of dev server.
- **Files modified:** nuxt.config.ts
- **Verification:** Build completes, static output serves correctly
- **Committed in:** 0e55904 (part of Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking issues)
**Impact on plan:** All fixes necessary for the project to build. No scope creep. Dev server verification deferred to when old Astro content is removed (Phase 3+).

## Issues Encountered
- **Dev server EMFILE**: The dev server cannot start properly when 13K markdown files exist in src/content/novels/. This is a macOS per-process file descriptor limit (kern.maxfilesperproc: 61440). The issue will resolve itself when old Astro content is removed during migration phases. In the meantime, verification was done via static build + serve.
- **String-based chapter ordering**: `.order('stem', 'ASC')` produces string sort (1, 100, 12...) not numeric (1, 2, 3...). This is expected and deferred to Phase 2 ordering implementation.
- **SQL dump size concern confirmed**: 502KB for 84 chapters projects to ~78MB for all 13K chapters. The body-exclusion strategy from .select() only affects query results, not the dump itself. This validates the concern raised in STATE.md and may need the content:file:afterParse hook approach.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Nuxt 4 foundation is operational with all core patterns established
- Content query patterns (useAsyncData + queryCollection + .select()) proven working
- Ready for Plan 02 (Netlify deployment, build benchmarks)
- SQL dump size concern needs monitoring as more content is added

## Self-Check: PASSED

All files verified present. All commit hashes found. 84 content files confirmed.

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-02-17*
