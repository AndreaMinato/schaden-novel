# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Readers can find and read novel chapters with a smooth, uninterrupted reading experience.
**Current focus:** Phase 4 - Operations

## Current Position

Phase: 4 of 4 (Operations)
Plan: 1 of 3 in current phase
Status: Executing Phase 4
Last activity: 2026-02-18 — Completed 04-01-PLAN.md (import script port)

Progress: [########░░] 78%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 8.1min
- Total execution time: 57min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure-foundation | 2/2 | 43min | 21.5min |
| 02-chapter-reader | 2/2 | 6min | 3min |
| 03-full-site-parity | 2/2 | 6min | 3min |
| 04-operations | 1/3 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 02-02 (3min), 03-01 (3min), 03-02 (3min), 04-01 (2min)
- Trend: stable (fast)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Nuxt 4 + Nuxt UI over Astro — better UI components, Vue ecosystem
- [Init]: Keep Netlify hosting — already configured, familiar
- [Init]: Migrate 13K markdown chapters — proven content, not starting fresh
- [01-01]: Pinned zod@3.24.4 — v3.25.x has broken CJS resolution with jiti
- [01-01]: Added @shikijs/langs + shiki as direct deps — pnpm strict hoisting fix
- [01-01]: Disabled content.watch + vite src/ ignore — EMFILE with 13K legacy files
- [01-01]: SQL dump ~6KB/chapter — projects to ~78MB at 13K scale, needs body stripping strategy
- [01-02]: Filesystem-based prerender route generation — reads actual filenames via readdirSync, avoids hardcoded ranges
- [01-02]: Netlify _redirects for SPA fallback — /* -> /200.html 200
- [01-02]: Content path /{novel}/{slug} distinct from route path /novels/{novel}/{slug}
- [01-02]: SQLite dump 7.9MB for 2,419 chapters — projects to ~45MB at 13K, body-stripping still recommended
- [02-01]: Client-side localeCompare({ numeric: true }) for chapter sort — Content v3 SQL sorts alphabetically
- [02-01]: rAF-throttled scroll detection for auto-hide header — avoids @vueuse/core dependency
- [02-02]: Ascending sort in useChapterNav (prev=lower, next=higher) vs descending in listing page
- [02-02]: Store route path in localStorage progress (not content path) for direct Phase 3 navigation
- [03-01]: Central NOVEL_NAMES map in useNovelMeta for consistent display names across all pages
- [03-01]: UDropdownMenu with nested item arrays for resume reading dropdown
- [03-01]: ClientOnly wrapper for all localStorage-dependent UI sections
- [03-02]: Global RSS link-only, per-novel RSS with full rawbody markdown content
- [03-02]: Multi-sitemap with per-novel sub-sitemaps via @nuxtjs/sitemap
- [03-02]: Only mga/lrg RSS prerendered (novels with current content)
- [04-01]: Refactored import_ids.mjs loadAll to iterate Object.keys(novels) instead of hardcoded per-novel calls

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: SQLite dump size MEASURED at ~3.5KB/chapter average (7.9MB for 2,419 chapters) — projecting ~45MB for 13K; body stripping via content:file:afterParse hook recommended before full content migration
- [Phase 1 - RESOLVED]: Build time at 13K pages — measured 40s for 2,419 chapters; extrapolates to ~3.6 minutes for 13K content processing. Acceptable.
- [Phase 2 - RESOLVED]: `queryCollectionItemSurroundings` — bypassed entirely; custom useChapterNav composable with localeCompare numeric sort provides correct ordering

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 04-01-PLAN.md (import script port). Phase 4 in progress.
Resume file: .planning/phases/04-operations/04-01-SUMMARY.md
