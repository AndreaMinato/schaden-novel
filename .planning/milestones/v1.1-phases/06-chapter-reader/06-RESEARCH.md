# Phase 6: Chapter Reader - Research

**Researched:** 2026-02-20
**Domain:** Client-side chapter rendering with split metadata/body fetching, loading skeletons, ContentRenderer compatibility with minimark body format
**Confidence:** HIGH

## Summary

Phase 6 converts the chapter reader page from a fully-prerendered page (where `queryCollection().first()` returns the complete document with body) to a split-fetch SPA page where metadata comes from WASM SQLite (instant, local) and the chapter body is fetched as a static JSON file from `/content/novels/{novel}/{chapter}.json` (network request, needs loading state).

The critical technical question -- "Can ContentRenderer render a minimark body fetched separately from the SQLite metadata?" -- is answered YES. Direct inspection of `ContentRenderer.vue` in `@nuxt/content@3.11.2` confirms it accepts a `value` prop where `value.body` (or `value` itself) can be a minimark object `{ type: "minimark", value: [...] }`. It calls `toHast()` from the `minimark` package to convert to HAST before passing to `MDCRenderer`. The body JSON files produced by Phase 5's body-extractor are already in this exact format.

The second critical concern is SPA reactivity: the current chapter page captures `route.params` as plain variables, which breaks when navigating between chapters in SPA mode (same component instance is reused). The fix is straightforward -- use `computed()` for route params and the `watch` option in `useAsyncData`.

**Primary recommendation:** Refactor `[...slug].vue` to split the single `queryCollection().first()` call into: (1) metadata-only SQLite query, (2) body JSON fetch with retry logic. Show USkeleton placeholders during body fetch. Make route params reactive for SPA navigation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Text line placeholders using USkeleton from Nuxt UI (not a custom spinner)
- ~8-10 placeholder bars in the body area
- Varied line widths (mix of 100%, 90%, 75%, 60%) to mimic natural paragraph shapes
- Skeleton inherits theme colors (dark mode compatible)
- Title, breadcrumbs, and prev/next nav show immediately from SQLite -- body area shows skeleton while fetching
- When navigating between chapters, title/nav update instantly to new chapter, body area shows skeleton
- Body content replaces skeleton via instant swap -- no fade or animation
- Always scroll to top on chapter navigation (prev/next), including revisits
- Inline error with retry button in the body area -- title/nav stay visible
- Auto-retry once silently after ~2s before showing error
- Same inline error pattern for both body fetch failure and SQLite metadata failure
- Minimal, technical tone: "Failed to load chapter. Retry"
- Always start at top of chapter -- no scroll position restoration
- Keyboard navigation (Cmd+Arrow for prev/next) identical to current behavior
- Dark mode applies globally as it does now -- skeleton inherits theme
- All existing features preserved: keyboard nav, reading progress tracking, dark mode

### Claude's Discretion
- Reading progress bar timing (show after body loads vs immediately) -- pick what avoids layout shifts
- Exact USkeleton sizing and spacing for the placeholder bars
- Technical approach for merging fetched body JSON with SQLite metadata

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| READ-01 | Chapter page loads metadata from WASM SQLite and body from static JSON as separate fetches | ContentRenderer confirmed compatible with standalone minimark body objects. SQLite query uses `queryCollection().select('title','path','stem').path(x).first()` for metadata; body fetched via `$fetch('/content/novels/{novel}/{chapter}.json')`. Composed object `{ body: fetchedBody }` passed to ContentRenderer. |
| READ-02 | Loading skeleton displays while chapter body fetches | USkeleton from Nuxt UI v4 -- simple `<USkeleton class="h-4 w-[width]" />` components. `useAsyncData` provides `status` ref ('pending'/'success'/'error') for conditional rendering. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nuxt/content` | 3.11.2 | `queryCollection()` for SQLite metadata, `ContentRenderer` for body rendering | Already installed; ContentRenderer handles minimark natively |
| `@nuxt/ui` | 4.4.0 | `USkeleton` for loading placeholders | Already installed; user decision specifies USkeleton |
| `minimark` | 0.2.0 | Transitive dep -- `toHast()` converts minimark to HAST inside ContentRenderer | Already installed via @nuxt/content; no direct import needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Nuxt `$fetch` | Built-in | Fetch body JSON files from static hosting | Body fetch in useAsyncData handler |
| Nuxt `useAsyncData` | Built-in | Reactive data fetching with status tracking | Both metadata query and body fetch |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ContentRenderer with composed body | Custom minimark-to-HTML renderer | ContentRenderer handles minimark natively (confirmed by source inspection); custom renderer would duplicate logic and miss prose component mapping |
| `useAsyncData` + `$fetch` for body | `useFetch` with computed URL | `useFetch` auto-watches URL changes but lacks easy custom retry logic; `useAsyncData` with manual `$fetch` gives full control over retry |
| USkeleton (Nuxt UI) | CSS-only pulse animation divs | USkeleton inherits theme colors automatically, consistent with Nuxt UI design system |

**No new packages to install.** Everything uses existing Nuxt/Nuxt UI/Nuxt Content APIs.

## Architecture Patterns

### Recommended Component Structure
```
app/pages/novels/[novel]/
  [...slug].vue     # MODIFY: split metadata/body fetching, add skeleton, add reactivity
