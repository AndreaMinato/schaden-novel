# Feature Research: SSR Migration

**Domain:** SSR migration for 13K-chapter novel reading site (Nuxt 4.3.1 + Nuxt Content v3, Netlify)
**Researched:** 2026-02-18
**Confidence:** MEDIUM -- SSR/ISR behavior on Netlify verified via official docs and Netlify developer guides. Nuxt Content v3 body/rawbody behavior in SSR verified via official docs. Cold start performance for 13K-chapter database is LOW confidence (no benchmarks found at this scale).

---

## Context: SSR vs Current SSG

The site currently uses `nuxt generate` (full SSG) producing 26,694 prerendered HTML files. The SQL database dump is body-stripped post-build from 64MB to 2.6MB. RSS feeds are link-only because `rawbody` was not available during the v1.0 SSG build.

SSR moves rendering from build-time to request-time. Every page request hits a Netlify serverless function that runs Nuxt, which queries the Nuxt Content SQLite database, renders the Vue component to HTML, and returns it. The critical implication: **body content is available at render time**, and **route rules allow mixing SSR, ISR, and prerender per route**.

---

## Feature Landscape

### Table Stakes (Migration Must Not Break These)

Existing features that must continue working identically after SSR migration. These are non-negotiable.

| Feature | SSR Impact | Complexity | Notes |
|---------|------------|------------|-------|
| Home page (latest chapters by novel) | LOW -- `useAsyncData` + `queryCollection` works identically in SSR. Data fetched server-side on request instead of at build. | LOW | No code changes needed. Already uses `useAsyncData`. Will render on every request unless cached via routeRules. |
| Novel catalog page (chapter counts) | LOW -- Same pattern. `queryCollection().count()` runs server-side per request. | LOW | No code changes needed. Consider ISR caching since counts change infrequently. |
| Novel detail page (chapter listing) | LOW -- `queryCollection().select().all()` works in SSR. Natural sort in `computed()` runs on server. | LOW | No code changes. 1300+ items sorted server-side per request -- fast given SQLite, but should be cached. |
| Chapter reader (prose rendering) | MEDIUM -- `queryCollection().path().first()` returns full body AST. `ContentRenderer` renders it server-side. **Body content is no longer stripped.** | MEDIUM | The body-stripping post-build hack is no longer needed or possible. The full 64MB database must be available at runtime. This is the single biggest change. |
| Prev/next chapter navigation | LOW -- `useChapterNav` composable fetches full chapter list via `useAsyncData`. Works identically. | LOW | No code changes. Consider caching the chapter list query or restructuring to avoid fetching all chapters per request. |
| Keyboard shortcuts (Cmd+Arrow) | NONE -- Client-only via `defineShortcuts`. No SSR involvement. | NONE | Zero changes needed. |
| Reading progress (localStorage) | NONE -- Already client-only with `import.meta.client` guards and `ClientOnly` wrapper. | NONE | Zero changes needed. |
| Resume reading dropdown | NONE -- Client-only via `onMounted` + `ClientOnly` wrapper. | NONE | Zero changes needed. |
| RSS feeds (global + per-novel) | LOW -- Server routes (`server/routes/rss.xml.ts`) already use `queryCollection(event, ...)`. Work in both SSG and SSR. | LOW | Currently link-only. Will continue to work as-is. Full-content RSS is a separate differentiator, not a regression risk. |
| Sitemap (multi-sitemap, per-novel) | LOW -- `@nuxtjs/sitemap` v7.6.0 supports SSR natively. Dynamic sitemaps are actually simpler in SSR (no prerender route enumeration needed). | LOW | The `nitro.prerender.routes` and `prerender:routes` hook for 13K chapter enumeration can be removed. Sitemaps generate dynamically from database. |
| Dark mode | NONE -- Nuxt UI `useColorMode` is hydration-safe by design. | NONE | Zero changes needed. |
| Auto-hide header | NONE -- Client-only scroll listener. | NONE | Zero changes needed. |

### Differentiators (New Capabilities SSR Enables)

