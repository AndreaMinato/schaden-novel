# Pitfalls Research: SSG-to-SSR Migration on Netlify

**Domain:** Nuxt 4.3.1 + Nuxt Content v3 novel reading site -- migrating from full SSG to SSR on Netlify
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH -- Netlify limits verified from official docs (HIGH); Nuxt Content v3 serverless architecture verified from official docs (HIGH); node:sqlite Lambda compatibility verified (MEDIUM-HIGH); SQL dump size extrapolated from project data (MEDIUM)

---

## Critical Pitfalls

### Pitfall 1: SSR Requires Full Chapter Bodies at Runtime -- Breaks Body Stripping Strategy

**What goes wrong:**
The current SSG build strips chapter body content from SQL dumps post-build (64MB reduced to 2.6MB) because all HTML is already pre-rendered. In SSR mode, the server must render chapter HTML on-demand, meaning it needs full parsed AST body content in the database at runtime. The 64MB unstripped SQL dump must be available to the Netlify Function, but AWS Lambda has a 50MB zipped / 250MB unzipped bundle limit. Even if the dump fits in the bundle, restoring 64MB of SQL data into in-memory SQLite on every cold start is unacceptable (estimated 2-10+ seconds).

**Why it happens:**
SSG and SSR have fundamentally different data access patterns. SSG renders all pages at build time and never needs the database again -- the output is static HTML. SSR renders pages on-demand and needs the full content database available at request time. The body stripping optimization that made SSG deployments small (2.6MB dumps) is incompatible with on-demand rendering.

**How to avoid:**
Do NOT attempt pure SSR for all 13K chapter pages. Use hybrid rendering instead:
1. Keep chapter pages prerendered via `routeRules: { '/novels/**': { prerender: true } }` -- this means `nuxt build` still pre-renders chapter HTML at build time, and body stripping can still apply.
2. SSR only the pages that benefit from it: home page (dynamic reading progress), novel listing (dynamic chapter counts), API routes.
3. If true SSR for chapters is needed later (e.g., for dynamic content), use an external database (Turso/LibSQL) instead of in-memory SQLite restoration.

**Warning signs:**
- Netlify Function bundle exceeds 50MB zipped after `nuxt build`
- First page load takes 5+ seconds on cold start
- Netlify Function logs show "Task timed out" on chapter page requests
- Server error: "SQLITE_CANTOPEN" in function logs

**Phase to address:**
Phase 1 (Architecture Decision) -- must decide hybrid vs. pure SSR BEFORE any implementation. This decision cascades to every other phase.

---

### Pitfall 2: In-Memory SQLite Cold Start Penalty on Serverless

**What goes wrong:**
Nuxt Content v3 on serverless restores the SQLite database from a generated dump on the first query of each cold start. With 13K chapters (even metadata-only at 2.6MB stripped), the database must be rebuilt from scratch on every new Lambda instance. Netlify Functions cold-start within ~1-3 seconds for the Lambda itself, plus the SQLite restoration adds additional seconds. Every page request that hits a cold instance feels slow (3-8+ seconds TTFB).

**Why it happens:**
Serverless functions are stateless -- each request may hit a fresh Lambda instance with no in-memory state. Unlike a persistent server where the database is loaded once and reused, Lambda must reinitialize on every cold start. Netlify Functions have 1024MB memory but the I/O cost of parsing and restoring SQL dump content is the bottleneck.

**How to avoid:**
1. Prerender as many routes as possible via `routeRules` -- prerendered pages are served as static files from the CDN, bypassing the Lambda entirely. Zero cold start penalty.
2. For routes that must be SSR, keep the SQL dump small by ensuring only metadata (not bodies) is needed at runtime.
3. Consider caching the Nitro response with `swr: 3600` (stale-while-revalidate) for SSR routes, so cold starts only affect the background revalidation, not user-facing requests.
4. If cold starts are unacceptable, use Turso/LibSQL as an external database -- eliminates dump restoration entirely.

**Warning signs:**
- TTFB > 3 seconds on the home page after a period of inactivity
- Netlify Function logs show long initialization times in "INIT_START" phase
- Users report intermittent slow page loads

**Phase to address:**
Phase 1 (Architecture) for the decision; Phase 2 (Implementation) for configuring SWR caching on SSR routes.

---

### Pitfall 3: node:sqlite Availability in Netlify's Lambda Runtime