app/composables/
  useChapterNav.ts  # MODIFY: make reactive for SPA navigation
```

### Pattern 1: Split Metadata/Body Fetching with Reactive Route Params

**What:** Separate the current single `queryCollection().first()` call into two independent data sources: SQLite metadata (title, path, nav) and static JSON body. Make all route-derived values reactive.

**When to use:** SPA pages where metadata is in WASM SQLite but body content is served as separate static files.

**Critical insight from codebase inspection:** The current `[...slug].vue` captures route params as plain variables:
```typescript
// CURRENT (NOT REACTIVE -- breaks in SPA mode)
const novel = route.params.novel as string
const slug = (route.params.slug as string[]).join('/')
```
When navigating `/novels/mga/1` -> `/novels/mga/2`, Vue Router reuses the same component instance. These plain variables never update.

**Fix:**
```typescript
// REACTIVE (works in SPA mode)
const route = useRoute()
const novel = computed(() => route.params.novel as string)
const slug = computed(() => (route.params.slug as string[]).join('/'))
const contentPath = computed(() => `/${novel.value}/${slug.value}`)
```

### Pattern 2: Composed Document for ContentRenderer

**What:** Fetch body JSON separately, then pass it to ContentRenderer in a format it understands.

**Source verification:** Direct inspection of `ContentRenderer.vue` (node_modules/@nuxt/content/dist/runtime/components/ContentRenderer.vue), lines 67-76:
```javascript
const body = computed(() => {
  let body2 = props.value.body || props.value;
  // ...
  if (body2.type === "minimal" || body2.type === "minimark") {
    return toHast({ type: "minimark", value: body2.value });
  }
  return body2;
});
```

ContentRenderer first tries `props.value.body`, then falls back to `props.value` itself. If the result has `type === "minimark"`, it converts to HAST via `toHast()`.

**The body JSON from Phase 5 body-extractor looks like:**
```json
{"type":"minimark","value":[["p",{},"Chapter text..."],["p",{},"More text..."]],"toc":{"title":"","searchDepth":2,"depth":2,"links":[]}}
```

**Two working approaches:**
```typescript
// Option A: Pass body directly (simplest)
<ContentRenderer :value="bodyData" />

// Option B: Compose with metadata (provides data context to MDC)
const composedDoc = computed(() => ({
  body: bodyData.value,
  title: chapter.value?.title,
}))
<ContentRenderer :value="composedDoc" />
```

**Recommendation:** Option A (pass body directly). The chapter page already renders title/nav separately from ContentRenderer, so no metadata context is needed inside the renderer.

**Confidence:** HIGH -- verified by reading actual ContentRenderer source code and body JSON samples from Phase 5 build output.

### Pattern 3: Body Fetch with Silent Auto-Retry

**What:** Wrap `$fetch` in `useAsyncData` with custom retry logic: try once, wait 2s, try again, then surface error.

```typescript
const { data: bodyData, status: bodyStatus, error: bodyError, refresh: retryBody } = useAsyncData(
  () => `body-${novel.value}-${slug.value}`,
  async () => {
    const url = `/content/novels/${novel.value}/${slug.value}.json`
    try {
      return await $fetch(url)
    } catch (e) {
      // Silent auto-retry after 2s
      await new Promise(resolve => setTimeout(resolve, 2000))
      return await $fetch(url)
    }
  },
  { watch: [novel, slug] }
)
```

`bodyStatus` ref provides: `'idle'` | `'pending'` | `'success'` | `'error'`
- `'pending'` -> show skeleton
- `'success'` -> show ContentRenderer
- `'error'` -> show inline error with retry button

The `refresh` function (renamed `retryBody`) powers the manual retry button.

**Confidence:** HIGH -- `useAsyncData` watch option confirmed in Nuxt 4.3.1 source code (asyncData.js line 149).

### Pattern 4: USkeleton Loading Placeholder

**What:** 8-10 skeleton bars with varied widths mimicking paragraph text.

```vue
<div v-if="bodyStatus === 'pending'" class="space-y-4 py-4">
  <USkeleton class="h-4 w-full" />
  <USkeleton class="h-4 w-full" />
  <USkeleton class="h-4 w-[90%]" />
  <USkeleton class="h-4 w-full" />
  <USkeleton class="h-4 w-[75%]" />
  <USkeleton class="h-4 w-full" />
  <USkeleton class="h-4 w-full" />
  <USkeleton class="h-4 w-[60%]" />
  <USkeleton class="h-4 w-[90%]" />
  <USkeleton class="h-4 w-[75%]" />
