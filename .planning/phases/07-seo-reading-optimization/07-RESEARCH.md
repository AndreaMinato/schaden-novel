# Phase 7: SEO + Reading Optimization - Research

**Researched:** 2026-02-21
**Domain:** Sitemap generation, RSS verification, client-side body prefetching and caching
**Confidence:** HIGH

## Summary

Phase 7 covers four requirements across two domains: **SEO discoverability** (sitemaps, RSS) and **reading speed** (body prefetching, body caching). The SEO work is primarily about fixing the empty sitemap problem -- `asSitemapCollection` integration with `@nuxtjs/sitemap` v7.6.0 produces empty per-novel sitemaps because chapter routes are not prerendered (only ~25 shell pages are). RSS feeds are already functional and just need verification. The reading optimization is a new `useBodyCache` composable implementing an LRU Map with prefetch-next-chapter behavior, integrated into the existing split-fetch chapter page.

The project already has all required dependencies installed. No new packages are needed. The sitemap fix requires a server endpoint providing programmatic URL sources. The body cache is a pure client-side composable using JavaScript Map as an LRU store.

**Primary recommendation:** Replace `asSitemapCollection` with a `defineSitemapEventHandler` server endpoint that queries all content collections and returns chapter URLs tagged with `_sitemap` for per-novel routing. Build a standalone `useBodyCache` composable with LRU eviction, then integrate prefetch trigger into the chapter page after body load completes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Prefetch **next chapter only** (not previous, not multiple ahead)
- Trigger: start prefetch **after the current chapter's body fetch completes** (no bandwidth competition)
- Always prefetch regardless of connection type -- individual body files are small (~10-50KB)
- **In-memory Map** -- no sessionStorage, no persistence. Lost on page refresh.
- **Shared cache** for both prefetched and visited bodies -- single unified cache
- **Cap at 5 entries**, LRU eviction (least recently used evicted first)
- RSS: **Keep link-only** format (title + link, no body/excerpt) -- same as v1.0
- RSS: **Verify only** -- no code changes unless broken
- Sitemap: **Per-novel sitemaps** (current approach) -- one sitemap per novel + sitemap index
- Sitemap: **Include all pages** -- chapters AND non-chapter pages (home, catalog, novel listings)
- Sitemap: **No priority/changefreq hints** -- just URLs and lastmod

### Claude's Discretion
- Handling navigation-before-prefetch-completes edge case
- Sitemap implementation approach (fix asSitemapCollection vs alternative like programmatic URL sources)
- Any RSS feed adjustments if verification reveals issues

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEO-01 | Sitemaps generated at build time with explicit URL sources for all chapters | Programmatic `sources` endpoint via `defineSitemapEventHandler` replaces broken `asSitemapCollection`; queries all 10 content collections |
| SEO-02 | RSS feeds (global + per-novel) still functional in SPA mode | RSS feeds already prerendered and functional (confirmed in `.output/public/`); verify XML validity and link format |
| READ-03 | Adjacent chapter bodies (prev/next) are prefetched for instant navigation | `useBodyCache` composable with `prefetch(url)` method; triggered after current body completes via `watch` on `bodyStatus` |
| READ-04 | Visited chapter bodies are cached in memory to avoid re-fetching | LRU Map in `useBodyCache` with 5-entry cap; chapter page checks cache before `$fetch` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nuxtjs/sitemap | 7.6.0 | Sitemap generation (already installed) | Official Nuxt SEO module, supports multi-sitemap + programmatic sources |
| feed | 5.2.0 | RSS feed generation (already installed) | Used by existing RSS routes, no changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JavaScript Map | Native | LRU cache backing store | Body cache -- insertion-order preserved, O(1) get/set |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom LRU Map | lru-cache npm package | Overkill for 5-entry cache; native Map is sufficient |
| defineSitemapEventHandler | urls function in nuxt.config | Config-based urls would bloat nuxt.config; server endpoint is cleaner and can query SQLite |
| Fix asSitemapCollection | Programmatic sources | asSitemapCollection failure root cause unclear (likely related to SPA mode not prerendering chapter routes); programmatic sources is more reliable and explicit |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended File Structure
```
server/
  api/
    __sitemap__/
      urls.ts              # NEW: Sitemap URL source endpoint
app/
  composables/
    useBodyCache.ts        # NEW: LRU body cache + prefetch
    useChapterNav.ts       # EXISTING: prev/next navigation
  pages/
    novels/
      [novel]/
        [...slug].vue      # MODIFY: integrate cache + prefetch
```

