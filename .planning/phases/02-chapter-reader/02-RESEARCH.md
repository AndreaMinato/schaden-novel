# Phase 2: Chapter Reader - Research

**Researched:** 2026-02-18
**Domain:** Nuxt Content v3 chapter reading, Nuxt UI v4 components, client-side navigation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Reading layout
- Narrow reading column (~65ch max-width) for optimal readability
- Sans-serif system font (Nuxt UI default) for chapter prose
- Subtle chapter title -- breadcrumb-style (e.g., "MGA > Chapter 42"), not a large heading
- Auto-hide header -- visible at top of page, hides on scroll down, reappears on scroll up

#### Chapter navigation
- Prev/next buttons at both top and bottom of the chapter
- Boundary behavior: disable (grey out) the button -- prev disabled on first chapter, next disabled on last
- Chapter listing sorted descending (latest first)
- Navigating between chapters always scrolls to top of page

#### Keyboard shortcuts
- Cmd+Left (Mac) / Ctrl+Left (Windows) = previous chapter
- Cmd+Right (Mac) / Ctrl+Right (Windows) = next chapter
- At boundary (first/last chapter): show brief toast like "Last chapter"
- Shortcuts active only on the chapter reader page, not chapter listing
- No Escape-to-listing shortcut -- use browser back or header link

#### Reading progress
- Save on page load -- opening a chapter records it as last-read
- No visible indicator on reader or listing -- progress used silently for resume-reading (Phase 3)
- localStorage stores just the chapter path per novel: `{"mga": "/novels/mga/42"}`
- No migration from old Astro site -- start fresh

### Claude's Discretion
- Exact spacing, padding, and line-height values
- Toast component choice and duration
- Auto-hide header animation timing
- Mobile responsive breakpoints and adjustments

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CATL-03 | User can view novel detail page with full chapter listing | Client-side natural sort of chapter stems; queryCollection for metadata; descending sort for listing |
| READ-01 | User can read a chapter with clean prose typography (max-width, readable line-height) | Tailwind prose-like styling with 65ch max-width; ContentRenderer for markdown; system font stack |
| READ-02 | User can navigate to prev/next chapter via buttons at top and bottom of reader | Custom useChapterNav composable computing prev/next from sorted chapter list; UButton with disabled prop |
| READ-03 | User can navigate chapters using keyboard arrow keys | defineShortcuts with meta_arrowleft/meta_arrowright; auto-preventDefault; useToast for boundary |
| READ-04 | Chapter page is mobile-responsive and readable on phone screens | Tailwind responsive utilities; padding adjustments at sm breakpoint; touch-friendly button sizes |
| PROG-01 | User's reading progress (last chapter per novel) persists in localStorage | useReadingProgress composable; write on page mount; JSON object keyed by novel slug |
</phase_requirements>

## Summary

This phase builds the core reading experience on top of the Nuxt 4 + Nuxt Content v3 + Nuxt UI v4 infrastructure established in Phase 1. The existing codebase has placeholder pages for novel listings (`app/pages/novels/[novel]/index.vue`) and chapter reading (`app/pages/novels/[novel]/[...slug].vue`) that need to be enhanced with proper typography, navigation, keyboard shortcuts, and progress tracking.

The most critical finding is that **Nuxt Content v3's SQL-based sorting is alphabetical, not numeric**. Files named `1.md`, `2.md`, `10.md` sort as `1, 10, 2` -- completely wrong for chapter ordering. The built-in `queryCollectionItemSurroundings` utility inherits this broken sort, making it unusable for prev/next chapter navigation. The solution is to fetch chapter metadata via `queryCollection`, sort client-side with `localeCompare({ numeric: true })`, and compute prev/next from the sorted array. This also handles the one suffixed chapter (`1632_a.md` in mga) correctly.

All required UI components exist in the already-installed Nuxt UI v4.4.0: `UButton` (disabled state, link navigation), `UBreadcrumb` (chapter title), `UHeader` (sticky header base), `useToast` (boundary notifications), and `defineShortcuts` (keyboard shortcuts with automatic Cmd/Ctrl platform mapping and built-in `preventDefault`). No new dependencies are needed.

