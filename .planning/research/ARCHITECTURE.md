# Architecture Research: SSR Migration

**Domain:** SSG-to-SSR migration for content-heavy Nuxt novel reading site
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH -- Nuxt/Netlify SSR integration verified via official docs; cold start performance with 13K-chapter SQLite dump is the key uncertainty

---

## Current Architecture (SSG Baseline)

```
BUILD TIME (nuxt generate, ~10 min)
┌─────────────────────────────────────────────────────────────────┐
│  content/{novel}/*.md  (13,318 files, 170MB)                   │
│       |                                                         │
│  Nuxt Content v3 parser -> SQLite DB (native Node 22.5+)       │
│       |                                                         │
│  Nitro prerender engine (26,694 routes, concurrency: 4)        │
│       |                                                         │
│  .output/public/  (static HTML + JS + CSS + SQL dumps)         │
│       |                                                         │
│  scripts/strip-dump-bodies.mjs  (96% dump size reduction)      │
│       |                                                         │
│  netlify deploy --prod --dir=.output/public --no-build         │
└─────────────────────────────────────────────────────────────────┘

RUNTIME (Netlify CDN, no server)
┌─────────────────────────────────────────────────────────────────┐
│  CDN serves prerendered HTML (every page is a static file)     │
│       |                                                         │
│  Vue hydrates on client                                         │
│       |                                                         │
│  Client-side navigation -> WASM SQLite (downloads body-        │
│  stripped SQL dump, runs queries in browser)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Key SSG-Specific Components (will change or be eliminated)

| Component | SSG Role | SSR Status |
|-----------|----------|------------|
| `nitro.prerender.routes` + `prerender:routes` hook | Generates 26,694 route list via `readdirSync` | **Eliminate** -- no prerendering needed |
| `nitro.prerender.crawlLinks: false` | Prevents crawler discovering 13K chapters | **Eliminate** -- moot without prerendering |
| `nitro.prerender.concurrency: 4` | Throttles build memory usage | **Eliminate** |
| `scripts/strip-dump-bodies.mjs` | Reduces client SQL dumps by 96% | **Revisit** -- may still be needed for client-side nav |
| `routeRules: { '/': { prerender: true } }` | Prerenders home page | **Expand** -- becomes the hybrid rendering control surface |
| Deploy: `--dir=.output/public --no-build` | Deploys static files only | **Change** -- `nuxt build` outputs to `.netlify/` structure |

---

## Target Architecture (SSR on Netlify)

```
BUILD TIME (nuxt build, target <1 min)
┌─────────────────────────────────────────────────────────────────┐
│  content/{novel}/*.md  (13,318 files, 170MB)                   │
│       |                                                         │
│  Nuxt Content v3 parser -> SQLite DB + SQL dump files          │
│       |                                                         │
│  Nitro builds server bundle + static assets                    │
│       |                                                         │
│  .output/                                                       │
│    ├── server/     (Nitro server -> Netlify Function)          │
│    └── public/     (static assets, CSS, JS, SQL dumps)         │
│                                                                 │
│  Netlify auto-detects preset, deploys:                         │
│    .netlify/functions-internal/server/  (serverless function)  │
│    dist/  (static assets served from CDN)                      │
└─────────────────────────────────────────────────────────────────┘

RUNTIME (Netlify CDN + Functions)
┌─────────────────────────────────────────────────────────────────┐
│                     NETLIFY CDN EDGE                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Cached responses (ISR/SWR)                               │  │
│  │ Static assets (JS, CSS, fonts)                           │  │
│  │ _payload.json files (for client-side nav)                │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │ cache MISS                          │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │         NETLIFY FUNCTION (AWS Lambda, us-east-2)         │  │
│  │                                                           │  │
│  │  Cold start:                                              │  │
│  │    1. Node.js 22 runtime boots                           │  │
│  │    2. Nitro server initializes                           │  │
│  │    3. First queryCollection() triggers dump restore      │  │
│  │       -> SQLite DB created in /tmp/contents.sqlite       │  │
│  │    4. Page rendered (Vue SSR + content from SQLite)      │  │
│  │    5. HTML + CDN cache headers returned                  │  │
│  │                                                           │  │
│  │  Warm request (same Lambda instance):                    │  │
│  │    1. SQLite already in /tmp                             │  │
│  │    2. Page rendered directly from SQLite                 │  │
│  │    3. HTML + CDN cache headers returned                  │  │
│  │                                                           │  │
│  │  Constraints:                                             │  │
│  │    Memory: 1024 MB default                               │  │
│  │    Timeout: 60 seconds                                   │  │
│  │    Response: 6 MB (buffered) / 20 MB (streamed)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│                     BROWSER                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Initial load: server-rendered HTML (full content)       │  │
│  │  Client-side nav: fetches _payload.json from CDN         │  │
│  │  localStorage: reading progress (unchanged)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Changes: SSG to SSR

### Components That Change

| Component | Current (SSG) | Target (SSR) | Effort |
|-----------|---------------|--------------|--------|
| `nuxt.config.ts` | `nuxt generate` prerender config, readdirSync routes | Remove prerender config, add `@netlify/nuxt`, add ISR routeRules, add `content.database.filename: '/tmp/contents.sqlite'` | Medium |
| `package.json` build script | `"build": "nuxt build"` (but used as `nuxt generate` for deploy) | `"build": "nuxt build"` (SSR build) | Low |
| `package.json` deploy script | `netlify deploy --prod --dir=.output/public --no-build` | `netlify deploy --prod --no-build` (auto-detects `.netlify/` structure) or Netlify CI build | Medium |
| `routeRules` | Only `'/': { prerender: true }` | ISR rules for chapter pages, prerender for static pages | Medium |

### Components That Are Eliminated

| Component | Why Eliminated |
|-----------|---------------|
| `nitro.prerender.routes` (static route array) | No prerendering of RSS/error pages -- SSR serves them dynamically |
| `nitro.hooks['prerender:routes']` (readdirSync loop) | No prerendering of chapter pages |
| `getChapterSlugs()` function in nuxt.config.ts | No filesystem-based route generation needed |
| `scripts/strip-dump-bodies.mjs` | See analysis below -- likely eliminated or greatly simplified |
| `nitro.prerender.concurrency: 4` | No prerendering |
| `nitro.prerender.crawlLinks: false` | No prerendering |

### Components That Stay Unchanged

| Component | Why Unchanged |
|-----------|---------------|
| `content.config.ts` | Per-novel collections work identically in SSR |
| `app/pages/*.vue` (all page components) | `useAsyncData` + `queryCollection` works in both SSG and SSR |
| `app/composables/useReadingProgress.ts` | Already SSR-safe (`import.meta.client` guard) |
| `app/composables/useChapterNav.ts` | `useAsyncData` works in SSR |
| `app/composables/useAutoHideHeader.ts` | Client-side only, unaffected |
| `app/composables/useNovelMeta.ts` | Pure data, no runtime dependency |
| `app/components/ResumeDropdown.vue` | Already wrapped in `<ClientOnly>` |
| `app/layouts/default.vue` | No SSG-specific code |
| `server/routes/rss.xml.ts` | Already uses server-side `queryCollection(event, ...)` |
| `server/routes/novels/[novel]/rss.xml.ts` | Already uses server-side `queryCollection(event, ...)` |
| `scripts/import.mjs` | Developer workflow, not deployment |

---

## Data Flow: SSR Chapter Page Request

### First Request (Cold Start, Cache Miss)

```
1. Browser requests GET /novels/mga/chapter-1500
        |
2. Netlify CDN: no cached response -> forward to Function
        |
3. Netlify Function (AWS Lambda) cold starts:
   a. Node.js 22 runtime boots (~100-300ms)
   b. Nitro server initializes
   c. Vue SSR begins rendering the page
   d. useAsyncData calls queryCollection('mga').path('/mga/chapter-1500').first()
   e. First query triggers dump restore:
      - Reads SQL dump from bundled assets
      - Decompresses and loads into SQLite at /tmp/contents.sqlite
      - THIS IS THE CRITICAL LATENCY POINT (dump size matters)
   f. SQLite query returns chapter content
   g. Vue renders HTML with chapter prose
   h. Nitro adds response headers:
      Cache-Control: public, max-age=0, must-revalidate
      Netlify-CDN-Cache-Control: public, max-age=31536000, stale-while-revalidate=31536000, durable
        |
4. Netlify CDN caches the response globally (durable directive)
        |
5. Browser receives full HTML (chapter content visible immediately)
   Vue hydrates, localStorage saves reading progress
```

### Subsequent Requests (Cache Hit)

```
1. Browser requests GET /novels/mga/chapter-1500
        |
2. Netlify CDN: cached response found -> serve directly
   (No Function invocation, ~20-50ms response)
        |
3. Browser receives cached HTML
   Vue hydrates, localStorage saves reading progress
```

### Client-Side Navigation (SPA transition)

```
1. User clicks "Next Chapter" link (Vue Router navigation)
        |
2. Nuxt fetches _payload.json for the target page:
   GET /novels/mga/chapter-1501/_payload.json
        |
3a. If ISR cached: CDN serves _payload.json directly (no Function)
        |
3b. If not cached: Function renders page, returns HTML + payload
        |
4. Vue updates DOM with new chapter content
   localStorage saves new reading progress
```

**Key insight:** With Nuxt 4.3+ payload extraction working for ISR/SWR routes, client-side navigation fetches `_payload.json` from the CDN rather than downloading the full WASM SQLite dump. This means the massive SQL dump download that was a concern in SSG mode is largely eliminated in ISR mode.

### Comparison: SSG vs SSR Data Flow

| Aspect | SSG (Current) | SSR (Target) |
|--------|---------------|--------------|
| First page load | CDN serves static HTML (~20ms) | CDN serves cached HTML (~20ms) or Function renders (~500-2000ms on cold start) |
| Build time | ~10 min (26,694 routes) | <1 min (no route prerendering) |
| Client-side nav | WASM SQLite downloads full dump, queries locally | Fetches _payload.json from CDN (ISR cached) |
| Content freshness | Stale until next build + deploy | Fresh on next ISR revalidation |
| Deploy size | ~2GB+ (13K HTML files + assets) | ~50MB (server bundle + static assets) |
| Cold start cost | None (all static) | ~500-2000ms first request per Lambda instance |

---

## Critical Architecture Decision: ISR Strategy

The ISR (Incremental Static Regeneration) configuration is the most important architectural decision for SSR migration. It determines performance characteristics for every page type.

### Recommended routeRules Configuration

```typescript
// nuxt.config.ts
routeRules: {
  // Home page: prerender at build time (changes rarely, lightweight)
  '/': { prerender: true },

  // Novel catalog: prerender (10 novels, changes rarely)
  '/novels': { prerender: true },

  // Novel detail pages: ISR with long TTL
  // Chapters don't change after publish, so cache indefinitely
  // Revalidated on deploy
  '/novels/*': { isr: true },

  // Chapter pages: ISR with long TTL
  // Content is immutable after publish -- cache until next deploy
  '/novels/*/*': { isr: true },
}
```

**`isr: true` (no TTL)** means: render on first request, cache on CDN, serve cached forever, purge only on new deploy. This is ideal because chapter content never changes after publishing.

**Alternative: `isr: 3600` (1-hour TTL)** would background-revalidate hourly. Unnecessary overhead since content is static.

### What ISR Eliminates

With `isr: true` for chapter pages:
- First visitor to a chapter triggers server render (~500-2000ms)
- All subsequent visitors get CDN-cached response (~20-50ms)
- After a deploy, cache is purged and pages re-render on demand
- No 10-minute build time. No 26,694 prerendered routes.
- Effectively "lazy SSG" -- same performance as SSG after first visit

---

## Nuxt Content v3 SQLite in Netlify Functions

### How It Works

1. **Build time:** Nuxt Content parses all 13,318 markdown files into SQLite and exports SQL dump files (one per collection, gzip + base64 encoded).

2. **Runtime (cold start):** When the Netlify Function receives its first content query, Nuxt Content reads the bundled SQL dump, decompresses it, and restores the data into a SQLite database at `/tmp/contents.sqlite`.

3. **Runtime (warm):** Subsequent requests on the same Lambda instance reuse the SQLite database in `/tmp`. No dump restoration needed.

### Configuration

```typescript
// nuxt.config.ts
content: {
  database: {
    type: 'sqlite',
    filename: '/tmp/contents.sqlite',  // Only writable dir on Lambda
  },
  experimental: {
    sqliteConnector: 'native',  // Node 22.5+ native sqlite (no better-sqlite3 needed)
  },
  watch: {
    enabled: false,  // No watching in production
  },
},
```

### Cold Start Performance Concern

This is the highest-risk item in the migration. The SQL dump for 13K chapters with full bodies could be substantial:

| Factor | Estimate | Impact |
|--------|----------|--------|
| Raw content | 170MB markdown | Parsed AST is larger than raw markdown |
| Dump compression | gzip typically 5-10x compression | ~17-34MB compressed per collection |
| Collections | 10 separate dumps | Each loaded independently on first query for that collection |
| Restore time | ~200ms per 10MB (from Turso benchmarks) | Could be 500-2000ms for large collections |
| Lambda memory | 1024 MB default | SQLite + Node.js overhead must fit |

**Mitigations:**
1. Per-novel collections mean only the queried novel's dump loads on a given request (not all 13K chapters)
2. ISR caching means cold starts are rare (most requests hit CDN)
3. Lambda instances stay warm for ~15-30 minutes between requests
4. If cold start is too slow, increase Lambda memory (more memory = proportionally more CPU on Lambda)

### Alternative: External Database

If cold start proves unacceptable, the fallback is an external database:

| Option | Pros | Cons |
|--------|------|------|
| **Turso (LibSQL)** | SQLite-compatible, free tier generous, no cold start restore | Additional service dependency, env vars for auth |
| **PostgreSQL (Neon/Supabase)** | Managed, no cold start | Different query semantics, connection pooling needed |
| **In-memory SQLite (`:memory:`)** | No /tmp needed | Restores dump on EVERY request (no persistence between requests) |

**Recommendation:** Start with `/tmp/contents.sqlite`. Measure cold start latency. Only switch to Turso if cold start exceeds 3 seconds.

---

## Deployment Pipeline Changes

### Current (SSG)

```bash
# package.json scripts
"build": "nuxt build",                        # actually runs nuxt generate
"deploy": "pnpm build && netlify deploy --prod --dir=.output/public --no-build"