### Pattern 1: Programmatic Sitemap Sources via Server Endpoint
**What:** A Nitro server route at `server/api/__sitemap__/urls.ts` that queries all 10 content collections and returns chapter URLs with `_sitemap` property for multi-sitemap routing.
**When to use:** When content routes are not prerendered (SPA mode) and the sitemap module has no application sources to discover.
**Why this works:** The existing RSS routes already query `queryCollection(event, novel)` successfully during prerender. The same pattern works for sitemap URL generation.

```typescript
// server/api/__sitemap__/urls.ts
import { defineSitemapEventHandler } from '#imports'

const NOVEL_SLUGS = ['mga', 'atg', 'overgeared', 'tmw', 'htk', 'issth', 'cd', 'lrg', 'mw', 'rtw']

export default defineSitemapEventHandler(async (event) => {
  const allUrls = await Promise.all(
    NOVEL_SLUGS.map(async (novel) => {
      try {
        const chapters = await queryCollection(event, novel as any)
          .select('path', 'pubDate')
          .all()
        return chapters.map(ch => ({
          loc: `/novels${ch.path}`,
          lastmod: ch.pubDate,
          _sitemap: novel,
        }))
      } catch {
        return []
      }
    })
  )
  return allUrls.flat()
})
```

nuxt.config.ts update:
```typescript
sitemap: {
  sources: ['/api/__sitemap__/urls'],  // ADD: global source
  sitemaps: {
    pages: {
      urls: ['/', '/novels', '/novels/mga', '/novels/atg', ...],  // Static pages
      // No sources needed -- pages are known at config time
    },
    mga: { include: ['/novels/mga/**'] },
    atg: { include: ['/novels/atg/**'] },
    // ... other novels keep include patterns for routing
  },
}
```

### Pattern 2: LRU Body Cache Composable
**What:** A module-level (singleton) Map-based LRU cache shared across all chapter page instances. The Map lives outside the composable function so it persists across navigations.
**When to use:** For caching fetched JSON body data in SPA chapter-to-chapter navigation.

```typescript
// app/composables/useBodyCache.ts
const MAX_ENTRIES = 5
const cache = new Map<string, any>()       // body data
const inflight = new Map<string, Promise<any>>()  // in-progress fetches

function touch(key: string, value: any) {
  cache.delete(key)   // Remove to re-insert at end (most recent)
  cache.set(key, value)
  // Evict LRU (first entry) if over capacity
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
}

export function useBodyCache() {
  function get(url: string): any | null {
    const value = cache.get(url)
    if (value !== undefined) {
      touch(url, value)  // Mark as recently used
      return value
    }
    return null
  }

  function set(url: string, data: any) {
    touch(url, data)
  }

  async function prefetch(url: string): Promise<void> {
    if (cache.has(url)) return          // Already cached
    if (inflight.has(url)) return       // Already fetching

    const promise = $fetch(url).then(data => {
      inflight.delete(url)
      touch(url, data)
      return data
    }).catch(() => {
      inflight.delete(url)
    })
    inflight.set(url, promise)
  }

  // For navigate-before-prefetch-completes edge case
  async function getOrFetch(url: string): Promise<any> {
    const cached = get(url)
    if (cached) return cached

    // Check if there's an in-flight prefetch we can await
    const pending = inflight.get(url)
    if (pending) return pending

    // Fresh fetch
    const data = await $fetch(url)
    set(url, data)
    return data
  }

  return { get, set, prefetch, getOrFetch }
}
```

