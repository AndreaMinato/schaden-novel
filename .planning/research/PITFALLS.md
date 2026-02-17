# Pitfalls Research

**Domain:** Nuxt 4 + Nuxt Content v3 novel reading site (SSG on Netlify, 13K+ markdown chapters)
**Researched:** 2026-02-17
**Confidence:** MEDIUM — build-time findings are HIGH (community benchmarks verified); SQLite dump behavior is MEDIUM (architecture confirmed, exact sizes for novel bodies are extrapolated); migration-specific behavior is MEDIUM (some is Nuxt 3 → 4 which has HIGH confidence, Astro → Nuxt is LOW-MEDIUM)

---

## Critical Pitfalls

### Pitfall 1: Netlify Build Timeout — 13K Pages Will Exceed 30 Minutes

**What goes wrong:**
Nuxt SSG (`nuxt generate`) has near-exponential build time growth. Community benchmarks show: 2,500 pages = ~17 minutes, 10,000 pages = ~600 seconds (10 minutes for pure prerendering, plus content parse time). With 13,318 chapter pages plus ~30 listing pages and Nuxt Content's SQLite indexing of 170MB of markdown, a full `nuxt generate` will likely run 60–200+ minutes on Netlify — well past the default ~30-minute build timeout. Even if the timeout is raised, the 300 build minutes/month free tier is exhausted in 1–2 deploys.

**Why it happens:**
Nuxt's prerenderer generates pages concurrently but the HTMLgeneration, Nitro payload extraction (_payload.json per route), and SQLite insertions during the content indexing phase are all non-trivial. Nuxt Content v3 must parse every markdown file into AST, insert into SQLite, then Nitro must render each route to HTML. The existing Astro site already requires 8GB RAM and slow builds with 13K files — Nuxt's content indexing adds another layer on top.

**How to avoid:**
Do not attempt to pre-render every chapter page. Instead:
1. Configure `nitro.prerender.crawlLinks: false` and do NOT add all 13K chapter routes to `nitro.prerender.routes`.
2. Pre-render only: home page, novel listing, per-novel listing pages (~12 routes) and the first 1–3 chapters of each novel for SEO.
3. Use SPA fallback (`fallback: true` in generate config) so chapter pages are served as client-rendered Vue pages — they load chapter data from the per-page `_payload.json` files that are generated at build time via the route crawler.
4. Alternatively: investigate whether Netlify's build image supports parallel Nuxt generation sharding by novel.
5. Increase `nitro.prerender.concurrency` from the default (typically 1) to 8–16 once timeout risk is validated — but this can trigger SQLite BUSY errors (see Pitfall 3).

**Warning signs:**
- Local `nuxt generate` taking >10 minutes for a test run with 200 chapters per novel.
- Netlify build logs showing "Build exceeded time limit" or exit code 137.
- Build minute counter hitting 100+ minutes on a single deploy.

**Phase to address:**
Infrastructure/deployment setup phase — must validate build strategy BEFORE implementing all 13K routes. Benchmark with 500 chapters first.

---

### Pitfall 2: Nuxt Content v3 Static SQLite Dump Downloaded to Every Browser

