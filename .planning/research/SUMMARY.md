# Project Research Summary

**Project:** Schaden Novel — SSG-to-SSR Migration
**Domain:** Content-heavy Nuxt 4 site on Netlify (13,318 chapters, 10 novels)
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project migrates a proven SSG deployment (26,694 prerendered HTML files, 10-minute builds, manual `netlify deploy --prod --dir=.output/public`) to a hybrid SSR model on Netlify. The motivation is twofold: build speed (10-minute rebuilds for content updates) and new SSR-enabled capabilities (full-content RSS, on-demand rendering). Research identifies two paths — Path A (hybrid prerender + SSR, zero new dependencies, builds stay ~10 min) and Path B (Turso + ISR, builds drop to 1-2 min, one new dependency). The recommendation is to start with Path A to prove Netlify SSR works before committing to an external database.

The core change is mechanical: remove the `nitro.prerender.routes` array and `prerender:routes` hook that force static-only output, add `routeRules` for hybrid rendering control, and switch the deploy pipeline from `--dir=.output/public --no-build` to Netlify CI (add `netlify.toml`). Every existing page component, composable, and server route works unchanged in SSR mode. The fundamental challenge is the constraint that the 354 MB SQLite database (64 MB unstripped SQL dump) must be available at runtime in a serverless function with a 50 MB zipped bundle limit and 60-second timeout. The mitigation is to continue prerendering all 13K chapter pages at build time — the Lambda only handles metadata-light routes (home, catalog, RSS) that need no body content.

The highest-risk unknowns are cold start latency with SQLite `/tmp` restoration and whether Netlify's Lambda runtime provides `node:sqlite` on the specific Node 22.x minor version in use. Both must be validated in the first deployment (a canary health-check route) before any further migration work. ISR caching (`isr: true` for chapter pages) is the performance safety net: CDN-cached responses serve most requests, making cold starts rare and user-invisible.

## Key Findings

### Recommended Stack

The migration requires no new packages for Path A. The existing stack (Nuxt 4.3.1, Nuxt Content v3, native SQLite connector, `@nuxtjs/sitemap`, `feed`) works identically in SSR mode. The build command is already `nuxt build` in `package.json` — the real change is that the `nuxt.config.ts` prerender config is what currently forces static-only output. Removing that config and adding `routeRules` switches the build to SSR mode.

**Core technologies:**
- `nuxt build` + Netlify preset auto-detection: produces Nitro server function + static assets — the fundamental migration mechanism, zero additional config required
- `routeRules` in `nuxt.config.ts`: replaces the `nitro.prerender.routes` array and `prerender:routes` hook; controls per-route rendering strategy (prerender/isr/swr/ssr) as the single control surface
- `netlify.toml` (new file): required for Netlify CI builds; sets `NODE_VERSION=22` and publish directory; eliminates the fragile manual deploy script
- `content.database.filename: '/tmp/contents.sqlite'`: tells Nuxt Content where to restore the SQL dump on Lambda (only writable path on AWS Lambda)
- `@netlify/nuxt` module (optional, recommended): provides local dev parity for ISR, Blobs, cache invalidation; zero-config

**Path B only (defer unless cold start > 3s):**
- `@libsql/client`: Turso/LibSQL driver — replaces bundled SQLite dump with a remote database query; eliminates cold start restore penalty entirely

### Expected Features

**Must have — P1 (required for migration to be functional):**
- `routeRules` hybrid rendering config — foundation for all other SSR features
- Remove `nitro.prerender.routes`, `prerender:routes` hook, and `getChapterSlugs()` function (26K route enumeration via `readdirSync`)
- Update deploy pipeline from `--dir=.output/public --no-build` to Netlify CI (netlify.toml)
- Verify all existing pages work in SSR (home, catalog, chapter reader, nav, RSS, sitemap, reading progress, dark mode)
- Sitemap prerendering — 13K URLs in SSR without prerender will timeout the Lambda

