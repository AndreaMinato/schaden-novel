# Phase 5: Build Pipeline + SPA Foundation - Research

**Researched:** 2026-02-20
**Domain:** Nuxt 4 build pipeline customization, content extraction at parse time, static prerender configuration, SPA fallback routing
**Confidence:** MEDIUM-HIGH

## Summary

Phase 5 transforms the build pipeline from "prerender everything" (26K routes, 10 min) to "extract bodies + prerender shells" (~25 routes, <2 min). The core mechanism is a custom Nuxt module (`body-extractor`) that hooks into `content:file:afterParse` to intercept each chapter's parsed body, write it to a staging JSON file, then replace the body with an empty minimark stub so the SQL dump stays small (~2.6MB). A second hook (`close`) copies the staged body files into `.output/public/content/` after the build completes. The nuxt.config removes the 13K-chapter `prerender:routes` hook and keeps only ~25 explicit routes. Netlify's redirect rule serves `200.html` for all non-static chapter URLs.

The biggest technical risk is the exact shape of the parsed body in the `afterParse` hook. Nuxt Content v3 uses two formats: a full MDC/HAST AST during parsing, and a compressed "minimal" format (`{ type: "minimal", value: [[tag, props, ...children], ...] }`) stored in the database. The hook fires between parsing and storage, so the body format at hook time needs empirical verification on first run. The module should log the body structure and adapt.

**Primary recommendation:** Build the body-extractor module with diagnostic logging, test on the smallest novel (lrg, 84 chapters) first, then scale to all 10 novels. Validate ContentRenderer compatibility with the extracted body format in Phase 6 (out of scope for this phase).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Body file organization: nested by novel `/content/novels/{slug}/{zero-padded-num}.json`, body content only (no metadata), raw minimark format, minified JSON
- Nuxt module (body-extractor) hooks into `nuxt generate` -- single build command produces everything
- Generate a `bodies-manifest.json` listing all body files with count, paths, sizes for build validation
- Explicit allow-list of ~25 routes in nuxt.config (not pattern-based exclusion)
- Prerendered pages: home, catalog/browse, 10 novel listing pages, RSS feeds (global + 10 per-novel), sitemaps
- Novel listing pages prerender with novel info only -- chapter list loads from SQLite client-side
- Home and catalog prerender as shells only -- novel data loads from SQLite client-side
- Nuxt generates 200.html (SPA fallback mode), not a hand-crafted static template
- Branded loading page: site logo centered with a subtle spinner, dark theme
- Netlify redirect rule configured in `netlify.toml` (not _redirects file)
- Replace post-build body-stripping script immediately -- clean break, parse-time stripping replaces it
- Switch from 26K prerendered routes to ~25 all at once -- no gradual rollback
- No fallback to full-static build -- commit fully to SPA approach
- Deploy command stays the same: `netlify deploy --prod --dir=.output/public --no-build`