**What goes wrong:**
For static deployments (`nuxt generate`), Nuxt Content v3 downloads a full SQLite database dump to the browser on the first content query. This dump contains all content — including parsed chapter body ASTs — for client-side navigation. A known case: 200 podcast episodes with full transcripts produced a 25.1 MB SQLite dump (exceeding Cloudflare's 25MB asset limit). This project has 13,318 chapters and 170MB of markdown. Even with compression, the SQLite dump would be tens to hundreds of megabytes, resulting in unacceptable initial load times for chapter-to-chapter navigation.

**Why it happens:**
Nuxt Content v3 stores full parsed AST content in SQLite at build time. For static sites with no server, it must make all content queryable in the browser. The WASM SQLite implementation initializes from a dump file downloaded on first query. There is no documented option to exclude body text from the SQLite store while retaining it for page rendering.

**How to avoid:**
Option A (preferred): Do not use `queryCollection` for chapter body text in page components. Instead, pre-render chapter bodies into HTML at build time using Nitro hooks, and rely on the prerendered HTML + `_payload.json` files for navigation (Nuxt extracts and caches page data into `_payload.json` per route; client navigation loads these instead of querying the SQLite dump). Chapter body content never touches the browser-side SQLite.

Option B: Use Nuxt Content only for chapter metadata (title, pubDate, tags, chapter number) in collections — keep body content as raw files read via `useStorage` or Node.js `fs` in server routes only. Use a custom `queryCollection`-free architecture for chapter rendering.

Option C: Disable full-text search indexing in Nuxt Content (reduces SQLite size significantly — one user saw 25MB drop to 7MB by removing FTS). Not sufficient alone for 13K chapters with bodies, but helps.

**Warning signs:**
- `.data/content/contents.sqlite` file size after test build is >10MB with just one novel's chapters.
- Network waterfall in browser showing a large `.sqlite` or `dump.db` download on first page transition.
- Slow first client-side navigation despite prerendered HTML loading instantly.

**Phase to address:**
Content architecture phase — must decide how chapter bodies are served BEFORE building the chapter reader page. The wrong choice here requires a full architecture rewrite.

---

### Pitfall 3: `better-sqlite3` Native Binding Failure on Netlify with pnpm

**What goes wrong:**
Nuxt Content v3 uses `better-sqlite3` by default, which requires a native binding compiled at install time via a `postinstall` script. On pnpm v10+, build scripts are not run by default, so `better-sqlite3` installs without its native binding and fails at runtime with "Could not locate the bindings file." Netlify also has documented issues with `better-sqlite3` not fetching the prebuilt binary correctly during CI builds.

**Why it happens:**
`better-sqlite3` is a native Node.js module with a compiled `.node` binary. The `postinstall` step that compiles or downloads this binary is silently skipped by pnpm v10+ unless explicitly allowed. Netlify's build environment doesn't always have the correct glibc version or fails to download prebuilt binaries.

**How to avoid:**
Add to `nuxt.config.ts`:
```typescript
content: {
  experimental: {
    nativeSqlite: true,
  },
},
```
And configure Netlify to use Node.js v22.5.0+ (which ships `node:sqlite` natively, eliminating the `better-sqlite3` dependency entirely). Set Node version in Netlify site config under "Dependency management."

If staying on Node 20, add to `.npmrc` or pnpm config:
```
enable-pre-post-scripts=true
```

**Warning signs:**
- Build fails with "Nuxt Content requires `better-sqlite3` module to operate."
- `pnpm install` succeeds locally but Netlify build fails with binding errors.
- Error: "Could not locate the bindings file" during `nuxt generate`.

**Phase to address:**
Infrastructure setup phase — configure before first Netlify deploy attempt.

---

### Pitfall 4: Dynamic Chapter Routes Not Auto-Discovered by Nuxt's Prerender Crawler

**What goes wrong:**
Nuxt's prerender crawler starts from the root URL and follows `<a>` links in rendered HTML. Chapter pages are typically linked from novel listing pages, but if chapter listing pages paginate or don't link to every chapter individually, thousands of chapters will be missed. The build "succeeds" but the `dist/` directory is missing most chapter pages — they 404 silently in production.

**Why it happens:**
Unlike Astro's `getStaticPaths()` which explicitly enumerates all routes to generate, Nuxt relies on crawler-based discovery by default. Any route not reachable by following links from the root page is not prerendered unless explicitly listed.

**How to avoid:**
Add a Nitro hook that enumerates all chapter routes from Nuxt Content's collection at build time:

```typescript
// nuxt.config.ts
hooks: {
  async 'nitro:config'(nitroConfig) {
    const { serverQueryContent } = await import('#content/server')
    const chapters = await serverQueryContent(event).select('path').find()
    nitroConfig.prerender = nitroConfig.prerender || {}
    nitroConfig.prerender.routes = chapters.map(c => c.path)
  }
}
```

Or use `nitro.prerender.crawlLinks: true` and ensure every chapter is linked from its novel listing page (not paginated). But with 13K chapters, a fully linked listing page is unrealistic.

**Warning signs:**
- `dist/` directory has far fewer files than expected (check: `find dist/ -name "*.html" | wc -l`).
- Some chapter URLs 404 after deployment while others work.
- Novel listing page links to chapters but random chapter pages return 404.

**Phase to address:**
Routing implementation phase — implement and validate before first production deploy.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Pre-render all 13K chapter pages | Full SSG, no SPA fallback logic | 200+ minute builds, Netlify timeout, 300 min/month exhausted in 1–2 deploys | Never for this project |
| Store full chapter bodies in Nuxt Content SQLite | Simpler query architecture | Browser downloads 100MB+ SQLite dump; navigation becomes slow for new visitors | Never for this project |
| Naively port `defaultSort()` from Astro | Familiar algorithm, fast migration | Same O(n²) sort problem at 13K scale; slow chapter listing page | Never — fix during migration |
| Load all chapters in `useAsyncData` then filter in JS | Simpler queries | Loads entire collection into server memory per request; same bottleneck as current Astro site | Never — use `.where()` filtering in queryCollection |
| Port import scripts without fixing known bugs | Faster migration | Silent error swallowing and missing `await` bugs are now in the new codebase | Never — fix bugs as part of port |
| Skip `.npmrc` `enable-pre-post-scripts` for pnpm | One less config file | `better-sqlite3` fails on Netlify CI | Never |
| Use `innerHTML` for resume reading dropdown (ported from Astro) | Preserves existing behavior | XSS risk if localStorage schema changes or is corrupted | Never — use `textContent` or `createElement` |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Netlify (build) | Using Node 18.x (Netlify default) | Set Node version to 22.5.0+ in Netlify Site Config → Dependency management |
| Netlify (static SPA fallback) | Deploying without fallback config for non-prerendered routes | Add `fallback: '404.html'` or `fallback: true` in `nuxt.config.ts` generate config; add Netlify `_redirects` file with `/* /index.html 200` for SPA routing |
| Netlify (build minutes) | Triggering full rebuild on every commit | Use Netlify's build ignore script to skip rebuilds when only non-content files change; or disable auto-deploy and trigger manually for content updates |
| Google Docs API (import scripts) | Single fetch with no retry | Implement exponential backoff (3 attempts) for the fetch in import scripts; handle 429 rate limiting |
| Nuxt Content v3 (pnpm) | Not running postinstall scripts | Add `enable-pre-post-scripts=true` to `.npmrc` or use `nativeSqlite: true` with Node 22+ |
| Netlify (Node version) | Assuming Netlify auto-detects Node version from `.nvmrc` or `package.json` | Explicitly set Node version in Netlify UI under Site Configuration |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full Nuxt Content collection scan on every page | Slow page renders, OOM during build | Use `.where({ tags: { $contains: novelSlug } })` in queryCollection | >500 chapters per novel |
| Client-side sort of all chapters for listing page | Listing page hangs; 13K sort operations in browser | Sort server-side in queryCollection using `.order('stem', 'ASC')` or pre-sorted metadata | >100 chapters in listing |
| Generating all 13,318 static routes at build time | Build exceeds 30-minute Netlify timeout; 300 build minutes gone in 1–2 deploys | Selective pre-render: listing pages + recent chapters; SPA fallback for remainder | >2,500 routes |
| RSS feed containing all chapters across all novels | Feed XML exceeds 1MB; RSS readers time out or truncate | Limit to last 100 chapters or generate 10 per-novel feeds with 50 chapters each | >500 items |
| Payload files include full chapter body for every route | `dist/` directory grows to 10GB+; Netlify asset size limit hit | Pre-render chapter HTML but exclude body from `_payload.json` using `.select()` on queryCollection listing queries | >1,000 pre-rendered chapter routes |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Porting `innerHTML` usage for resume reading dropdown from Astro to Vue | XSS injection if localStorage is corrupted or attacker can manipulate localStorage schema | Replace `innerHTML` with `textContent` + programmatic DOM construction; or use `v-html` with explicit sanitization |
| Accessing `localStorage` outside `onMounted` or `<ClientOnly>` | Hydration mismatch console errors; resume reading component renders nothing on server then flickers on client | Wrap all localStorage access in `onMounted`; use `<ClientOnly>` wrapper component for ResumeReading component |
| Google Doc IDs hardcoded in import scripts (carried over from Astro) | IDs visible in git history; if documents are private, security by obscurity only | Move to `.env` variables; add `import.mjs` to `.gitignore` if it contains IDs; use Netlify environment variables for CI import runs |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Chapter pages not pre-rendered (pure SPA mode) | Slow TTFB; no meta tags for social sharing; poor SEO for chapter titles | Pre-render at least novel listing pages and first chapter of each novel; use SPA fallback only for subsequent chapter pages |
| Resume reading state not persisted across browser sessions | Users lose reading position on browser restart or device switch | Use localStorage (already implemented in Astro); ensure it survives via `onMounted` guard in Vue |
| Novel listing page loading 3,000+ chapters then paginating in JS | Slow listing page; visible reflow as content loads | Query only 50 chapters per page via queryCollection `.limit(50).offset(page * 50)`, or load all metadata (lightweight) but paginate display |
| Prev/next navigation breaking on first/last chapters | Dead links or JavaScript errors at chapter boundaries | Validate prev/next exist before rendering links; show disabled state not broken link; already known bug in Astro — must fix in Nuxt |
| RSS feed only shows last 3 chapters per novel | Users following RSS miss new chapters between feed checks if batches are large | Generate per-novel RSS feeds with 50+ items each, or a global feed with last 100 across all novels |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Nuxt Content setup:** Often missing `experimental.nativeSqlite: true` — verify Netlify build doesn't fail with `better-sqlite3` binding error on first deploy.
- [ ] **Static generation:** Often missing explicit route registration — verify `find dist/ -name "*.html" | wc -l` shows expected chapter count after build.
- [ ] **SPA fallback:** Often missing Netlify redirect rule — verify refreshing a chapter URL directly (not navigating from home) doesn't show Netlify's 404 page.
- [ ] **Resume reading:** Often missing `<ClientOnly>` wrapper — verify no hydration mismatch errors in browser console when visiting any page.
- [ ] **Chapter sorting:** Often assumes sort works correctly — verify chapters with `_b`, `_c` suffixes appear in correct position in listing (not at end or alphabetically sorted).
- [ ] **RSS feed:** Often missing size guard — verify RSS feed XML is under 1MB and readable in major RSS clients (Feedly, NetNewsWire).
- [ ] **Netlify Node version:** Often left at default 18.x — verify Site Config shows Node 22.5.0+ before first deploy.
- [ ] **Import scripts:** Often ported with silent error swallowing intact — verify a failed Google Docs fetch produces a visible error, not silence.
- [ ] **SQLite dump size:** Often never measured — verify `.data/content/contents.sqlite` size before deploying; if >5MB with one novel's chapters included, the client-side SQLite approach must be reconsidered.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Build timeout on Netlify | MEDIUM | Switch to selective prerender immediately; add `nitro.prerender.routes` with only listing pages; re-deploy |
| SQLite dump too large for browser | HIGH | Remove chapter body from Nuxt Content collection schema; rebuild content architecture to use prerendered HTML only; rewrite page components that use `queryCollection` for body |
| `better-sqlite3` binding failure | LOW | Add `experimental.nativeSqlite: true` to `nuxt.config.ts`; upgrade Netlify Node version; re-deploy |
| Missing chapter routes in dist/ | LOW | Add `prerender:routes` hook enumerating all chapters from file system; re-run generate |
| Hydration mismatch from localStorage | LOW | Wrap ResumeReading component in `<ClientOnly>`; move all localStorage reads to `onMounted` |
| Chapter sort broken for suffix chapters | MEDIUM | Replace sort function with pre-parsed numeric comparison; re-generate listing pages |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Build timeout for 13K pages | Infrastructure/deployment setup (Phase 1) | Time `nuxt generate` with 500 test chapters; ensure <5 min; extrapolate |
| SQLite dump browser download size | Content architecture design (Phase 1–2) | Check `.data/content/contents.sqlite` size after ingesting one novel |
| `better-sqlite3` binding failure | Infrastructure setup (Phase 1) | Trigger first Netlify deploy with `nativeSqlite: true` and Node 22+ configured |
| Dynamic routes not discovered | Routing implementation (Phase 2) | After `nuxt generate`, count HTML files in dist/novels/ directory |
| SSR hydration mismatch (localStorage) | Component migration (Phase 3) | Test resume reading component in SSR mode; check browser console for hydration warnings |
| SQLite BUSY during large generate | Build optimization (Phase 2) | Monitor Nuxt generate logs for SQLITE_BUSY errors; tune concurrency |
| Naively ported inefficient sort | Data layer / content utilities (Phase 2) | Benchmark listing page render time with one novel's full chapter list |
| Import script bugs carried over | Script migration (Phase 4) | Run import on test novel; verify error surfaces when Google Docs URL is invalid |
| Netlify Node.js version | Infrastructure setup (Phase 1) | Netlify build log shows "Node version: 22.x.x" |
| Missing `_redirects` SPA fallback | Deployment configuration (Phase 1) | Hard-refresh a chapter URL on deployed Netlify site; should not show Netlify 404 |
| RSS feed too large | Feed generation (Phase 3) | Validate RSS feed size with `wc -c public/rss.xml`; should be under 500KB |
| Prev/next navigation at boundaries | Chapter reader (Phase 3) | Manual test: navigate to first and last chapter; verify no broken links or JS errors |

---

## Sources

- [Nuxt Content v3 Announcement — SQLite architecture overview](https://content.nuxt.com/blog/v3) — HIGH confidence (official)
- [Nuxt Content Database Documentation](https://content.nuxt.com/docs/advanced/database) — HIGH confidence (official)
- [Nuxt Content Static Hosting](https://content.nuxt.com/docs/deploy/static) — HIGH confidence (official)
- [Nuxt Content Netlify Deployment](https://content.nuxt.com/docs/deploy/netlify) — HIGH confidence (official)
- [Nuxt Content Configuration](https://content.nuxt.com/docs/getting-started/configuration) — HIGH confidence (official)
- [Nuxt Prerendering Documentation](https://nuxt.com/docs/getting-started/prerendering) — HIGH confidence (official)
- [Nuxt Content Database Size Analysis — 200 podcast episodes = 25MB](https://damieng.com/blog/2024/05/14/nuxt-content-db-and-size/) — MEDIUM confidence (single developer analysis, but methodology is sound)
- [Slow SSG build times: 2,500 pages = ~17 min, exponential growth — Nuxt discussions](https://github.com/nuxt/nuxt/discussions/26689) — MEDIUM confidence (community-reported, no official benchmark)
- [better-sqlite3 binding failures with pnpm v10+](https://github.com/nuxt/content/issues/3483) — HIGH confidence (multiple confirmed reports)
- [SQLite BUSY errors during large static generation](https://github.com/nuxt/content/issues/3233) — MEDIUM confidence (community reports)
- [nativeSqlite experimental configuration](https://github.com/nuxt/content/issues/3225) — MEDIUM confidence (GitHub issue confirming feature exists)
- [Nuxt hydration mismatch with localStorage](https://nuxt.com/docs/guide/best-practices/hydration) — HIGH confidence (official)
- [Netlify build memory limits and OOM errors](https://answers.netlify.com/t/javascript-heap-out-of-memory-when-trying-to-build-a-nuxt-app/93138) — MEDIUM confidence (community forum)
- [Dynamic routes not auto-discovered: generate is missing pages](https://github.com/nuxt/nuxt/issues/14115) — MEDIUM confidence (GitHub issue, confirmed pattern)
- [Netlify free plan: 300 build minutes/month](https://www.netlify.com/pricing/) — HIGH confidence (official)
- [Nuxt 4 breaking changes and migration](https://nuxt.com/blog/v4) — HIGH confidence (official)
- [Nuxt UI v4 migration guide](https://ui.nuxt.com/docs/getting-started/migration/v4) — HIGH confidence (official)

---
*Pitfalls research for: Nuxt 4 + Nuxt Content v3 novel reading site (SSG on Netlify, 13K+ markdown chapters)*
*Researched: 2026-02-17*