</div>
```

USkeleton inherits theme colors via Tailwind dark mode classes automatically -- no extra dark mode handling needed.

**Confidence:** HIGH -- Nuxt UI v4 USkeleton confirmed via MCP tool. Simple `class`-based sizing, no props needed.

### Pattern 5: Reactive Chapter Navigation Composable

**What:** Make `useChapterNav` accept reactive params so it re-fetches when navigating between chapters.

Current `useChapterNav.ts` uses `useAsyncData` with key `nav-${novel}` and a static `currentPath`. The chapter list is cached per novel (good), but the `currentIndex` computed uses a non-reactive `currentPath` string.

**Fix:** Accept `currentPath` as a `Ref<string>` or `ComputedRef<string>`:
```typescript
export function useChapterNav(novel: Ref<string> | ComputedRef<string>, currentPath: Ref<string> | ComputedRef<string>) {
  const { data: rawChapters } = useAsyncData(
    () => `nav-${toValue(novel)}`,
    () => queryCollection(toValue(novel) as any)
      .select('title', 'path', 'stem')
      .all(),
    { watch: [novel] }
  )

  const currentIndex = computed(() =>
    sortedChapters.value.findIndex(ch => ch.path === toValue(currentPath))
  )
  // prev/next computed stay the same -- they derive from currentIndex
}
```

**Confidence:** HIGH -- standard Vue 3 reactivity pattern with `toValue()`.

### Anti-Patterns to Avoid
- **Querying body from SQLite:** Phase 5 replaced body with empty minimark stub `{ type: "minimark", value: [] }`. ContentRenderer would render nothing. Body MUST come from the JSON file.
- **Using `await` at top level for body fetch in SPA:** The page should show immediately with skeleton. Don't block rendering on body fetch. Use `useAsyncData` without `await` (or use `lazy: true`) so the component renders while fetch is pending.
- **Plain variable route params in SPA:** `const novel = route.params.novel as string` is NOT reactive. Use `computed()`.
- **Calling `useAsyncData` with `await` for BOTH metadata and body:** Metadata should load fast (local SQLite) and CAN use `await`. Body fetch should NOT block -- show skeleton while it loads.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Minimark to HTML rendering | Custom minimark parser/renderer | `ContentRenderer` from `@nuxt/content` | Confirmed to handle minimark body objects directly (line 72-74 of ContentRenderer.vue); handles prose component mapping, MDC syntax, etc. |
| Loading skeleton animation | Custom CSS pulse animation | `USkeleton` from `@nuxt/ui` | Inherits theme colors, consistent with design system, user decision |
| Scroll to top on navigation | Custom scroll handler | Existing `router.options.ts` | Already returns `{ top: 0, behavior: 'instant' }` -- works for SPA nav |
| Reactive data fetching | Manual `watch` + `fetch` | `useAsyncData` with `watch` option | Built-in status tracking, deduplication, SSR safety |

**Key insight:** The biggest risk (ContentRenderer compatibility with external body) is a non-issue. ContentRenderer already handles minimark natively -- no custom rendering needed.

## Common Pitfalls

### Pitfall 1: Non-Reactive Route Params Break SPA Navigation
**What goes wrong:** Navigating from Chapter 1 to Chapter 2 via prev/next buttons keeps showing Chapter 1 content. The URL updates but the page content doesn't change.
**Why it happens:** `const slug = route.params.slug` captures the value at mount time. In SPA mode, the same component instance is reused, so this never updates.
**How to avoid:** Use `computed()` for all route-derived values. Use `watch` option in `useAsyncData` to re-trigger fetches.
**Warning signs:** During testing, clicking prev/next changes the URL in the address bar but the page content stays the same.

### Pitfall 2: Blocking Body Fetch Prevents Immediate Title/Nav Display
**What goes wrong:** The entire page waits for the body JSON to fetch before showing anything, including the title and navigation.
**Why it happens:** Using `await useAsyncData(...)` for the body fetch blocks the component's setup. Nothing renders until both metadata AND body are available.
**How to avoid:** Use `await` for the SQLite metadata query (fast, local WASM) but NOT for the body fetch. Either omit `await` on the body `useAsyncData` call, or use `lazy: true`. The component renders immediately with metadata, showing skeleton in the body area.
**Warning signs:** The page shows a blank/white screen (or SPA loading template) until the body JSON finishes downloading.

### Pitfall 3: Body Fetch URL Mismatch
**What goes wrong:** Body fetch returns 404. The page shows an error even though the chapter exists.
**Why it happens:** The body JSON file path uses the original content stem (e.g., `/content/novels/mga/1.json`) but the code constructs a different path (e.g., padded numbers, different prefix).
**How to avoid:** The body-extractor writes to `/content/novels/{novel}/{stem}.json` where `{stem}` is the original filename without extension (e.g., `1`, `100`, `1886`). The `slug` from the route params is the same as the stem. Construct URL as: `/content/novels/${novel}/${slug}.json`.
**Warning signs:** Network tab shows 404 for body JSON requests. The body-extractor manifest (`/content/bodies-manifest.json`) lists the correct paths for cross-reference.

### Pitfall 4: ContentRenderer Passed Empty Body from SQLite
**What goes wrong:** Instead of waiting for the JSON body, ContentRenderer is passed the SQLite document (which has an empty body stub from Phase 5's stripping). The chapter appears to have no content.
**Why it happens:** The old pattern `<ContentRenderer :value="chapter" />` passes the full SQLite document. Phase 5 replaced body with `{ type: "minimark", value: [] }`, so ContentRenderer renders nothing.
**How to avoid:** Only pass the fetched body JSON to ContentRenderer, NOT the SQLite document. The SQLite document provides metadata only (title, nav). The ContentRenderer gets the JSON body.
**Warning signs:** Chapter pages show title and navigation but no body text.

### Pitfall 5: useAsyncData Key Collision Between Chapters
**What goes wrong:** Navigating to a new chapter shows stale body content from the previous chapter.
**Why it happens:** If `useAsyncData` key doesn't change between chapters (e.g., static string `'body'`), Nuxt returns cached data for the old key.
**How to avoid:** Use a dynamic key function: `() => \`body-${novel.value}-${slug.value}\``. This ensures each chapter gets its own cache entry.
**Warning signs:** Body content from the previous chapter flashes briefly or persists after navigation.