# Post-build step
node scripts/strip-dump-bodies.mjs             # strips chapter bodies from SQL dumps
```

### Target (SSR)

```bash
# package.json scripts
"build": "nuxt build",                         # SSR build (generates server bundle)
"deploy": "pnpm build && netlify deploy --prod --no-build"

# No post-build body stripping needed (see analysis below)
```

### Netlify Configuration

```toml
# netlify.toml (new file)
[build]
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
  # AWS_LAMBDA_JS_RUNTIME = "nodejs22.x"  # should be default, but explicit if needed
```

**Or:** Continue using CLI deploy without `netlify.toml`. Netlify auto-detects Nuxt and configures the Function deployment.

### @netlify/nuxt Module

```typescript
// nuxt.config.ts
modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap', '@netlify/nuxt'],
```

This module provides:
- Netlify Blobs integration
- On-demand cache invalidation
- ISR with `durable` cache directive
- Local dev parity (test Netlify primitives with `nuxt dev`)
- Automatic 404 for missing static assets without Function invocation

---

## Body Stripping Analysis for SSR

### Why Body Stripping Existed

In SSG mode, Nuxt Content generates SQL dump files that get downloaded to the browser for client-side WASM SQLite queries. With 13K chapters of novel content, the unstripped dumps were massive. The `strip-dump-bodies.mjs` script reduced dump size by 96%.

### SSR Changes the Equation

In SSR with ISR:
1. **Server-side rendering:** Chapter content comes from the server-rendered HTML, not from a client-side SQLite query
2. **Payload extraction:** Client-side navigation fetches `_payload.json` from CDN (contains the pre-rendered page data)
3. **WASM SQLite downloads:** May still occur if a client-side content query runs before a cached payload is available

### Recommendation

**Eliminate body stripping initially.** With ISR caching, the path where a browser would need to download the full SQL dump is narrow:
- ISR-cached pages serve `_payload.json` directly
- Only truly first-ever visits to uncached pages might trigger WASM SQLite
- Even then, per-novel collections mean only one novel's dump loads (not all 13K chapters)

If monitoring reveals excessive client-side dump downloads, the stripping script can be re-enabled as a build step. But it should not be the default assumption.

---

## RSS and Sitemap in SSR

### RSS Feeds

The existing server routes (`server/routes/rss.xml.ts` and `server/routes/novels/[novel]/rss.xml.ts`) already use server-side `queryCollection(event, ...)`. They will work identically in SSR mode -- no changes needed.

In SSG mode, these routes were prerendered as static XML files. In SSR mode, they render dynamically on each request. To avoid unnecessary Function invocations:

```typescript
routeRules: {
  '/rss.xml': { isr: 3600 },              // Re-generate hourly
  '/novels/*/rss.xml': { isr: 3600 },     // Re-generate hourly
}
```

### Sitemap

`@nuxtjs/sitemap` works in SSR mode. It generates the sitemap dynamically at runtime. With 13K URLs across 10 multi-sitemaps, this is a moderately expensive operation. Cache it:

```typescript
routeRules: {
  '/sitemap*.xml': { isr: true },  // Cache until deploy
}
```

---

## Architecture Diagram: Component Boundaries

```
┌───────────────────────────────────────────────────────────────┐
│                    nuxt.config.ts                              │
│  modules: [@nuxt/content, @nuxt/ui, @nuxtjs/sitemap,         │
│            @netlify/nuxt]                                      │
│  routeRules: ISR configuration per route pattern              │
│  content.database: { type: 'sqlite',                          │
│                      filename: '/tmp/contents.sqlite' }       │
└───────────────────┬───────────────────────────────────────────┘
                    │
    ┌───────────────┼──────────────────────┐
    │               │                      │
    ▼               ▼                      ▼
