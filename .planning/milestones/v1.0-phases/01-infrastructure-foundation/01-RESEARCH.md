# Phase 1: Infrastructure Foundation - Research

**Researched:** 2026-02-17
**Domain:** Nuxt 4 + Nuxt Content v3 + Nuxt UI static site generation at scale
**Confidence:** HIGH

## Summary

Nuxt 4 is the current stable major version (released July 2025). The `nuxt` npm package installs v4 by default. Nuxt Content v3 (currently 3.11.2) is the official content module, fully rewritten around an SQLite storage layer with collection-based architecture. Nuxt UI v4 (currently 4.4.0) is the matching UI library that requires Nuxt 4.

The project migrates from Astro 5 with 13,318 markdown chapters across 10 novels. The existing content uses simple frontmatter (title, pubDate, tags) and is organized in `src/content/novels/{novel-shortname}/` directories. The Nuxt 4 equivalent uses a `content/` directory at the project root and defines collections in `content.config.ts`.

The critical architectural decision is SQLite dump size management. Nuxt Content v3's `page` collection type stores parsed body content (as AST) in the SQLite database. For a static site, this dump is downloaded to the browser on the first client-side content query. With 13K chapters of novel text, this dump could be enormous. The user's decision to keep the dump small by excluding body text is correct and essential. The recommended approach is a dual-strategy: use `page` type collections for individual chapter rendering (body needed at build time for prerendering), and use `queryCollection().select()` to exclude body from listing queries. Prerendered pages use `_payload.json` instead of SQLite at runtime, so the key is to minimize what client-side navigation needs from the dump.

**Primary recommendation:** Scaffold Nuxt 4 + Nuxt Content v3 + Nuxt UI v4. Use `page` type collections per novel. Selectively prerender a subset of chapters. Test SQLite dump size early -- if it exceeds 10MB with body content, implement a `content:file:afterParse` hook to strip body from the dump, or restructure to use `data` type collections for listing metadata alongside `page` collections for chapter rendering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Builds happen locally, NOT on Netlify CI -- user runs build locally then uploads dist/ to Netlify
- Netlify build timeout is irrelevant -- local machine has no timeout constraint
- Incremental builds are important -- chapters are only added (batch import), rarely edited
- Typical workflow: batch import new chapters -> rebuild -> deploy
- Keep SQLite dump small -- exclude chapter body text from SQLite collections
- Only store metadata (title, path, pubDate, novel, order) in SQLite
- Chapter body content served via prerendered HTML and _payload.json, not client-side SQLite queries
- "We will make it work" -- no pivot away from Nuxt Content v3
- If issues arise, solve them within the Nuxt Content ecosystem
- No fallback to alternative content systems planned

### Claude's Discretion
- Validation subset size (which novel, how many chapters to test with)
- Content directory naming (short names vs full titles)
- Nuxt Content collection schema design
- Netlify deployment configuration
- Build optimization approach for incremental builds

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Site built with Nuxt 4 + Nuxt UI, deployable as static site | Nuxt 4 is stable (v4.3+). Nuxt UI v4.4.0 requires Nuxt 4. `nuxi generate` produces static output in `.output/public/`. Scaffold with `pnpm create nuxt@latest`. |
| INFRA-02 | Nuxt Content v3 handles markdown chapters with per-novel collections | Nuxt Content v3.11.2 supports `defineCollection()` with `source` patterns per directory. Each novel gets its own collection. Files can only belong to ONE collection. |
| INFRA-03 | Build completes within timeout for 13K+ chapters | Build is local (no timeout). `nitro.prerender.concurrency` defaults to 1, can be increased. Selective prerendering via `routeRules` or `prerender:routes` hook. SPA fallback via `200.html`. |
| INFRA-04 | Site deploys to Netlify with zero-config preset | Nuxt auto-detects Netlify. For manual deploy: `netlify deploy --prod --dir=.output/public --no-build`. Output dir changed from `dist` to `.output/public` in Nuxt 4. |
| INFRA-05 | Content queries use useAsyncData to avoid SQLite dump download | Prerendered pages bake data into `_payload.json` via `useAsyncData`. No SQLite dump download needed for prerendered routes. Non-prerendered routes trigger dump download. Keeping dump small is critical. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuxt | 4.3+ | Application framework | Current stable major. New projects should use v4. |
| @nuxt/content | 3.11+ | File-based CMS with SQLite | Official Nuxt module for markdown content. SQL-backed queries. |
| @nuxt/ui | 4.4+ | UI component library | Official Nuxt UI. 110+ components. Requires Nuxt 4. Free + open source. |
| tailwindcss | 4.x | Utility CSS framework | Required by Nuxt UI v4. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nuxt/fonts | latest | Font optimization | Auto font loading. Optional for Phase 1. |
| @nuxt/icon | latest | 200K+ icons via Iconify | Bundled with Nuxt UI. Auto-configured. |

