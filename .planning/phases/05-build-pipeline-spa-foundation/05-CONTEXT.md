# Phase 5: Build Pipeline + SPA Foundation - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build produces SPA-ready output: individual JSON body files for all 13,318 chapters, a metadata-only SQL dump (body-stripped at parse time), minimal prerendered pages (~25), and SPA fallback routing for deep links. No chapter reading UI changes — that's Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Body file organization
- Nested by novel: `/content/novels/{slug}/{zero-padded-num}.json`
- Body content only — no metadata (title, word count, etc.). Metadata comes from SQLite.
- Raw minimark format (Nuxt Content's internal format), not pre-rendered HTML
- Minified JSON — every byte counts across 13K files
- Nuxt module (body-extractor) hooks into `nuxt generate` — single build command produces everything
- Generate a `bodies-manifest.json` listing all body files with count, paths, sizes for build validation

### Prerender page list
- Explicit allow-list of ~25 routes in nuxt.config (not pattern-based exclusion)
- Prerendered pages: home, catalog/browse, 10 novel listing pages, RSS feeds (global + 10 per-novel), sitemaps
- Novel listing pages prerender with novel info only (title, description, cover) — chapter list loads from SQLite client-side
- Home and catalog prerender as shells only — novel data loads from SQLite client-side

### SPA fallback shell
- Nuxt generates 200.html (SPA fallback mode), not a hand-crafted static template
- Branded loading page: site logo centered with a subtle spinner, dark theme
- Netlify redirect rule configured in `netlify.toml` (not _redirects file)

### Build migration
- Replace post-build body-stripping script immediately — clean break, parse-time stripping replaces it
- Switch from 26K prerendered routes to ~25 all at once — no gradual rollback
- No fallback to full-static build — commit fully to SPA approach
- Deploy command stays the same: `netlify deploy --prod --dir=.output/public --no-build`

### Claude's Discretion
- Body extractor Nuxt module implementation details (which hooks, extraction timing)
- Parse-time SQL dump stripping approach
- Exact Nuxt prerender configuration syntax
- 200.html spinner implementation and inline CSS
- Build validation/verification steps beyond manifest

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-build-pipeline-spa-foundation*
*Context gathered: 2026-02-20*
