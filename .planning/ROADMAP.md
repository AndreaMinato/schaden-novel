# Roadmap: Schaden Novel

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-4 (shipped 2026-02-18)
- **v1.1 SPA Migration** -- Phases 5-7 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) -- SHIPPED 2026-02-18</summary>

- [x] Phase 1: Infrastructure Foundation (2/2 plans) -- completed 2026-02-17
- [x] Phase 2: Chapter Reader (2/2 plans) -- completed 2026-02-18
- [x] Phase 3: Full Site Parity (2/2 plans) -- completed 2026-02-18
- [x] Phase 4: Operations (3/3 plans) -- completed 2026-02-18

</details>

### v1.1 SPA Migration

**Milestone Goal:** Eliminate 10-minute builds by switching from full SSG (26K prerendered routes) to SPA mode with on-demand chapter body loading. Build drops to under 2 minutes.

- [ ] **Phase 5: Build Pipeline + SPA Foundation** - Body-extractor module, stripped SQL dump, minimal prerendering, SPA fallback routing
- [ ] **Phase 6: Chapter Reader** - Client-side chapter rendering with split metadata/body fetches and loading feedback
- [ ] **Phase 7: SEO + Reading Optimization** - Sitemap/RSS preservation and chapter prefetch/cache for instant navigation

## Phase Details

### Phase 5: Build Pipeline + SPA Foundation
**Goal**: Build produces SPA-ready output -- body JSON files, metadata-only SQL dump, minimal prerendered pages, and SPA fallback routing
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, SPA-01
**Success Criteria** (what must be TRUE):
  1. Running `nuxt generate` produces 13,318 individual JSON body files alongside the site output
  2. SQL dump in build output is ~2.6MB (body-stripped at parse time), not 64MB
  3. Build prerenders only ~25 shell pages (home, catalog, novel listings, RSS, sitemaps) -- not 26K chapter routes
  4. Build completes in under 2 minutes
  5. Visiting a chapter URL directly (deep link) loads the SPA shell instead of returning 404
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md -- Body extractor module + build pipeline config (BUILD-01, BUILD-02, BUILD-03, BUILD-04)
- [x] 05-02-PLAN.md -- SPA fallback routing + branded loading template (SPA-01) -- completed 2026-02-20

### Phase 6: Chapter Reader
**Goal**: Readers can open and read any chapter through client-side rendering with visual loading feedback
**Depends on**: Phase 5
**Requirements**: READ-01, READ-02
**Success Criteria** (what must be TRUE):
  1. Opening a chapter URL displays the full chapter (title, body text, prev/next navigation) rendered client-side via WASM SQLite metadata + fetched JSON body
  2. A loading skeleton is visible while the chapter body fetches, replaced by content when the fetch completes
  3. All existing chapter features work in SPA mode: keyboard navigation, reading progress tracking, dark mode
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: SEO + Reading Optimization
**Goal**: Search engines discover all chapters and readers enjoy instant chapter-to-chapter navigation
**Depends on**: Phase 6
**Requirements**: SEO-01, SEO-02, READ-03, READ-04
**Success Criteria** (what must be TRUE):
  1. Sitemap includes URLs for all 13,318 chapters, generated at build time via explicit URL sources
  2. RSS feeds (global + per-novel) return valid XML with chapter entries
  3. Navigating to next/previous chapter loads instantly (adjacent bodies prefetched)
  4. Returning to a previously read chapter in the same session loads instantly (body cached in memory)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:** 5 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure Foundation | v1.0 | 2/2 | Complete | 2026-02-17 |
| 2. Chapter Reader | v1.0 | 2/2 | Complete | 2026-02-18 |
| 3. Full Site Parity | v1.0 | 2/2 | Complete | 2026-02-18 |
| 4. Operations | v1.0 | 3/3 | Complete | 2026-02-18 |
| 5. Build Pipeline + SPA Foundation | v1.1 | 1/2 | In Progress | - |
| 6. Chapter Reader | v1.1 | 0/? | Not started | - |
| 7. SEO + Reading Optimization | v1.1 | 0/? | Not started | - |