### Pattern 3: Chapter Page Integration (Prefetch After Load)
**What:** Modify `[...slug].vue` to check cache before fetching body, store result in cache, and prefetch next chapter after body loads.
**When to use:** In the existing split-fetch chapter page.

```typescript
// In [...slug].vue <script setup>
const bodyCache = useBodyCache()

const { data: bodyData, status: bodyStatus } = useAsyncData(
  () => `body-${novel.value}-${slug.value}`,
  async () => {
    const url = `/content/novels/${novel.value}/${slug.value}.json`
    return bodyCache.getOrFetch(url)  // Check cache, await in-flight, or fresh fetch
  },
  { watch: [novel, slug] }
)

// Prefetch next chapter after current body loads
watch(bodyStatus, (status) => {
  if (status === 'success' && next.value) {
    const nextSlug = next.value.path.split('/').slice(2).join('/')
    const nextUrl = `/content/novels/${novel.value}/${nextSlug}.json`
    bodyCache.prefetch(nextUrl)
  }
})
```

### Anti-Patterns to Avoid
- **Double Map for prefetch and visited**: User explicitly wants a single unified cache. Do NOT create separate stores.
- **sessionStorage/localStorage for bodies**: User explicitly chose in-memory only. Do NOT persist.
- **Prefetching multiple chapters ahead**: User explicitly chose next-only. Do NOT prefetch prev or N+2.
- **Awaiting body fetch on page load**: Body fetch must NOT block rendering -- skeleton must show (established in Phase 6).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap XML generation | Custom XML builder | @nuxtjs/sitemap (already installed) | Handles XML escaping, sitemap index, XSL stylesheet, prerender integration |
| RSS feed generation | Custom XML templates | feed package (already installed) | Already working in existing routes |
| Sitemap URL discovery | Custom build-time script | defineSitemapEventHandler + queryCollection | Runs during prerender, has access to content SQLite, integrates with sitemap module |

**Key insight:** The sitemap module already handles multi-sitemap indexing, XSL stylesheets, and prerender route registration. The only missing piece is a URL source, which is a single server endpoint.

## Common Pitfalls

### Pitfall 1: asSitemapCollection Produces Empty Sitemaps in SPA Mode
**What goes wrong:** `asSitemapCollection` wraps content collections but the sitemap module relies on prerendered routes as application sources. With `crawlLinks: false` and only ~25 shell pages prerendered, there are zero chapter routes for the sitemap to discover.
**Why it happens:** The sitemap module's content integration expects routes to be discoverable through prerendering or Nuxt's route generation. In SPA mode with selective prerendering, this pipeline is empty.
**How to avoid:** Use explicit `sources` with a `defineSitemapEventHandler` endpoint. Remove `asSitemapCollection` from content.config.ts since it adds no value when using programmatic sources.
**Warning signs:** Empty `<urlset>` in per-novel sitemap XML files.

### Pitfall 2: Module Load Order for Sitemap + Content
**What goes wrong:** If `@nuxt/content` loads before `@nuxtjs/sitemap`, the sitemap module cannot hook into content's collection pipeline.
**Why it happens:** Nuxt modules load in the order specified in the `modules` array.
**How to avoid:** Keep `@nuxtjs/sitemap` BEFORE `@nuxt/content` in `nuxt.config.ts` modules array. Current config already has this correct: `['@nuxtjs/sitemap', '@nuxt/content', '@nuxt/ui']`.
**Warning signs:** Content routes not appearing in sitemaps even with correct source configuration.

### Pitfall 3: Cache Key Mismatch Between Fetch and Prefetch
**What goes wrong:** If the cache key used during prefetch differs from the key used during the actual page fetch (e.g., trailing slash, different encoding), the prefetched data is never found.
**Why it happens:** URL construction happens in two different places (prefetch trigger and page fetch).
**How to avoid:** Use the same URL construction function for both. Extract URL building to a shared helper: `const bodyUrl = (novel: string, slug: string) => \`/content/novels/${novel}/${slug}.json\``.
**Warning signs:** Network tab shows body being fetched twice despite prefetch appearing to work.

