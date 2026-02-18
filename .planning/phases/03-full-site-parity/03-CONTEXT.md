# Phase 3: Full Site Parity - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the site to match the existing Astro site's catalog, home page, resume reading experience, and discovery feeds (RSS, sitemap) — making it a deployable Astro replacement. Chapter reader and navigation already exist from Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Home page layout
- One section per novel, each with a heading and its latest chapters underneath
- Show 3-5 recent chapters per novel
- Each chapter entry shows chapter number + title
- Novel sections ordered by most recently updated first

### Catalog presentation
- Simple vertical list of novels (not a card grid)
- Each entry shows novel name + chapter count
- Sorted alphabetically
- Each novel links directly to its novel detail page (/novels/{novel})

### Resume reading UX
- Available in two places: dropdown in header/navbar + dedicated section on home page
- Each entry shows novel name + last chapter read (e.g. "Martial Peak — Chapter 2847")
- Header dropdown shows all novels with reading progress (max 10 given 10 novels)
- Empty state: show the section/dropdown with a "Start reading to track progress" message
- Data source: localStorage (already storing per-novel progress from Phase 2)

### RSS feeds
- Both global feed and per-novel feeds
- Global feed: last 50 chapters, link only (no full text)
- Per-novel feeds: last 50 chapters, full chapter content included
- Standard RSS/XML format

### Sitemap
- Split into multiple sitemaps (sitemap index + per-novel sitemaps)
- Covers catalog, novel detail, and chapter pages

### Claude's Discretion
- Exact visual styling and spacing for all pages
- Home page section component design
- RSS feed metadata fields beyond title/link/content
- Sitemap priority and changefreq values
- Loading/error states for all pages

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

*Phase: 03-full-site-parity*
*Context gathered: 2026-02-18*