### Alternatives Considered
None -- stack is locked by user decision.

**Installation:**
```bash
pnpm create nuxt@latest schaden-novel-nuxt
cd schaden-novel-nuxt
pnpm add @nuxt/content tailwindcss @nuxt/ui
```

## Architecture Patterns

### Recommended Project Structure (Nuxt 4)
```
schaden-novel/
├── app/                      # Nuxt 4 srcDir (new default)
│   ├── app.vue               # Root component
│   ├── components/           # Auto-imported components
│   ├── composables/          # Auto-imported composables
│   ├── layouts/              # Layout components
│   ├── pages/                # File-based routing
│   │   ├── index.vue         # Home page
│   │   └── novels/
│   │       └── [novel]/
│   │           └── [...slug].vue  # Chapter catch-all
│   └── assets/
│       └── css/
│           └── main.css      # Tailwind imports
├── content/                  # Nuxt Content source (stays at root)
│   ├── mga/                  # Novel chapters (short names)
│   │   ├── 1.md
│   │   └── ...
│   ├── atg/
│   ├── overgeared/
│   └── ... (10 novels)
├── content.config.ts         # Collection definitions
├── nuxt.config.ts            # Nuxt configuration
├── public/                   # Static assets
└── server/                   # Server routes (if needed)
```

### Pattern 1: Per-Novel Collections with Shared Schema
**What:** Define one collection per novel to keep collections independent and manageable.
**When to use:** Always -- this is the required pattern for per-novel chapter management.
**Example:**
```typescript
// content.config.ts
import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

const chapterSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()),
  order: z.number().optional(),
})

export default defineContentConfig({
  collections: {
    mga: defineCollection({
      type: 'page',
      source: 'mga/**/*.md',
      schema: chapterSchema,
    }),
    atg: defineCollection({
      type: 'page',
      source: 'atg/**/*.md',
      schema: chapterSchema,
    }),
    // ... one per novel
  }
})
```
**Source:** https://content.nuxt.com/docs/collections/define

### Pattern 2: useAsyncData Wrapping for Content Queries
**What:** Always wrap `queryCollection()` in `useAsyncData()` to enable payload extraction.
**When to use:** Every content query in pages/components.
**Example:**
```vue
<script setup lang="ts">
const route = useRoute()

// Chapter page -- fetches single chapter with body
const { data: chapter } = await useAsyncData(
  `chapter-${route.params.novel}-${route.params.slug}`,
  () => queryCollection(route.params.novel as string)
    .path(route.path)
    .first()
)

// Chapter listing -- metadata only, NO body
const { data: chapters } = await useAsyncData(
  `chapters-${route.params.novel}`,
  () => queryCollection(route.params.novel as string)
    .select('title', 'path', 'stem', 'meta')
    .order('stem', 'ASC')
    .all()
)
</script>
```
**Source:** https://content.nuxt.com/docs/utils/query-collection