**Should have — P2 (high value, leverages SSR):**
- Full-content RSS feeds — `rawbody` is accessible at SSR render time; requires adding field to collection schema and a markdown-to-HTML pipeline in server routes
- ISR cache tuning — fine-grained TTLs per route type (chapters: `isr: true`, RSS: `isr: 3600`, sitemaps: `prerender: true`)
- Elimination of body-stripping pipeline — possible if `_payload.json` from CDN replaces WASM SQLite download in ISR mode (must verify in DevTools)

**Defer — P3 (only if cold start or operational problems arise):**
- On-demand cache invalidation webhook — `purgeCache()` for post-import CDN purging
- External database migration to Turso — only if cold start with SQLite `/tmp` exceeds 3 seconds
- Streamlined import pipeline (`import -> deploy -> purge` in one command)

**Anti-features (do not build during migration):**
- Edge Functions for SSR — Deno runtime, `node:sqlite` unavailable, memory limits incompatible with 64 MB database
- Full SSR with no caching — 13K unique Lambda invocations is expensive and slow; use ISR
- Server-side reading progress — scope explosion; localStorage is adequate

### Architecture Approach

The target architecture is a thin Netlify Function (AWS Lambda, Node 22) running the Nitro server, backed by a per-request SQLite database restored into `/tmp` from a bundled SQL dump. CDN caches ISR responses globally with `durable` directives. Per-novel collections (10 separate dumps) mean only one novel's dump loads on any given request, limiting cold start SQL restoration to a fraction of the full dataset. Client-side navigation fetches `_payload.json` from CDN (Nuxt 4.3+ payload extraction) rather than downloading the full WASM SQLite dump.

**Major components:**
1. `nuxt.config.ts` — single control surface: `routeRules` (prerender/ISR per route pattern), `content.database` (SQLite `/tmp` path), module list including `@netlify/nuxt`
2. Netlify CDN edge — serves ISR-cached HTML and `_payload.json`; chapter pages hit CDN after first render, bypassing Lambda entirely
3. Netlify Function (Lambda, Node 22) — Nitro server handles cache misses; restores per-novel SQLite dump to `/tmp` on cold start; renders Vue SSR and returns HTML + CDN cache headers
4. `content/` directory — unchanged; 13K markdown files parsed at build time into 10 per-novel SQL dumps bundled into the server function
5. `server/routes/` — RSS server routes already use server-side `queryCollection(event, ...)`; work unchanged in SSR
6. `app/` pages and composables — unchanged; `useAsyncData` + `queryCollection` work identically in SSR; localStorage composables already guarded with `import.meta.client`

**Hybrid rendering decision matrix:**

| Route | Strategy | Rationale |
|-------|----------|-----------|
| `/`, `/novels` | `prerender: true` | Lightweight, changes only on deploy |
| `/novels/:novel` | `isr: true` | Chapter listings, rarely changes |
| `/novels/:novel/:chapter` | `isr: true` | Immutable content, cache until redeploy |
| `/rss.xml`, `/novels/*/rss.xml` | `isr: 3600` | Hourly refresh for feed readers |
| `/sitemap*.xml` | `prerender: true` | 13K URLs will timeout Lambda if dynamic |
| `/200.html`, `/404.html` | `prerender: true` | Error pages must be static |

### Critical Pitfalls

1. **SSR requires full chapter bodies — breaks body-stripping strategy** — The current 64 MB dump is stripped to 2.6 MB post-build because all chapter HTML is pre-rendered. SSR chapter rendering would need the full unstripped dump, which exceeds Lambda bundle limits and has prohibitive cold start cost. Prevention: keep chapter pages prerendered via `routeRules`. Only route lightweight metadata-dependent pages (home, catalog) through SSR. If true chapter SSR is ever needed, use Turso (Path B).

2. **Cold start SQLite restore penalty** — Nuxt Content restores the SQL dump into in-memory SQLite on the first query of each cold Lambda instance. Estimated 2-10+ seconds for large dumps. Prevention: use `isr: true` for chapter pages so CDN serves cached responses; only the very first visitor to each chapter post-deploy triggers a Lambda invocation. ISR caching makes cold starts rare and backstage.

