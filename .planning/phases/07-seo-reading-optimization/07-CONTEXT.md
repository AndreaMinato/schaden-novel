# Phase 7: SEO + Reading Optimization - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Search engines discover all 13,318 chapters via sitemaps, RSS feeds remain functional in SPA mode, and readers enjoy instant chapter-to-chapter navigation through prefetching and caching. No new reading features — this optimizes discoverability and speed for the existing SPA chapter reader.

</domain>

<decisions>
## Implementation Decisions

### Prefetch behavior
- Prefetch **next chapter only** (not previous, not multiple ahead)
- Trigger: start prefetch **after the current chapter's body fetch completes** (no bandwidth competition)
- Always prefetch regardless of connection type — individual body files are small (~10-50KB)
- Edge case (navigate before prefetch completes): Claude's discretion

### Cache strategy
- **In-memory Map** — no sessionStorage, no persistence. Lost on page refresh.
- **Shared cache** for both prefetched and visited bodies — single unified cache
- **Cap at 5 entries**, LRU eviction (least recently used evicted first)
- This gives room for: current chapter + prefetched next + 3 recently visited

### RSS feed content
- **Keep link-only** format (title + link, no body/excerpt) — same as v1.0
- **Verify only** — RSS feeds are already functional (prerendered). No code changes unless broken.
- Keep current chapter count per feed
- Same URLs, no special handling for SPA — feed readers open browser, SPA loads chapter

### Sitemap scope
- **Nice to have** priority (not blocking if broken, but should work)
- **Per-novel sitemaps** (current approach) — one sitemap per novel + sitemap index
- **Include all pages** — chapters AND non-chapter pages (home, catalog, novel listings)
- **No priority/changefreq hints** — just URLs and lastmod
- Known issue: asSitemapCollection currently produces empty sitemaps — needs fix

### Claude's Discretion
- Handling navigation-before-prefetch-completes edge case
- Sitemap implementation approach (fix asSitemapCollection vs alternative like programmatic URL sources)
- Any RSS feed adjustments if verification reveals issues

</decisions>

<specifics>
## Specific Ideas

- Sitemap fix is the main unknown — v1.0 asSitemapCollection wrapper produces empty per-novel sitemaps despite being configured. May need alternative approach.
- RSS is likely already done — audit confirmed feeds are functional and prerendered.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-seo-reading-optimization*
*Context gathered: 2026-02-20*
