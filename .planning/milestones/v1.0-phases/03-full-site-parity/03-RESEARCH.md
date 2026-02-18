# Phase 3: Full Site Parity - Research

**Researched:** 2026-02-18
**Domain:** Nuxt pages, Nuxt Content v3 multi-collection querying, RSS feed generation, sitemap generation, localStorage-based resume reading
**Confidence:** HIGH

## Summary

This phase completes the Nuxt site to match the Astro site's home page, catalog, resume reading dropdown, RSS feeds, and sitemap. The existing codebase from Phases 1-2 provides a solid foundation: Nuxt Content v3 collections for all 10 novels, a chapter reader with navigation, reading progress saved to localStorage, and a basic layout with auto-hide header.

The main technical challenges are: (1) querying across multiple Nuxt Content collections since there is no cross-collection query API -- each of the 10 novel collections must be queried individually and results merged client-side, (2) generating RSS XML in Nitro server routes using the `feed` npm package with `queryCollection(event, collection)` server-side API, and (3) integrating `@nuxtjs/sitemap` with per-novel sitemaps covering ~13K URLs total.

**Primary recommendation:** Use existing stack (Nuxt Content v3 + Nuxt UI) for pages and resume reading. Add `feed` (npm) for RSS generation via Nitro server routes. Add `@nuxtjs/sitemap` for multi-sitemap generation. No other dependencies needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Home page layout**: One section per novel, heading + latest chapters underneath. 3-5 recent chapters per novel. Each entry shows chapter number + title. Sections ordered by most recently updated first.
- **Catalog presentation**: Simple vertical list of novels (not a card grid). Each entry shows novel name + chapter count. Sorted alphabetically. Links directly to novel detail page (/novels/{novel}).
- **Resume reading UX**: Two places: dropdown in header/navbar + dedicated section on home page. Each entry shows novel name + last chapter read (e.g. "Martial Peak -- Chapter 2847"). Header dropdown shows all novels with reading progress (max 10). Empty state: "Start reading to track progress" message. Data source: localStorage.
- **RSS feeds**: Both global feed and per-novel feeds. Global: last 50 chapters, link only. Per-novel: last 50 chapters, full chapter content. Standard RSS/XML format.
- **Sitemap**: Split into multiple sitemaps (sitemap index + per-novel sitemaps). Covers catalog, novel detail, and chapter pages.

### Claude's Discretion
- Exact visual styling and spacing for all pages
- Home page section component design
- RSS feed metadata fields beyond title/link/content
- Sitemap priority and changefreq values
- Loading/error states for all pages

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CATL-01 | User can view home page with latest chapters grouped by novel | Multi-collection querying pattern (query each collection, merge, sort by pubDate). Novel names map. Home page component design. |
| CATL-02 | User can view novel catalog showing all available novels with chapter counts | queryCollection `.count()` API for each collection. Alphabetical sorting. Catalog page at /novels route. |
| PROG-02 | User can resume reading from multi-novel dropdown showing last-read chapter per novel | Extend useReadingProgress composable with `getAll()`. UDropdownMenu component from Nuxt UI. Two placement points (header + home page). |
| DISC-01 | Site generates RSS feed for new chapters | `feed` npm package + Nitro server routes at `/rss.xml` and `/novels/{novel}/rss.xml`. Prerender via routeRules. queryCollection server-side API. |
| DISC-02 | Site generates sitemap for search engine indexing | `@nuxtjs/sitemap` module v7.x. Multi-sitemap with per-novel sitemaps via `sitemaps` config. Content URL discovery via sources/urls API. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt | 4.3.1 | Framework | Already installed |
| @nuxt/content | latest (v3) | Content querying | Already installed, provides queryCollection |
| @nuxt/ui | latest (v4.4.0) | UI components | Already installed, provides UDropdownMenu |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| feed | 5.2.0 | RSS/Atom/JSON feed generation | Server routes for RSS XML generation |
| @nuxtjs/sitemap | 7.6.0 | Sitemap generation | Multi-sitemap with sitemap index |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `feed` npm | Hand-rolled XML string | `feed` handles escaping, RFC compliance, multiple formats; hand-rolled risks malformed XML |
| `@nuxtjs/sitemap` | Hand-rolled sitemap XML | Module handles chunking, sitemap index, XSL stylesheet, robots.txt integration automatically |
| `nuxt-feedme` | `feed` + server route | nuxt-feedme has 25 stars, low adoption; `feed` is battle-tested with 200+ dependents |