**Primary recommendation:** Build custom `useChapterNav` composable for sorted chapter list and prev/next computation; do NOT use `queryCollectionItemSurroundings` or `UContentSurround` due to broken numeric sort.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuxt | 4.3.1 | Framework | Already installed, provides routing + layouts + composables |
| @nuxt/content | 3.11.2 | Content management | Already installed, provides queryCollection + ContentRenderer |
| @nuxt/ui | 4.4.0 | UI components | Already installed, provides UButton, UBreadcrumb, UHeader, useToast, defineShortcuts |
| tailwindcss | latest | Styling | Already installed via Nuxt UI, provides utility classes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | 12.8.2 (transitive) | Utility composables | Used internally by Nuxt UI; NOT directly importable under pnpm strict hoisting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom useChapterNav | queryCollectionItemSurroundings + UContentSurround | Built-in but broken for numeric filenames -- alphabetical sort gives wrong chapter order |
| Custom scroll detection | @vueuse/core useScroll | Would require adding as direct dep; 15-line composable is simpler |
| VueUse useLocalStorage | Custom useReadingProgress | Same issue -- not a direct dep; localStorage API is trivial |

**Installation:** No new packages needed. Everything is already installed.

## Architecture Patterns

### Recommended Project Structure
```
app/
  pages/
    novels/
      [novel]/
        index.vue          # Novel detail page with chapter listing (CATL-03)
        [...slug].vue      # Chapter reader page (READ-01 through READ-04, PROG-01)
  composables/
    useChapterNav.ts       # Fetch + sort chapters, compute prev/next
    useReadingProgress.ts  # localStorage read/write per novel
    useAutoHideHeader.ts   # Scroll direction detection for header
  layouts/
    default.vue            # Standard layout with auto-hide header
  router.options.ts        # Scroll-to-top on navigation
```

### Pattern 1: Client-Side Natural Sort for Chapters
**What:** Fetch all chapter metadata from a collection, sort with `localeCompare({ numeric: true })`, cache the sorted list, and compute prev/next from array position.
**When to use:** Always -- for both the chapter listing page and the reader's prev/next navigation.
**Why:** Nuxt Content v3's SQL ORDER BY sorts stems alphabetically (`1, 10, 100, 2` instead of `1, 2, 10, 100`). No numeric collation option exists in the v3 API.
**Example:**
```typescript
// Source: MDN localeCompare + Nuxt Content queryCollection
function naturalSort(a: { stem: string }, b: { stem: string }) {
  return a.stem.localeCompare(b.stem, undefined, { numeric: true, sensitivity: 'base' })
}

// In composable:
const { data: rawChapters } = await useAsyncData(
  `chapters-${novel}`,
  () => queryCollection(novel as any)
    .select('title', 'path', 'stem')
    .all()
)

const sortedChapters = computed(() => {
  if (!rawChapters.value) return []
  return [...rawChapters.value].sort(naturalSort)
})
```

### Pattern 2: Composable-Based Chapter Navigation
**What:** A composable that takes the current path and novel, returns reactive prev/next chapter objects.
**When to use:** In the chapter reader page.
**Example:**
```typescript
// app/composables/useChapterNav.ts
export function useChapterNav(novel: string, currentPath: string) {
  // Fetch and sort all chapters (uses useAsyncData caching)
  const { data: chapters } = await useAsyncData(...)

  const currentIndex = computed(() =>
    sortedChapters.value.findIndex(ch => ch.path === currentPath)
  )
  const prev = computed(() =>
    currentIndex.value > 0 ? sortedChapters.value[currentIndex.value - 1] : null
  )
  const next = computed(() =>
    currentIndex.value < sortedChapters.value.length - 1
      ? sortedChapters.value[currentIndex.value + 1]
      : null
  )
  return { prev, next, chapters: sortedChapters }
}
```

### Pattern 3: defineShortcuts for Keyboard Navigation
**What:** Nuxt UI's `defineShortcuts` composable with `meta_arrowleft` / `meta_arrowright`.
**When to use:** In the chapter reader page component only.
**Key behavior verified from source code:**
- `meta` maps to Cmd on macOS, Ctrl on other platforms (automatic)
- `preventDefault()` is called automatically when a shortcut matches
- Handler receives the KeyboardEvent as first argument
- Shortcuts are scoped to component lifecycle (active only while page is mounted)
- Shortcuts are disabled when an input/textarea is focused (default behavior)
**Example:**
```typescript
// Source: @nuxt/ui defineShortcuts source code (verified)
defineShortcuts({
  meta_arrowleft: () => navigateToPrev(),
  meta_arrowright: () => navigateToNext(),
})
```

