# Phase 5: SSR Deploy Pipeline - Research

**Researched:** 2026-02-19
**Domain:** Netlify SSR deployment, Nuxt Content v3 SQLite in serverless, Lambda runtime constraints
**Confidence:** MEDIUM (critical unknowns around bundle size and cold start)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No locked decisions -- all areas deferred to Claude's discretion.

### Claude's Discretion

All areas below are at Claude's discretion -- user deferred all decisions for this infrastructure phase.

**Cutover strategy**
- Direct switch vs staging preview, rollback approach, keeping current SSG site operational during transition

**Pivot threshold**
- When to stop troubleshooting node:sqlite/cold-start issues and pivot to Turso
- What signals trigger the pivot decision

**CI migration**
- Transition from local build + `netlify deploy --prod` to Netlify CI
- Branch deploy rules, build configuration, environment variables

**Health endpoint**
- Scope of checks (node:sqlite, query latency, content availability)
- Response format and monitoring approach

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUILD-01 | Build switches from `nuxt generate` to `nuxt build` for SSR output | `nuxt build` produces `.output/` with server function + static assets. Nitro auto-detects Netlify preset. See Architecture Patterns. |
| BUILD-02 | `netlify.toml` configures Netlify CI build with Node 22 | Node 22 is default on Netlify since Feb 2025. Create project-level `netlify.toml` with build command and publish dir. See Code Examples. |
| BUILD-03 | `@netlify/nuxt` module added for ISR and CDN integration | Module v0.2.24 provides dev parity but ISR works without it (Nitro auto-detects). Add for dev parity and future CDN features. See Standard Stack. |
| BUILD-04 | Deploy pipeline produces working SSR site on Netlify | Push-to-deploy via Netlify CI. Branch deploys for staging. Critical blocker: SQLite connector and bundle size. See Common Pitfalls. |
</phase_requirements>

## Summary

Switching from `nuxt generate` (SSG) to `nuxt build` (SSR) on Netlify is architecturally straightforward -- Nitro auto-detects the Netlify environment and produces the right server function output. However, this project has two critical blockers that make the transition high-risk:

**Blocker 1: `node:sqlite` is NOT available on AWS Lambda.** The project currently uses `experimental.sqliteConnector: 'native'` which relies on Node.js's experimental `node:sqlite` module. AWS Lambda's Node.js 22 runtime intentionally disables experimental features and does not allow enabling them via `NODE_OPTIONS`. The connector must be switched to `better-sqlite3` for the server function to work at all.

**Blocker 2: The content database is dangerously large for Lambda.** The `sql_dump.txt` is 160MB uncompressed / 48MB gzipped. Lambda functions have a 50MB zipped bundle limit. Whether this fits depends on how Nitro packages the dump (server asset vs public asset) and how much additional code is in the bundle. This is the primary risk factor and may require pivoting to Turso/LibSQL if the bundle exceeds the limit.

**Primary recommendation:** Switch to `better-sqlite3` connector, attempt `nuxt build` for Netlify, and measure both bundle size and cold start TTFB before committing. If bundle exceeds 50MB or cold start exceeds 3s, pivot to Turso immediately.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuxt | latest (4.3.1) | SSR framework | Already in use; `nuxt build` is the SSR build command |
| @nuxt/content | latest | Content management with SQLite | Already in use; provides sql_dump and database restoration |
| better-sqlite3 | latest | SQLite connector for server function | Required because `node:sqlite` is unavailable on Lambda; default Nuxt Content connector |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @netlify/nuxt | 0.2.24 | Dev parity with Netlify platform | Add for local dev testing of serverless functions, blobs, and ISR caching |
| @netlify/functions | latest | Cache purge API | Only if implementing tag-based cache invalidation (Phase 6+) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | Turso/LibSQL | External DB eliminates bundle size concern but adds network latency and a new dependency; use as pivot if SQLite bundle too large |
| better-sqlite3 | sqlite3 (npm) | Less widely supported on serverless platforms; better-sqlite3 is the Nuxt Content default |
| Netlify Functions | Netlify Edge Functions | Edge uses Deno/V8 runtime; `node:sqlite` unavailable, memory limits even tighter, and `durable` cache directive not supported |

**Installation:**
```bash
pnpm add -D @netlify/nuxt
pnpm add better-sqlite3
```