**Installation:**
```bash
pnpm add feed @nuxtjs/sitemap
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── pages/
│   ├── index.vue              # Home page (REWRITE from Phase 1 stub)
│   ├── novels/
│   │   ├── index.vue          # NEW: Catalog page
│   │   ├── [novel]/
│   │   │   ├── index.vue      # Existing: Novel detail/chapter list
│   │   │   └── [...slug].vue  # Existing: Chapter reader
├── composables/
│   ├── useReadingProgress.ts  # EXTEND with getAll()
│   ├── useChapterNav.ts       # Existing
│   ├── useAutoHideHeader.ts   # Existing
│   └── useNovelMeta.ts        # NEW: Novel names, slugs, metadata
├── layouts/
│   └── default.vue            # MODIFY: Add nav links + resume dropdown
├── components/                # NEW directory
│   ├── ResumeDropdown.vue     # Resume reading dropdown component
│   └── HomeNovelSection.vue   # Home page per-novel section component
server/
├── routes/
│   ├── rss.xml.ts             # Global RSS feed
│   └── novels/
│       └── [novel]/
│           └── rss.xml.ts     # Per-novel RSS feed
```

### Pattern 1: Multi-Collection Aggregation (Home Page)
**What:** Query all 10 novel collections individually, merge results, sort by recency.
**When to use:** Any page that needs data from multiple novel collections.
**Example:**
```typescript
// Source: Nuxt Content v3 queryCollection API docs
const NOVELS = ['mga', 'atg', 'overgeared', 'tmw', 'htk', 'issth', 'cd', 'lrg', 'mw', 'rtw']

// Query each collection for latest chapters
const novelSections = await Promise.all(
  NOVELS.map(async (novel) => {
    const chapters = await queryCollection(novel as any)
      .select('title', 'path', 'stem', 'pubDate')
      .order('pubDate', 'DESC')
      .limit(3)
      .all()
    return { novel, chapters }
  })
)

// Filter out empty collections and sort by most recent chapter
const sorted = novelSections
  .filter(s => s.chapters.length > 0)
  .sort((a, b) => {
    const aDate = a.chapters[0]?.pubDate ?? 0
    const bDate = b.chapters[0]?.pubDate ?? 0
    return new Date(bDate).valueOf() - new Date(aDate).valueOf()
  })
```

### Pattern 2: Server-Side queryCollection for RSS
**What:** Use `queryCollection(event, collection)` in Nitro server routes.
**When to use:** Server routes that need content data (RSS, API endpoints).
**Example:**
```typescript
// server/routes/rss.xml.ts
// Source: Nuxt Content v3 docs - queryCollection server-side
import { Feed } from 'feed'

export default defineEventHandler(async (event) => {
  const feed = new Feed({
    id: 'schaden-novels',
    title: 'Schaden Novels',
    description: 'Latest novel chapters',
    link: 'https://your-site.netlify.app',
    copyright: '2024-present Schaden Novels',
  })

  const NOVELS = ['mga', 'lrg', /* ... */]
  const allChapters = []

  for (const novel of NOVELS) {
    const chapters = await queryCollection(event, novel as any)
      .select('title', 'path', 'pubDate')
      .order('pubDate', 'DESC')
      .limit(50)
      .all()
    allChapters.push(...chapters.map(ch => ({ ...ch, novel })))
  }

  // Sort all and take top 50
  allChapters.sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf())

  for (const ch of allChapters.slice(0, 50)) {
    feed.addItem({
      title: ch.title,
      link: `https://your-site.netlify.app/novels${ch.path}`,
      date: new Date(ch.pubDate),
    })
  }

  setResponseHeader(event, 'Content-Type', 'application/xml')
  return feed.rss2()
})
```

### Pattern 3: Nuxt UI DropdownMenu for Resume Reading
**What:** Use UDropdownMenu with dynamically built items from localStorage.
**When to use:** The resume reading dropdown in the header.
**Example:**
```typescript
// Source: Nuxt UI v4 DropdownMenu docs
import type { DropdownMenuItem } from '@nuxt/ui'