**What goes wrong:**
The project currently uses `experimental.sqliteConnector: 'native'` which relies on `node:sqlite`. This module was stabilized (no longer experimental) in Node v22.13.0. Netlify defaulted to Node 22 since February 2025. However, the specific Node 22.x minor version in Netlify's Lambda runtime may or may not include v22.13.0+. If the Lambda runtime uses an older Node 22 patch (e.g., 22.11.x), `node:sqlite` may not be available or may require the `--experimental-sqlite` flag -- which Lambda runtimes do not support.

**Why it happens:**
Netlify uses AWS Lambda runtimes, which lag behind Node.js releases. The `node22.x` Lambda runtime may pin to a specific minor version that predates the v22.13.0 stabilization of `node:sqlite`. There is no documented guarantee that Netlify's Lambda runtime uses the latest Node 22.x patch.

**How to avoid:**
1. Before any migration work, deploy a minimal test function that imports `node:sqlite` and runs a basic query. Verify it works on Netlify's actual Lambda runtime.
2. If `node:sqlite` is unavailable, switch to `better-sqlite3` connector with proper build configuration (add `better-sqlite3` to `pnpm.onlyBuiltDependencies` in package.json and ensure `.npmrc` has `enable-pre-post-scripts=true`).
3. If using an external database (Turso/D1), this pitfall is moot -- you would use the `libsql` or `d1` connector instead.

**Warning signs:**
- Netlify deploy succeeds but function returns 500 with "Cannot find module 'node:sqlite'" or "SQLite is not available"
- Build log shows Node version < 22.13.0
- Local dev works but deployed functions crash

**Phase to address:**
Phase 1 (Infrastructure Validation) -- test in the first deployment, before any feature work.

---

### Pitfall 4: `nuxt build` Output Structure Change Breaks Deploy Pipeline

**What goes wrong:**
The current deploy uses `nuxt build` (which runs `nuxt generate` implicitly via the prerender config) and deploys from `.output/public/` as a static site (`netlify deploy --prod --dir=.output/public --no-build`). SSR requires deploying the full `.output/` directory including the Nitro server bundle in `.output/server/`. Continuing to deploy only `.output/public/` will produce a site with no server -- SSR routes will 404 or fall back to the SPA shell with no data.

**Why it happens:**
SSG and SSR produce fundamentally different build artifacts:
- SSG: `.output/public/` contains all HTML, JS, CSS, and `_payload.json` files. No server needed.
- SSR: `.output/server/` contains the Nitro server bundle (deployed as a Netlify Function). `.output/public/` contains only static assets and prerendered pages.

Developers often change `nuxt.config.ts` settings without updating the deploy pipeline.

**How to avoid:**
1. Switch from manual `netlify deploy` to Netlify's built-in Nuxt framework detection. Add a `netlify.toml`:
```toml
[build]
  command = "nuxt build"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "22"
```
2. Netlify automatically detects Nuxt and deploys the server bundle as a Function. Do NOT use `--no-build` when SSR is enabled.
3. Alternatively, use the `@netlify/nuxt` module for tighter integration.
4. Remove the `--dir=.output/public` from the deploy script -- Netlify handles the output directory when building through its pipeline.

**Warning signs:**
- Deployed site shows blank pages or "Cannot GET /novels/mga/chapter-1" errors
- Netlify dashboard shows no Functions deployed
- `.output/server/` directory exists locally but was never uploaded

**Phase to address:**
Phase 1 (Infrastructure) -- update deploy pipeline before deploying any SSR routes.

---

### Pitfall 5: Sitemap Generation Timeout with 13K URLs in SSR Mode

**What goes wrong:**
The `@nuxtjs/sitemap` module currently generates 10 sitemaps (one per novel) at build time during SSG. In SSR mode, if sitemaps are not prerendered, they are generated dynamically on request. Generating a sitemap for a novel with 3,000+ chapters requires querying the database, building XML, and returning it -- all within Netlify's 60-second function timeout. With cold start + SQLite restoration + XML generation for 3K URLs, this could easily time out.

**Why it happens:**
The sitemap module queries Nuxt Content collections to discover URLs. In SSR mode without prerendering, each sitemap request triggers a fresh database query. Combined with cold start overhead, large sitemaps become slow or timeout.

