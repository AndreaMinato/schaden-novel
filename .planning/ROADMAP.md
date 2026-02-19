# Roadmap: Schaden Novel

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-4 (shipped 2026-02-18)
- **v1.1 SSR Migration** -- Phases 5-7 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) -- SHIPPED 2026-02-18</summary>

- [x] Phase 1: Infrastructure Foundation (2/2 plans) -- completed 2026-02-17
- [x] Phase 2: Chapter Reader (2/2 plans) -- completed 2026-02-18
- [x] Phase 3: Full Site Parity (2/2 plans) -- completed 2026-02-18
- [x] Phase 4: Operations (3/3 plans) -- completed 2026-02-18

</details>

### v1.1 SSR Migration (In Progress)

**Milestone Goal:** Switch from full SSG (10-min builds, 26K prerendered routes) to hybrid SSR on Netlify. Chapters stay CDN-cached via ISR. Build drops to under 2 minutes. RSS feeds gain full chapter content.

- [ ] **Phase 5: SSR Deploy Pipeline** - Netlify CI build producing a working SSR server function
- [ ] **Phase 6: Hybrid Rendering** - Per-route rendering strategies replace SSG-era route enumeration
- [ ] **Phase 7: Full-Content RSS** - RSS feeds deliver full chapter HTML to feed readers

## Phase Details

### Phase 5: SSR Deploy Pipeline
**Goal**: Site deploys and serves pages as an SSR application on Netlify
**Depends on**: Phase 4
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04
**Success Criteria** (what must be TRUE):
  1. `nuxt build` produces server function output (not static-only HTML)
  2. Site is live on Netlify serving pages through the server function
  3. Health-check endpoint confirms `node:sqlite` works in the Lambda runtime
  4. Cold start TTFB is under 3 seconds after 30 minutes idle
**Plans:** 2 plans

Plans:
- [ ] 05-01-PLAN.md — SSR build configuration (nuxt.config.ts, deps, netlify.toml, health endpoint)
- [ ] 05-02-PLAN.md — Deploy and validate SSR on Netlify (build test, live site verification)

### Phase 6: Hybrid Rendering
**Goal**: Pages use optimal rendering strategies (prerender/ISR) and SSG-era route generation is eliminated
**Depends on**: Phase 5
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04, CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. Home and catalog pages exist as static HTML in build output (prerendered)
  2. Chapter pages return CDN cache headers after first request (ISR active)
  3. Sitemap XML files exist as static files in build output (no Lambda timeout risk)
  4. Build completes in under 2 minutes (no 26K route enumeration)
  5. All 10 novels' chapter readers, navigation, and reading progress work correctly
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Full-Content RSS
**Goal**: RSS feeds deliver full chapter content to feed readers
**Depends on**: Phase 6
**Requirements**: RSS-01, RSS-02, RSS-03
**Success Criteria** (what must be TRUE):
  1. RSS feed entries contain full chapter HTML in `<content:encoded>` tags
  2. Feed readers display formatted chapter content (not just title/link)
  3. Both global and per-novel RSS feeds serve full content
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:** Phase 5 -> Phase 6 -> Phase 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure Foundation | v1.0 | 2/2 | Complete | 2026-02-17 |
| 2. Chapter Reader | v1.0 | 2/2 | Complete | 2026-02-18 |
| 3. Full Site Parity | v1.0 | 2/2 | Complete | 2026-02-18 |
| 4. Operations | v1.0 | 3/3 | Complete | 2026-02-18 |
| 5. SSR Deploy Pipeline | v1.1 | 0/? | Not started | - |
| 6. Hybrid Rendering | v1.1 | 0/? | Not started | - |
| 7. Full-Content RSS | v1.1 | 0/? | Not started | - |