┌──────────┐  ┌──────────────┐  ┌─────────────────────┐
│ content/ │  │ app/         │  │ server/              │
│          │  │              │  │                       │
│ 13K .md  │  │ pages/       │  │ routes/              │
│ files    │  │  index       │  │  rss.xml.ts          │
│          │  │  novels/     │  │  novels/[novel]/     │
│ Parsed   │  │   index      │  │   rss.xml.ts         │
│ at build │  │   [novel]/   │  │                       │
│ time     │  │    index     │  │ queryCollection(event)│
│          │  │    [...slug] │  │ (server-side queries) │
│ SQL dump │  │              │  │                       │
│ generated│  │ layouts/     │  └─────────────────────┘
│          │  │  default     │
│          │  │              │
│          │  │ composables/ │
│          │  │  useChapterNav      │
│          │  │  useReadingProgress │
│          │  │  useAutoHideHeader  │
│          │  │  useNovelMeta       │
│          │  │              │
│          │  │ components/  │
│          │  │  ResumeDropdown     │
└──────────┘  └──────────────┘

         BOUNDARY: Build vs Runtime
    ─────────────────────────────────────

┌──────────────────────────────────────────────────────────────┐
│                    NETLIFY INFRASTRUCTURE                     │
│                                                              │
│  CDN Edge           │  Function (Lambda)                     │
│  ┌────────────┐     │  ┌──────────────────────────────────┐ │
│  │ ISR cache  │     │  │ Nitro server                     │ │
│  │ _payload   │◄────│──│ SQLite /tmp restore on cold start│ │
│  │ static JS  │     │  │ Vue SSR rendering                │ │
│  │ CSS/fonts  │     │  │ Content queries -> chapter HTML  │ │
│  └────────────┘     │  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Hybrid Rendering: Prerender vs ISR Decision Matrix