Features that become possible or dramatically simpler with SSR.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Full-content RSS feeds | RSS items include chapter text, not just links. Readers can read in their feed reader without visiting the site. Standard for serious content sites. | MEDIUM | In SSR, `rawbody` field is accessible via `queryCollection`. Add `rawbody: z.string()` to collection schema, then `.select('title', 'path', 'pubDate', 'rawbody')` in RSS server routes. Convert markdown to HTML via a simple remark pipeline for `<content:encoded>`. Alternatively, use `nuxt-content-body-html` module (v4.0.4, maintained, supports Content v3) to get pre-rendered HTML. |
| ISR caching (instant loads after first hit) | First visitor triggers SSR, subsequent visitors get CDN-cached response until TTL expires. Best of both worlds: fresh content + fast delivery. | LOW | Add `routeRules` in `nuxt.config.ts`. Netlify automatically sets `Netlify-CDN-Cache-Control: public, max-age=N, stale-while-revalidate=31536000, durable`. |
| Instant new chapter availability | New chapters are available immediately after import without a 10-minute build + deploy cycle. Just import content and it appears on next request. | LOW | This is the core value proposition of SSR. No build step needed for content updates. Deploy the SSR function once; content changes flow through automatically. |
| Dynamic cache invalidation | Purge specific cached pages when content updates, rather than rebuilding everything. | MEDIUM | Use `@netlify/functions` `purgeCache({ tags: [...] })` with `Netlify-Cache-Tag` headers. Tag chapter pages with novel slug for per-novel purging. Requires a webhook or script to trigger purge after content import. |
| Elimination of body-stripping hack | No more post-build SQL dump manipulation. The full database is the database -- no 64MB-to-2.6MB compression pipeline. | LOW | Remove the body-stripping build step entirely. SSR serves from the full database. Simplifies the build pipeline. |
| Zero-build content updates | `pnpm import:docs` adds chapters to `content/` dir. In SSR, the database is rebuilt from content at deploy time (or via external DB like Turso). No `nuxt generate` needed for content-only changes. | MEDIUM | Requires understanding of how Nuxt Content rebuilds its SQLite database in SSR mode. If using file-based SQLite on Netlify, the database dump is bundled at build time and restored on cold start. Content changes still need a rebuild/redeploy of the function, but the build is seconds (just bundling), not 10 minutes (prerendering 26K routes). |
| Per-route rendering strategy | Mix prerender (home, catalog), ISR (chapter pages), and pure SSR (RSS, sitemap) in the same app. | LOW | `routeRules` in `nuxt.config.ts`. This is the primary architectural tool for the migration. |
| Cache-Control headers for browsers | Set appropriate `max-age` for static assets, short TTL for chapter pages, long TTL for catalog pages. Fine-grained HTTP caching. | LOW | `routeRules` `headers` option. Example: chapters get `max-age=3600`, home page gets `max-age=300`. |
| On-demand revalidation via webhook | After Google Docs import, trigger a webhook that purges cached chapter pages so readers see new content instantly. | MEDIUM | Requires a small server route that calls `purgeCache()`. The import script would `curl` this endpoint after importing. |

### Anti-Features (Do NOT Build During Migration)

| Feature | Why Tempting | Why Problematic | Alternative |
|---------|-------------|-----------------|-------------|
| Edge Functions for SSR | "Lower latency than serverless" | Netlify Edge Functions have strict memory limits. A 64MB content database will exceed them. Edge Functions also lack `/tmp` filesystem for SQLite restoration. The Netlify Nuxt integration already routes to standard Functions. | Use standard Netlify Functions (serverless). Cold start is acceptable with ISR caching. |
| External database (Turso/D1/Postgres) | "Avoid cold start database restoration" | Adds operational complexity (managing a separate service, auth tokens, network latency). The content is static markdown -- it does not need a live database. The SQLite dump approach works fine for read-only content. | Stick with bundled SQLite dump. Optimize cold start by aggressively caching via ISR. |
| Full SSR with no caching | "Always fresh content" | 13K chapters each triggering a cold serverless function invocation is expensive and slow. Netlify has function invocation limits on free/pro tiers. | Use ISR with long TTL. Chapters never change after publication. Cache them aggressively. |
| Server-side reading progress | "Sync progress across devices" | Requires user auth, server-side storage, session management. Scope explosion. | Keep localStorage. This is a migration milestone, not a feature milestone. |
| Real-time content hot-reload in production | "Push new chapters without redeploy" | Would require a persistent server watching the filesystem or a webhook-triggered database rebuild at runtime. Serverless functions are stateless -- there is no persistent process. | Redeploy after content import. ISR ensures the CDN starts serving new content within TTL. |
| Pre-rendering all 26K routes alongside SSR | "Keep the old prerender behavior as fallback" | Defeats the purpose of SSR migration. The 10-minute build is what we are trying to eliminate. Prerender only the handful of high-traffic static pages (home, catalog, novel index pages). | Prerender ~25 pages (home, catalog, 10 novel pages, RSS feeds). SSR + ISR the remaining 13K+ chapter pages. |

---

## Feature Dependencies