**How to avoid:**
1. Prerender all sitemaps: add sitemap routes to `routeRules` or `nitro.prerender.routes`:
```typescript
routeRules: {
  '/sitemap.xml': { prerender: true },
  '/sitemap/pages.xml': { prerender: true },
  '/sitemap/mga.xml': { prerender: true },
  // ... all 10 novel sitemaps
}
```
2. Use SWR caching on sitemap routes (`swr: 86400` -- revalidate daily) if prerendering is not feasible.
3. The `@nuxtjs/sitemap` module supports `cacheMaxAgeSeconds` -- set it to avoid regenerating on every request.

**Warning signs:**
- Sitemap URLs return 504 Gateway Timeout
- Google Search Console reports "Sitemap could not be read"
- Netlify Function logs show timeout on sitemap routes

**Phase to address:**
Phase 2 (Route Configuration) -- configure sitemap prerendering alongside chapter prerendering.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Pure SSR for all routes (no hybrid) | Simpler config, no route rules | Every page request hits Lambda cold start; 64MB dump restoration; slow TTFB; Netlify bill spikes | Never for this project |
| Keep `nuxt generate` and add SSR later | No deploy pipeline changes | `nuxt generate` cannot use `routeRules` for hybrid rendering; forces full rewrite when SSR is needed | Never -- must switch to `nuxt build` |
| In-memory SQLite with full body content | No external DB dependency | 64MB dump restoration on every cold start; 5-10s TTFB; potential Lambda timeout | Only if < 1MB dump size |
| Skip prerendering chapter pages | Faster builds, simpler config | 13K routes served via Lambda; massive cold start penalty; high function invocation costs | Never for content that rarely changes |
| Keep manual `netlify deploy --dir=.output/public` | Familiar workflow | SSR routes silently broken; no server function deployed | Never once SSR is enabled |
| Ignore sitemap prerendering | Less config | Sitemap requests timeout with 13K URLs; SEO damage | Never for sites with > 1000 URLs |

---

## Integration Gotchas

Common mistakes when connecting components in this specific migration.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Netlify + Nuxt SSR | Deploying with `--no-build` and `--dir=.output/public` | Use Netlify's build pipeline or deploy full `.output/` including server bundle |
| Netlify + node:sqlite | Assuming Node 22 means node:sqlite works | Test with a canary function first; have better-sqlite3 as fallback |
| Nuxt Content v3 + serverless | Using in-memory SQLite with full body content dump | Prerender content-heavy pages; use external DB (Turso) for true SSR |
| @nuxtjs/sitemap + SSR | Not prerendering sitemaps | Add sitemap routes to `routeRules` with `prerender: true` |
| RSS server routes + cold start | Expecting fast response on first request | Add `swr` caching to RSS route rules; prerender RSS XML if content is static |
| localStorage + SSR | Accessing localStorage in `setup()` or computed properties | Already handled well with `import.meta.client` guards; maintain this pattern |
| `useAsyncData` + SSR | Assuming same behavior as SSG | In SSR, runs on every request (not cached between users); add SWR/ISR caching for expensive queries |
| `nuxt generate` + `routeRules` | Trying hybrid rendering with `nuxt generate` | `routeRules` like `swr`, `isr` require `nuxt build` -- `nuxt generate` only supports prerender |

---

## Performance Traps

Patterns that work in SSG but fail in SSR/serverless.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full SQL dump restoration on cold start | 3-10s TTFB on first request after idle period | Prerender all static content; use SWR for dynamic routes; consider external DB | Always on serverless with dumps > 1MB |
| 10 parallel collection queries in RSS route | RSS request times out (60s limit) with cold start + 10 DB queries | Prerender RSS feeds; or cache with `swr: 3600` | First request after cold start with large collections |
| Chapter listing page querying all chapters at runtime | Novel index page with 3K chapters takes 5+ seconds to render | Prerender novel listing pages; or paginate server-side | > 500 chapters per novel |
| No CDN caching for SSR responses | Every visitor triggers a Lambda invocation | Use `routeRules` with `swr` or `isr` for cacheable content | > 10 concurrent users |
| Netlify Function invocation costs | Monthly bill spikes from 13K unique chapter URLs being SSR'd | Prerender all chapter pages; SSR only truly dynamic routes | > 1000 daily visitors |

---

## Security Mistakes