### Pitfall 4: Prefetch Triggering Before Next Chapter Data Available
**What goes wrong:** The `watch(bodyStatus)` fires when body loads, but `next` computed may not have a value yet if the nav chapter list hasn't loaded.
**Why it happens:** `useChapterNav` fetches the chapter list asynchronously via `useAsyncData`. If the body loads before the nav list resolves, `next.value` is null.
**How to avoid:** Guard the prefetch trigger: only prefetch when both `bodyStatus === 'success'` AND `next.value` is truthy. Use `watchEffect` or a combined `watch([bodyStatus, next], ...)` to handle timing.
**Warning signs:** Prefetch never fires despite body loading successfully.

### Pitfall 5: LRU Eviction of Current Chapter
**What goes wrong:** With 5-entry cap, navigating through many chapters could evict the current chapter from cache.
**Why it happens:** If user navigates forward 5+ times, the current chapter is 5 entries back and gets evicted.
**How to avoid:** This is actually fine -- the current chapter body is already in the `bodyData` reactive ref. The cache is for avoiding re-fetches, not for holding the current display. No action needed.

## Code Examples

### Sitemap Source Endpoint (Verified Pattern from RSS Routes)
```typescript
// server/api/__sitemap__/urls.ts
// Pattern matches existing RSS routes which successfully query collections during prerender
import { defineSitemapEventHandler } from '#imports'

const NOVEL_SLUGS = ['mga', 'atg', 'overgeared', 'tmw', 'htk', 'issth', 'cd', 'lrg', 'mw', 'rtw']

export default defineSitemapEventHandler(async (event) => {
  const allUrls = await Promise.all(
    NOVEL_SLUGS.map(async (novel) => {
      try {
        const chapters = await queryCollection(event, novel as any)
          .select('path', 'pubDate')
          .all()
        return chapters.map(ch => ({
          loc: `/novels${ch.path}`,
          lastmod: ch.pubDate,
          _sitemap: novel,
        }))
      } catch {
        return []
      }
    })
  )
  return allUrls.flat()
})
```

### LRU Map Cache (Native JavaScript, No Dependencies)
```typescript
// app/composables/useBodyCache.ts
// Module-level state survives across SPA navigations but is lost on page refresh
const MAX_ENTRIES = 5
const cache = new Map<string, any>()
const inflight = new Map<string, Promise<any>>()

function touch(key: string, value: any) {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
}

export function useBodyCache() {
  function get(url: string): any | null {
    const val = cache.get(url)
    if (val !== undefined) {
      touch(url, val)
      return val
    }
    return null
  }

  function set(url: string, data: any) {
    touch(url, data)
  }

  async function prefetch(url: string): Promise<void> {
    if (cache.has(url) || inflight.has(url)) return
    const p = $fetch(url)
      .then(data => { inflight.delete(url); touch(url, data); return data })
      .catch(() => { inflight.delete(url) })
    inflight.set(url, p)
  }

  async function getOrFetch(url: string): Promise<any> {
    const cached = get(url)
    if (cached) return cached
    const pending = inflight.get(url)
    if (pending) return pending
    const data = await $fetch(url)
    set(url, data)
    return data
  }

  return { get, set, prefetch, getOrFetch }
}
```

### Body URL Helper (Shared Between Fetch and Prefetch)
```typescript
// Ensures cache key consistency
function bodyUrl(novel: string, chapterPath: string): string {
  // chapterPath is like /mga/123, strip the novel prefix to get slug
  const slug = chapterPath.split('/').slice(2).join('/')
  return `/content/novels/${novel}/${slug}.json`
}
```

