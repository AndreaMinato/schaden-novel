# Phase 2: Chapter Reader - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Readers can open any chapter from a novel's chapter listing and read it with clean typography, prev/next navigation, keyboard shortcuts, and reading progress that survives browser sessions. Home page, catalog, resume-reading dropdown, RSS, and sitemap are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Reading layout
- Narrow reading column (~65ch max-width) for optimal readability
- Sans-serif system font (Nuxt UI default) for chapter prose
- Subtle chapter title — breadcrumb-style (e.g., "MGA › Chapter 42"), not a large heading
- Auto-hide header — visible at top of page, hides on scroll down, reappears on scroll up

### Chapter navigation
- Prev/next buttons at both top and bottom of the chapter
- Boundary behavior: disable (grey out) the button — prev disabled on first chapter, next disabled on last
- Chapter listing sorted descending (latest first)
- Navigating between chapters always scrolls to top of page

### Keyboard shortcuts
- Cmd+Left (Mac) / Ctrl+Left (Windows) = previous chapter
- Cmd+Right (Mac) / Ctrl+Right (Windows) = next chapter
- At boundary (first/last chapter): show brief toast like "Last chapter"
- Shortcuts active only on the chapter reader page, not chapter listing
- No Escape-to-listing shortcut — use browser back or header link

### Reading progress
- Save on page load — opening a chapter records it as last-read
- No visible indicator on reader or listing — progress used silently for resume-reading (Phase 3)
- localStorage stores just the chapter path per novel: `{"mga": "/novels/mga/42"}`
- No migration from old Astro site — start fresh

### Claude's Discretion
- Exact spacing, padding, and line-height values
- Toast component choice and duration
- Auto-hide header animation timing
- Mobile responsive breakpoints and adjustments

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches using Nuxt UI components.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-chapter-reader*
*Context gathered: 2026-02-17*