3. **`node:sqlite` availability on Netlify Lambda runtime** — `node:sqlite` was stabilized in v22.13.0; Netlify's Lambda runtime may pin an older Node 22.x minor version. Prevention: deploy a canary `/api/health` endpoint that imports `node:sqlite` and runs a query before any other migration work. Fallback: switch connector to `better-sqlite3` (add to `pnpm.onlyBuiltDependencies`).

4. **Deploy pipeline silently broken after SSR switch** — Deploying only `.output/public/` (current script) after switching to SSR produces a site with no server function; SSR routes return 404 with no visible error. Prevention: add `netlify.toml` and use Netlify CI builds so the framework detection handles the full `.netlify/functions-internal/server/` output structure automatically.

5. **Sitemap generation timeout with 13K URLs in SSR** — Generating 10 sitemaps dynamically triggers cold start + multiple DB queries per request, easily exceeding the 60-second Lambda timeout. Prevention: add all sitemap routes to `routeRules` with `prerender: true`; verify `.output/public/sitemap*.xml` files exist after build.

## Implications for Roadmap

Research converges on a 4-phase structure with a hard gate at Phase 1. Each phase validates a critical assumption before the next phase can safely proceed. The ARCHITECTURE.md "Phase 1 is the critical gate" principle is reinforced by PITFALLS.md: all five critical pitfalls are detectable in Phase 1, and most recovery paths are cheap only if caught early.

### Phase 1: Infrastructure Validation

**Rationale:** The `node:sqlite` Lambda compatibility and deploy pipeline change are hard blockers. Nothing can be validated until a Netlify Function actually serves requests. This must gate all other phases — if cold start > 3s or `node:sqlite` fails, the architecture changes before investing in config refactor.

**Delivers:** Working SSR deployment on Netlify with a verified deploy pipeline and a canary health-check endpoint that imports and queries SQLite. Measured cold start TTFB. Go/no-go decision for SQLite vs Turso.

**Addresses:** Deploy pipeline (Pitfall 4), `node:sqlite` compatibility (Pitfall 3), cold start baseline measurement (Pitfall 2)

**Avoids:** Discovering architecture-blocking issues in Phase 2 after large config changes

**Recommended actions:**
- Add `netlify.toml` with `command = "nuxt build"`, `publish = ".output/public"`, `NODE_VERSION = "22"`
- Add `@netlify/nuxt` to modules in `nuxt.config.ts`
- Add `content.database.filename: '/tmp/contents.sqlite'` to content config
- Deploy to Netlify staging with minimal changes (do NOT yet remove prerender config)
- Add `/api/health` server route that imports `node:sqlite`, queries a collection, returns 200
- Measure cold start TTFB after 30 min inactivity
- GATE: if cold start > 3s, pivot to Turso (Path B) before Phase 2

**Research flag:** Does not need deeper research — well-documented patterns, official Nuxt/Netlify docs.

### Phase 2: Hybrid Rendering Configuration

**Rationale:** Once SSR deploys and cold start is validated, replace the prerender machinery with `routeRules`. This is the largest config change but carries low risk because the patterns are fully documented. Sitemap prerendering must be done here to avoid SEO issues before cutover.

**Delivers:** Full `routeRules` hybrid config; removal of prerender hook and `readdirSync` route generation; ISR for novel/chapter pages; prerendered sitemaps and home/catalog. Build time drops because the 26K route enumeration is gone (though prerender still runs for prerendered routes).

**Addresses:** routeRules setup (P1), sitemap prerendering (Pitfall 5), ISR caching (P2), removal of `getChapterSlugs()` dead code

**Avoids:** Pitfall 1 (full chapter bodies at runtime) — chapters remain prerendered; Pitfall 5 (sitemap timeout) — sitemaps prerendered; Pitfall 4 (deploy pipeline) — already fixed in Phase 1

**Recommended actions:**
- Remove `getChapterSlugs()`, `nitro.prerender.routes`, `prerender:routes` hook, `nitro.prerender.concurrency`, `nitro.prerender.crawlLinks`
- Add `routeRules` per the decision matrix above
- Update `package.json` scripts: `preview` -> `nuxt preview`, `deploy` -> `netlify deploy --prod --no-build`
- Verify build output: `.output/public/novels/` still contains 13K HTML files (chapters still prerendered via routeRules)
- Verify CDN cache headers on ISR routes (check `Netlify-CDN-Cache-Control` response header)
- Test all 10 novels, chapter reader, RSS, and sitemap in staging