### Pattern 3: Selective Prerendering with SPA Fallback
**What:** Prerender key pages (home, novel index, recent chapters) and use SPA fallback for the rest.
**When to use:** When 13K+ pages make full prerendering impractical or slow.
**Example:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/novels': { prerender: true },
    '/novels/mga': { prerender: true },
    // Don't prerender all 13K chapters
  },
  nitro: {
    prerender: {
      crawlLinks: false,  // Disable crawler to prevent discovering 13K chapters
      routes: ['/', '/novels'],
    },
  },
})
```
**Source:** https://nuxt.com/docs/4.x/getting-started/prerendering

### Pattern 4: ContentRenderer for Chapter Display
**What:** Use `<ContentRenderer>` to render markdown body from page collections.
**When to use:** On chapter detail pages.
**Example:**
```vue
<template>
  <ContentRenderer v-if="chapter" :value="chapter" />
</template>
```
**Source:** https://content.nuxt.com/docs/getting-started/migration

### Anti-Patterns to Avoid
- **Putting files in multiple collections:** "A document is designed to be present in only one collection at a time. If a file is referenced in multiple collections, live reload will not work correctly." Each markdown file goes in exactly ONE collection.
- **Using queryCollection without useAsyncData:** Without the wrapper, data is not extracted into `_payload.json`, forcing a SQLite dump download on client navigation.
- **Enabling crawlLinks with 13K pages:** The Nitro crawler will discover and try to prerender every chapter page. Disable it and explicitly list routes to prerender.
- **Using `data` type for chapters that need rendering:** The `data` collection type has no `body` field. Chapters that need markdown rendering MUST use `page` type.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content querying | Custom file-reading logic | `queryCollection()` | SQL-backed, typed, cacheable |
| Markdown rendering | Custom markdown parser | `<ContentRenderer>` | Handles AST, components, plugins |
| UI components | Custom buttons/cards/nav | Nuxt UI components | 110+ production-ready components |
| Dark mode | Custom theme toggle | `@nuxt/color-mode` | Auto-configured with Nuxt UI |
| Static generation | Custom build scripts | `nuxi generate` | Handles prerendering, payloads, crawling |
| Netlify deploy | Custom deploy scripts | `netlify deploy --prod --dir=.output/public` | Already working pattern |
| Chapter sorting | Complex sort logic | SQLite `ORDER BY` via `.order()` | Database handles sorting efficiently |

**Key insight:** Nuxt Content v3's SQL-backed architecture means sorting, filtering, and pagination happen at the database level, not in JavaScript. Use `.order()`, `.where()`, `.limit()`, `.skip()` instead of fetching all and sorting in memory.

## Common Pitfalls

### Pitfall 1: SQLite Dump Bloat with Body Content
**What goes wrong:** The `page` collection type stores the full parsed body (AST) in SQLite. With 13K novel chapters, the dump file could be 50-200MB+, causing massive downloads on client-side navigation.
**Why it happens:** Nuxt Content stores everything in the database by default. The dump is downloaded to the browser on the first client-side content query.
**How to avoid:** (1) Prerender as many pages as possible so they use `_payload.json` instead of the dump. (2) Use `.select()` to exclude body from listing queries. (3) Measure dump size early with a subset of chapters. (4) If dump is too large, explore `content:file:afterParse` hook to strip body before database insertion.
**Warning signs:** `.output/public/api/_content/` directory contains very large SQLite dump files.

### Pitfall 2: Nuxt 4 Directory Structure Confusion
**What goes wrong:** Files placed in wrong locations because Nuxt 4 moves `pages/`, `components/`, etc. into an `app/` subdirectory.
**Why it happens:** Most tutorials/examples still show Nuxt 3 structure. Nuxt 4 defaults `srcDir` to `app/`.
**How to avoid:** Use `pnpm create nuxt@latest` which scaffolds the correct Nuxt 4 structure. Content directory stays at root, NOT in `app/`.
**Warning signs:** Components not auto-importing, pages not routing.

### Pitfall 3: Content Files in Multiple Collections
**What goes wrong:** Live reload breaks, inconsistent query results.
**Why it happens:** Developer creates overlapping source patterns across collections.
**How to avoid:** Each markdown file must be matched by exactly ONE collection's `source` pattern. Use non-overlapping directory structures: `content/mga/`, `content/atg/`, etc.
**Warning signs:** HMR not updating content, duplicate entries in queries.

### Pitfall 4: better-sqlite3 Native Binding Errors
**What goes wrong:** Build fails with native module compilation errors, especially on different Node versions or platforms.
**Why it happens:** `better-sqlite3` requires native compilation. Can fail on different OS/architecture.
**How to avoid:** Use Node.js 22.5+ with native SQLite: set `content.experimental.sqliteConnector: 'native'` in nuxt.config.ts. Eliminates the need for `better-sqlite3` entirely.
**Warning signs:** `Error: Could not find module better-sqlite3`, compilation errors during `pnpm install`.

### Pitfall 5: Memory Exhaustion During Build
**What goes wrong:** `nuxi generate` crashes with OOM (out of memory) errors.
**Why it happens:** Prerendering thousands of pages concurrently loads many pages into memory. Current Astro build already requires `--max-old-space-size=8192`.
**How to avoid:** Set `NODE_OPTIONS=--max-old-space-size=8192` (or higher). Keep `nitro.prerender.concurrency` reasonable (default is 1, increase carefully). Start with selective prerendering, not all 13K pages.
**Warning signs:** `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed`, process killed by OS.

### Pitfall 6: Output Directory Mismatch for Netlify Deploy
**What goes wrong:** `netlify deploy` uploads empty or wrong directory.
**Why it happens:** Nuxt 4's `nuxi generate` outputs to `.output/public/`, NOT `dist/`. The existing deploy command uses `--dir=dist`.
**How to avoid:** Update deploy command to `netlify deploy --prod --dir=.output/public --no-build`. Or add a symlink/copy step.
**Warning signs:** Netlify site shows blank page or "Page Not Found" after deploy.

## Code Examples

### Complete nuxt.config.ts for Phase 1
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  content: {
    experimental: {
      sqliteConnector: 'native',  // Node 22.5+ -- avoids better-sqlite3
    },
  },

  // Selective prerendering for infrastructure validation
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/', '/200.html', '/404.html'],
      concurrency: 4,
    },
  },

  // Route rules for selective prerendering
  routeRules: {
    '/': { prerender: true },
  },

  compatibilityDate: '2025-07-15',
})
```
**Source:** Composite from https://content.nuxt.com/docs/getting-started/configuration and https://nuxt.com/docs/4.x/getting-started/prerendering

