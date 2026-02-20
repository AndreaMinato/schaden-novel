# Requirements: Schaden Novel

**Defined:** 2026-02-20
**Core Value:** Readers can find and read novel chapters with a smooth, uninterrupted reading experience.

## v1.1 Requirements

Requirements for SPA Migration milestone. Each maps to roadmap phases.

### Build Pipeline

- [ ] **BUILD-01**: Build produces individual JSON body files for all 13,318 chapters via body-extractor module
- [ ] **BUILD-02**: SQL dump is body-stripped at parse time (64MB -> ~2.6MB), replacing post-build script
- [ ] **BUILD-03**: Only ~25 shell pages prerendered (home, catalog, novel listings, RSS, sitemaps) -- not 26K chapter routes
- [ ] **BUILD-04**: Build completes in under 2 minutes

### Chapter Reading

- [ ] **READ-01**: Chapter page loads metadata from WASM SQLite and body from static JSON as separate fetches
- [ ] **READ-02**: Loading skeleton displays while chapter body fetches
- [ ] **READ-03**: Adjacent chapter bodies (prev/next) are prefetched for instant navigation
- [ ] **READ-04**: Visited chapter bodies are cached in memory to avoid re-fetching

### SEO & Discovery

- [ ] **SEO-01**: Sitemaps generated at build time with explicit URL sources for all chapters
- [ ] **SEO-02**: RSS feeds (global + per-novel) still functional in SPA mode

### SPA Infrastructure

- [x] **SPA-01**: Netlify redirect rule serves 200.html for all non-prerendered routes (deep link support)

## Future Requirements

Deferred to future milestones.

### UX Polish

- **UX-01**: SPA loading template while JS bundle initializes
- **UX-02**: Loading skeletons on metadata-dependent pages (home, catalog, novel listing)
- **UX-03**: SEO meta tags on SPA-rendered chapter pages via useHead/useSeoMeta

## Out of Scope

| Feature | Reason |
|---------|--------|
| SSR rendering | OOM at 8GB (64MB database module), Lambda bundle 78MB > 50MB limit |
| `ssr: false` global mode | Breaks Nuxt Content v3 static generation (issue #1229) |
| Full-text search | 170MB content impractical for client-side |
| Offline / PWA | Content too large for browser cache |
| Authentication | Static reading site, no login needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 5 | Pending |
| BUILD-02 | Phase 5 | Pending |
| BUILD-03 | Phase 5 | Pending |
| BUILD-04 | Phase 5 | Pending |
| READ-01 | Phase 6 | Pending |
| READ-02 | Phase 6 | Pending |
| READ-03 | Phase 7 | Pending |
| READ-04 | Phase 7 | Pending |
| SEO-01 | Phase 7 | Pending |
| SEO-02 | Phase 7 | Pending |
| SPA-01 | Phase 5 | Complete |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after 05-02 execution*