## Architecture Patterns

### Build Output Structure (`nuxt build` for Netlify)
```
.output/
├── public/                    # Static assets (served from CDN)
│   ├── __nuxt_content/        # Client-side SQL dumps per collection
│   │   ├── atg/sql_dump.txt
│   │   ├── mga/sql_dump.txt
│   │   └── ...
│   ├── _nuxt/                 # Client JS/CSS bundles
│   └── ...
├── server/
│   ├── index.mjs              # Server function entry point
│   └── chunks/                # Code-split server chunks
└── nitro.json                 # Build metadata
```

Netlify repackages this into:
```
.netlify/
├── functions-internal/
│   └── server/                # Lambda function (zipped, 50MB limit)
└── publish/                   # CDN-served static files (no size limit)
```

### Pattern 1: SSR with ISR Route Rules
**What:** Configure routes to be server-rendered on first request, then cached on CDN
**When to use:** Chapter pages -- too many to prerender, but content rarely changes
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/novels': { prerender: true },
    '/novels/*': { prerender: true },       // Novel index pages
    '/novels/**': { isr: true },            // Chapter pages -- ISR
  },
})
```
Source: https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/

### Pattern 2: SQLite In-Memory for Serverless
**What:** Configure Nuxt Content to use in-memory SQLite on serverless (restored from dump on each cold start)
**When to use:** When deploying to Lambda/serverless where filesystem is ephemeral
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  content: {
    database: {
      type: 'sqlite',
      filename: ':memory:',   // In-memory -- restored from dump on cold start
    },
    experimental: {
      sqliteConnector: 'better-sqlite3',  // NOT 'native' -- node:sqlite unavailable on Lambda
    },
  },
})
```
Source: https://content.nuxt.com/docs/deploy/serverless

### Pattern 3: Turso/LibSQL Fallback (if SQLite bundle too large)
**What:** Use external database instead of bundled SQLite
**When to use:** If Lambda bundle exceeds 50MB or cold start exceeds 3s
```typescript
// nuxt.config.ts -- PIVOT configuration
export default defineNuxtConfig({
  content: {
    database: {
      type: 'libsql',
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
  },
})
```
Source: https://content.nuxt.com/docs/deploy/serverless

### Anti-Patterns to Avoid
- **Using `node:sqlite` on serverless:** The native connector requires `--experimental-sqlite` flag, which AWS Lambda does not support. Always use `better-sqlite3` or an external database.
- **Leaving `prerender:routes` hook for SSR:** The current hook enumerates 13K chapters for prerendering. In SSR mode, chapters should use ISR, not prerendering. The hook becomes unnecessary (cleanup is Phase 6).
- **Stripping body from server-side dumps:** The body-stripping script was designed for SSG where pre-rendered HTML already contained content. In SSR, the server needs body content in the database to render pages. Do NOT run strip-dump-bodies.mjs on server-side dumps.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Netlify function packaging | Custom bundling scripts | Nitro auto-detect + `netlify` preset | Nitro handles _redirects, function entry points, asset splitting automatically |
| ISR caching | Custom cache headers | `routeRules: { isr: true }` | Nuxt/Nitro generates correct `Netlify-CDN-Cache-Control` headers |
| Database restoration | Manual dump loading logic | Nuxt Content built-in dump restoration | Content module handles dump→SQLite restoration on cold start automatically |
| Health check routing | Manual Lambda handler | Nitro server routes (`server/api/health.ts`) | Server routes are auto-bundled into the function |

**Key insight:** The Nuxt + Nitro + Netlify stack handles nearly all deployment concerns automatically. The main engineering work is configuration, not custom code.

## Common Pitfalls

### Pitfall 1: node:sqlite Unavailable on Lambda (CRITICAL)
**What goes wrong:** Server function crashes on cold start with `Cannot find module 'node:sqlite'` or similar error
**Why it happens:** AWS Lambda Node.js 22 runtime disables experimental features. The `--experimental-sqlite` flag cannot be passed via NODE_OPTIONS.
**How to avoid:** Change `experimental.sqliteConnector` from `'native'` to `'better-sqlite3'` in nuxt.config.ts. Add `better-sqlite3` as a dependency.
**Warning signs:** Function invocation errors in Netlify dashboard, 500 responses on all SSR pages
**Confidence:** HIGH -- verified via AWS Lambda Node.js 22 documentation