### Claude's Discretion
- Body extractor Nuxt module implementation details (which hooks, extraction timing)
- Parse-time SQL dump stripping approach
- Exact Nuxt prerender configuration syntax
- 200.html spinner implementation and inline CSS
- Build validation/verification steps beyond manifest

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUILD-01 | Build produces individual JSON body files for all 13,318 chapters via body-extractor module | `content:file:afterParse` hook receives parsed body per file; module writes to staging dir, `close` hook copies to `.output/public/content/`. Body format is minimark AST, writable as JSON. |
| BUILD-02 | SQL dump is body-stripped at parse time (64MB -> ~2.6MB), replacing post-build script | Setting `content.body` (or equivalent) to empty minimark `{ type: "minimark", value: [], toc: {...} }` in afterParse hook prevents body from entering the SQLite database. Replaces `scripts/strip-dump-bodies.mjs`. |
| BUILD-03 | Only ~25 shell pages prerendered -- not 26K chapter routes | Remove `prerender:routes` hook that adds chapters. Keep explicit `nitro.prerender.routes` list with `crawlLinks: false`. Use `routeRules` for prerender control. |
| BUILD-04 | Build completes in under 2 minutes | Content compilation (~2 min same as v1.0) + body extraction (integrated, ~0 extra) + prerender 25 routes (~10 sec) + copy files (~5 sec) = ~2-3 min. Tight but achievable. |
| SPA-01 | Netlify redirect rule serves 200.html for all non-prerendered routes | `[[redirects]]` in `netlify.toml`: `from = "/novels/*/*"`, `to = "/200.html"`, `status = 200`, `force = false`. Netlify serves static files first, falls back to 200.html. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nuxt/kit` | (bundled with Nuxt) | `defineNuxtModule` for body-extractor module | Official module authoring API |
| Node `fs` / `path` | Built-in | File I/O for body JSON extraction and copy | No external deps needed for fs operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nuxtjs/sitemap` | ^7.6.0 | Sitemap generation with `asSitemapCollection()` | Already installed; needs `asSitemapCollection()` wrapper in `content.config.ts` for non-prerendered chapter URL discovery |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Nuxt module (body-extractor) | Post-build script | Script approach is fragile (regex on SQL dumps); module approach integrates into build pipeline atomically |
| `close` hook for file copy | `nitro:build:public-assets` hook | `close` fires after all output is written; `nitro:build:public-assets` fires before Nitro server is built -- both work but `close` is simpler for this use case |
| `content:file:afterParse` for body stripping | `beforeParse` body removal | `beforeParse` only has raw markdown (string); `afterParse` has the parsed AST which is what we need to extract |

**No new packages to install.** Everything uses built-in Nuxt/Node APIs.

## Architecture Patterns

### Recommended Module Structure
```
modules/
  body-extractor.ts    # Nuxt module: afterParse hook + close hook

.output/public/
  content/
    novels/
      mga/
        1.json         # Chapter body (minimark AST)
        2.json
        ...
      atg/
        1.json
        ...
  __nuxt_content/      # SQL dumps (body-stripped, ~2.6MB total)
  200.html             # SPA fallback shell
  index.html           # Prerendered home page
  novels/
    index.html         # Prerendered catalog
    mga/index.html     # Prerendered novel listing
    ...
```

### Pattern 1: Two-Phase Body Extraction Module
**What:** A Nuxt module that hooks into content compilation to extract bodies, then copies them after build.
**When to use:** When you need to split content processing from content storage.

Phase A runs during content compilation via `content:file:afterParse`:
- Receives each parsed content file
- Extracts the body AST
- Writes to staging directory: `{buildDir}/body-extract/{novel}/{chapter}.json`
- Replaces body with empty minimark stub
- Tracks files extracted for manifest generation

Phase B runs after build via `close` hook:
- Copies all staged body files to `.output/public/content/novels/`
- Writes `bodies-manifest.json` with file count, paths, and sizes
- Logs summary statistics

**Confidence:** MEDIUM-HIGH. The `content:file:afterParse` hook is documented and receives `{ file, content }` context. Modifications to `content` persist to the database. The exact body field name and format need empirical verification.

### Pattern 2: Explicit Prerender Allow-List
**What:** Replace the dynamic `prerender:routes` hook with a static route list.
**When to use:** When you want deterministic, fast prerendering of only known pages.

```typescript
// nuxt.config.ts
nitro: {
  prerender: {
    crawlLinks: false,  // Already set -- prevents discovering 13K chapters
    routes: [
      '/', '/200.html', '/404.html',
      '/novels',
      '/rss.xml',
      // 10 novel listing pages
      '/novels/mga', '/novels/atg', '/novels/overgeared', '/novels/tmw',
      '/novels/htk', '/novels/issth', '/novels/cd', '/novels/lrg',
      '/novels/mw', '/novels/rtw',
      // Per-novel RSS feeds
      '/novels/atg/rss.xml', '/novels/cd/rss.xml', '/novels/htk/rss.xml',
      '/novels/issth/rss.xml', '/novels/lrg/rss.xml', '/novels/mga/rss.xml',
      '/novels/mw/rss.xml', '/novels/overgeared/rss.xml', '/novels/rtw/rss.xml',
      '/novels/tmw/rss.xml',
    ],
    concurrency: 4,
  },
  // Remove the prerender:routes hook entirely
}
```