### Complete content.config.ts for Per-Novel Collections
```typescript
// content.config.ts
import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

const chapterSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()),
})

// Helper to define a novel collection
function novelCollection(dir: string) {
  return defineCollection({
    type: 'page',
    source: `${dir}/**/*.md`,
    schema: chapterSchema,
  })
}

export default defineContentConfig({
  collections: {
    mga: novelCollection('mga'),
    atg: novelCollection('atg'),
    overgeared: novelCollection('overgeared'),
    tmw: novelCollection('tmw'),
    htk: novelCollection('htk'),
    issth: novelCollection('issth'),
    cd: novelCollection('cd'),
    lrg: novelCollection('lrg'),
    mw: novelCollection('mw'),
    rtw: novelCollection('rtw'),
  },
})
```

### Chapter Page with useAsyncData (INFRA-05 Pattern)
```vue
<!-- app/pages/novels/[novel]/[...slug].vue -->
<script setup lang="ts">
const route = useRoute()
const novel = route.params.novel as string

const { data: chapter } = await useAsyncData(
  `chapter-${novel}-${route.params.slug}`,
  () => queryCollection(novel).path(route.path).first()
)

if (!chapter.value) {
  throw createError({ statusCode: 404, message: 'Chapter not found' })
}
</script>

<template>
  <div v-if="chapter">
    <h1>{{ chapter.title }}</h1>
    <ContentRenderer :value="chapter" />
  </div>
</template>
```

### Chapter Listing with Metadata Only (No Body)
```vue
<!-- app/pages/novels/[novel]/index.vue -->
<script setup lang="ts">
const route = useRoute()
const novel = route.params.novel as string

const { data: chapters } = await useAsyncData(
  `listing-${novel}`,
  () => queryCollection(novel)
    .select('title', 'path', 'stem')
    .order('stem', 'ASC')
    .all()
)
</script>

<template>
  <div>
    <h1>{{ novel }} Chapters</h1>
    <ul>
      <li v-for="ch in chapters" :key="ch.path">
        <NuxtLink :to="ch.path">{{ ch.title }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
```