Domain-specific security issues for SSR migration.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing database connection strings in client bundle | External DB credentials (Turso auth token) leaked to browser | Use `runtimeConfig` (not `appConfig`) for secrets; verify they only appear in server bundle |
| Server-side localStorage access attempt in SSR | Crash or undefined behavior when server code reaches localStorage | Already mitigated with `import.meta.client` guards; audit all composables before enabling SSR |
| Unsanitized query parameters reaching database queries | SQL injection via route params in SSR mode | Nuxt Content's `queryCollection` API parameterizes queries; avoid raw SQL |

---

## UX Pitfalls

User experience risks during the SSR transition.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cold start latency on first visit | Users see 3-8s blank page; high bounce rate | Prerender popular entry pages; use SWR for warm cache |
| Hydration flash for reading progress | "Continue Reading" section appears, disappears, reappears during hydration | Already using `<ClientOnly>` -- maintain this; consider `useCookie` instead of localStorage for SSR-compatible reading progress |
| Different rendering between SSR and client navigation | SSR page shows no reading progress; client navigation shows it | This is expected behavior -- document it; `<ClientOnly>` fallback slot can show a loading skeleton |
| Stale cached pages with SWR | User sees outdated chapter list after new chapters are added | Set appropriate `swr` TTL (e.g., 3600s for chapter listings); use `isr: true` for time-sensitive routes |
| Missing prerendered pages for deep links | User shares a chapter URL; recipient gets Lambda cold start delay | Prerender all chapter pages -- they are static content |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces after SSR migration.

- [ ] **Deploy pipeline:** Netlify deploys server bundle, not just public dir -- verify Functions tab shows deployed function
- [ ] **node:sqlite compatibility:** Deployed function can actually import and use node:sqlite -- test with a `/api/health` endpoint that queries the DB
- [ ] **Chapter prerendering:** All 13K chapter pages are still prerendered after switching to `nuxt build` -- verify `.output/public/novels/` contains HTML files
- [ ] **Sitemap prerendering:** All 10 sitemaps + sitemap index are prerendered -- verify `.output/public/sitemap.xml` exists
- [ ] **RSS prerendering:** RSS feeds are prerendered or have SWR caching -- test cold start response time
- [ ] **Cold start TTFB:** Non-prerendered routes respond within 3 seconds including cold start -- test after 30 minutes of inactivity
- [ ] **SQL dump size in bundle:** Function bundle size is under 50MB zipped -- check Netlify deploy logs for bundle size
- [ ] **Hydration mismatches:** No console warnings about hydration mismatches -- test home page, novel listing, chapter reader
- [ ] **Reading progress:** `<ClientOnly>` wrapper still works in SSR mode; no flash of content -- test with populated localStorage
- [ ] **404 handling:** Non-existent chapter URLs return proper 404, not Lambda errors -- test `/novels/mga/nonexistent-chapter`
- [ ] **routeRules applied:** Prerender rules are actually applied -- check Nitro output logs during build for prerendered route count

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Lambda bundle too large (>50MB) | MEDIUM | Strip body content from collections used at runtime; prerender all body-dependent routes; redeploy |
| node:sqlite unavailable in Lambda | LOW | Switch `sqliteConnector` to `better-sqlite3`; add to `pnpm.onlyBuiltDependencies`; redeploy |
| Cold start > 10 seconds | MEDIUM | Add `swr: 3600` to all SSR routes via routeRules; or switch to external DB (Turso); redeploy |
| Sitemap timeout | LOW | Add sitemap routes to `nitro.prerender.routes`; redeploy |
| Deploy pipeline broken (no server) | LOW | Add `netlify.toml` with proper build config; switch to Netlify build pipeline; redeploy |
| Hydration mismatches in production | LOW-MEDIUM | Audit all composables for browser API usage; wrap in `<ClientOnly>` or `onMounted`; redeploy |
| Chapter pages not prerendered | MEDIUM | Verify `routeRules` prerender patterns match chapter URL structure; add explicit `nitro.prerender.routes` hook if patterns don't work |
| Reading progress lost during migration | LOW | localStorage data is client-side and unaffected by server changes; no recovery needed -- just ensure the composable still reads it correctly |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SQL dump too large for Lambda | Phase 1 (Architecture Decision) | Decide hybrid rendering strategy; measure `.output/server/` bundle size |
| Cold start penalty | Phase 1 (Architecture Decision) | Choose between in-memory SQLite + prerender vs. external DB |
| node:sqlite Lambda compatibility | Phase 1 (Infrastructure Validation) | Deploy canary function; test `node:sqlite` import |
| Deploy pipeline broken | Phase 1 (Infrastructure) | First SSR deploy succeeds; Netlify Functions tab shows function |
| Chapter prerendering with routeRules | Phase 2 (Route Configuration) | `nuxt build` output contains 13K+ HTML files in `.output/public/novels/` |
| Sitemap timeout | Phase 2 (Route Configuration) | Sitemaps prerendered; test with `curl` after deploy |
| RSS cold start | Phase 2 (Route Configuration) | RSS routes prerendered or cached; test TTFB < 3s |
| useAsyncData SSR behavior change | Phase 3 (Component Audit) | Test all pages in SSR dev mode; verify no unexpected re-fetching |
| Hydration mismatches | Phase 3 (Component Audit) | Zero hydration warnings in browser console across all page types |
| Reading progress SSR compatibility | Phase 3 (Component Audit) | `<ClientOnly>` wrapper verified; no flash of wrong content |
| Function invocation costs | Phase 4 (Monitoring) | Track Netlify Function invocations; verify prerendered routes bypass Lambda |