### Pitfall 6: Reading Progress Saves Before Body Loads
**What goes wrong:** Reading progress is saved immediately on mount, recording a visit even if the user navigates away before content loads.
**Why it happens:** Current code calls `useReadingProgress().save()` in `onMounted()`, which fires immediately regardless of body fetch status.
**How to avoid:** This is acceptable behavior per user decision -- "always start at top of chapter." Progress tracking records that the user visited the chapter, not that they read it. No change needed.

## Code Examples

### Complete Chapter Page Refactoring Pattern
```vue
<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const route = useRoute()

// REACTIVE route params (critical for SPA navigation)
const novel = computed(() => route.params.novel as string)
const slug = computed(() => (route.params.slug as string[]).join('/'))
const contentPath = computed(() => `/${novel.value}/${slug.value}`)

// 1. Metadata from SQLite (fast, local WASM query -- OK to await)
const { data: chapter, error: metaError } = await useAsyncData(
  () => `chapter-${novel.value}-${slug.value}`,
  () => queryCollection(novel.value as any)
    .select('title', 'path', 'stem')
    .path(contentPath.value)
    .first(),
  { watch: [novel, slug] }
)

// 2. Body from static JSON (network fetch -- do NOT await, show skeleton)
const { data: bodyData, status: bodyStatus, error: bodyError, refresh: retryBody } = useAsyncData(
  () => `body-${novel.value}-${slug.value}`,
  async () => {
    const url = `/content/novels/${novel.value}/${slug.value}.json`
    try {
      return await $fetch(url)
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      return await $fetch(url)
    }
  },
  { watch: [novel, slug] }
)

// 3. Chapter navigation (reactive)
const { prev, next } = useChapterNav(novel, contentPath)

// 4. Reading progress
onMounted(() => {
  useReadingProgress().save(novel.value, `/novels${contentPath.value}`)
})

// 5. Breadcrumbs (from metadata, shows immediately)
const breadcrumbItems = computed<BreadcrumbItem[]>(() => [
  { label: novel.value.toUpperCase(), to: `/novels/${novel.value}` },
  { label: chapter.value?.title || `Chapter ${slug.value}` },
])

// 6. Keyboard shortcuts
const toast = useToast()
defineShortcuts({
  meta_arrowleft: () => {
    if (prev.value) navigateTo(`/novels${prev.value.path}`)
    else toast.add({ title: 'First chapter', color: 'neutral', duration: 2000 })
  },
  meta_arrowright: () => {
    if (next.value) navigateTo(`/novels${next.value.path}`)
    else toast.add({ title: 'Last chapter', color: 'neutral', duration: 2000 })
  },
})
</script>

<template>
  <div class="max-w-[65ch] mx-auto px-4 sm:px-6 py-8">
    <!-- Breadcrumb (immediate from SQLite) -->
    <UBreadcrumb :items="breadcrumbItems" class="mb-4" />

    <!-- Top navigation (immediate from SQLite) -->
    <nav class="flex justify-between items-center mb-8">
      <UButton :to="prev ? `/novels${prev.path}` : undefined" :disabled="!prev"
        icon="i-lucide-chevron-left" variant="outline" label="Previous" size="sm" />
      <UButton :to="next ? `/novels${next.path}` : undefined" :disabled="!next"
        icon="i-lucide-chevron-right" trailing variant="outline" label="Next" size="sm" />
    </nav>

    <!-- Chapter body area -->
    <article class="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
      <!-- Loading skeleton -->
      <div v-if="bodyStatus === 'pending'" class="space-y-4 py-4">
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-[90%]" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-[75%]" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-[60%]" />
        <USkeleton class="h-4 w-[90%]" />
        <USkeleton class="h-4 w-[75%]" />
      </div>

      <!-- Body content (instant swap from skeleton) -->
      <ContentRenderer v-else-if="bodyData" :value="bodyData" />

      <!-- Error state -->
      <div v-else-if="bodyError" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Failed to load chapter.</p>
        <UButton label="Retry" variant="outline" size="sm" class="mt-2" @click="retryBody()" />
      </div>
    </article>

    <!-- Bottom navigation -->
    <nav class="flex justify-between items-center mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
      <UButton :to="prev ? `/novels${prev.path}` : undefined" :disabled="!prev"
        icon="i-lucide-chevron-left" variant="outline" label="Previous" size="sm" />
      <UButton :to="next ? `/novels${next.path}` : undefined" :disabled="!next"
        icon="i-lucide-chevron-right" trailing variant="outline" label="Next" size="sm" />
    </nav>
  </div>
</template>
```