### Pattern 4: Auto-Hide Header via Scroll Detection
**What:** Track scroll direction with a simple event listener; toggle header visibility via CSS transform.
**When to use:** In the default layout wrapping all pages.
**Example:**
```typescript
// app/composables/useAutoHideHeader.ts
export function useAutoHideHeader() {
  const isVisible = ref(true)
  let lastScrollY = 0
  let ticking = false

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      const currentY = window.scrollY
      // Always show header near top of page
      if (currentY < 60) {
        isVisible.value = true
      } else {
        isVisible.value = currentY < lastScrollY // scrolling up
      }
      lastScrollY = currentY
      ticking = false
    })
  }

  onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
  onUnmounted(() => window.removeEventListener('scroll', onScroll))

  return { isVisible }
}
```

### Anti-Patterns to Avoid
- **Using `.order('stem', 'ASC')` for chapter lists:** Gives alphabetical sort. Always sort client-side with natural sort.
- **Using `queryCollectionItemSurroundings` for prev/next:** Same broken sort. Compute from sorted array.
- **Using `UContentSurround` component:** Depends on `queryCollectionItemSurroundings`. Build custom nav buttons.
- **Adding VueUse as direct dependency:** Available as transitive dep of Nuxt UI but not importable under pnpm strict hoisting. Write the 15-line composables instead.
- **Storing full chapter objects in localStorage:** Only store the path string per novel. Keep it minimal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | `useToast()` from Nuxt UI | Handles positioning, animation, duration, stacking, max limit (5) |
| Keyboard shortcuts | Manual keydown listener with platform detection | `defineShortcuts()` from Nuxt UI | Handles Cmd/Ctrl mapping, preventDefault, input focus detection, chaining |
| Breadcrumb navigation | Custom breadcrumb HTML | `UBreadcrumb` from Nuxt UI | Handles separators, icons, links, accessibility |
| Button with link + disabled | Custom anchor/button hybrid | `UButton` with `to` + `disabled` props | Handles routing, disabled state, focus styles, variants |
| Markdown rendering | Custom markdown parser | `ContentRenderer` from Nuxt Content | Handles AST rendering, Vue component slots, code highlighting |
| Sticky header base | Custom position:sticky div | `UHeader` from Nuxt UI | Provides --ui-header-height CSS var, mobile menu toggle, navigation integration |

**Key insight:** Nuxt UI v4.4.0 provides every UI primitive needed for this phase. The only custom code needed is: sorting logic, prev/next computation, localStorage wrapper, and scroll-direction detection.

## Common Pitfalls

### Pitfall 1: Alphabetical Chapter Sorting
**What goes wrong:** Chapters display as 1, 10, 100, 1000, 2, 20, 200... instead of 1, 2, 3... 10, 11...
**Why it happens:** Nuxt Content v3 uses SQLite with text-based ORDER BY. The `stem` field is TEXT type. No `$numeric` collation option exists (that was v2 only).
**How to avoid:** Always sort client-side with `localeCompare(other, undefined, { numeric: true, sensitivity: 'base' })`. Never trust `.order('stem', 'ASC')` for numeric filenames.
**Warning signs:** Chapter listing shows chapter 10 after chapter 1, before chapter 2.

### Pitfall 2: SPA Fallback and Content Queries
**What goes wrong:** Non-prerendered pages (loaded via SPA fallback `/200.html`) fail to query content.
**Why it happens:** On first load of a non-prerendered page, the client must download the SQLite dump before queries work. If the dump is large, there's a loading delay.
**How to avoid:** The content module handles this automatically -- on first query it downloads the dump and initializes a client-side SQLite DB. All subsequent queries run locally. Use `useAsyncData` with `lazy: true` or show a loading state. The dump for 2,335 mga chapters was ~7.9MB (Phase 1 measurement), projected ~45MB at 13K scale.
**Warning signs:** Blank page flash on first navigation to a non-prerendered chapter.

### Pitfall 3: Scroll-to-Top Not Working Between Chapters
**What goes wrong:** Navigating from chapter 5 to chapter 6 keeps scroll position at the bottom of the page.
**Why it happens:** Nuxt's default scroll behavior may not reset for same-route-pattern navigations (`/novels/mga/5` to `/novels/mga/6` are both `[...slug]`).
**How to avoid:** Define `app/router.options.ts` with explicit `scrollBehavior` returning `{ top: 0, behavior: 'instant' }` for page transitions. Also call `window.scrollTo(0, 0)` in `watch(route)` as a safety net.
**Warning signs:** User reads to bottom of chapter 5, clicks "Next", sees bottom of chapter 6.