const { getAll } = useReadingProgress()
const items = computed<DropdownMenuItem[]>(() => {
  const progress = getAll() // { novel: routePath, ... }
  if (Object.keys(progress).length === 0) {
    return [{ label: 'Start reading to track progress', type: 'label' }]
  }
  return Object.entries(progress).map(([novel, path]) => ({
    label: `${NOVEL_NAMES[novel]} — ${extractChapterLabel(path)}`,
    to: path,
    icon: 'i-lucide-book-open',
  }))
})
```

### Pattern 4: @nuxtjs/sitemap Multi-Sitemap Configuration
**What:** Use sitemap module with per-novel sitemaps via include/exclude.
**When to use:** Sitemap index covering all ~13K URLs split by novel.
**Example:**
```typescript
// nuxt.config.ts
// Source: nuxtseo.com/docs/sitemap/guides/multi-sitemaps
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap'],
  site: {
    url: 'https://your-site.netlify.app',
  },
  sitemap: {
    sitemaps: {
      pages: {
        include: ['/', '/novels', '/novels/*'],
        exclude: ['/novels/*/*'],
      },
      mga: { include: ['/novels/mga/**'] },
      lrg: { include: ['/novels/lrg/**'] },
      // ... one per novel
    },
    sitemapsPathPrefix: '/',
  },
})
```

### Anti-Patterns to Avoid
- **Cross-collection querying:** Nuxt Content v3 has NO cross-collection query API. Never try `queryCollection('*')`. Always query each collection individually and merge.
- **Fetching all 13K chapters at once:** The home page only needs 3-5 per novel. Always use `.limit()` and `.select()` to minimize data transfer.
- **Blocking on empty collections:** 8 of 10 novels currently have 0 chapters. Always handle empty results gracefully -- don't error, just skip/hide.
- **Using `serverQueryContent`:** This is the v2 API. Nuxt Content v3 uses `queryCollection(event, collection)` on the server side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS XML generation | Template literal XML strings | `feed` npm package (v5.2.0) | Handles XML escaping, date formatting, RFC 2822 compliance, multiple output formats |
| Sitemap generation | Manual XML sitemap files | `@nuxtjs/sitemap` (v7.6.0) | Handles chunking, sitemap index, XSL stylesheets, robots.txt, auto-discovery of routes |
| Dropdown menu UI | Custom dropdown with click-outside, keyboard nav, focus trap | `UDropdownMenu` from Nuxt UI | Accessible, keyboard-navigable, styled, tested |
| Chapter number extraction from path | Regex parsing of paths | `path.split('/').pop()` or extract from slug | Simple string operation, but don't over-engineer |

**Key insight:** RSS and sitemap have strict spec requirements (XML escaping, proper date formats, namespace declarations). Libraries handle these edge cases; hand-rolled solutions will have subtle bugs that break feed readers and search engine crawlers.

## Common Pitfalls

### Pitfall 1: Empty Collections Break Queries
**What goes wrong:** `queryCollection('atg').all()` returns `[]` but code assumes non-empty array, causing `.sort()` or `.slice()` on undefined.
**Why it happens:** Only 2 of 10 novels (mga: 2335, lrg: 84) have content. The other 8 are defined in content.config.ts but have 0 chapters in the content directory.
**How to avoid:** Always filter out novels with 0 chapters before rendering. Use `.filter(s => s.chapters.length > 0)` on aggregated results.
**Warning signs:** Empty sections on home page, broken "View All" links, RSS feeds with 0 items.

### Pitfall 2: localStorage Key Mismatch Between Astro and Nuxt
**What goes wrong:** Astro site uses `savedChapters` key with `{ [novel]: { chapterId, timestamp } }` structure. Nuxt site (Phase 2) uses `schaden-reading-progress` key with `{ [novel]: routePath }` structure.
**Why it happens:** Phase 2 designed a new format without considering backward compatibility with the Astro site's data.
**How to avoid:** The Nuxt site uses its own key (`schaden-reading-progress`). Since the Phase 2 composable already stores route paths (e.g., `/novels/mga/123`), use the new format exclusively. Users who switch from Astro will lose their progress -- this is acceptable since it's a fresh migration.
**Warning signs:** Resume reading dropdown shows stale/incorrect data from old format.

### Pitfall 3: RSS Server Routes Not Prerendered
**What goes wrong:** RSS feed URLs return 404 on the static Netlify deploy because server routes aren't prerendered by default.
**Why it happens:** `nuxt generate` only prerenders pages and explicitly listed routes. Server routes need to be added to `nitro.prerender.routes` or use `routeRules`.
**How to avoid:** Add all RSS feed routes to `nitro.prerender.routes`: `['/rss.xml', '/novels/mga/rss.xml', '/novels/lrg/rss.xml']`. Only prerender feeds for novels that have content.
**Warning signs:** RSS feeds work in dev but 404 in production.

### Pitfall 4: Sitemap Module Conflicts with Static Generation
**What goes wrong:** `@nuxtjs/sitemap` may not discover dynamic content routes during `nuxt generate` if content is only available at runtime.
**Why it happens:** Sitemap module discovers URLs from app sources (pages, prerender config). Dynamic chapter routes aren't filesystem pages -- they're generated from content.
**How to avoid:** Use the `urls` config function or a `sources` API endpoint that reads from the content database at build time to supply all chapter URLs. Or rely on the existing `prerender:routes` hook which already adds chapter routes -- the sitemap module should discover those.
**Warning signs:** Sitemap has only a few pages instead of thousands.

### Pitfall 5: Querying All Chapters for RSS Full Content
**What goes wrong:** Per-novel RSS feeds need "full chapter content included" but Nuxt Content v3 stores body as AST, not HTML. Getting HTML requires converting the AST.
**Why it happens:** Nuxt Content v3 uses a parsed AST (`body`) field, not raw HTML. The `<ContentRenderer>` component renders it in Vue, but server routes don't have Vue rendering.
**How to avoid:** For the global feed (link-only), just use title/path/pubDate. For per-novel feeds (full content), either: (a) read the raw markdown files directly from filesystem during prerender, or (b) use the `rawbody` field if available, or (c) convert the body AST to HTML using `hast-util-to-html` with AST patching. Option (a) is simplest for a static site.
**Warning signs:** RSS `<content:encoded>` is empty or contains `[object Object]`.

### Pitfall 6: N+1 Query Pattern on Home Page
**What goes wrong:** Querying 10 collections sequentially on every home page load is slow.
**Why it happens:** No cross-collection query in Nuxt Content v3. Each collection is a separate SQL table.
**How to avoid:** Use `Promise.all()` to parallelize queries. Use `.select()` to fetch only needed fields. Use `.limit(3)` to minimize result size. The home page is prerendered, so query cost is paid at build time only.
**Warning signs:** Slow dev page loads, timeout during build.

## Code Examples

### Novel Metadata Utility
```typescript
// app/composables/useNovelMeta.ts
// Central source of truth for novel names and slugs
export const NOVEL_NAMES: Record<string, string> = {
  mga: 'Martial God Asura',
  atg: 'Against the Gods',
  overgeared: 'Overgeared',
  tmw: 'True Martial World',
  htk: 'Hail the King',
  issth: 'I Shall Seal the Heavens',
  cd: 'Coiling Dragon',
  lrg: 'LRG',
  mw: 'Martial World',
  rtw: 'Release That Witch',
}

