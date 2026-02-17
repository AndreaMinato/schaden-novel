# Architecture Research

**Domain:** Content-heavy static reading site (novels + chapters)
**Researched:** 2026-02-17
**Confidence:** MEDIUM — Nuxt Content v3 docs verified via official sources; build-time performance at scale inferred from benchmarks, not direct 13K-page measurement

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Static)                            │
├──────────────────────────┬──────────────────────────────────────────┤
│  Pages (Prerendered HTML) │  Vue SPA layer (client hydration)        │
│  ┌──────────┐ ┌────────┐  │  ┌──────────────┐  ┌──────────────────┐ │
│  │  Home    │ │ Novel  │  │  │ useReading   │  │ useKeyboardNav   │ │
│  │  Page    │ │ Detail │  │  │ Progress     │  │ (arrow keys)     │ │
│  └──────────┘ └────────┘  │  └──────┬───────┘  └──────────────────┘ │
│  ┌──────────────────────┐ │         │ localStorage                   │
│  │  Chapter Reader Page │ │  ┌──────▼───────┐                        │
│  └──────────────────────┘ │  │ WASM SQLite  │ ← downloaded on 1st   │
│                            │  │ (content DB) │   content query        │
│                            │  └──────────────┘                        │
├──────────────────────────┴──────────────────────────────────────────┤
│                        NETLIFY CDN                                   │
│  Static HTML + JS + CSS + SQLite dump (.sqlite or .db)              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          BUILD TIME                                  │
├─────────────────────────────────────────────────────────────────────┤
│  content/novels/**/*.md                                              │
│       ↓ (Nuxt Content v3 parses)                                    │
│  SQLite database (metadata + parsed AST per chapter)                │
│       ↓ (nuxt generate)                                             │
│  13,318 prerendered HTML pages + SQLite dump                        │
│       ↓                                                             │
│  Netlify deploy                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `app/pages/index.vue` | Home: latest chapters grouped by novel | `queryCollection` per novel, `select(['path','title','pubDate'])` |
| `app/pages/novels/index.vue` | Novel catalog with chapter counts | `queryCollection` count per novel |
| `app/pages/novels/[novel]/index.vue` | Full chapter listing for one novel | `queryCollection(novel).order('path','ASC').all()` |
| `app/pages/novels/[novel]/[chapter].vue` | Chapter reader | Full content query + `ContentRenderer` |
| `app/layouts/default.vue` | Site shell (header, footer, nav) | Wraps all pages except chapter reader |
| `app/layouts/chapter.vue` | Reading-optimized shell | Minimal chrome, full-width prose |
| `app/components/ChapterNav.vue` | Prev/Next navigation bar | `queryCollectionItemSurroundings()` or precomputed links |
| `app/components/ResumeReading.vue` | "Continue reading" widget | Reads localStorage on `onMounted` |
| `app/components/NovelCard.vue` | Novel summary with count + latest chapter | Accepts novel slug + metadata props |
| `app/components/ChapterListItem.vue` | Single chapter row in a listing | Accepts chapter path + title + pubDate |
| `app/composables/useReadingProgress.ts` | localStorage read/write for per-novel progress | VueUse `useLocalStorage`, `onMounted`-guarded |
| `app/composables/useKeyboardNav.ts` | Cmd+Left/Right keyboard chapter nav | `useEventListener` from VueUse |
| `content.config.ts` | Collection definitions and schemas | `defineContentConfig` with per-novel collections |
| `scripts/import.mjs` | Google Docs → markdown import pipeline | Node script, cheerio HTML parsing, outputs `.md` |

---

## Recommended Project Structure