**Confidence:** HIGH -- all APIs verified from source code inspection.

### Reactive useChapterNav Composable
```typescript
// app/composables/useChapterNav.ts (modified for reactive params)
import type { Ref, ComputedRef } from 'vue'

export function useChapterNav(
  novel: Ref<string> | ComputedRef<string>,
  currentPath: Ref<string> | ComputedRef<string>
) {
  const { data: rawChapters } = useAsyncData(
    () => `nav-${toValue(novel)}`,
    () => queryCollection(toValue(novel) as any)
      .select('title', 'path', 'stem')
      .all(),
    { watch: [novel] }
  )

  const sortedChapters = computed(() => {
    if (!rawChapters.value) return []
    return [...rawChapters.value].sort((a, b) =>
      a.stem.localeCompare(b.stem, undefined, { numeric: true, sensitivity: 'base' })
    )
  })

  const currentIndex = computed(() =>
    sortedChapters.value.findIndex(ch => ch.path === toValue(currentPath))
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `queryCollection().first()` returns full doc with body | Body stripped to empty stub in SQLite; real body in static JSON | v1.1 Phase 5 | Chapter page must fetch body separately |
| Static pre-rendered chapter HTML | SPA client-rendered chapter with loading skeleton | v1.1 Phase 6 | Faster build, slower first chapter load (JSON fetch) |
| Non-reactive route params (SSG) | Reactive computed params + watch in useAsyncData | v1.1 Phase 6 | Required for SPA chapter-to-chapter navigation |
| Single ContentRenderer call with full document | ContentRenderer with separately-fetched minimark body | v1.1 Phase 6 | Same visual result; different data flow |

**Deprecated/outdated:**
- `await useAsyncData(key, () => queryCollection(...).path(...).first())` for chapter body -- SQLite body is now empty
- Plain variable route params in `[...slug].vue` -- must be `computed()` for SPA
- `useChapterNav(novelString, pathString)` with plain string params -- must accept Ref/ComputedRef

## Open Questions

1. **`await` vs non-await for metadata useAsyncData in SPA context**
   - What we know: `await useAsyncData(...)` blocks the component's setup. In SSG, this is fine (server renders). In SPA, it means nothing renders until WASM SQLite responds.
   - What's unclear: How fast is the WASM SQLite query for a single chapter's metadata? If sub-50ms (likely), `await` is fine. If slow on first load (SQLite dump download), the page will show the SPA loading template until SQLite initializes.
   - Recommendation: Use `await` for metadata. The SPA loading template (from Phase 5) covers the initial SQLite download. Once SQLite is initialized, queries are instant. Test empirically.

2. **`useAsyncData` key as function vs string for body fetch**
   - What we know: Nuxt 4.3.1 `useAsyncData` supports a key function `() => string` that recomputes when watched refs change.
   - What's unclear: Whether the function key + `watch` option handles rapid navigation (clicking next multiple times quickly) without race conditions.
   - Recommendation: Use function key + `watch`. `useAsyncData` has built-in deduplication. Test rapid navigation empirically.

3. **Reading progress `save()` call timing with reactive params**
   - What we know: Current code calls `save()` in `onMounted()` with plain `novel` and `contentPath` values. With reactive params, `onMounted` runs once but params change on navigation.
   - What's unclear: Should `save()` fire on every chapter navigation or only on initial mount?
   - Recommendation: Use a `watch` on `contentPath` to save progress on every chapter visit (not just mount). This matches current behavior where each prerendered page calls `save()` on mount independently.

## Sources

### Primary (HIGH confidence)
- `ContentRenderer.vue` source code at `node_modules/@nuxt/content/dist/runtime/components/ContentRenderer.vue` -- lines 67-76 confirm minimark handling, lines 11-14 confirm `value` prop interface
- `minimark@0.2.0` `hast.mjs` source at `node_modules/.pnpm/minimark@0.2.0/node_modules/minimark/dist/hast.mjs` -- `toHast()` function converts minimark value array to HAST tree
- `@nuxt/content` `runtime/index.js` -- `decompressTree()` uses same `toHast()` conversion
- Body JSON sample at `.output/public/content/novels/lrg/1.json` -- confirms `{"type":"minimark","value":[...],"toc":{...}}` format
- Nuxt 4.3.1 `asyncData.js` source -- line 149 confirms `options.watch` triggers re-execution
- Nuxt UI v4 USkeleton component -- confirmed via MCP tool: simple `class`-based sizing, no required props
- Existing codebase files: `[...slug].vue`, `useChapterNav.ts`, `useReadingProgress.ts`, `router.options.ts`, `body-extractor.ts` -- all read directly

### Secondary (MEDIUM confidence)
- Phase 5 research (`05-RESEARCH.md`) -- body extraction format, afterParse hook behavior
- Architecture research (`ARCHITECTURE.md`) -- component responsibilities, data flow patterns

### Tertiary (LOW confidence)
- Rapid SPA navigation race condition behavior -- needs empirical testing
- WASM SQLite initialization timing on first visit -- needs empirical measurement

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new deps; all APIs verified from source code
- Architecture: HIGH -- ContentRenderer minimark compatibility confirmed by source inspection; reactivity patterns are standard Vue 3/Nuxt 4
- Pitfalls: HIGH -- all pitfalls derived from direct codebase inspection of current non-reactive patterns
- Code examples: HIGH -- based on verified API contracts from source code

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, existing deps pinned)