export const NOVEL_SLUGS = Object.keys(NOVEL_NAMES) as Array<keyof typeof NOVEL_NAMES>

export function getNovelName(slug: string): string {
  return NOVEL_NAMES[slug] || slug.toUpperCase()
}
```

### Extended useReadingProgress Composable
```typescript
// app/composables/useReadingProgress.ts (extended)
const STORAGE_KEY = 'schaden-reading-progress'

export function useReadingProgress() {
  function save(novel: string, chapterPath: string) {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const data = raw ? JSON.parse(raw) : {}
      data[novel] = chapterPath
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* silently fail */ }
  }

  function get(novel: string): string | null {
    if (!import.meta.client) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const data = raw ? JSON.parse(raw) : {}
      return data[novel] || null
    } catch { return null }
  }

  // NEW: Get all reading progress entries
  function getAll(): Record<string, string> {
    if (!import.meta.client) return {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  return { save, get, getAll }
}
```

### Catalog Page with Chapter Counts
```typescript
// app/pages/novels/index.vue
// Uses queryCollection .count() for each collection
const NOVELS = ['mga', 'atg', 'overgeared', 'tmw', 'htk', 'issth', 'cd', 'lrg', 'mw', 'rtw']

const { data: novelStats } = await useAsyncData('catalog', async () => {
  const results = await Promise.all(
    NOVELS.map(async (slug) => {
      const count = await queryCollection(slug as any).count()
      return { slug, count }
    })
  )
  return results
    .filter(n => n.count > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug))
})
```

### Per-Novel RSS Feed Server Route
```typescript
// server/routes/novels/[novel]/rss.xml.ts
import { Feed } from 'feed'