---

## Sources

### Official Documentation (HIGH confidence)
- [Nuxt Content v3 Serverless Hosting](https://content.nuxt.com/docs/deploy/serverless) -- SQL dump restoration, cold start warnings, external DB recommendations
- [Nuxt Content v3 Netlify Deployment](https://content.nuxt.com/docs/deploy/netlify) -- zero-config detection, Node 20+ requirement
- [Nuxt Content v3 Database Configuration](https://content.nuxt.com/docs/advanced/database) -- dump mechanism, integrity checks, connector options
- [Nuxt Content v3 Configuration](https://content.nuxt.com/docs/getting-started/configuration) -- SQLite connector options (native, better-sqlite3, libsql, d1, postgresql)
- [Netlify Functions Overview](https://docs.netlify.com/build/functions/overview/) -- 1024MB memory, 60s timeout, 50MB zipped bundle, 6MB response payload
- [Netlify Node 22 Default](https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981) -- Node 22 default since Feb 2025
- [Node.js SQLite API](https://nodejs.org/api/sqlite.html) -- Stability 1.1, stabilized in v22.13.0 and v23.4.0
- [Nuxt Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering) -- `routeRules`, hybrid rendering, prerender vs SSR
- [Nuxt Hydration Best Practices](https://nuxt.com/docs/4.x/guide/best-practices/hydration) -- localStorage, `<ClientOnly>`, `onMounted`

### Community/Verified Sources (MEDIUM confidence)
- [Hydration Mismatch with localStorage -- Nuxt Discussion #25500](https://github.com/nuxt/nuxt/discussions/25500) -- confirmed patterns and solutions
- [How to use localStorage with SSR -- Nuxt Discussion #27793](https://github.com/nuxt/nuxt/discussions/27793) -- useCookie alternative
- [Fix SSR Hydration Mismatch in Nuxt (2026)](https://oneuptime.com/blog/post/2026-01-24-fix-ssr-hydration-mismatch-nuxt/view) -- current best practices
- [Issues deploying Nuxt3 with SSR to Netlify -- Issue #24764](https://github.com/nuxt/nuxt/issues/24764) -- vue/server-renderer missing in bundle
- [SQLITE_CANTOPEN on Netlify](https://answers.netlify.com/t/error-sqlite-connection-error-sqlite-cantopen-unable-to-open-database-file/99994) -- file system restrictions in Lambda
- [Netlify Functions size limitations](https://answers.netlify.com/t/functions-failing-to-deploy-despite-local-bundle-being-smaller-than-50mb/46128) -- 50MB zipped AWS Lambda limit

### Project-Specific Data (HIGH confidence -- measured from this codebase)
- Pre-body-stripping SQL dump: ~64MB
- Post-body-stripping SQL dump: ~2.6MB
- Total chapters: 13,318 across 10 novels
- Total markdown content: ~170MB
- Current build time: ~10 minutes for 26,694 routes
- Current SQLite connector: `native` (node:sqlite via Node 22.5+)

---
*Pitfalls research for: SSG-to-SSR migration on Netlify -- Nuxt 4.3.1 + Nuxt Content v3 (13K chapters)*
*Researched: 2026-02-18*