**Research flag:** Does not need deeper research — `routeRules` is the official Nuxt hybrid rendering API.

### Phase 3: SSR-Enabled Features

**Rationale:** Once hybrid rendering is stable and ISR-cached pages are verified, implement features that become possible only with SSR. Full-content RSS is the highest-value improvement. Body-stripping elimination reduces build complexity but depends on confirming `_payload.json` replaces WASM SQLite downloads.

**Delivers:** Full-content RSS feeds (chapter markdown/HTML in `<content:encoded>`); fine-tuned cache headers per route; potential elimination of `scripts/strip-dump-bodies.mjs`.

**Addresses:** Full-content RSS (P2), ISR cache tuning (P2), body-stripping elimination (P1 simplification)

**Recommended actions:**
- Add `rawbody: z.string()` to relevant collection schemas in `content.config.ts`
- Update RSS server routes to include `rawbody` and convert markdown to HTML for `<content:encoded>` (evaluate `nuxt-content-body-html` module vs manual remark pipeline)
- Open a chapter page in DevTools Network tab; confirm no SQL dump download occurs with ISR active
- If no dump download: remove `scripts/strip-dump-bodies.mjs` and the post-build step that calls it

**Research flag:** Needs targeted research during planning. Two approaches exist for full-content RSS (`rawbody` field vs `nuxt-content-body-html` module v4.0.4) with different tradeoffs. The markdown-to-HTML pipeline inside a server route has caveats (no `ContentRenderer` server-side). Use `gsd:research-phase` for this phase.

### Phase 4: Validation and Monitoring

**Rationale:** Validate the full site in production and establish performance baselines. Cold start frequency and function invocation costs are production unknowns that cannot be measured in staging.

**Delivers:** Full smoke test across all 10 novels; cold start monitoring; CDN cache hit rate tracking; comparison against SSG baseline; decision point for Turso migration if needed.

**Addresses:** Cold start risk (Pitfall 2), function invocation costs, overall migration completeness

**Recommended actions:**
- Smoke test: all 10 novels, chapter navigation (first/last chapter boundaries), RSS feeds, sitemaps, reading progress persistence, dark mode, resume reading dropdown
- Monitor Netlify Function invocations (should drop as ISR fills CDN cache)
- Monitor cold start frequency via Function logs (`INIT_START` events)
- Compare build time: target <2 min vs current 10 min
- If cold start TTFB > 3s on any route: evaluate Turso migration (Path B)

**Research flag:** Does not need deeper research — standard monitoring and validation patterns.

### Phase Ordering Rationale

- Phase 1 before everything: `node:sqlite` Lambda compatibility and deploy pipeline are hard blockers detectable only via deployment; cold start baseline informs all subsequent architectural decisions
- Phase 2 before Phase 3: ISR caching must be working and verified before enabling SSR features that depend on it (body content, cache invalidation)
- Body-stripping stays until Phase 3 confirms `_payload.json` replaces WASM SQLite downloads — removing it prematurely would expose 64 MB dumps to browsers
- Phase 4 in production, not staging: CDN cache fill behavior and Lambda warm/cold cycle patterns only emerge under real traffic

### Research Flags

Phases needing deeper research during planning:
- **Phase 3 (Full-content RSS):** Two implementation approaches (`rawbody` schema field vs `nuxt-content-body-html` module); markdown-to-HTML pipeline inside server routes has edge cases; module maintenance status as of Feb 2026 needs checking

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** Official Nuxt/Netlify docs cover the deploy pipeline change exactly; `node:sqlite` canary test is a one-route deployment
- **Phase 2 (Routing):** `routeRules` is the official Nuxt hybrid rendering API with extensive official documentation
- **Phase 4 (Validation):** Standard smoke testing and monitoring

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Nuxt and Netlify docs; both Path A and Path B are verified deployment patterns; all existing dependencies confirmed compatible |
| Features | MEDIUM | SSR/ISR routing behavior verified via official docs; cold start performance at 13K-chapter scale is not benchmarked; `_payload.json` replaces WASM SQLite is documented but unverified at this scale |
| Architecture | MEDIUM-HIGH | Component boundaries and data flow verified via official docs; cold start latency and `/tmp` SQLite persistence on Lambda are project-specific unknowns |
| Pitfalls | MEDIUM-HIGH | Netlify limits (50 MB bundle, 60s timeout, 1024 MB memory) verified from official docs; `node:sqlite` Lambda minor-version risk is MEDIUM (undocumented guarantee) |