export default defineEventHandler(async (event) => {
  const novel = getRouterParam(event, 'novel')
  if (!novel) throw createError({ statusCode: 400, message: 'Novel required' })

  const siteUrl = 'https://your-site.netlify.app'
  const feed = new Feed({
    id: `${novel}-feed`,
    title: `${novel.toUpperCase()} - Schaden Novels`,
    description: `Latest chapters of ${novel}`,
    link: `${siteUrl}/novels/${novel}`,
    copyright: '2024-present Schaden Novels',
  })

  const chapters = await queryCollection(event, novel as any)
    .select('title', 'path', 'pubDate')
    .order('pubDate', 'DESC')
    .limit(50)
    .all()

  // For full content: read raw markdown from filesystem
  for (const ch of chapters) {
    feed.addItem({
      title: ch.title,
      link: `${siteUrl}/novels${ch.path}`,
      date: new Date(ch.pubDate),
      // content: rawMarkdown  // For per-novel feeds with full content
    })
  }

  setResponseHeader(event, 'Content-Type', 'application/xml')
  return feed.rss2()
})
```

### Prerendering RSS and Sitemap Routes
```typescript
// In nuxt.config.ts nitro.prerender.routes addition
nitro: {
  prerender: {
    routes: [
      '/', '/200.html', '/404.html',
      '/rss.xml',
      '/novels/mga/rss.xml',
      '/novels/lrg/rss.xml',
      // Only prerender feeds for novels that have content
    ],
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serverQueryContent(event)` (Content v2) | `queryCollection(event, collection)` (Content v3) | Content v3 release (2025) | Server routes must use new API |
| Single collection for all content | Per-collection definitions in content.config.ts | Content v3 | No cross-collection queries; must query each individually |
| `@astrojs/rss` | `feed` npm + Nitro server routes | Framework migration | Different API; same RSS output |
| `savedChapters` localStorage key (Astro) | `schaden-reading-progress` key (Nuxt Phase 2) | Phase 2 implementation | Different data structure; no backward compat needed |

**Deprecated/outdated:**
- `serverQueryContent`: Nuxt Content v2 API. Use `queryCollection(event, collection)` in v3.
- `nuxt-content-body-html`: May not be compatible with Content v3's collection-based architecture. Need to verify if it works with `queryCollection`.

## Open Questions

1. **Per-novel RSS full content: how to get HTML from body AST?**
   - What we know: Nuxt Content v3 stores body as AST. `<ContentRenderer>` renders it in Vue but server routes don't have Vue.
   - What's unclear: Whether `nuxt-content-body-html` is compatible with Content v3 collections. Whether `rawbody` field exists in Content v3.
   - Recommendation: Start with link-only feeds for both global and per-novel. If full content is strictly needed, try reading raw `.md` files from filesystem during prerender (simplest approach for a static site), or experiment with `hast-util-to-html` on the body AST. Flag as enhancement if it blocks progress.

2. **Sitemap URL discovery for 13K chapter routes**
   - What we know: The `prerender:routes` hook already adds chapter routes. `@nuxtjs/sitemap` can discover URLs from prerender config and app sources.
   - What's unclear: Whether the sitemap module automatically picks up routes added via `prerender:routes` hook, or if explicit `urls`/`sources` config is needed.
   - Recommendation: Start with adding `@nuxtjs/sitemap` module and check if it auto-discovers prerendered routes. If not, use the `urls` async function to read content dirs and generate URLs at build time.

3. **Catalog page route: `/novels` vs `/novels/index`**
   - What we know: Currently `/novels/[novel]/index.vue` exists for novel detail pages. Need a new `/novels/index.vue` for the catalog.
   - What's unclear: Nothing -- Nuxt file-based routing supports this naturally with `app/pages/novels/index.vue`.
   - Recommendation: Create `app/pages/novels/index.vue` as the catalog page. No conflict with existing dynamic routes.

## Sources

### Primary (HIGH confidence)
- Nuxt Content v3 queryCollection API: https://content.nuxt.com/docs/utils/query-collection -- server-side usage with event, all query methods
- @nuxtjs/sitemap multi-sitemaps guide: https://nuxtseo.com/docs/sitemap/guides/multi-sitemaps -- chunking, manual sitemaps, config
- @nuxtjs/sitemap config API: https://nuxtseo.com/docs/sitemap/api/config -- urls, sources, exclude, site URL
- Nuxt UI DropdownMenu: https://ui.nuxt.com/docs/components/dropdown-menu -- items API, `to` for navigation, custom slots
- `feed` npm package: https://www.npmjs.com/package/feed -- v5.2.0, RSS/Atom/JSON generator

### Secondary (MEDIUM confidence)
- RSS feed generation pattern for Nuxt Content: https://www.marcal.dev/en/how-to-generate-an-rss-feed-for-your-nuxt-content-site -- verified pattern using `feed` + server routes + prerender
- Nuxt Content v3 migration guide: https://content.nuxt.com/docs/getting-started/migration -- queryCollection replaces queryContent
- Nuxt Content markdown docs: https://content.nuxt.com/docs/files/markdown -- body AST structure, frontmatter fields

### Tertiary (LOW confidence)
- `nuxt-content-body-html` for body HTML: https://github.com/dword-design/nuxt-content-body-html -- v3 compatibility unverified; may need alternative approach for full-content RSS

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs and npm
- Architecture: HIGH - Patterns verified against Nuxt Content v3 API docs and existing codebase
- Pitfalls: HIGH - Based on direct codebase analysis (empty collections, localStorage keys, prerender requirements)
- RSS full content: MEDIUM - Body-to-HTML conversion approach needs validation
- Sitemap URL discovery: MEDIUM - Auto-discovery behavior with prerender:routes hook needs testing

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable ecosystem, low churn)