**Confidence:** HIGH. This is standard Nuxt prerender configuration. The `crawlLinks: false` + explicit routes pattern is documented.

### Pattern 3: Netlify SPA Fallback via netlify.toml
**What:** Redirect rule that serves 200.html for chapter URLs without matching static files.
**When to use:** For SPA deep-link support on static hosting.

```toml
# netlify.toml
[[redirects]]
  from = "/novels/*/*"
  to = "/200.html"
  status = 200
  force = false
```

`force = false` is critical -- Netlify serves existing static files first (JS, CSS, prerendered HTML, body JSON files) and only falls back to 200.html for routes that don't match a static file.

**Confidence:** HIGH. Standard Netlify SPA pattern, well-documented.

### Anti-Patterns to Avoid
- **Setting `ssr: false` globally:** Breaks Nuxt Content v3 static generation entirely. Content queries return nothing. Issue #1229 confirmed unresolved. Keep `ssr: true` with selective prerendering.
- **Using `content:file:beforeParse` for body extraction:** Only has raw markdown string, not the parsed AST. Need the AST for ContentRenderer compatibility.
- **Hardcoding body file paths with zero-padded numbers:** Chapter filenames in content/ are NOT zero-padded (e.g., `1.md`, `100.md`, `1886.md`). Derive the path from the content file's actual path/stem, not from manual padding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Body extraction from SQL dumps | Regex parsing of base64-gzipped SQL dump (current approach) | `content:file:afterParse` hook in a Nuxt module | Regex is fragile; hook has direct access to parsed AST before DB storage |
| SPA fallback HTML | Custom static HTML template | Nuxt's built-in `200.html` generation + `spaLoadingTemplate` config | Nuxt already generates 200.html with proper Vue app bootstrapping |
| Sitemap URL discovery for 13K chapters | Manual sitemap XML generation script | `asSitemapCollection()` from `@nuxtjs/sitemap/content` | Module handles URL enumeration, chunking, and XML generation |
| File copy to build output | Post-build shell script | Module's `close` hook with `cpSync()` | Integrated into build pipeline, no separate step |

**Key insight:** The existing `strip-dump-bodies.mjs` script (166 lines of SQL parsing with escape handling) is replaced by ~5 lines in the afterParse hook that set body to empty. The complexity moves from "parse SQL to find and replace body columns" to "intercept body before it enters the database."

## Common Pitfalls

### Pitfall 1: afterParse Hook Body Format Mismatch
**What goes wrong:** The body object in the afterParse hook may be in MDC/HAST format (full AST with `type`, `tag`, `children`, `props` nodes) rather than the compressed "minimal" format (`{ type: "minimal", value: [[tag, props, ...children]] }`). Writing the wrong format means ContentRenderer cannot render it in Phase 6.
**Why it happens:** Nuxt Content v3 compresses the AST into "minimal" format during database storage, which happens AFTER the afterParse hook. The hook receives the pre-compression format.
**How to avoid:** Log `JSON.stringify(content.body).substring(0, 500)` and `content.body.type` on the first file processed. If the body has `type: "root"` with `children` array, it's MDC format. If it has `type: "minimal"` with `value` array, it's already compressed. Write whatever format the hook provides -- Phase 6 will handle ContentRenderer compatibility.
**Warning signs:** Body JSON files contain deeply nested `{ type: "element", tag: "p", children: [...] }` structures instead of flat `["p", {}, "text"]` tuples.

### Pitfall 2: File Path Derivation from Content Path
**What goes wrong:** Body JSON files end up in wrong paths because the content path and the output path don't align.
**Why it happens:** Content paths in Nuxt Content v3 are like `/mga/1` (no `/novels/` prefix, no file extension). The user decision says output paths should be `/content/novels/{slug}/{zero-padded-num}.json`. But chapter filenames are NOT zero-padded in the source (`1.md`, `100.md`). The stem from content is the filename without extension.
**How to avoid:** Use the content's `path` or `stem` field directly. For novel `mga` with content path `/mga/1`, output to `/content/novels/mga/1.json`. Do NOT attempt zero-padding unless the user meant to use the existing filename stems.
**Warning signs:** Files like `/content/novels/mga/001.json` exist but the runtime fetches `/content/novels/mga/1.json` (or vice versa).