### Pitfall 2: Lambda Bundle Size Exceeds 50MB (CRITICAL)
**What goes wrong:** Deployment fails with "function is larger than the 50MB limit" error
**Why it happens:** The sql_dump.txt is 160MB uncompressed / 48MB gzipped. If Nitro bundles it as a server asset inside the function zip, the total easily exceeds 50MB.
**How to avoid:** Check `.netlify/functions-internal/server/` size after build. If over limit: (a) verify dump is in public/ not server/, (b) consider Turso pivot, (c) investigate `included_files` configuration to exclude dump from function bundle.
**Warning signs:** Build succeeds but deploy fails; function zip size reported in Netlify logs
**Confidence:** MEDIUM -- sql_dump gzips to 48MB (measured), but unclear whether it's bundled in function or served from CDN. Needs empirical validation.

### Pitfall 3: Cold Start TTFB Exceeds 3 Seconds
**What goes wrong:** First request after 30min idle takes >3s, failing the success criterion
**Why it happens:** On each cold start, the Lambda must: (1) boot Node.js runtime, (2) load server function, (3) restore 160MB of SQL dump into in-memory SQLite, (4) execute the query, (5) render the page. Steps 3-4 with better-sqlite3 on a 160MB dump could take 1-3s alone.
**How to avoid:** Measure cold start TTFB empirically after deploy. If consistently >3s, pivot to Turso (external DB eliminates dump restoration). Consider increasing Lambda memory (Netlify default is 1024MB, which should be adequate).
**Warning signs:** Intermittent slow responses (especially mornings/after idle periods), health endpoint reporting >2s latency
**Confidence:** MEDIUM -- dump restoration speed for 160MB is untested. Netlify provides 1GB memory and 60s timeout, which helps.

### Pitfall 4: better-sqlite3 Native Binding Compilation
**What goes wrong:** Build fails with native module compilation errors for better-sqlite3
**Why it happens:** better-sqlite3 requires native compilation matching the deployment OS (Linux on Lambda). Local macOS binaries won't work.
**How to avoid:** Build on Netlify CI (which runs Linux), not locally. Netlify CI handles native module compilation. Ensure `better-sqlite3` is in `dependencies` (not `devDependencies`).
**Warning signs:** Build errors mentioning `node-gyp`, `prebuild`, or `.node` file not found
**Confidence:** HIGH -- better-sqlite3 is widely used on serverless platforms and Nuxt Content documents it as working on "all Node environments"

### Pitfall 5: Old netlify.toml Conflicts
**What goes wrong:** Build uses wrong publish directory or build command
**Why it happens:** The existing `.netlify/netlify.toml` (UI-generated) sets `publish = "/Users/aminato/dev/schaden-novel/dist"` and `command = "pnpm run build"` with absolute local paths.
**How to avoid:** Create a project-level `netlify.toml` at the repo root. This overrides the UI config. Set correct publish dir for `nuxt build` output.
**Warning signs:** Deploy succeeds but site shows 404 or old content
**Confidence:** HIGH

### Pitfall 6: PNPM Shamefully Hoist
**What goes wrong:** Dependencies not resolved correctly in Netlify CI
**Why it happens:** Nuxt ecosystem expects hoisted dependencies; pnpm's strict node_modules structure can break resolution
**How to avoid:** Set `PNPM_FLAGS = "--shamefully-hoist"` as Netlify environment variable
**Warning signs:** Module resolution errors during build
**Confidence:** MEDIUM -- mentioned in Netlify docs for Nuxt, but may not be needed with current pnpm config

## Code Examples

### netlify.toml (project root)
```toml
# Source: https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/
[build]
  command = "pnpm run build"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "22"

[functions]
  node_bundler = "esbuild"
  included_files = ["node_modules/.cache/nuxt/.nuxt/content/**"]
```

### nuxt.config.ts changes for SSR
```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap', '@netlify/nuxt'],

  content: {
    database: {
      type: 'sqlite',
      filename: ':memory:',
    },
    experimental: {
      sqliteConnector: 'better-sqlite3',  // Changed from 'native'
    },
    watch: {
      enabled: false,
    },
  },

  routeRules: {
    '/': { prerender: true },
    // Phase 6 will add more route rules for ISR
  },

  // Remove nitro.prerender hooks and routes (Phase 6 cleanup)
  // For now, keep them -- they won't conflict with SSR

  compatibilityDate: '2025-07-15',
})
```