**Overall confidence:** MEDIUM-HIGH — The approach is well-grounded in official documentation. Two critical unknowns (cold start with 64 MB dump, `node:sqlite` on specific Lambda version) cannot be resolved until the Phase 1 canary deployment runs.

### Gaps to Address

- **Cold start latency with full SQL dump:** No benchmark exists for Nuxt Content dump restoration at 13K-chapter scale on Netlify Lambda. Must measure in Phase 1 with the health-check canary after 30 min idle. If > 3s, architecture shifts to Turso (Path B) before Phase 2 begins. This is the highest-impact unknown.

- **`node:sqlite` on Netlify's Lambda Node 22.x minor version:** `node:sqlite` stabilized in v22.13.0. Netlify may pin an older 22.x patch. Cannot determine without deploying. Phase 1 covers this with the canary. Fallback path (`better-sqlite3`) is well-understood.

- **Client-side SQL dump downloads in ISR mode:** ARCHITECTURE.md asserts that `_payload.json` from CDN eliminates WASM SQLite downloads in SSR/ISR mode. This is documented behavior (Nuxt 4.3+) but unverified for this specific project's query patterns. Must confirm in Phase 3 DevTools before removing the body-stripping pipeline.

- **Full-content RSS implementation path:** Two approaches with different tradeoffs. `rawbody` field requires manual markdown-to-HTML; `nuxt-content-body-html` module (v4.0.4) needs maintenance status check. Research in Phase 3.

## Sources

### Primary (HIGH confidence)
- [Deploy Nuxt to Netlify](https://nuxt.com/deploy/netlify) — zero-config preset detection, build output structure
- [Nuxt on Netlify](https://docs.netlify.com/frameworks/nuxt/) — framework docs, `@netlify/nuxt` module, Node version requirements
- [Netlify Platform Primitives with Nuxt 4](https://www.netlify.com/blog/platform-primitives-with-nuxt-4/) — ISR, Blobs, streaming, Functions v2
- [ISR and Advanced Caching with Nuxt v4 on Netlify](https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/) — routeRules for ISR, CDN cache headers, purgeCache API
- [Nuxt Content v3 Serverless Hosting](https://content.nuxt.com/docs/deploy/serverless) — database adapters, cold start dump restoration behavior
- [Nuxt Content v3 Database Architecture](https://content.nuxt.com/docs/advanced/database) — dump generation at build, runtime restoration, integrity checks
- [Netlify Functions Overview](https://docs.netlify.com/build/functions/overview/) — 50 MB zip / 250 MB unzip limits, 1024 MB memory, 60s timeout
- [Nuxt Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering) — routeRules syntax: prerender, isr, swr, ssr
- [Node.js SQLite API](https://nodejs.org/api/sqlite.html) — stabilized in v22.13.0

### Secondary (MEDIUM confidence)
- [Nuxt Content Raw Content](https://content.nuxt.com/docs/advanced/raw-content) — `rawbody` schema field availability
- [nuxt-content-body-html module](https://github.com/dword-design/nuxt-content-body-html) — v4.0.4, Content v3 support, maintenance status needs checking
- [AWS Lambda cold start with SQLite](https://turso.tech/blog/get-microsecond-read-latency-on-aws-lambda-with-local-databases) — Turso marketing, but plausible technical claims on restore latency
- Existing codebase inspection — `nuxt.config.ts`, `content.config.ts`, server routes, composables, pages — authoritative for current behavior

### Tertiary (LOW confidence)
- Netlify Functions cold start forum estimates — general 50-500ms estimates; actual performance at 13K-chapter scale unknown

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*