### Pitfall 4: Cmd+Left/Right Conflict with Browser Default
**What goes wrong:** Cmd+Left normally moves cursor to beginning of line; shortcut might not fire.
**Why it happens:** Browser default behavior intercepting the key event before the handler.
**How to avoid:** `defineShortcuts` calls `e.preventDefault()` automatically when a matching shortcut fires. Verified in source code (line 102). No additional work needed.
**Warning signs:** Shortcut does nothing or cursor jumps in a text field. (Mitigated by default `usingInput: false` behavior.)

### Pitfall 5: Chapter Suffix Sorting
**What goes wrong:** Chapter `1632_a` sorts after `1633` or in an unexpected position.
**Why it happens:** Custom sort function doesn't handle non-numeric suffixes.
**How to avoid:** `localeCompare({ numeric: true })` handles this correctly: `1632` < `1632_a` < `1633`. Only one suffixed file exists (`mga/1632_a.md`). Test with this specific case.
**Warning signs:** Chapter 1632_a appears at end of list or between wrong chapters.

### Pitfall 6: Content Path vs Route Path Mismatch
**What goes wrong:** `queryCollection(novel).path(routePath)` returns null.
**Why it happens:** Content paths are `/{novel}/{slug}` (e.g., `/mga/42`) but route paths are `/novels/{novel}/{slug}` (e.g., `/novels/mga/42`). Already handled in existing code.
**How to avoid:** Always strip `/novels` prefix when querying content. The existing `[...slug].vue` already does this correctly: `const contentPath = \`/${novel}/${slug}\``.
**Warning signs:** "Chapter not found" 404 errors.

## Code Examples

### Chapter Listing with Natural Sort (Descending)
```typescript
// Source: Nuxt Content queryCollection + MDN localeCompare
// For app/pages/novels/[novel]/index.vue

const route = useRoute()
const novel = route.params.novel as string

const { data: rawChapters } = await useAsyncData(
  `listing-${novel}`,
  () => queryCollection(novel as any)
    .select('title', 'path', 'stem')
    .all()
)

// Sort descending (latest first) per user decision
const chapters = computed(() => {
  if (!rawChapters.value) return []
  return [...rawChapters.value].sort((a, b) =>
    b.stem.localeCompare(a.stem, undefined, { numeric: true, sensitivity: 'base' })
  )
})
```

### Prev/Next Navigation Buttons
```vue
<!-- Source: Nuxt UI UButton docs -->
<template>
  <div class="flex justify-between">
    <UButton
      :to="prev ? `/novels${prev.path}` : undefined"
      :disabled="!prev"
      icon="i-lucide-chevron-left"
      variant="outline"
      label="Previous"
    />
    <UButton
      :to="next ? `/novels${next.path}` : undefined"
      :disabled="!next"
      icon="i-lucide-chevron-right"
      trailing
      variant="outline"
      label="Next"
    />
  </div>
</template>
```

### Breadcrumb Chapter Title
```vue
<!-- Source: Nuxt UI UBreadcrumb docs -->
<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const items = computed<BreadcrumbItem[]>(() => [
  { label: novel.toUpperCase(), to: `/novels/${novel}` },
  { label: `Chapter ${slug}` }
])
</script>

<template>
  <UBreadcrumb :items="items" />
</template>
```

### Keyboard Shortcuts with Boundary Toast
```typescript
// Source: Nuxt UI defineShortcuts source code (verified)
const toast = useToast()

defineShortcuts({
  meta_arrowleft: () => {
    if (prev.value) {
      navigateTo(`/novels${prev.value.path}`)
    } else {
      toast.add({ title: 'First chapter', color: 'neutral', duration: 2000 })
    }
  },
  meta_arrowright: () => {
    if (next.value) {
      navigateTo(`/novels${next.value.path}`)
    } else {
      toast.add({ title: 'Last chapter', color: 'neutral', duration: 2000 })
    }
  },
})
```

### Reading Progress (localStorage)
```typescript
// app/composables/useReadingProgress.ts
const STORAGE_KEY = 'schaden-reading-progress'

export function useReadingProgress() {
  function save(novel: string, chapterPath: string) {
    if (!import.meta.client) return
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      data[novel] = chapterPath
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* localStorage may be unavailable */ }
  }

  function get(novel: string): string | null {
    if (!import.meta.client) return null
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return data[novel] || null
    } catch { return null }
  }

  return { save, get }
}
```

### Scroll-to-Top Router Config
```typescript
// app/router.options.ts
// Source: Nuxt custom routing docs + Vue Router scroll behavior
import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'instant' }
  },
}
```