| Route Pattern | Strategy | Rationale |
|---------------|----------|-----------|
| `/` | `prerender: true` | Home page is lightweight, changes only on deploy |
| `/novels` | `prerender: true` | Catalog of 10 novels, changes only when a novel is added |
| `/novels/:novel` | `isr: true` | Chapter listing per novel, content rarely changes |
| `/novels/:novel/:chapter` | `isr: true` | Chapter content is immutable after publish |
| `/rss.xml` | `isr: 3600` | Hourly refresh for feed readers |
| `/novels/:novel/rss.xml` | `isr: 3600` | Hourly refresh for per-novel feeds |
| `/sitemap*.xml` | `isr: true` | Static content, regenerate on deploy only |
| `/200.html`, `/404.html` | `prerender: true` | Error pages must be static |

---

## Migration Risk Assessment

### LOW RISK (Standard patterns, well-documented)

- **Build command change:** `nuxt generate` to `nuxt build` is a one-line change
- **Module addition:** `@netlify/nuxt` is zero-config
- **RSS/sitemap routes:** Already server-side, work unchanged
- **Page components:** `useAsyncData` + `queryCollection` identical in SSR
- **Composables:** Already SSR-safe

### MEDIUM RISK (Needs validation)

- **ISR cache behavior:** Verify `isr: true` purges on deploy for Netlify
- **Payload extraction for chapters:** Verify `_payload.json` generated for ISR routes
- **Sitemap with 13K URLs:** May need dynamic sitemap endpoint instead of build-time generation
- **Deploy script change:** Test CLI deploy vs Netlify CI for SSR output structure