```
schaden-novel/                    # project root
├── app/                          # all Vue app code (Nuxt 4 convention)
│   ├── app.vue                   # root component
│   ├── pages/
│   │   ├── index.vue             # home page (latest chapters by novel)
│   │   └── novels/
│   │       ├── index.vue         # novel catalog
│   │       └── [novel]/
│   │           ├── index.vue     # novel detail + full chapter list
│   │           └── [chapter].vue # chapter reader
│   ├── layouts/
│   │   ├── default.vue           # site shell with header/footer
│   │   └── chapter.vue           # reading layout (no sidebar)
│   ├── components/
│   │   ├── AppHeader.vue         # site navigation header
│   │   ├── AppFooter.vue         # site footer
│   │   ├── NovelCard.vue         # novel summary card
│   │   ├── ChapterListItem.vue   # chapter row in listing
│   │   ├── ChapterNav.vue        # prev/next chapter navigation
│   │   └── ResumeReading.vue     # "continue reading" localStorage widget
│   ├── composables/
│   │   ├── useReadingProgress.ts # localStorage: save/load last chapter per novel
│   │   └── useKeyboardNav.ts     # Cmd+Arrow keyboard navigation
│   └── utils/
│       └── chapterSort.ts        # numeric chapter sort (port from consts.ts)
├── content/                      # markdown files (Nuxt Content v3 convention)
│   └── novels/
│       ├── mga/
│       │   ├── 1.md
│       │   ├── 2.md
│       │   └── ...               # 2,335 chapters
│       ├── atg/                  # 2,157 chapters
│       ├── mw/                   # 2,254 chapters
│       ├── tmw/                  # 1,307 chapters
│       ├── rtw/                  # 1,498 chapters
│       ├── overgeared/           # 1,255 chapters
│       ├── issth/                # 1,407 chapters
│       ├── htk/                  # 1,020 chapters
│       ├── lrg/                  # 84 chapters
│       └── cd/                   # 1 chapter (placeholder)
├── server/
│   └── routes/
│       └── feed.xml.ts           # RSS feed generation
├── scripts/
│   ├── import.mjs                # Google Docs → .md (port existing)
│   ├── import_ids.mjs            # chapter ID utilities
│   └── readChapters.mjs          # chapter reading utilities
├── public/
│   └── robots.txt
├── content.config.ts             # Nuxt Content v3 collection definitions
├── nuxt.config.ts                # framework config
└── package.json
```

### Structure Rationale

- **`app/` vs root:** Nuxt 4's key change — all Vue code lives in `app/` to separate framework-controlled directories. Files outside `app/` (server, public, content) remain at root.
- **`content/novels/[novel]/[chapter].md`:** Nuxt Content v3 maps this to URL path `/novels/[novel]/[chapter]` automatically for `type: 'page'` collections, aligning content location with routes.
- **`app/layouts/chapter.vue`:** Separate layout from default justifies the reading-focused chrome (no nav clutter, full-width prose, keyboard nav active).
- **Per-novel directory** rather than flat: mirrors existing Astro structure, enables per-novel collection definitions for targeted queries.

---

## Architectural Patterns

### Pattern 1: Per-Novel Collections in content.config.ts

**What:** Define one collection per novel (10 total) rather than one monolithic collection. Each collection targets a single novel's directory.

**When to use:** Any time you need to list chapters for a specific novel, you query the novel's collection directly instead of filtering 13K records.

**Trade-offs:** 10x more collection definitions but each query is scoped. Eliminates the need for path-prefix `LIKE` filtering on every chapter list query.

**Example:**
```typescript
// content.config.ts
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const chapterSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).optional(),
})

export default defineContentConfig({
  collections: {
    mga: defineCollection({
      type: 'page',
      source: 'novels/mga/*.md',
      schema: chapterSchema,
    }),
    atg: defineCollection({
      type: 'page',
      source: 'novels/atg/*.md',
      schema: chapterSchema,
    }),
    // ... repeat for all 10 novels
  }
})
```

### Pattern 2: Metadata-Only Queries for Chapter Lists

**What:** Use `select()` to fetch only lightweight fields when building chapter listings. Never load the markdown body/AST when listing chapters.

**When to use:** Any page that displays a list of chapters (home, novel detail, chapter jumper dropdown).

**Trade-offs:** Dramatically reduces the data fetched per query. Critical when WASM SQLite includes parsed ASTs for 13K chapters.

**Example:**
```typescript
// app/pages/novels/[novel]/index.vue
const novel = useRoute().params.novel as string
const { data: chapters } = await useAsyncData(`chapters-${novel}`, () =>
  queryCollection(novel)
    .select(['path', 'title', 'pubDate'])
    .order('path', 'ASC')
    .all()
)
```

### Pattern 3: ContentRenderer for Chapter Pages

**What:** Query the full document (including body) on chapter reader pages, then pass to `<ContentRenderer>`.

