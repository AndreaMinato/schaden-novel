# Stack Research

**Domain:** SSR migration for Nuxt novel reading site on Netlify
**Researched:** 2026-02-18
**Confidence:** HIGH

## Critical Constraint: Bundle Size vs. Serverless Limits

The local SQLite content database is **354 MB** (`.data/content/contents.sqlite`) for 13,318 chapters. Netlify Functions (AWS Lambda) enforce **50 MB zipped / 250 MB unzipped** bundle limits. The Nuxt Content v3 SQL dump bundled with the server function will likely exceed these limits with full chapter bodies. This constraint determines the entire migration strategy.

On serverless cold starts, Nuxt Content restores the dump into an in-memory SQLite database on first query. Even if the dump fits within limits, restoring hundreds of MB on each cold start adds 3-10s latency on top of Netlify Functions' baseline ~3s cold start.

## Two Migration Paths

### Path A: Hybrid Prerender + SSR (Lower Risk)

Prerender all 13K chapters at build time (same as today). SSR only for dynamic/new features. Build time stays ~10 min. No new dependencies.

### Path B: Full SSR with Turso + ISR (Faster Builds)

Move content database to Turso (hosted LibSQL). Chapters rendered on-demand with ISR caching on Netlify CDN. Build drops from ~10 min to ~1-2 min. One new dependency (`@libsql/client`).

**Recommendation: Start with Path A. Migrate to Path B when faster builds matter.**

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `nuxt build` (replaces `nuxt generate`) | -- | Build command | Produces Nitro server function + prerendered static pages. `nuxt generate` produces static-only output with no server runtime. This single command change is the fundamental SSR migration. |
| Netlify `netlify` preset | auto-detected | Deployment target | Zero-config. Nuxt/Nitro auto-detects Netlify CI environment and outputs an optimized function + static assets. Do NOT set `nitro.preset` manually. |
| `routeRules` (Nuxt config) | -- | Per-route rendering strategy | Controls rendering: `prerender: true` (build-time static), `isr: true` (render once, cache on CDN until deploy), `swr: N` (cache with TTL). Replaces the `nitro.prerender.routes` array and the `prerender:routes` hook entirely. |
| `netlify.toml` | -- | Build configuration | Required for Netlify CI builds. Defines build command, publish directory, and Node version. Currently missing from the project. |

### Supporting Libraries (Path B only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@libsql/client` | latest | Turso/LibSQL database driver | Required by Nuxt Content v3's `libsql` database adapter. Enables remote database queries from the Netlify Function instead of bundling the 354 MB dump. Only needed for Path B. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `nuxt preview` | Local SSR preview | Replaces `npx serve .output/public`. Runs the actual Nitro server locally so you test real SSR behavior, not just static files. |
| `@netlify/nuxt` (v0.2.13) | Local Netlify platform emulation | Optional devDependency. Provides local dev parity for Netlify Blobs, Image CDN, Functions, env vars. NOT required for deployment. Add only if testing Netlify-specific features locally. |
| Turso CLI | Database management (Path B) | Create databases, generate auth tokens. One-time setup. |

## Configuration Changes Required

### nuxt.config.ts

**Remove for both paths:**
- `getChapterSlugs()` function and the `readdirSync`/`resolve` imports at the top
- `nitro.prerender.routes` array (the static route list)
- `nitro.prerender.concurrency`
- `nitro.hooks['prerender:routes']` hook (filesystem-based route generation)

**Add/Change:**

