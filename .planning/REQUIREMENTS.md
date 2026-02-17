# Requirements: Schaden Novel

**Defined:** 2026-02-17
**Core Value:** Readers can find and read novel chapters with a smooth, uninterrupted reading experience.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Site built with Nuxt 4 + Nuxt UI, deployable as static site
- [ ] **INFRA-02**: Nuxt Content v3 handles markdown chapter files with per-novel collections
- [ ] **INFRA-03**: Build completes within Netlify timeout (~30 min) for 13K+ chapters
- [ ] **INFRA-04**: Site deploys to Netlify with zero-config preset
- [ ] **INFRA-05**: Content queries use useAsyncData to avoid SQLite dump download in browser

### Catalog

- [ ] **CATL-01**: User can view home page with latest chapters grouped by novel
- [ ] **CATL-02**: User can view novel catalog showing all available novels with chapter counts
- [ ] **CATL-03**: User can view novel detail page with full chapter listing

### Reader

- [ ] **READ-01**: User can read a chapter with clean prose typography (max-width, readable line-height)
- [ ] **READ-02**: User can navigate to prev/next chapter via buttons at top and bottom of reader
- [ ] **READ-03**: User can navigate chapters using keyboard arrow keys
- [ ] **READ-04**: Chapter page is mobile-responsive and readable on phone screens

### Progress

- [ ] **PROG-01**: User's reading progress (last chapter per novel) persists in localStorage
- [ ] **PROG-02**: User can resume reading from a multi-novel dropdown showing last-read chapter per novel

### Discovery

- [ ] **DISC-01**: Site generates RSS feed for new chapters
- [ ] **DISC-02**: Site generates sitemap for search engine indexing

### Operations

- [ ] **OPS-01**: Google Docs import script ports existing chapter import workflow to new project
- [ ] **OPS-02**: Import script handles errors visibly (fix existing silent error swallowing)
- [ ] **OPS-03**: Existing ~13,318 markdown chapters migrate to Nuxt Content structure

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhancements

- **ENH-01**: User can toggle dark mode / light mode with localStorage persistence
- **ENH-02**: User can view novel synopsis/description page per novel
- **ENH-03**: User can adjust reader font size and line height via settings panel
- **ENH-04**: User can jump to any chapter via slide-out drawer in reader
- **ENH-05**: User can filter/search chapters within a novel's chapter list

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Static site, no backend; localStorage sufficient for progress |
| Comments / community features | Reading-focused, no moderation infrastructure |
| Full-text search across all chapters | 170MB content makes client-side search impractical |
| Offline / PWA mode | 170MB content exceeds browser cache limits |
| Rating / review system | Requires auth + backend |
| Real-time notifications (push/email) | Static site, no server; RSS is the notification primitive |
| Monetization / chapter unlocking | Content is translated, not original; legal complexity |
| Mobile app | Mobile web is sufficient; scope explosion |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |
| INFRA-05 | — | Pending |
| CATL-01 | — | Pending |
| CATL-02 | — | Pending |
| CATL-03 | — | Pending |
| READ-01 | — | Pending |
| READ-02 | — | Pending |
| READ-03 | — | Pending |
| READ-04 | — | Pending |
| PROG-01 | — | Pending |
| PROG-02 | — | Pending |
| DISC-01 | — | Pending |
| DISC-02 | — | Pending |
| OPS-01 | — | Pending |
| OPS-02 | — | Pending |
| OPS-03 | — | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after initial definition*
