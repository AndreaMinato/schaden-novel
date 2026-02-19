# Requirements: Schaden Novel

**Defined:** 2026-02-18
**Core Value:** Readers can find and read novel chapters with a smooth, uninterrupted reading experience.

## v1.1 Requirements

Requirements for SSR migration. Each maps to roadmap phases.

### Build Pipeline

- [x] **BUILD-01**: Build switches from `nuxt generate` to `nuxt build` for SSR output
- [x] **BUILD-02**: `netlify.toml` configures Netlify CI build with Node 22
- [x] **BUILD-03**: `@netlify/nuxt` module added for ISR and CDN integration
- [ ] **BUILD-04**: Deploy pipeline produces working SSR site on Netlify

### Hybrid Rendering

- [ ] **RENDER-01**: `routeRules` configures per-route rendering strategy (prerender/ISR)
- [ ] **RENDER-02**: Chapter and novel pages use ISR (cached until redeploy)
- [ ] **RENDER-03**: Home and catalog pages are prerendered at build time
- [ ] **RENDER-04**: Sitemaps are prerendered to avoid Lambda timeout

### Cleanup

- [ ] **CLEAN-01**: `getChapterSlugs()` function and `readdirSync` route generation removed
- [ ] **CLEAN-02**: `prerender:routes` hook and `nitro.prerender.routes` array removed
- [ ] **CLEAN-03**: Build time under 2 minutes (no 26K route enumeration)

### RSS Upgrade

- [ ] **RSS-01**: Collection schemas include `rawbody` field for chapter content access
- [ ] **RSS-02**: RSS feeds include full chapter content in `<content:encoded>`
- [ ] **RSS-03**: RSS server routes convert markdown to HTML for feed readers

## Future Requirements

### Operational Improvements

- **OPS-01**: Cold start monitoring and frequency tracking
- **OPS-02**: Cache invalidation webhook for post-import CDN purging
- **OPS-03**: Streamlined import pipeline (import -> deploy -> purge in one command)
- **OPS-04**: Body-stripping pipeline removal (after verifying _payload.json replaces WASM SQLite downloads)

### Database Migration

- **DB-01**: Turso/LibSQL migration if cold start exceeds 3 seconds
- **DB-02**: External database for zero-cold-start content queries

## Out of Scope

| Feature | Reason |
|---------|--------|
| Edge Functions for SSR | Deno runtime, `node:sqlite` unavailable, memory limits incompatible with 64MB database |
| Full SSR with no caching | 13K unique Lambda invocations is expensive and slow; ISR required |
| Server-side reading progress | Scope explosion; localStorage is adequate |
| Turso migration (v1.1) | Only needed if cold start > 3s; deferred to future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 5 | Complete |
| BUILD-02 | Phase 5 | Complete |
| BUILD-03 | Phase 5 | Complete |
| BUILD-04 | Phase 5 | Pending |
| RENDER-01 | Phase 6 | Pending |
| RENDER-02 | Phase 6 | Pending |
| RENDER-03 | Phase 6 | Pending |
| RENDER-04 | Phase 6 | Pending |
| CLEAN-01 | Phase 6 | Pending |
| CLEAN-02 | Phase 6 | Pending |
| CLEAN-03 | Phase 6 | Pending |
| RSS-01 | Phase 7 | Pending |
| RSS-02 | Phase 7 | Pending |
| RSS-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after roadmap creation*