```typescript
export default defineNuxtConfig({
  // modules, css, site, sitemap -- ALL UNCHANGED

  routeRules: {
    // === Path A: prerender chapters at build time ===
    '/': { prerender: true },
    '/novels': { prerender: true },
    '/novels/*': { prerender: true },
    '/novels/*/*': { prerender: true },
    '/rss.xml': { prerender: true },
    '/novels/*/rss.xml': { prerender: true },

    // === Path B: ISR for chapters ===
    // '/': { prerender: true },
    // '/novels': { isr: true },
    // '/novels/*': { isr: true },
    // '/novels/*/*': { isr: true },
    // '/rss.xml': { prerender: true },
    // '/novels/*/rss.xml': { isr: true },
  },

  content: {
    // Path A: keep existing config
    experimental: {
      sqliteConnector: 'native',
    },
    watch: { enabled: false },

    // Path B: replace experimental block with:
    // database: {
    //   type: 'libsql',
    //   url: process.env.TURSO_DATABASE_URL,
    //   authToken: process.env.TURSO_AUTH_TOKEN,
    // },
    // watch: { enabled: false },
  },

  nitro: {
    // Path A: simplified prerender config
    prerender: {
      crawlLinks: false,
    },
    // Path B: remove prerender block entirely
  },

  // vite, ignore, compatibilityDate -- ALL UNCHANGED
})
```

**Why `routeRules` replaces the prerender hook:** The current config reads the filesystem at build time to generate route paths. With `routeRules`, Nuxt handles route discovery via its glob patterns (`/novels/*/*`). This is declarative and works with both prerendering and ISR.

### netlify.toml (NEW file, required)

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

The Nitro `netlify` preset outputs static assets to `dist/` and the server function to `.netlify/functions/`. This differs from `nuxt generate` which outputs everything to `.output/public/`.

### package.json script changes

| Script | Current | New | Why |
|--------|---------|-----|-----|
| `build` | `nuxt build` | `nuxt build` | Same command, but without `nuxt generate` semantics. The `nuxt build` in the current config was already set correctly. |
| `preview` | `npx serve .output/public` | `nuxt preview` | Runs the actual Nitro SSR server locally for testing. Static file server cannot test SSR routes. |
| `deploy` | `pnpm build && netlify deploy --prod --dir=.output/public --no-build` | `netlify deploy --prod` | Netlify CI handles the build. The `--dir` and `--no-build` flags are no longer correct because output structure changes. |

### content.config.ts

**No changes needed.** The collection definitions (`defineCollection` with `type: 'page'` and `source` globs) work identically in SSR mode. The collections are parsed at build time regardless of rendering strategy.

## Installation

### Path A (Hybrid Prerender + SSR)
```bash
# No new packages
# Only config file changes
```