**When to use:** Only on the chapter reader page (`[chapter].vue`). This is the one place where full content is needed.

**Trade-offs:** For prerendered pages, the rendered HTML is embedded at build time. Client-side navigation will fetch from WASM SQLite.

**Example:**
```typescript
// app/pages/novels/[novel]/[chapter].vue
definePageMeta({ layout: 'chapter' })

const route = useRoute()
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection(route.params.novel as string)
    .path(route.path)
    .first()
)

const { data: surroundings } = await useAsyncData(`nav-${route.path}`, () =>
  queryCollectionItemSurroundings(
    route.params.novel as string,
    route.path,
    { before: 1, after: 1 }
  )
)
// surroundings[0] = prev chapter, surroundings[1] = next chapter
```

```vue
<template>
  <div>
    <ChapterNav :prev="surroundings?.[0]" :next="surroundings?.[1]" />
    <ContentRenderer v-if="page" :value="page" />
    <ChapterNav :prev="surroundings?.[0]" :next="surroundings?.[1]" />
  </div>
</template>
```

### Pattern 4: SSR-Safe localStorage for Reading Progress

**What:** Wrap all `localStorage` access in `onMounted` or use VueUse's `useLocalStorage` (SSR-safe). Never access `window` or `localStorage` at the top level of a composable.

**When to use:** `useReadingProgress` composable, `ResumeReading` component.

**Trade-offs:** The reading progress widget is only visible after hydration (client-side only). Acceptable for this feature.

**Example:**
```typescript
// app/composables/useReadingProgress.ts
import { useLocalStorage } from '@vueuse/core'

export function useReadingProgress() {
  // useLocalStorage is SSR-safe in VueUse — returns null on server
  const savedChapters = useLocalStorage<Record<string, { path: string; timestamp: number }>>(
    'savedChapters',
    {}
  )

  function saveProgress(novel: string, path: string) {
    savedChapters.value[novel] = { path, timestamp: Date.now() }
  }

  function getProgress(novel: string) {
    return savedChapters.value[novel]?.path ?? null
  }

  return { saveProgress, getProgress }
}
```

### Pattern 5: Prerendering All Routes for Static Netlify Deploy

**What:** Configure Nuxt to prerender every route at build time using `nuxt generate` with `crawlLinks: true`. This generates static HTML for all 13K+ chapter pages.

**When to use:** Required for Netlify static hosting. Every chapter URL must be a pre-built HTML file.

**Trade-offs:** Build time will be significant (see scalability section). All routes must be discoverable by the crawler from `index.vue` links.

**Example:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: { compatibilityVersion: 4 },

  modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap'],

  nitro: {
    prerender: {
      crawlLinks: true,
      // Seed the crawler — chapter pages are linked from novel index pages
      routes: ['/'],
    },
  },

  routeRules: {
    // Explicit prerender for all novel routes as fallback
    '/novels/**': { prerender: true },
  },
})
```

---

## Data Flow

### Build-Time Data Flow

```
content/novels/[novel]/[chapter].md
        ↓
Nuxt Content v3 parser (markdown → AST)
        ↓
SQLite database (metadata + AST per chapter)
        ↓
nuxt generate → Nitro crawler
        ↓
  For each route: queryCollection() → HTML page rendered
        ↓
.output/public/
  ├── index.html
  ├── novels/index.html
  ├── novels/mga/index.html         ← 2,335 chapter list rows
  ├── novels/mga/1/index.html       ← chapter rendered to HTML
  ├── novels/mga/2/index.html
  └── ... (13,318 chapter files)
        ↓
Netlify deploy (CDN-distributed static files)
```

### Runtime Data Flow (User Visit)

```
User visits /novels/mga/1500
        ↓
CDN serves prerendered HTML (instant, no server needed)
        ↓
Vue hydrates on client
        ↓
First content query (e.g., click to /novels/mga/1501 via Vue Router)
        ↓
WASM SQLite database dump downloaded from CDN (~?MB — see pitfalls)
        ↓
SQLite initialized in browser (IndexedDB or in-memory)
        ↓
All subsequent navigation queries run locally in browser
```

### Reading Progress Data Flow

```
User lands on /novels/mga/1500
        ↓
