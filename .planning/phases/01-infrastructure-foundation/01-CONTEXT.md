# Phase 1: Infrastructure Foundation - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold Nuxt 4 + Nuxt UI project, configure Nuxt Content v3 with per-novel collections, validate the build pipeline handles 13K chapters, and deploy static output to Netlify. No user-facing features — infrastructure only.

</domain>

<decisions>
## Implementation Decisions

### Build and deploy workflow
- Builds happen locally, NOT on Netlify CI — user runs build locally then uploads dist/ to Netlify
- Netlify build timeout is irrelevant — local machine has no timeout constraint
- Incremental builds are important — chapters are only added (batch import), rarely edited
- Typical workflow: batch import new chapters → rebuild → deploy

### SQLite dump strategy
- Keep SQLite dump small — exclude chapter body text from SQLite collections
- Only store metadata (title, path, pubDate, novel, order) in SQLite
- Chapter body content served via prerendered HTML and _payload.json, not client-side SQLite queries

### Failure strategy
- "We will make it work" — no pivot away from Nuxt Content v3
- If issues arise, solve them within the Nuxt Content ecosystem (optimize queries, adjust schema, split collections)
- No fallback to alternative content systems planned

### Claude's Discretion
- Validation subset size (which novel, how many chapters to test with)
- Content directory naming (short names vs full titles)
- Nuxt Content collection schema design
- Netlify deployment configuration
- Build optimization approach for incremental builds

</decisions>

<specifics>
## Specific Ideas

- Current deploy workflow uses `netlify deploy --prod --dir=dist --no-build` — preserve this pattern
- Current build needs `NODE_OPTIONS=--max-old-space-size=8192` — may need similar for Nuxt
- Google Docs import creates batch of markdown files, then full rebuild happens

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-infrastructure-foundation*
*Context gathered: 2026-02-17*