### HIGH RISK (Unknown until measured)

- **Cold start latency:** 13K-chapter SQL dump restore time is unknown. Could be 200ms (acceptable) or 5 seconds (unacceptable). Must be measured early.
- **SQLite /tmp persistence:** Netlify Functions reuse Lambda instances for ~15-30 min. If instance recycling is aggressive, cold starts become frequent.
- **Memory usage:** SQLite database with 13K chapters of parsed AST in memory. 1024 MB Lambda limit may be tight.
- **Native SQLite connector on Lambda:** Node 22 `node:sqlite` is used in build. Must verify it works in the Lambda runtime (not just local dev).

---

## Suggested Build Order for Migration

Dependencies flow top-down. Each step validates a critical assumption before investing in subsequent work.

```
Phase 1: Prove SSR Works (HIGH RISK validation)
├── 1a. Change build command, add @netlify/nuxt module
├── 1b. Configure content.database for /tmp/contents.sqlite
├── 1c. Remove all prerender config from nuxt.config.ts
├── 1d. Deploy to Netlify staging, measure cold start latency
└── 1e. GATE: If cold start > 3s, investigate Turso before proceeding

Phase 2: ISR Caching Layer
├── 2a. Add routeRules for ISR on chapter pages
├── 2b. Verify CDN caching works (check response headers)
├── 2c. Verify _payload.json generation for ISR routes
└── 2d. Verify cache purge on deploy

Phase 3: Cleanup and Optimization
├── 3a. Remove scripts/strip-dump-bodies.mjs
├── 3b. Remove getChapterSlugs() and prerender hook
├── 3c. Update deploy script for SSR output
├── 3d. Add ISR rules for RSS feeds and sitemaps
└── 3e. Add netlify.toml if needed (or keep CLI deploy)

Phase 4: Validation and Monitoring
├── 4a. Full site smoke test (all 10 novels, chapter nav, RSS)
├── 4b. Monitor cold start frequency and latency
├── 4c. Monitor Function invocation count (should drop as ISR fills cache)
└── 4d. Compare performance metrics vs SSG baseline
```