**IMPORTANT clarification on user decision:** The user said "zero-padded-num" for the body file path. This contradicts the source content structure where files are NOT zero-padded (e.g., `1.md`, not `001.md`). Either: (a) the module pads numbers during extraction (creating `001.json` from `1.md`) and the runtime must also pad when fetching, or (b) the files use the original stem (no padding). **Recommend using the original stem** to avoid a padding-width mismatch between build and runtime. Flag this for planner to clarify.

### Pitfall 3: build Command is `nuxt build` Not `nuxt generate`
**What goes wrong:** Running `nuxt build` without `--prerender` creates a server build, not a static site. No HTML files generated, no body extraction, no SQL dumps.
**Why it happens:** Current `package.json` has `"build": "nuxt build"`. For static hosting, it needs to be `nuxt generate` (equivalent to `nuxt build --prerender`).
**How to avoid:** Change package.json build script to `nuxt generate`. This enables the prerender pipeline that creates 200.html, HTML files, and SQL dumps.
**Warning signs:** `.output/public/` is empty or missing after build. No `200.html` or `index.html` generated.

### Pitfall 4: Sitemap Breaks Without asSitemapCollection
**What goes wrong:** Per-novel sitemaps are empty or contain only the novel listing URL, missing all 13K chapter URLs.
**Why it happens:** Without chapter routes being prerendered, the sitemap module's `nuxt:prerender` source has no chapter URLs to discover. The module needs `asSitemapCollection()` wrapping collections in `content.config.ts` to enumerate content-based URLs.
**How to avoid:** Wrap each novel collection with `asSitemapCollection()` in `content.config.ts`. Ensure `@nuxtjs/sitemap` is loaded BEFORE `@nuxt/content` in `nuxt.config.ts` modules array.
**Warning signs:** Sitemap XML files contain fewer URLs than expected. `curl https://site/sitemap_index.xml` shows per-novel sitemaps with 0-1 URLs.

### Pitfall 5: Body Extraction Fires in Dev Mode
**What goes wrong:** Running `nuxt dev` triggers the afterParse hook for all 13K files, writing body JSON files to the build directory and cluttering the dev experience.
**Why it happens:** The `content:file:afterParse` hook fires during content compilation in both dev and generate modes.
**How to avoid:** Guard the hook with a check for the generate/build context. In the module setup, check if we're in a generate build: `if (!nuxt.options._generate) return` or check `process.env.NUXT_GENERATE === 'true'`. Alternatively, check `nuxt.options.nitro?.static` or wrap the hook registration in a build-only condition.
**Warning signs:** Dev server startup is slow due to writing 13K files. Staging directory fills up during development.

### Pitfall 6: Close Hook Does Not Fire in Dev Mode
**What goes wrong:** Body files never get copied because the `close` hook fires only when Nuxt shuts down gracefully, which in dev mode means CTRL+C.
**Why it happens:** The `close` hook is for cleanup, not build output. In generate mode, it fires after prerendering completes.
**How to avoid:** This is actually correct behavior -- we only want the copy in generate mode. But verify by checking that generate mode triggers `close` after output is written. If `close` fires too early (before `.output/public/` exists), use `nitro:build:public-assets` instead.
**Warning signs:** After `nuxt generate`, `.output/public/content/` directory does not exist or is empty.

## Code Examples