### Health Check Endpoint
```typescript
// server/api/health.ts
export default defineEventHandler(async () => {
  const start = performance.now()

  try {
    // Test that content queries work (proves SQLite is operational)
    const chapters = await queryCollection('mga').count()
    const latency = Math.round(performance.now() - start)

    return {
      status: 'ok',
      database: 'sqlite',
      latency_ms: latency,
      content_count: chapters,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      status: 'error',
      database: 'sqlite',
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})
```

### Cold Start TTFB Test Script
```bash
#!/bin/bash
# Test cold start TTFB after the site has been idle
# Run after 30+ minutes of no traffic

URL="https://schaden-novel.netlify.app/api/health"

echo "Testing cold start TTFB..."
TTFB=$(curl -o /dev/null -s -w '%{time_starttransfer}' "$URL")
echo "TTFB: ${TTFB}s"

if (( $(echo "$TTFB > 3.0" | bc -l) )); then
  echo "FAIL: Cold start exceeds 3s threshold"
  exit 1
else
  echo "PASS: Cold start within threshold"
fi
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `nuxt generate` (full SSG) | `nuxt build` (SSR + ISR) | Nuxt 3+ / Nitro | Eliminates 26K route prerendering; chapters rendered on-demand |
| `netlify_builder` preset | `netlify` preset with `isr` route rule | Nitro 2024+ | Deprecated on-demand builders in favor of standard ISR via CDN headers |
| Proprietary ISR headers | Standard `Netlify-CDN-Cache-Control` with `stale-while-revalidate` | Nuxt 4 + compatibility date 2024-05-07 | Standard HTTP caching, no minimum TTL |
| `@netlify/nuxt` required for ISR | Zero-config ISR via Nitro auto-detect | Nuxt 4 | Module optional (dev parity only); ISR works without it |
| Manual `netlify deploy --prod` | Push-to-deploy via Netlify CI | Always available | Eliminates local build requirement |

**Deprecated/outdated:**
- `netlify_builder` preset: Replaced by standard `netlify` preset with ISR route rules
- `nativeSqlite` config key: Deprecated in favor of `experimental.sqliteConnector: 'native'`
- `node:sqlite` on serverless: Still experimental in Node.js; unusable on Lambda without custom runtime

## Recommendations (Claude's Discretion Areas)

### Cutover Strategy
**Recommendation: Branch deploy with validation gate.**
1. Keep current SSG site on `main` branch (production)
2. All Phase 5 work on `feature/nuxt` branch (already the working branch)
3. Netlify branch deploys create preview URL automatically (e.g., `feature-nuxt--schaden-novel.netlify.app`)
4. Validate SSR works on preview URL: health endpoint passes, pages render, cold start <3s
5. Merge to `main` only after validation passes
6. **Rollback:** If production SSR fails, revert merge to `main` -- Netlify redeploys previous SSG build automatically

### Pivot Threshold
**Recommendation: Time-boxed troubleshooting with clear decision signals.**
- **Immediate pivot to Turso if:** Netlify deploy fails due to bundle size >50MB (no workaround possible without removing content from dump)
- **Pivot after 2 hours if:** Cold start TTFB consistently >3s across 5+ measurements at different times
- **Pivot after 3 hours if:** better-sqlite3 compilation fails on Netlify CI and workarounds (esbuild bundler, external_node_modules) don't resolve it
- **Do NOT pivot for:** First-deploy issues, configuration typos, or transient network errors -- these are fixable

### CI Migration
**Recommendation: Standard Netlify CI with git-based deploys.**
1. Create project-level `netlify.toml` with build command and publish directory
2. Link repo to Netlify site (may already be linked from Astro era)
3. Set environment variables in Netlify UI: `NODE_VERSION=22`, `PNPM_FLAGS=--shamefully-hoist`
4. Branch deploy rules: `feature/nuxt` gets preview deploys, `main` is production
5. Remove local deploy scripts from `package.json` after migration validated

### Health Endpoint
**Recommendation: Lightweight JSON endpoint at `/api/health`.**
- Check: Execute a `queryCollection().count()` to prove SQLite works
- Report: status, latency_ms, content_count, timestamp
- Format: JSON (easy to curl, easy to monitor)
- Monitoring: Manual curl for now; can add uptime monitoring (e.g., UptimeRobot) later if needed
- Do NOT check every collection -- one query is sufficient to prove the database is functional

## Open Questions

1. **Where does Nitro place the sql_dump for server-side use?**
   - What we know: Client-side dumps go to `.output/public/__nuxt_content/`. Server needs the dump to restore the database.
   - What's unclear: Is the dump bundled inside the server function zip (counts toward 50MB limit) or fetched from the CDN at runtime?
   - Recommendation: Run `nuxt build` and inspect `.output/server/` for sql_dump files. This is the #1 question to answer before proceeding.

2. **How long does restoring 160MB of SQL dump into in-memory SQLite take?**
   - What we know: Nuxt Content handles restoration automatically on first query. The dump is gzipped+base64 encoded.
   - What's unclear: Wall-clock time for decompression + SQL execution on Lambda (1GB memory, Node 22)
   - Recommendation: Deploy and measure empirically. If >2s restoration time, cold start will likely exceed 3s total.

3. **Does `better-sqlite3` compile correctly on Netlify CI for Lambda?**
   - What we know: better-sqlite3 requires native compilation. Netlify CI runs Linux (matching Lambda). Nuxt Content lists it as working on "all Node environments."
   - What's unclear: Whether Netlify's esbuild bundler handles native `.node` bindings correctly, or if `external_node_modules` config is needed
   - Recommendation: Test with a minimal build first. If compilation fails, try `external_node_modules = ["better-sqlite3"]` in netlify.toml.

4. **Can the prerender:routes hook coexist with SSR for Phase 5?**
   - What we know: Phase 6 removes the hook. Phase 5 only changes the build command.
   - What's unclear: Whether the hook that adds 13K routes still runs during `nuxt build` and forces prerendering of all chapters
   - Recommendation: Test `nuxt build` and observe whether it attempts to prerender 13K routes. If so, must disable the hook in Phase 5 (pull forward from Phase 6).

## Sources

### Primary (HIGH confidence)
- Netlify Nuxt setup guide: https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/
- Nuxt Content serverless deployment: https://content.nuxt.com/docs/deploy/serverless
- Nuxt Content database configuration: https://content.nuxt.com/docs/getting-started/configuration
- Netlify Functions configuration: https://docs.netlify.com/build/functions/optional-configuration/
- Netlify Functions overview (limits): https://docs.netlify.com/build/functions/overview/
- Netlify ISR guide for Nuxt 4: https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/

### Secondary (MEDIUM confidence)
- Netlify platform primitives blog: https://www.netlify.com/blog/platform-primitives-with-nuxt-4/
- AWS Lambda Node.js 22 runtime: https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/
- Netlify Node.js 22 default upgrade: https://answers.netlify.com/t/builds-functions-plugins-default-node-js-version-upgrade-to-22/135981
- Nuxt Content Netlify deploy: https://content.nuxt.com/docs/deploy/netlify
- Lambda cold start optimization: https://speedrun.nobackspacecrew.com/blog/2025/07/21/the-fastest-node-22-lambda-coldstart-configuration.html

### Tertiary (LOW confidence -- needs validation)
- node:sqlite experimental status on Lambda: Multiple sources agree it's unavailable, but no single authoritative Lambda docs page confirms the specific `--experimental-sqlite` flag behavior. Validated by cross-referencing AWS blog + Node.js docs + forum posts.
- sql_dump bundling in server function: No source definitively explains whether Nitro packages the dump as a server asset (inside function zip) or leaves it in public/ (CDN-served). Needs empirical testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Nuxt/Nitro/Netlify integration is well-documented and zero-config
- Architecture: MEDIUM -- sql_dump bundling and cold start behavior need empirical validation
- Pitfalls: HIGH -- node:sqlite unavailability is well-verified; bundle size risk is measurable

**Measured project data:**
- contents.sqlite: 350MB
- sql_dump.txt: 160MB uncompressed, 48MB gzipped
- Content: 13,318 chapters across 10 novels
- Content directory: 170MB

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable ecosystem, but Lambda/Netlify limits may change)