### Main CSS File for Nuxt UI
```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";
```

### Deploy Script
```json
{
  "scripts": {
    "dev": "nuxi dev",
    "build": "NODE_OPTIONS=--max-old-space-size=8192 nuxi generate",
    "preview": "npx serve .output/public",
    "deploy": "pnpm build && netlify deploy --prod --dir=.output/public --no-build"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nuxt 3 with v3 compat flags | Nuxt 4 (stable, default) | July 2025 | New projects use Nuxt 4 directly |
| Nuxt Content v2 (file-based) | Nuxt Content v3 (SQLite-backed) | 2025 | SQL queries, collections, typed schema |
| Nuxt UI v2 (paid Pro) | Nuxt UI v4 (free, 110+ components) | 2025 | All components free and open source |
| `better-sqlite3` required | Native SQLite (Node 22.5+) | Node 22.5 | No native compilation needed |
| Nuxt 3 flat structure | Nuxt 4 `app/` subdirectory | July 2025 | `pages/` -> `app/pages/`, etc. |
| `dist/` output | `.output/public/` output | Nuxt 3+ | Deploy dir changed |
| `queryContent()` | `queryCollection()` | Content v3 | SQL-based, collection-scoped |

**Deprecated/outdated:**
- `queryContent()`: Replaced by `queryCollection()` in Content v3
- `<ContentDoc>`, `<ContentList>`, `<ContentNavigation>`: Removed in Content v3. Use `<ContentRenderer>` + manual queries.
- `content.experimental.nativeSqlite`: Deprecated in favor of `content.experimental.sqliteConnector: 'native'`
- Document-driven mode: Removed in Content v3. Must create explicit page routes.

## Open Questions

1. **SQLite dump size with body content**
   - What we know: `page` type collections store body (AST) in SQLite. The dump is downloaded to browser on first client-side query. `.select()` excludes body from query results but not from the dump file itself.
   - What's unclear: Exact dump size for 13K novel chapters. Whether a `content:file:afterParse` hook can strip body before DB insertion without breaking `<ContentRenderer>`. Whether prerendered pages truly never trigger dump download.
   - Recommendation: Test with one novel (~2K chapters) immediately in Phase 1. Measure dump size in `.output/public/`. If >10MB, investigate body stripping or separate data/page collection patterns.

2. **Dynamic collection name in queryCollection**
   - What we know: `queryCollection()` takes a collection name as string. The route param `[novel]` provides the novel name.
   - What's unclear: Whether `queryCollection(dynamicString)` works with TypeScript types, or if all collection names must be known statically.
   - Recommendation: Test early. May need a lookup map or type assertion.

3. **Chapter ordering without numeric prefix**
   - What we know: Existing chapters use `1.md`, `2.md` etc. as filenames. Nuxt Content v3 uses alphabetical ordering by default. The `stem` field contains the filename without extension.
   - What's unclear: Whether `.order('stem', 'ASC')` will sort `1, 10, 100, 2` (string sort) or `1, 2, 10, 100` (numeric sort). Custom sort may need a numeric `order` field in frontmatter.
   - Recommendation: Add an `order` field to the schema and frontmatter. Or use zero-padded filenames (001.md, 002.md) for correct alphabetical sort.

4. **Incremental build behavior**
   - What we know: User wants batch import -> rebuild workflow. Nuxt Content v3 uses database integrity checks. Nitro prerendering re-generates all specified routes.
   - What's unclear: Whether Nuxt Content v3 has true incremental parsing (only re-parse changed files). Whether `nuxi generate` can skip already-generated HTML files.
   - Recommendation: Accept full rebuild for Phase 1. Measure build time. Optimize in later phases if needed.

## Discretion Recommendations

### Validation Subset: Use `lrg` (84 chapters) for initial testing, `mga` (2,335 chapters) for scale testing
- `lrg` is small enough for rapid iteration during scaffold/config work
- `mga` is the largest novel and will stress-test the build pipeline
- Benchmark with `mga` before attempting all 13K

### Content Directory Naming: Use existing short names (`mga`, `atg`, `htk`, etc.)
- Already established in current project
- Short names work well as collection names and URL slugs
- No reason to change what works

### Collection Schema: Use `page` type with shared schema helper function
- `page` type is required for `<ContentRenderer>` (body rendering)
- Define a `novelCollection()` helper that takes directory name
- Schema: `title` (string), `pubDate` (date), `tags` (string[])
- Add `order` (number, optional) for explicit chapter ordering

### Netlify Deploy: Use `netlify deploy --prod --dir=.output/public --no-build`
- Matches existing `--no-build` pattern
- Only change: `dist` -> `.output/public`
- Keep existing Netlify site ID and auth

### Build Optimization: Start simple, optimize later
- Phase 1: Full rebuild, selective prerendering (only index pages)
- Measure build time with 1 novel, then all 13K chapters
- `NODE_OPTIONS=--max-old-space-size=8192` from day one
- Increase `nitro.prerender.concurrency` only if safe

## Sources

### Primary (HIGH confidence)
- Nuxt 4 official docs: https://nuxt.com/docs/4.x/getting-started/installation -- installation, directory structure
- Nuxt 4 prerendering: https://nuxt.com/docs/4.x/getting-started/prerendering -- selective prerender, hooks, crawl control
- Nuxt 4 rendering modes: https://nuxt.com/docs/4.x/guide/concepts/rendering -- hybrid rendering, SPA fallback, route rules
- Nuxt Content v3 collections: https://content.nuxt.com/docs/collections/define -- defineCollection, source patterns, schema
- Nuxt Content v3 types: https://content.nuxt.com/docs/collections/types -- page vs data, body field, auto-generated fields
- Nuxt Content v3 query: https://content.nuxt.com/docs/utils/query-collection -- queryCollection API, select, where, order
- Nuxt Content v3 config: https://content.nuxt.com/docs/getting-started/configuration -- SQLite connectors, experimental options
- Nuxt Content v3 database: https://content.nuxt.com/docs/advanced/database -- dump generation, client-side WASM, restore
- Nuxt Content v3 static: https://content.nuxt.com/docs/deploy/static -- static site generation, WASM SQLite
- Nuxt Content v3 migration: https://content.nuxt.com/docs/getting-started/migration -- v2 to v3 changes
- Nuxt UI installation: https://ui.nuxt.com/docs/getting-started/installation/nuxt -- setup, dependencies
- Nuxt deploy Netlify: https://nuxt.com/deploy/netlify -- zero-config, setup
- Nuxt Content v3 sources: https://content.nuxt.com/docs/collections/sources -- source config, cwd, include/exclude

### Secondary (MEDIUM confidence)
- Nuxt Content v3 DeepWiki analysis: https://deepwiki.com/nuxt/content/2.1-collection-types -- page vs data internal differences, SQLite storage
- Nuxt Content SQLite issues: https://github.com/nuxt/content/issues/3233 -- migration challenges, WAL mode, size limits
- Nuxt 4 upgrade guide: https://nuxt.com/docs/4.x/getting-started/upgrade -- directory structure migration
- Nuxt 4 announcement: https://nuxt.com/blog/v4 -- release date, version info
- Nitro config: https://nitro.build/config -- prerender concurrency, options

### Tertiary (LOW confidence)
- Nuxt SPA fallback discussion: https://github.com/nuxt/nuxt/discussions/24583 -- 200.html behavior for non-prerendered routes
- Nuxt Content body stripping feasibility -- unverified, needs testing during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm and official docs
- Architecture: HIGH -- collection system, query API, prerendering all documented
- SQLite dump strategy: MEDIUM -- core approach is sound but body stripping mechanics need validation during implementation
- Pitfalls: HIGH -- sourced from official docs, GitHub issues, and verified constraints

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable ecosystem, 30-day validity)
