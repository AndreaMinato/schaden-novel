# Roadmap: Schaden Novel

## Overview

Rebuild a proven 10-novel, 13,318-chapter reading site from Astro to Nuxt 4 + Nuxt UI. The path is: validate the infrastructure and build pipeline (the highest-risk unknown), build the core reading experience end-to-end, complete the full site to reach Astro parity, then migrate all content and port the import workflow.

## Phases

- [ ] **Phase 1: Infrastructure Foundation** - Nuxt 4 project scaffolded, Netlify configured, Nuxt Content v3 per-novel collections proven to build and deploy
- [ ] **Phase 2: Chapter Reader** - Readers can open any chapter, read it with clean typography, navigate prev/next and via keyboard, and have their progress saved
- [ ] **Phase 3: Full Site Parity** - Home, catalog, resume reading dropdown, RSS, and sitemap complete — site is a deployable Astro replacement
- [ ] **Phase 4: Operations** - Import script ported with bug fixes and all 13,318 existing chapters migrated to Nuxt Content structure

## Phase Details

### Phase 1: Infrastructure Foundation
**Goal**: Validated Nuxt 4 project that scaffolds, builds, and deploys to Netlify with Nuxt Content v3 handling per-novel chapter collections — build-time risks measured before any feature work
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. `nuxi generate` completes without errors and produces a static site that serves locally
  2. One novel's chapters are queryable — `queryCollection()` wrapped in `useAsyncData()` returns correct titles and paths
  3. SQLite database size is measured after ingesting one full novel; if it exceeds 10MB, an architecture decision is made before Phase 2 begins
  4. Netlify deployment succeeds with Node 22.5+ and `nativeSqlite: true` — no `better-sqlite3` binding errors
  5. Selective prerender benchmark with ~500 chapters completes within a known time budget, confirming the SPA fallback strategy for remaining chapter pages
**Plans:** 2 plans
Plans:
- [ ] 01-01-PLAN.md — Scaffold Nuxt 4 + configure per-novel content collections + test pages
- [ ] 01-02-PLAN.md — Validate build, benchmark scale, deploy to Netlify

### Phase 2: Chapter Reader
**Goal**: Readers can open any chapter from a novel's chapter listing and read it with correct typography, prev/next navigation, keyboard shortcuts, and reading progress that survives browser sessions
**Depends on**: Phase 1
**Requirements**: CATL-03, READ-01, READ-02, READ-03, READ-04, PROG-01
**Success Criteria** (what must be TRUE):
  1. Novel detail page lists all chapters for a novel in correct numeric order, including chapters with suffixes like _b and _c
  2. Chapter reader displays prose with readable line-height and max-width, and is usable on a phone-sized screen
  3. Prev and next buttons at the top and bottom of the reader navigate to adjacent chapters correctly, including first and last chapters (boundary behavior fixed from Astro)
  4. Pressing the left or right arrow key navigates to the previous or next chapter without triggering any scroll or browser-default behavior
  5. User's last-read chapter per novel is written to localStorage on chapter load and restored correctly after a page refresh or new browser session
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Layout with auto-hide header, scroll-to-top, and novel detail page with descending chapter listing
- [ ] 02-02-PLAN.md — Chapter reader with typography, prev/next navigation, keyboard shortcuts, and reading progress

### Phase 3: Full Site Parity
**Goal**: The complete site matches the existing Astro site's catalog, home page, resume reading experience, and discovery feeds — ready to replace the Astro site in production
**Depends on**: Phase 2
**Requirements**: CATL-01, CATL-02, PROG-02, DISC-01, DISC-02
**Success Criteria** (what must be TRUE):
  1. Home page displays the latest chapters grouped by each of the 10 novels
  2. Catalog page lists all available novels with their chapter counts
  3. Resume reading dropdown shows the last-read chapter per novel drawn from localStorage, and clicking it navigates directly to that chapter
  4. RSS feed URL returns valid XML with entries for recent chapters
  5. Sitemap URL returns valid XML covering catalog, novel detail, and chapter pages
**Plans:** 2 plans
Plans:
- [ ] 03-01-PLAN.md — Home page, catalog page, resume reading dropdown, layout navigation
- [ ] 03-02-PLAN.md — RSS feeds (global + per-novel) and sitemap generation

### Phase 4: Operations
**Goal**: Developers can import new chapters from Google Docs into the Nuxt Content structure, and all 13,318 existing chapters are accessible in the rebuilt site without data loss
**Depends on**: Phase 3
**Requirements**: OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. Running the import script with a valid Google Docs URL creates a correctly formatted markdown chapter file under the appropriate novel's Nuxt Content directory
  2. Import script surfaces errors visibly when a Google Doc is unavailable, rate-limited, or fails to parse — no silent failures or swallowed exceptions
  3. All ~13,318 existing chapters are accessible in the rebuilt site and match the source markdown content without missing files or formatting regressions
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 0/2 | Not started | - |
| 2. Chapter Reader | 0/2 | Not started | - |
| 3. Full Site Parity | 0/TBD | Not started | - |
| 4. Operations | 0/TBD | Not started | - |