### nuxt.config.ts Sitemap Update
```typescript
sitemap: {
  sources: ['/api/__sitemap__/urls'],
  sitemaps: {
    pages: {
      urls: [
        '/', '/novels',
        '/novels/mga', '/novels/atg', '/novels/overgeared', '/novels/tmw',
        '/novels/htk', '/novels/issth', '/novels/cd', '/novels/lrg',
        '/novels/mw', '/novels/rtw',
      ],
      exclude: ['/novels/*/*'],
    },
    mga: { include: ['/novels/mga/**'] },
    atg: { include: ['/novels/atg/**'] },
    overgeared: { include: ['/novels/overgeared/**'] },
    tmw: { include: ['/novels/tmw/**'] },
    htk: { include: ['/novels/htk/**'] },
    issth: { include: ['/novels/issth/**'] },
    cd: { include: ['/novels/cd/**'] },
    lrg: { include: ['/novels/lrg/**'] },
    mw: { include: ['/novels/mw/**'] },
    rtw: { include: ['/novels/rtw/**'] },
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| asSitemapCollection for content | Programmatic sources via defineSitemapEventHandler | @nuxtjs/sitemap v7+ | Required when chapter routes are not prerendered |
| Single sitemap file | Multi-sitemap with index | @nuxtjs/sitemap v3+ | Essential for 13K+ URLs (sitemap 50K URL limit per file) |
| swrv/vue-query for caching | Native Map LRU | N/A | 5-entry cache is trivial; libraries add unnecessary overhead |

**Deprecated/outdated:**
- `asSitemapCollection` in content.config.ts: Not deprecated generally, but ineffective for this project because chapter routes are not prerendered. Should be removed in favor of programmatic sources.

## Open Questions

1. **Sitemap prerender route registration**
   - What we know: @nuxtjs/sitemap auto-registers sitemap routes for prerender (confirmed by existing `.output/public/__sitemap__/` files). The `sources` endpoint will be called during this prerender.
   - What's unclear: Whether the `/api/__sitemap__/urls` endpoint itself needs to be in the prerender routes list, or if the sitemap module handles this automatically.
   - Recommendation: Test without adding it to prerender routes first. If sitemaps are still empty, add it. LOW risk -- the module should handle this.

2. **Content path format from queryCollection**
   - What we know: `queryCollection.select('path')` returns paths like `/mga/123` (without `/novels` prefix, based on content directory structure).
   - What's unclear: Exact path format -- the RSS routes use `ch.path` and prepend `/novels` manually.
   - Recommendation: Follow the RSS pattern: `loc: \`/novels${ch.path}\``. Confirmed working pattern.

3. **Sitemap size with 13K+ URLs**
   - What we know: 13,318 chapters across 10 novels. Largest novel (mga) has 2,335 chapters. Sitemap protocol allows max 50,000 URLs per file.
   - What's unclear: Whether per-novel sitemaps with 2K+ entries cause any performance issues during prerender.
   - Recommendation: No chunking needed -- the largest novel (2,335 URLs) is well under the 50K limit. Monitor prerender time.

## Sources

### Primary (HIGH confidence)
- **Existing codebase**: nuxt.config.ts, content.config.ts, server/routes/rss.xml.ts, app/pages/novels/[novel]/[...slug].vue, app/composables/useChapterNav.ts -- direct inspection
- **Build output**: `.output/public/` -- confirmed empty sitemaps, working RSS feeds
- **nuxtseo.com/docs/sitemap/getting-started/data-sources** -- programmatic sources documentation
- **nuxtseo.com/docs/sitemap/guides/dynamic-urls** -- defineSitemapEventHandler and _sitemap routing
- **nuxtseo.com/docs/sitemap/guides/content** -- asSitemapCollection integration (and its limitations)
- **nuxtseo.com/docs/sitemap/api/config** -- multi-sitemap config with per-sitemap sources/urls/include

### Secondary (MEDIUM confidence)
- **JavaScript Map insertion-order guarantee** -- ECMAScript spec, well-established pattern for simple LRU
- **Module load order requirement** (sitemap before content) -- nuxtseo.com docs + community discussions

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed, patterns verified against existing RSS routes
- Architecture: HIGH -- sitemap endpoint follows proven RSS route pattern; LRU cache is straightforward native JS
- Pitfalls: HIGH -- empty sitemap root cause identified by examining actual build output; cache key mismatch is a known pattern

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain, no fast-moving dependencies)