### Path B (Full SSR with Turso)
```bash
# Install Turso client
pnpm add @libsql/client

# One-time: create Turso database
# (requires Turso CLI: https://docs.turso.tech/cli/installation)
turso db create schaden-novel
turso db tokens create schaden-novel

# Set in Netlify dashboard (Site settings > Environment variables):
#   TURSO_DATABASE_URL = libsql://schaden-novel-<username>.turso.io
#   TURSO_AUTH_TOKEN = <generated-token>
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Turso/LibSQL (Path B) | PostgreSQL (`database.type: 'postgresql'`) | Only if you already run a PostgreSQL instance. Turso is preferred because it is SQLite-compatible (minimal config delta from current native SQLite setup) and has a generous free tier (500M reads/month, 5 GB storage). |
| Turso/LibSQL (Path B) | In-memory SQLite (`filename: ':memory:'`) | Never for this project. The 354 MB dump exceeds Netlify Functions' 250 MB unzipped limit. Even if it fit, restoring 354 MB on every cold start adds prohibitive latency. |
| Standard Netlify Functions | Netlify Edge Functions (`netlify_edge` preset) | Never for this project. Edge Functions use Deno runtime where `node:sqlite` is unavailable. The `@libsql/client` also relies on Node-specific bindings. Adds untested runtime compatibility risk for no benefit. |
| ISR (`isr: true`) | SWR (`swr: seconds`) | Only when content changes frequently between deploys and you want time-based revalidation. For static novel chapters that change only on deploy, `isr: true` caches on Netlify CDN indefinitely until redeploy, which is ideal. |
| Netlify CI builds | Local build + `netlify deploy --no-build` | Only for debugging build issues locally. The current workflow of local builds bypasses Netlify's auto-detection of the `netlify` preset (which relies on CI environment variables). SSR deployment should use Netlify CI. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `nitro.preset: 'netlify'` in config | Breaks local dev. Nitro auto-detects the preset in Netlify CI only. Hardcoding it means `nuxt dev` and `nuxt preview` also try to use the Netlify preset locally. | Let auto-detection handle it (CI sets the environment variable). |
| `netlify_edge` preset | Deno runtime. `node:sqlite` unavailable. `@libsql/client` Node bindings may not work. Adds untested runtime. | Standard `netlify` preset (Node.js runtime). |
| `@netlify/nuxt` as required dependency | Not needed for deployment. Only emulates Netlify platform features in local dev. Adding it as a hard dependency inflates the install and adds maintenance. | Add as optional devDependency only if/when you need to test Netlify Blobs or Image CDN locally. |
| `better-sqlite3` | Already avoided with `experimental.sqliteConnector: 'native'`. Adding it requires native binary compilation in CI. | Keep using native `node:sqlite` (Node 22.5+). |
| Custom `netlify/functions/` directory | Nitro generates the Netlify Function automatically from the Nuxt server. Creating a manual functions directory conflicts with this output. | Let Nitro handle function generation. |
| `nuxt generate` (the old build command) | Produces static-only output with no server. Cannot serve SSR routes, API endpoints at runtime, or use ISR/SWR. | `nuxt build` for any SSR capability. |

## Stack Patterns by Variant

**If the goal is adding server-side features (search, personalization) without changing build time:**
- Use Path A (hybrid prerender + SSR)
- Prerender all chapters, SSR only new dynamic pages
- Zero new dependencies
- Build time stays ~10 min

**If the goal is faster builds and on-demand rendering:**
- Use Path B (Turso + ISR)
- No prerendering; chapters cached on CDN after first request
- Build drops to ~1-2 min
- One new dependency (`@libsql/client`)
- Turso free tier sufficient for a novel reading site

**If migrating incrementally (recommended):**
- Start with Path A to validate SSR works on Netlify
- Switch specific routes from `prerender: true` to `isr: true` one at a time
- Add Turso when you want to eliminate build-time prerendering entirely

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Nuxt 4.3.1 | Netlify `netlify` preset | Requires `compatibilityDate >= '2024-05-07'` for Netlify Functions v2 features (streaming, Blobs). Current config has `2025-07-15` -- already compatible. |
| `@nuxt/content` (latest) | `@libsql/client` (latest) | Content v3's `libsql` database adapter wraps `@libsql/client`. No version pinning needed between them. |
| Node 22 | Netlify Functions | Netlify supports Node 18.14+. Node 22 provides native `node:sqlite`. Set `NODE_VERSION=22` in `netlify.toml` build environment. |
| `@nuxtjs/sitemap` (7.6+) | SSR mode | Sitemap generation works in both SSG and SSR. In SSR mode, sitemaps can be generated dynamically at runtime or prerendered at build time. |
| `zod` (3.25.76) | No impact | Already pinned for Nuxt Content v3 compat. Unaffected by SSR migration. |
| `shiki` / `@shikijs/langs` (3.22.0) | No impact | Syntax highlighting in content rendering. Works identically in SSR. |

## Deployment Flow Comparison

| Aspect | Current (SSG) | Path A (Hybrid) | Path B (ISR + Turso) |
|--------|---------------|-----------------|----------------------|
| Build command | `nuxt build` (static generation) | `nuxt build` (server + prerendered) | `nuxt build` (server only) |
| Build time | ~10 min (26K routes) | ~10 min (26K routes) | ~1-2 min (no prerendering) |
| Build output | `.output/public/` | `dist/` + `.netlify/functions/` | `dist/` + `.netlify/functions/` |
| Deploy method | Manual `netlify deploy --prod --dir=... --no-build` | Netlify CI (git push) | Netlify CI (git push) |
| Server runtime | None | Netlify Function (Node.js) | Netlify Function (Node.js) |
| Content database | Build-time native SQLite | Build-time native SQLite | Turso (remote LibSQL) |
| Cold start | N/A | N/A (chapters are prerendered static) | ~3s first request per chapter |
| CDN caching | All static by nature | All static by nature | ISR: cached on CDN after first hit |
| Body stripping | Post-build for client dumps | Still needed for client dumps | Not needed (Turso serves content) |

## Existing Stack Compatibility

| Existing Tech | SSR Impact | Action Needed |
|---------------|------------|---------------|
| `@nuxt/content` (latest) | Fully compatible with SSR. Database adapter changes only for Path B. | Path A: none. Path B: update `content.database` config. |
| `@nuxt/ui` (latest) | No impact. Works identically in SSR mode. | None. |
| `@nuxtjs/sitemap` (7.6+) | Works in SSR. Can generate sitemaps dynamically or at build time. | None. |
| `feed` package (RSS) | Server routes (`/rss.xml`) work in SSR. Can prerender or serve dynamically. | None. |
| `zod` (3.25.76) | No impact. | None. |
| Native SQLite connector | Path A: keep for build-time prerendering. Path B: replace with Turso adapter. | Path B: remove `experimental.sqliteConnector`, add `database.type: 'libsql'`. |
| `content.watch.enabled: false` | Keep disabled. 13K files still overwhelm watchers in dev. | None. |
| Body stripping post-build | Path A: still needed for client-side dump download size. Path B: likely unnecessary. | Evaluate after migration. |
| `compatibilityDate: '2025-07-15'` | Already exceeds the `2024-05-07` minimum for Netlify Nuxt 4 features. | None. |

## Sources

- [Deploy Nuxt to Netlify](https://nuxt.com/deploy/netlify) -- official deployment guide, zero-config preset detection
- [Nuxt on Netlify](https://docs.netlify.com/frameworks/nuxt/) -- framework docs, `@netlify/nuxt` module, Node version requirements
- [Netlify Platform Primitives with Nuxt 4](https://www.netlify.com/blog/platform-primitives-with-nuxt-4/) -- ISR, Blobs, streaming, Functions v2
- [ISR and Advanced Caching with Nuxt v4 on Netlify](https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/) -- routeRules for ISR, CDN cache headers, revalidation
- [Nuxt Content v3 Serverless Hosting](https://content.nuxt.com/docs/deploy/serverless) -- database adapters (Turso, PostgreSQL, D1), cold start dump restoration behavior
- [Nuxt Content v3 Database Architecture](https://content.nuxt.com/docs/advanced/database) -- dump generation at build, runtime restoration, integrity checks
- [Nuxt Content v3 Configuration](https://content.nuxt.com/docs/getting-started/configuration) -- `database.type` options (sqlite, libsql, d1, postgresql, pglite)
- [Nuxt Content v3 Netlify Deploy](https://content.nuxt.com/docs/deploy/netlify) -- auto-detection, Node 20+ requirement
- [Nuxt Content v3 Server Hosting](https://content.nuxt.com/docs/deploy/server) -- SQLite in server mode, glibc requirements
- [Nuxt 4 Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering) -- routeRules syntax: prerender, isr, swr, ssr, cors
- [Nitro Netlify Provider](https://nitro.build/deploy/providers/netlify) -- `netlify`, `netlify_edge` presets, output structure
- [Turso Pricing](https://turso.tech/pricing) -- free tier: 500M reads/month, 5 GB storage, 100 databases
- [@netlify/nuxt Changelog](https://www.netlify.com/changelog/nuxt-4-support-new-netlify-nuxt-module-for-local-dev/) -- local dev module, optional for deployment
- [Netlify Functions Overview](https://docs.netlify.com/build/functions/overview/) -- 50 MB zip / 250 MB unzip limits, 512 MB memory, 10s execution cap
- [Netlify Prerendered Routes Thread](https://answers.netlify.com/t/nuxt-4-prerendered-routes-still-cause-a-server-function-invocation/143395) -- confirmed prerendered pages excluded from function invocations

---
*Stack research for: SSR migration (Nuxt 4.3.1 + Nuxt Content v3 + Netlify)*
*Researched: 2026-02-18*