Chapter.vue calls saveProgress('mga', '/novels/mga/1500') on mount
        ↓
useReadingProgress writes to localStorage key 'savedChapters'
        ↓
(later) User visits home page /
        ↓
ResumeReading component reads localStorage in onMounted
        ↓
Displays "Continue: MGA Chapter 1500" link per novel
```

### RSS Feed Data Flow

```
server/routes/feed.xml.ts (server route)
        ↓
queryCollection('mga').select(['path','title','pubDate']).order('pubDate','DESC').limit(50).all()
        ↓
Feed XML built with latest chapters across all novels
        ↓
/feed.xml static file (prerendered at build time)
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Netlify CDN | `nuxt generate` output deployed to `/dist` or `.output/public` | Zero-config Nuxt 4 Netlify detection via `@netlify/plugin-nuxt` |
| Google Docs | `scripts/import.mjs` runs locally, outputs `.md` to `content/novels/[novel]/` | Not a runtime integration — developer workflow only |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `content/` ↔ `app/pages/` | `queryCollection()` composable (Nuxt Content API) | Type-safe, auto-imported |
| `app/pages/` ↔ `app/layouts/` | `definePageMeta({ layout: 'chapter' })` | Chapter pages use reading layout |
| `app/pages/` ↔ `app/composables/` | Direct import (auto-imported in Nuxt) | Composables accessed in `<script setup>` |
| `app/composables/useReadingProgress` ↔ browser | VueUse `useLocalStorage` | No server involvement; SSR-safe |
| `server/routes/feed.xml.ts` ↔ `content/` | `queryCollection(event, ...)` with event parameter | Server-side query requires `event` arg |
| `nuxt.config.ts` ↔ Netlify | `nitro.prerender` + Netlify adapter auto-detection | Build-time only |

---

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current: 13K pages, 10 novels | Pure SSG with `nuxt generate`; all pages prerendered; expect 30-90 min builds |
| +5K pages (more chapters) | Build time increases proportionally; investigate Netlify build time limits (default: 30 min); may need plan upgrade or build caching |
| New novels added | Add collection definition to `content.config.ts`; no architectural change needed |
| 1M+ monthly visitors | CDN handles static files trivially; WASM SQLite downloaded once per visitor, cached; no server scaling needed |

### Scaling Priorities

1. **First bottleneck: build time.** The 13,318-page prerender is the main risk. Existing Astro site already handles this, so Nuxt must match it. Use Netlify's build cache plugin to avoid rebuilding unchanged pages. Validate actual build time early in development.

2. **Second bottleneck: WASM SQLite database size.** Nuxt Content v3 downloads a full SQLite dump to the browser on first content query. With 13K chapters of 170MB markdown, this dump's size is unknown but potentially significant. Use `select()` everywhere to minimize query overhead; the dump size itself cannot be controlled without changing the content architecture.

---

## Anti-Patterns

### Anti-Pattern 1: Single Monolithic Chapters Collection

**What people do:** Define one collection for all novels: `source: 'novels/**/*.md'`. Then filter with `where('path', 'LIKE', '/novels/mga/%')` for every novel-specific query.

**Why it's wrong:** Every listing query must scan all 13K records and filter client-side or via LIKE. SQLite handles it, but prerendering means this query runs 13K times during build. Debugging is also harder.

**Do this instead:** Define 10 per-novel collections. Each `queryCollection('mga')` only scans that novel's records (max ~2,335 rows instead of 13,318).

### Anti-Pattern 2: Loading Full Content Bodies in List Views

**What people do:** `queryCollection('mga').all()` without `.select()`, loading full parsed AST for every chapter when building a listing.

**Why it's wrong:** Each chapter body is the full parsed markdown AST. At 13K chapters this multiplies memory usage massively during build and inflates the per-page payload in SSG output.

**Do this instead:** Always use `.select(['path', 'title', 'pubDate'])` for list queries. Only load full content on the chapter reader page.

### Anti-Pattern 3: Using Tags Arrays for Novel Filtering

**What people do:** Port the Astro `tags.includes(novel)` filter directly. The Astro `novelSchema` uses `tags: z.array(z.string())` and filters `data.tags.includes(novel)`.