### Body Extractor Module (Recommended Implementation)
```typescript
// modules/body-extractor.ts
import { defineNuxtModule } from '@nuxt/kit'
import { mkdirSync, writeFileSync, cpSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

interface ManifestEntry {
  path: string
  size: number
}

export default defineNuxtModule({
  meta: { name: 'body-extractor' },
  setup(_options, nuxt) {
    // Only run during generate (not dev)
    if (!nuxt.options._generate) return

    const stagingDir = resolve(nuxt.options.buildDir, 'body-extract')
    const manifest: ManifestEntry[] = []
    let extractCount = 0

    // Phase A: Extract bodies during content compilation
    nuxt.hooks.hook('content:file:afterParse', (ctx) => {
      const { content } = ctx

      // Only process files with a body (skip non-markdown, skip files without body)
      if (!content.body) return

      // Derive path from content.path (e.g., "/mga/1" -> novel="mga", chapter="1")
      const pathParts = content.path?.split('/').filter(Boolean)
      if (!pathParts || pathParts.length < 2) return

      const novel = pathParts[0]
      const chapter = pathParts.slice(1).join('/')
      const outPath = resolve(stagingDir, 'novels', novel, `${chapter}.json`)

      // Log first file for format debugging
      if (extractCount === 0) {
        console.log(`[body-extractor] First body type: ${content.body.type}`)
        console.log(`[body-extractor] First body keys: ${Object.keys(content.body).join(', ')}`)
        console.log(`[body-extractor] Sample: ${JSON.stringify(content.body).substring(0, 200)}...`)
      }

      // Write body JSON (minified)
      mkdirSync(dirname(outPath), { recursive: true })
      const json = JSON.stringify(content.body)
      writeFileSync(outPath, json)
      manifest.push({ path: `/content/novels/${novel}/${chapter}.json`, size: Buffer.byteLength(json) })
      extractCount++

      // Replace body with empty minimark stub
      content.body = {
        type: 'minimark',
        value: [],
        toc: { title: '', searchDepth: 2, depth: 2, links: [] }
      }
    })

    // Phase B: Copy to output + write manifest after build
    nuxt.hooks.hook('close', () => {
      if (extractCount === 0) return

      const destDir = resolve(nuxt.options.rootDir, '.output/public/content')
      try {
        cpSync(stagingDir, destDir, { recursive: true })
      } catch (e) {
        console.error(`[body-extractor] Failed to copy body files: ${e}`)
        return
      }

      // Write manifest
      const manifestPath = resolve(destDir, 'bodies-manifest.json')
      const manifestData = {
        count: manifest.length,
        totalSize: manifest.reduce((sum, e) => sum + e.size, 0),
        files: manifest,
      }
      writeFileSync(manifestPath, JSON.stringify(manifestData))

      console.log(`[body-extractor] Extracted ${extractCount} body files`)
      console.log(`[body-extractor] Total size: ${(manifestData.totalSize / 1024 / 1024).toFixed(1)}MB`)
    })
  }
})
```

**Confidence:** MEDIUM. Hook API is documented. Exact `content.body` structure needs runtime verification. The empty body replacement format `{ type: 'minimark', value: [], toc: {...} }` matches what the current `strip-dump-bodies.mjs` script uses as replacement.

### Prerender Configuration (Minimal Routes)
```typescript
// nuxt.config.ts changes
export default defineNuxtConfig({
  // ...existing modules, but ensure sitemap is BEFORE content
  modules: ['@nuxtjs/sitemap', '@nuxt/content', '@nuxt/ui', '~/modules/body-extractor'],

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [
        '/', '/200.html', '/404.html',
        '/novels',
        '/rss.xml',
        '/novels/mga', '/novels/atg', '/novels/overgeared', '/novels/tmw',
        '/novels/htk', '/novels/issth', '/novels/cd', '/novels/lrg',
        '/novels/mw', '/novels/rtw',
        '/novels/atg/rss.xml', '/novels/cd/rss.xml', '/novels/htk/rss.xml',
        '/novels/issth/rss.xml', '/novels/lrg/rss.xml', '/novels/mga/rss.xml',
        '/novels/mw/rss.xml', '/novels/overgeared/rss.xml', '/novels/rtw/rss.xml',
        '/novels/tmw/rss.xml',
      ],
      concurrency: 4,
    },
    // REMOVE the hooks.prerender:routes that added 13K chapter routes
  },

  // SPA loading template for branded spinner
  spaLoadingTemplate: true,  // or path to custom HTML

  // ...rest unchanged
})
```