```
[nuxt.config.ts routeRules setup]
    |
    +--requires--> [ISR caching for chapter pages]
    |                  |
    |                  +--enables--> [Cache-Control headers]
    |                  +--enables--> [Dynamic cache invalidation via purgeCache]
    |
    +--requires--> [Prerender config for static pages (home, catalog)]
    |
    +--requires--> [SSR for chapter reader]
                       |
                       +--requires--> [Full content database (no body stripping)]
                       |                  |
                       |                  +--enables--> [Full-content RSS feeds]
                       |                  +--enables--> [Elimination of body-stripping hack]
                       |
                       +--requires--> [Netlify Functions deployment (nuxt build, not nuxt generate)]

[Full-content RSS]
    +--requires--> [rawbody field in collection schema OR nuxt-content-body-html module]
    +--requires--> [Markdown-to-HTML pipeline in server route]

[Dynamic cache invalidation]
    +--requires--> [Netlify-Cache-Tag headers on SSR responses]
    +--requires--> [purgeCache webhook server route]
    +--requires--> [Import script triggers webhook after content import]

[Netlify deployment changes]
    +--requires--> [Switch from `netlify deploy --dir=.output/public` to Netlify CI build]
    +--requires--> [Or: `nuxt build` + `netlify deploy --dir=.output` with function support]
```

### Dependency Notes

- **routeRules is the foundation:** Every other SSR feature depends on the hybrid rendering config in `nuxt.config.ts`. This must be the first thing configured and verified.
- **Full database requires no body stripping:** The body-stripping pipeline and `nuxt generate` are mutually exclusive with SSR. Removing body stripping is a prerequisite for SSR, not a separate feature.
- **Full-content RSS requires rawbody or body HTML:** Two approaches exist. Adding `rawbody: z.string()` to the schema gives raw markdown (needs conversion). `nuxt-content-body-html` gives rendered HTML directly. Either requires the full database.
- **Cache invalidation requires ISR:** Without ISR, there is nothing to invalidate. ISR must be working first.
- **Deployment mechanism change is foundational:** `nuxt build` produces a server bundle. The deploy command changes from `--dir=.output/public` to something that deploys both static assets and the server function.

---

## Migration Phases: What Changes vs What Stays

### Phase 1: Core SSR Switch (Table Stakes)

The migration must-haves. Goal: site works identically via SSR.

- [ ] Switch `nuxt.config.ts` from `nuxt generate` to `nuxt build` -- the build command change
- [ ] Remove `nitro.prerender.routes` and `prerender:routes` hook (26K route enumeration)
- [ ] Remove body-stripping post-build pipeline
- [ ] Configure `routeRules` for hybrid rendering:
  - `'/'`: prerender
  - `'/novels'`: ISR (3600s)
  - `'/novels/:novel'`: ISR (3600s)
  - `'/novels/:novel/**'`: ISR (86400s or `true` for until-redeploy)
  - `'/rss.xml'`: ISR (3600s)
  - `'/novels/*/rss.xml'`: ISR (3600s)
- [ ] Update Netlify deployment: build via Netlify CI or update deploy script for SSR output
- [ ] Verify all existing pages render correctly via SSR
- [ ] Verify sitemap still works (should be automatic with `@nuxtjs/sitemap` in SSR mode)
- [ ] Verify RSS feeds still work (server routes are SSR-native)
- [ ] Verify localStorage-based features work (reading progress, resume dropdown, dark mode)
- [ ] Cold start performance testing with full 64MB database

### Phase 2: SSR-Enabled Improvements (Differentiators)

Features that become possible once SSR is working.

- [ ] Full-content RSS feeds (add `rawbody` to schema, render to HTML in server routes)
- [ ] Fine-tuned cache headers per route type
- [ ] On-demand cache invalidation webhook for post-import purging

### Phase 3: Operational Improvements (Nice-to-Have)

- [ ] Streamlined import pipeline (`import -> deploy -> purge cache` in one command)
- [ ] Monitoring/alerting for cold start latency
- [ ] Evaluate external database (Turso) if cold start with 64MB SQLite dump proves problematic

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Risk | Priority |
|---------|------------|---------------------|------|----------|
| Core SSR switch (`nuxt build`) | HIGH (enables everything) | MEDIUM | MEDIUM (cold start unknowns) | P1 |
| routeRules hybrid rendering | HIGH (performance) | LOW | LOW (well-documented) | P1 |
| Remove body-stripping pipeline | HIGH (simplification) | LOW | LOW | P1 |
| Remove 26K route prerendering | HIGH (build speed) | LOW | LOW | P1 |
| Netlify SSR deployment | HIGH (foundational) | MEDIUM | MEDIUM (deployment mechanism change) | P1 |
| Sitemap in SSR mode | MEDIUM (SEO) | LOW | LOW (@nuxtjs/sitemap handles it) | P1 |
| RSS continuity (link-only) | MEDIUM (existing subscribers) | NONE | LOW (already works) | P1 |
| Full-content RSS | MEDIUM (reader convenience) | MEDIUM | MEDIUM (rawbody + HTML pipeline) | P2 |
| ISR cache tuning | MEDIUM (performance) | LOW | LOW | P2 |
| Cache invalidation webhook | LOW (operational) | MEDIUM | LOW | P3 |
| External database migration | LOW (cold start mitigation) | HIGH | HIGH (new dependency) | P3 |