### Auto-Hide Header CSS
```css
/* Applied to header wrapper element */
.header-auto-hide {
  transition: transform 300ms ease-in-out;
}
.header-auto-hide.header-hidden {
  transform: translateY(-100%);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nuxt Content v2 `$numeric` sort | v3 has no equivalent; must sort client-side | Content v3 release (2024) | Cannot rely on DB sorting for numeric filenames |
| v2 `queryContent().findSurround()` | v3 `queryCollectionItemSurroundings()` | Content v3 release | New API but same alphabetical sort limitation |
| Custom keyboard handler | Nuxt UI `defineShortcuts` | UI v4.4.0 | Built-in platform detection, preventDefault, input-aware |
| vue-toastification / vue-sonner | Nuxt UI `useToast` | UI v4 | Built into Nuxt UI, no extra dependency |

**Deprecated/outdated:**
- `queryContent()` / `findSurround()`: Nuxt Content v2 API, replaced by `queryCollection()` / `queryCollectionItemSurroundings()` in v3
- `$numeric` sort option: v2 only, not available in v3's SQL-based queries
- Nuxt UI v2 `useNotification`: Replaced by `useToast` in v4

## Open Questions

1. **SQLite dump size at full 13K chapter scale**
   - What we know: 2,335 chapters produce a ~7.9MB dump. Projected ~45MB at 13K.
   - What's unclear: Whether 45MB client-side dump causes unacceptable load times on mobile.
   - Recommendation: Not a blocker for this phase. Body-stripping strategy (mentioned in Phase 1 notes) would reduce dump size. Monitor load performance and address in a later optimization phase if needed.

2. **`defineShortcuts` type safety with dynamic collection names**
   - What we know: `queryCollection(novel as any)` uses `as any` cast because collection names are dynamic strings, not static literals.
   - What's unclear: Whether there's a cleaner TypeScript pattern for dynamic collection access.
   - Recommendation: Keep `as any` cast. The 10 collection names are known at build time but chosen at runtime by route param. Type safety at this boundary is low-value.

## Sources

### Primary (HIGH confidence)
- Nuxt UI v4.4.0 `defineShortcuts` source code (read directly from `node_modules`) -- verified preventDefault, meta key mapping, handler signature
- [queryCollectionItemSurroundings docs](https://content.nuxt.com/docs/utils/query-collection-item-surroundings) -- API signature, return format
- [queryCollection docs](https://content.nuxt.com/docs/utils/query-collection) -- chainable methods, order() API
- [Nuxt UI Toast component](https://ui.nuxt.com/docs/components/toast) -- props, duration, color variants
- [Nuxt UI Button component](https://ui.nuxt.com/docs/components/button) (WebFetch) -- disabled prop, to prop, icon support
- [Nuxt UI Breadcrumb component](https://ui.nuxt.com/docs/components/breadcrumb) (WebFetch) -- items format, link support
- [Nuxt UI Header component](https://ui.nuxt.com/docs/components/header) (WebFetch) -- sticky by default, CSS variable
- [Nuxt UI useToast composable](https://ui.nuxt.com/docs/composables/use-toast) (WebFetch) -- add/remove API, per-toast duration
- [Nuxt UI defineShortcuts composable](https://ui.nuxt.com/docs/composables/define-shortcuts) (WebFetch) -- key syntax, meta mapping
- [Collection Types docs](https://content.nuxt.com/docs/collections/types) (WebFetch) -- stem field is string type
- Content directory structure verified from filesystem -- `content/{novel}/{number}.md` naming pattern

### Secondary (MEDIUM confidence)
- [Nuxt Content v3 database architecture](https://content.nuxt.com/docs/advanced/database) -- client-side SQLite dump behavior
- [Nuxt Content migration guide](https://content.nuxt.com/docs/getting-started/migration) -- v2 $numeric removed in v3
- [Nuxt scroll behavior discussion](https://github.com/nuxt/nuxt/discussions/16223) -- scrollBehavior in router.options.ts
- [MDN localeCompare](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare) -- { numeric: true } option for natural sort

### Tertiary (LOW confidence)
- SQLite dump size projections (extrapolated from Phase 1 measurements, not independently verified at 13K scale)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions verified from package.json and node_modules
- Architecture: HIGH -- patterns verified against official docs and source code; sorting workaround is a well-known pattern
- Pitfalls: HIGH -- alphabetical sort issue verified via Content v3 migration docs; defineShortcuts behavior verified from source code
- UI components: HIGH -- all component APIs verified from official docs via WebFetch

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable stack, no fast-moving changes expected)