### Netlify Redirect Configuration
```toml
# netlify.toml (new file)
[[redirects]]
  from = "/novels/*/*"
  to = "/200.html"
  status = 200
  force = false
```

### Sitemap Collection Configuration
```typescript
// content.config.ts changes
import { defineContentConfig, defineCollection } from '@nuxt/content'
import { asSitemapCollection } from '@nuxtjs/sitemap/content'
import { z } from 'zod'

const chapterSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()),
})

function novelCollection(dir: string) {
  return defineCollection(
    asSitemapCollection({
      type: 'page',
      source: `${dir}/**/*.md`,
      schema: chapterSchema,
    })
  )
}

export default defineContentConfig({
  collections: {
    lrg: novelCollection('lrg'),
    mga: novelCollection('mga'),
    // ...all 10 novels
  },
})
```

**Confidence:** MEDIUM. `asSitemapCollection` is documented but its interaction with 13K entries across 10 collections needs validation. The sitemap module supports chunking for large collections.

### SPA Loading Template
```html
<!-- app/spa-loading-template.html -->
<div id="spa-loading" style="
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #111;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
">
  <div style="text-align: center;">
    <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
      Schaden Novel
    </div>
    <div style="
      width: 24px; height: 24px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    "></div>
  </div>
</div>
<style>
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
```

**Note:** The `spaLoadingTemplate` config in nuxt.config must be set to `true` or a path string for Nuxt to include this in the 200.html output. Since Nuxt 3.7, it's disabled by default.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Post-build SQL dump body stripping via regex | Parse-time body extraction via `content:file:afterParse` hook | v1.1 (this phase) | Eliminates fragile 166-line SQL parsing script; bodies never enter the database |
| Prerender all 26K routes | Prerender ~25 shell routes + SPA fallback | v1.1 (this phase) | Build time drops from ~10 min to ~2 min |
| Single build output (HTML + stripped dumps) | Build output includes HTML + stripped dumps + 13K body JSON files | v1.1 (this phase) | Deploy artifact grows (~200MB body files) but individual files are CDN-cacheable |
| `nuxt build` | `nuxt generate` (or `nuxt build --prerender`) | v1.1 (this phase) | Required for static prerendering with SSR-enabled content |

**Deprecated/outdated:**
- `scripts/strip-dump-bodies.mjs`: Replaced by body-extractor module. Should be deleted.
- `prerender:routes` hook adding 13K chapter routes: Replaced by explicit 25-route list. Should be removed.
- `getChapterSlugs()` function in nuxt.config: No longer needed (was used only by the prerender hook). Should be removed.

## Open Questions

1. **Exact body format in afterParse hook**
   - What we know: Nuxt Content v3 uses "minimal" format `{ type: "minimal", value: [...] }` in the database/queries. The afterParse hook fires before database storage.
   - What's unclear: Does the hook receive the pre-compression MDC AST (`{ type: "root", children: [...] }`) or the already-compressed minimal format? GitHub issue #3072 suggests compression happens during storage, meaning the hook gets the full AST.
   - Recommendation: Log format on first run, write whatever format is received. ContentRenderer compatibility is Phase 6's concern.

2. **Zero-padding in body file paths**
   - What we know: User decision says `/content/novels/{slug}/{zero-padded-num}.json`. Source content files are NOT zero-padded (e.g., `1.md`, `100.md`).
   - What's unclear: What padding width? `001.json`? `0001.json`? Must match between build extraction and runtime fetch.
   - Recommendation: Use the original stem (no padding) to avoid build/runtime mismatch. If zero-padding is desired, determine max chapter number per novel and pad accordingly. **Flag for planner to decide.**

3. **Novel listing pages -- shell vs full prerender**
   - What we know: User says "novel listing pages prerender with novel info only -- chapter list loads from SQLite client-side." Current implementation (`[novel]/index.vue`) uses `queryCollection().select('title','path','stem').all()` which returns ALL chapters.
   - What's unclear: This means the prerendered HTML will contain the full chapter listing (server-rendered) but then client-side will re-query. Is this intentional duplication, or should the listing page be modified to only load metadata (novel name, description, count) at prerender time?
   - Recommendation: For this phase, prerender the listing pages as-is (they will contain chapter lists in the HTML). Modifying the listing page to load chapter list client-side is a UI change better suited for Phase 6+.