**Priority key:**
- P1: Required for SSR migration to be functional
- P2: Should be included in SSR milestone (high value, leverages SSR)
- P3: Defer unless cold start or operational issues arise

---

## Cold Start Risk Assessment

The biggest unknown in this migration is cold start performance with a 64MB content database on Netlify serverless functions.

| Factor | Current (SSG) | SSR (Expected) |
|--------|--------------|----------------|
| First page load | Instant (prerendered HTML from CDN) | Cold start: 500ms-2s (function boot + DB restore). Warm: ~200ms. After ISR cache: instant from CDN. |
| Build time | ~10 min (26,694 routes) | ~30s (no prerendering, just bundle) |
| Deploy size | 2.6MB SQL dump + 26K HTML files | 64MB SQL dump + server function bundle |
| Content update latency | 10 min build + deploy | Instant after deploy (ISR serves stale while revalidating) |
| Function memory | N/A | 1GB limit on Netlify. 64MB DB should fit. |
| Function timeout | N/A | 26s limit. Single page render should be <5s. |

**Mitigation strategy:** Aggressively cache with ISR. Chapter pages (which are the bulk of traffic) never change after publication. Use `isr: true` (cache until next deploy) for chapter routes. This means cold start only affects the very first visitor to each chapter after a deploy -- subsequent visitors get CDN-cached HTML.

---

## Sources

- [Nuxt Rendering Modes (official docs)](https://nuxt.com/docs/4.x/guide/concepts/rendering) -- HIGH confidence (official docs, routeRules config)
- [Advanced caching with Nuxt 4 on Netlify](https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/) -- HIGH confidence (official Netlify developer guide, ISR/SWR config, purgeCache API, cache headers)
- [Netlify Platform Primitives with Nuxt 4](https://www.netlify.com/blog/platform-primitives-with-nuxt-4/) -- HIGH confidence (official Netlify blog, zero-config SSR deployment)
- [Nuxt Content Serverless Hosting](https://content.nuxt.com/docs/deploy/serverless) -- HIGH confidence (official docs, database behavior in serverless, cold start implications)
- [Nuxt Content Raw Content](https://content.nuxt.com/docs/advanced/raw-content) -- HIGH confidence (official docs, rawbody schema field)
- [Nuxt Content Database Architecture](https://content.nuxt.com/docs/advanced/database) -- HIGH confidence (official docs, dump/restore lifecycle)
- [Nuxt Content Collection Types](https://content.nuxt.com/docs/collections/types) -- HIGH confidence (official docs, body field is AST in page collections)
- [Nuxt Content queryCollection](https://content.nuxt.com/docs/utils/query-collection) -- HIGH confidence (official docs, select() method, server route usage)
- [Nuxt Content Netlify Deployment](https://content.nuxt.com/docs/deploy/netlify) -- HIGH confidence (official docs, Node.js version requirement)
- [nuxt-content-body-html module](https://github.com/dword-design/nuxt-content-body-html) -- MEDIUM confidence (v4.0.4, maintained as of May 2025, supports Content v3)
- [Nuxt Content RSS with full body HTML](https://sebastianlandwehr.com/blog/creating-an-rss-feed-from-nuxt-content-with-full-body-html-code) -- MEDIUM confidence (community guide, demonstrates bodyHtml approach)
- [GitHub issue #2019: composable for ContentRenderer HTML](https://github.com/nuxt/content/issues/2019) -- MEDIUM confidence (closed as not-planned, confirms no native server-side HTML rendering API)
- [Netlify Functions cold start](https://answers.netlify.com/t/functions-potential-cold-start-issues/107322) -- LOW confidence (forum post, general cold start 50-500ms estimates)
- [Netlify Edge Function memory limits](https://answers.netlify.com/t/nuxt-on-edge-function-memory-limit-error/119473) -- MEDIUM confidence (forum post confirming Edge memory constraints)
- Existing codebase inspection -- HIGH confidence (direct reading of `nuxt.config.ts`, server routes, composables, pages)

---
*Feature research for: SSR migration of 13K-chapter novel reading site*
*Researched: 2026-02-18*