**Phase 1 is the critical gate.** If cold start latency is unacceptable with SQLite `/tmp`, the architecture shifts to an external database (Turso). This must be validated before any other work.

---

## Sources

- Nuxt on Netlify (official docs): https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/ (HIGH confidence)
- Deploy Nuxt to Netlify: https://nuxt.com/deploy/netlify (HIGH confidence)
- Nuxt Content v3 serverless hosting: https://content.nuxt.com/docs/deploy/serverless (HIGH confidence)
- Nuxt Content v3 database: https://content.nuxt.com/docs/advanced/database (HIGH confidence)
- Nuxt Content v3 Netlify deploy: https://content.nuxt.com/docs/deploy/netlify (HIGH confidence)
- Netlify Functions overview (constraints): https://docs.netlify.com/build/functions/overview/ (HIGH confidence)
- ISR and advanced caching with Nuxt 4 on Netlify: https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/ (HIGH confidence)
- Netlify platform primitives with Nuxt 4: https://www.netlify.com/blog/platform-primitives-with-nuxt-4/ (HIGH confidence)
- @netlify/nuxt module: https://www.netlify.com/changelog/nuxt-4-support-new-netlify-nuxt-module-for-local-dev/ (HIGH confidence)
- Nuxt hybrid rendering: https://nuxt.com/docs/4.x/guide/concepts/rendering (HIGH confidence)
- Netlify Node.js 22 default runtime: https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981 (HIGH confidence)
- AWS Lambda cold start with SQLite: https://turso.tech/blog/get-microsecond-read-latency-on-aws-lambda-with-local-databases (MEDIUM confidence -- Turso marketing, but technical claims are plausible)
- Nuxt payload extraction for ISR: https://github.com/nuxt/nuxt/releases/tag/v4.3.0 (MEDIUM confidence -- release notes confirmed feature, not tested at this scale)

---

*Architecture research for: SSG-to-SSR migration of content-heavy Nuxt novel reading site*
*Researched: 2026-02-18*