**Why it's wrong:** Nuxt Content v3 stores arrays as JSON strings in SQLite. There is no native `$contains` operator. The workaround `.where('tags', 'LIKE', '%"mga"%')` works but is fragile and bypasses type safety.

**Do this instead:** Use per-novel collections (Pattern 1). Novel identity comes from which collection you query, not from a tags field. Tags field can be removed from the schema entirely.

### Anti-Pattern 4: Accessing localStorage at Module Scope

**What people do:** `const savedChapters = JSON.parse(localStorage.getItem('savedChapters'))` at the top level of a composable or component script.

**Why it's wrong:** Nuxt renders on the server first (even for static generation). `localStorage` and `window` are undefined in Node.js. This crashes the build.

**Do this instead:** Use VueUse `useLocalStorage` (SSR-aware) or guard with `if (import.meta.client)` / `onMounted`.

### Anti-Pattern 5: Skipping `routeRules` Prerender Fallback

**What people do:** Rely only on `crawlLinks: true` and assume the crawler will find all 13K chapter pages.

**Why it's wrong:** The Nitro crawler starts from `/` and follows links. If the chapter listing page only shows 3 chapters (like the home page in the current Astro site), thousands of chapter URLs will never be discovered.

**Do this instead:** Set `routeRules: { '/novels/**': { prerender: true } }` AND ensure every chapter URL appears as an `<a href>` in the novel's chapter listing page. The novel detail page should render all chapters as links so the crawler finds them.

---

## Build Order Implications for Roadmap

The component dependencies create this natural build order:

```
1. content.config.ts + content/ migration
       ↓ (required before any page can query content)
2. app/composables/ (useReadingProgress, useKeyboardNav)
       ↓ (composables are consumed by pages, must exist first)
3. app/layouts/ (default + chapter)
       ↓ (pages reference layouts by name)
4. app/components/ (AppHeader, AppFooter, ChapterNav, etc.)
       ↓ (components referenced in pages)
5. app/pages/ — in this order:
   a. novels/[novel]/index.vue (chapter listing — validates content queries work)
   b. novels/[novel]/[chapter].vue (reader — validates ContentRenderer + nav)
   c. novels/index.vue (catalog — builds on listing component)
   d. index.vue (home — builds on ResumeReading + chapter list patterns)
       ↓
6. server/routes/feed.xml.ts (RSS — depends on queryCollection pattern working)
7. nuxt.config.ts prerender + Netlify deploy (validates full SSG pipeline)
8. scripts/ port from Astro (import pipeline, standalone from Nuxt)
```

The chapter reader page (step 5b) is the highest-risk component because it combines: content queries, `ContentRenderer`, `queryCollectionItemSurroundings`, two layouts, keyboard nav, and reading progress. Build it early to surface any Nuxt Content v3 compatibility issues before investing time in catalog/home pages.

---

## Sources

- Nuxt 4 directory structure: https://nuxt.com/docs/4.x/directory-structure (HIGH confidence)
- Nuxt Content v3 announcement: https://content.nuxt.com/blog/v3 (HIGH confidence)
- Nuxt Content v3 collections: https://content.nuxt.com/docs/collections/define (HIGH confidence)
- Nuxt Content v3 queryCollection: https://content.nuxt.com/docs/utils/query-collection (HIGH confidence)
- Nuxt Content v3 static hosting: https://content.nuxt.com/docs/deploy/static (HIGH confidence)
- Nuxt Content v3 database: https://content.nuxt.com/docs/advanced/database (HIGH confidence)
- ContentRenderer component: https://content.nuxt.com/docs/components/content-renderer (HIGH confidence)
- Nuxt 4 prerendering: https://nuxt.com/docs/4.x/getting-started/prerendering (HIGH confidence)
- SSG build time at scale: https://github.com/nuxt/nuxt/discussions/26689 (MEDIUM confidence — community discussion, not official benchmark)
- Array field LIKE workaround: https://zhul.in/en/2025/10/20/nuxt-content-v3-z-array-query-challenge/ (MEDIUM confidence — verified via single source)
- VueUse useLocalStorage: https://vueuse.org/core/uselocalstorage/ (HIGH confidence)
- Netlify + Nuxt 4: https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/ (HIGH confidence)

---

*Architecture research for: content-heavy Nuxt 4 novel reading site*
*Researched: 2026-02-17*