4. **Build time: content compilation dominates**
   - What we know: Content compilation (parsing 13K markdown files) takes ~2 minutes regardless of prerender count. The 2-minute target means the entire build must complete within content compilation time.
   - What's unclear: Whether body extraction overhead (13K `writeFileSync` calls + 13K JSON.stringify calls) adds measurable time to compilation.
   - Recommendation: Benchmark after implementation. If body extraction adds >30 seconds, consider batching writes or using async I/O.

5. **Netlify deploy size with 13K+ body JSON files**
   - What we know: Netlify has no hard file count limit overall, but a 54,000 files per directory limit. Largest novel (MGA) has ~2,335 chapters -- well under 54K per directory. Total body files ~200MB.
   - What's unclear: Whether the `netlify deploy` CLI handles 13K+ new files efficiently (upload time, API rate limits).
   - Recommendation: First deploy may be slow (uploading 13K files). Subsequent deploys should be fast (Netlify uses content hashing, only uploads changed files).

## Sources

### Primary (HIGH confidence)
- [Nuxt Content v3 Hooks](https://content.nuxt.com/docs/advanced/hooks) - afterParse hook API, context object shape
- [Nuxt 4 Lifecycle Hooks](https://nuxt.com/docs/4.x/api/advanced/hooks) - `close`, `nitro:build:public-assets`, `prerender:routes` hooks
- [Nuxt 4 Prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering) - explicit route list, crawlLinks:false, 200.html auto-generation
- [Nuxt 4 Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering) - hybrid rendering, SPA fallback, ssr:true requirement
- [Netlify Redirects](https://docs.netlify.com/routing/redirects/) - redirect rules, 200 rewrite, force:false behavior
- [Nuxt Sitemap Content Integration](https://nuxtseo.com/docs/sitemap/guides/content) - asSitemapCollection() API
- [Nuxt Sitemap Data Sources](https://nuxtseo.com/docs/sitemap/getting-started/data-sources) - custom URL sources, build-time urls function
- Codebase inspection: `nuxt.config.ts`, `content.config.ts`, `package.json`, `scripts/strip-dump-bodies.mjs`, all page components, all composables -- HIGH confidence (direct file reads)

### Secondary (MEDIUM confidence)
- [Nuxt Content v3 minimal/minimark body format](https://github.com/nuxt/content/issues/3072) - body type "minimal" structure, decompressTree utility
- [ContentRenderer with external data](https://github.com/nuxt/content/discussions/1974) - value prop structure requirements
- [Nuxt SPA fallback discussion](https://github.com/nuxt/nuxt/discussions/24583) - delivering SSG with SPA fallback
- [Nuxt Content ssr:false issue #1229](https://github.com/nuxt/content/issues/1229) - confirmed: ssr:false breaks Content v3
- [Nuxt 200.html generation PR #6308](https://github.com/nuxt/framework/pull/6308) - 200.html and 404.html auto-generated
- [Netlify file count limits](https://answers.netlify.com/t/is-there-a-storage-or-file-count-limit-for-business-plan-hosting/118172) - 54K per directory limit

### Tertiary (LOW confidence)
- afterParse hook body format (MDC vs minimal) at hook time -- needs empirical verification
- Build time estimate with body extraction overhead -- extrapolated from current build times, needs benchmarking

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses only built-in Nuxt/Node APIs, no new dependencies
- Architecture: MEDIUM-HIGH - afterParse hook is documented; exact body format needs verification; file copy via close hook is standard
- Pitfalls: HIGH - well-documented from v1.0 experience and architecture research
- Prerender config: HIGH - standard Nuxt configuration, well-documented
- Netlify redirect: HIGH - standard SPA hosting pattern
- Sitemap integration: MEDIUM - asSitemapCollection is documented but not tested at 13K scale

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
