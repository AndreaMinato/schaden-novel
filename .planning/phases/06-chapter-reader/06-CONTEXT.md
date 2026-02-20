# Phase 6: Chapter Reader - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Readers can open and read any chapter through client-side rendering with visual loading feedback. Chapter metadata comes from WASM SQLite, body from static JSON files produced by Phase 5's body-extractor. All existing chapter features (keyboard nav, reading progress, dark mode) must work in SPA mode.

</domain>

<decisions>
## Implementation Decisions

### Loading skeleton
- Text line placeholders using USkeleton from Nuxt UI (not a custom spinner)
- ~8-10 placeholder bars in the body area
- Varied line widths (mix of 100%, 90%, 75%, 60%) to mimic natural paragraph shapes
- Skeleton inherits theme colors (dark mode compatible)

### Content appearance and transitions
- Title, breadcrumbs, and prev/next nav show immediately from SQLite — body area shows skeleton while fetching
- When navigating between chapters, title/nav update instantly to new chapter, body area shows skeleton
- Body content replaces skeleton via instant swap — no fade or animation
- Always scroll to top on chapter navigation (prev/next), including revisits

### Fetch failure UX
- Inline error with retry button in the body area — title/nav stay visible
- Auto-retry once silently after ~2s before showing error
- Same inline error pattern for both body fetch failure and SQLite metadata failure
- Minimal, technical tone: "Failed to load chapter. Retry"

### Reading position and existing features
- Always start at top of chapter — no scroll position restoration
- Keyboard navigation (Cmd+Arrow for prev/next) identical to current behavior
- Dark mode applies globally as it does now — skeleton inherits theme
- All existing features preserved: keyboard nav, reading progress tracking, dark mode

### Claude's Discretion
- Reading progress bar timing (show after body loads vs immediately) — pick what avoids layout shifts
- Exact USkeleton sizing and spacing for the placeholder bars
- Technical approach for merging fetched body JSON with SQLite metadata

</decisions>

<specifics>
## Specific Ideas

- Use USkeleton component from Nuxt UI for loading placeholders — consistent with existing component library
- Phase 5 produces body JSON at `/content/novels/{novel}/{stem}.json` in minimark format
- SQLite metadata available via queryCollection() — already working for chapter title, nav, breadcrumbs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-chapter-reader*
*Context gathered: 2026-02-20*
