# Phase 04: Operations - Research

**Researched:** 2026-02-18
**Domain:** Content import scripting, file migration, SQLite dump optimization
**Confidence:** HIGH

## Summary

Phase 4 ports two Google Docs import scripts (import.mjs + import_ids.mjs) and their shared readChapters.mjs to output to the Nuxt Content directory (`content/{novel}/` instead of `src/content/novels/{novel}/`), migrates all 13,318 existing chapters via rsync, and cleans up legacy directories. The existing scripts have critical silent error handling (`catch { }`) that must be fixed.

The body-stripping strategy requires careful attention: the user's proposed `content:file:afterParse` hook approach will **break pre-rendering** because the hook fires during content parsing that populates the SQLite DB used for both the dump AND page generation. The correct approach is post-processing the SQL dump files after `nuxt generate`.

**Primary recommendation:** Port scripts with path changes + error handling fixes, rsync content, post-process SQL dumps for body stripping, add content/ to Vite watch ignore list to prevent EMFILE.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Import workflow
- Port existing script from scripts/ directory -- keep same CLI interface (same flags/args)
- Script imports publicly accessible Google Docs -- no authentication needed
- No known bugs to fix -- faithful port, just update output paths to Nuxt Content structure
- Output goes to content/{novel}/ instead of src/content/novels/{novel}/

#### Migration approach
- Simple cp/rsync from src/content/novels/* to content/* -- files are already compatible, no frontmatter changes needed
- Overwrite the 2 novels already in content/ (mga, lrg) with src/content versions for consistency
- Delete legacy src/ and dist/ directories after successful migration
- Strip chapter bodies from SQLite dump using content:file:afterParse hook -- keep queries lean, render from markdown files

#### Error handling
- Import script: warn and continue on failure (bad URL, rate limit, parse error) -- don't stop for individual chapter failures
- Log errors to a file (e.g., import-errors.log) in addition to stderr
- Print summary at end of every run: X imported, Y failed, Z skipped

#### Validation
- File count comparison per novel between src/content and content/ + manual spot-check
- Run nuxt generate after migration to confirm full build with 13K chapters succeeds
- Overwrite existing content/ novels to ensure all 10 novels come from the same source

### Claude's Discretion
- Body-stripping hook implementation details
- rsync flags vs cp approach for file copy
- Exact log file format and location

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPS-01 | Google Docs import script ports existing chapter import workflow to new project | Existing scripts analyzed: import.mjs, import_ids.mjs, readChapters.mjs. Path change from `./src/content/novels/{tag}/` to `./content/{tag}/` is the core change. Cheerio dependency already in devDependencies. |
| OPS-02 | Import script handles errors visibly (fix existing silent error swallowing) | Three silent `catch {}` blocks identified across import.mjs (lines 58-60, 87-88) and import_ids.mjs (lines 41-43). Need warn+continue pattern, error file logging, and run summary. |
| OPS-03 | Existing ~13,318 markdown chapters migrate to Nuxt Content structure | 13,318 .md files (170MB) in src/content/novels/. All use compatible frontmatter (title, pubDate, tags). content.config.ts already defines all 10 novel collections. rsync --delete for clean overwrite. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | ^1.1.2 | HTML parsing for Google Docs export | Already in devDeps, used by existing import script |
| Node.js fs/promises | native | File system operations | Already used in existing scripts |
| Node.js readline | native | Line-by-line chapter splitting | Already used in readChapters.mjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rsync (CLI) | system | File migration | Copying 13K files from src/content/novels/ to content/ |
| zlib (Node) | native | Gzip decompress/compress | Post-processing SQL dump files for body stripping |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rsync | cp -R | rsync gives --delete for clean copy, cp requires manual rm first |
| Post-process dump | afterParse hook | afterParse strips body from SQLite DB, breaking pre-rendering (see Pitfall 1) |

**Installation:**
No new dependencies needed. All tools are already available (cheerio in devDeps, rsync/cp system tools, Node built-ins).

## Architecture Patterns

### Existing Script Architecture
```
scripts/
  import.mjs         # Main import: TOC doc -> extract chapter links -> fetch all -> writeChapters
  import_ids.mjs      # Alt import: direct doc IDs -> fetch all -> writeChapters
  readChapters.mjs    # Shared: split combined chapters.md -> individual {number}.md files
```

### Import Flow (import.mjs)
```
1. Load "table of contents" Google Doc as HTML (one per novel)
2. Extract all <a href> links -> extract doc IDs
3. For each doc ID: fetch as text, append to tmp/{novel}/chapters.md
4. Call writeChapters() to split combined file into individual chapter .md files
5. Clean up tmp/
```

### Chapter File Creation (readChapters.mjs)
```
1. Read combined chapters.md line by line
2. Detect chapter boundaries via /Capitolo\s+[0-9]/g regex
3. Extract chapter number from title
4. Handle multi-part chapters: prima->_a, seconda->_b, terza->_c, quarta->_d
5. Generate frontmatter: title, pubDate (current date), tags: [novel]
6. Skip if file already exists (existsSync check)
7. Write to: content/{novel}/{number}.md  <-- CHANGE from src/content/novels/{novel}/
```

### Content Directory Structure
```
content/
  atg/           # 2,157 chapters
  cd/            # 1 chapter (legitimate - novel in early import)
  htk/           # 1,020 chapters
  issth/         # 1,407 chapters
  lrg/           # 84 chapters
  mga/           # 2,335 chapters
  mw/            # 2,254 chapters
  overgeared/    # 1,255 chapters
  rtw/           # 1,498 chapters
  tmw/           # 1,307 chapters
  (total: 13,318 files, 170MB)
```

### Frontmatter Schema (unchanged)
```yaml
---
title: Capitolo 1 - Yun Che, Xiao Che
pubDate: 2024-05-22T15:27:25.178Z
tags:
    - atg
---
[chapter body]
```

### Filename Patterns
- Standard: `{number}.md` (e.g., `1.md`, `100.md`, `2157.md`)
- Multi-part: `{number}_{suffix}.md` (e.g., `101_a.md`, `102_b.md`, `103_c.md`)
- All .md, no other file types present

### Pattern: Post-Process SQL Dump for Body Stripping

**CRITICAL**: Do NOT use `content:file:afterParse` hook for body stripping. See Pitfall 1.

```javascript
// scripts/strip-dump-bodies.mjs
// Run AFTER nuxt generate, BEFORE deploy
import { readFileSync, writeFileSync } from 'fs'
import { readdirSync } from 'fs'
import { createGunzip, gzipSync } from 'zlib'
import { resolve } from 'path'

const dumpDir = resolve('.output/public/__nuxt_content')
const collections = readdirSync(dumpDir)

for (const collection of collections) {
  const dumpPath = resolve(dumpDir, collection, 'sql_dump.txt')
  // Decode base64 -> decompress gzip -> get SQL
  const compressed = readFileSync(dumpPath, 'utf-8')
  const buffer = Buffer.from(compressed, 'base64')
  const sql = require('zlib').gunzipSync(buffer).toString('utf-8')

  // SQL format: INSERT INTO _content_{name} VALUES (id, title, body, ...)
  // body is the 3rd column — replace its JSON value with empty minimark
  const stripped = sql.replace(
    /(')\s*,\s*'\{"type":"minimark","value":\[.*?\]\}'\s*,/g,
    "$1, '{\"type\":\"minimark\",\"value\":[]}', "
  )

  // Recompress and re-encode
  const recompressed = gzipSync(Buffer.from(stripped))
  writeFileSync(dumpPath, recompressed.toString('base64'))
}
```

**Note:** The regex approach above is fragile — body content may contain escaped quotes and nested structures. A more robust approach would parse the SQL statements properly. The planner should decide the exact implementation. The key insight is: post-process AFTER build, not during build.

### Anti-Patterns to Avoid
- **Stripping body in afterParse hook:** Strips from SQLite DB used for pre-rendering too, resulting in empty chapter pages
- **Not ignoring content/ in Vite watcher:** 13K files in content/ will cause EMFILE just like src/ did
- **Missing await on appendFile:** Existing import.mjs line 57 does `appendFile(...)` without `await` — race condition with subsequent reads
- **Processing all novels in parallel:** Google Docs API will rate-limit — keep sequential processing with sleep between novels

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML link extraction | Custom regex | cheerio | Already used, handles malformed HTML |
| File copy 13K files | Custom Node.js copy loop | rsync CLI | Handles atomicity, permissions, --delete for clean copy |
| Gzip/base64 for dump post-processing | Third-party libs | Node.js built-in zlib + Buffer | No extra deps needed |

**Key insight:** The import scripts are simple and specific — the complexity is in error handling and the body-stripping post-process, not in the import logic itself.

## Common Pitfalls

### Pitfall 1: afterParse Hook Breaks Pre-Rendering (CRITICAL)
**What goes wrong:** Using `content:file:afterParse` to strip body removes it from the SQLite database. Pre-rendered pages use the same SQLite DB to query chapter content via `queryCollection().first()`. Result: pre-rendered HTML has no chapter body text.
**Why it happens:** The hook fires during `processCollectionItems` which populates BOTH the SQLite DB (used for pre-rendering) AND the SQL dump (shipped to client). They share the same data source.
**How to avoid:** Post-process the SQL dump files in `.output/public/__nuxt_content/*/sql_dump.txt` AFTER `nuxt generate` completes. The pre-rendered pages and their payloads already contain the full body.
**Warning signs:** Empty chapter pages when viewed in browser after build.
**Confidence:** HIGH — verified by reading @nuxt/content module source code (module.mjs lines 1497, 3166-3170, 3189-3317).

### Pitfall 2: EMFILE After Migration
**What goes wrong:** Moving 13K files from src/ to content/ trades one EMFILE source for another. Vite's file watcher monitors content/ directory.
**Why it happens:** `content.watch.enabled: false` only disables Nuxt Content's watcher, not Vite's native fs.watch for HMR.
**How to avoid:** Add `'**/content/**'` to `vite.server.watch.ignored` in nuxt.config.ts. After deleting src/ and dist/, remove their entries from ignore lists.
**Warning signs:** EMFILE errors on `pnpm dev` after migration.
**Confidence:** HIGH — prior decision [01-01] documented same pattern with src/.

### Pitfall 3: Missing await on appendFile
**What goes wrong:** In existing import.mjs line 57: `appendFile(...)` is called without `await`. If writeChapters runs before all appends complete, chapters may be truncated or missing.
**Why it happens:** Original code oversight — `appendFile` returns a Promise but it's not awaited.
**How to avoid:** Add `await` to all `appendFile` calls in the ported script.
**Warning signs:** Intermittent missing chapter content at end of import.
**Confidence:** HIGH — verified by reading import.mjs line 57 and import_ids.mjs line 40.

### Pitfall 4: SQLite Dump Size in localStorage
**What goes wrong:** Client-side Nuxt Content caches SQL dumps in localStorage (database.client.js lines 86-99). localStorage has a 5-10MB limit per origin. Without body stripping, 13K chapters project to ~41MB compressed across 10 novels.
**Why it happens:** Nuxt Content v3 uses localStorage for dump caching to avoid re-downloading.
**How to avoid:** Body stripping reduces dump size dramatically. Without body, each row is ~200-500 bytes (title + metadata). 13K rows = ~3-6MB total across all collections.
**Warning signs:** `QuotaExceededError` in browser console, content queries failing silently.
**Confidence:** HIGH — verified by examining database.client.js and measuring current mga dump (7.4MB for 2,335 chapters).

### Pitfall 5: Prerender Configuration Not Updated
**What goes wrong:** Current nuxt.config.ts only prerenders lrg (all) and mga (first 500). After migration, all 10 novels need prerendering.
**Why it happens:** Phase 1 set up limited prerendering for benchmarking.
**How to avoid:** Expand `prerender:routes` hook to iterate all 10 novels using the existing `getChapterSlugs()` helper. Remove the mga 500-chapter limit.
**Warning signs:** 404 errors for novel chapters that aren't lrg or mga.
**Confidence:** HIGH — verified in nuxt.config.ts lines 59-74.

### Pitfall 6: nuxt.config.ts Cleanup After Legacy Deletion
**What goes wrong:** After deleting src/ and dist/, the ignore patterns referencing them become dead code. More importantly, content/ needs to be added to Vite ignore.
**Why it happens:** Original patterns were added for legacy directories.
**How to avoid:** Update nuxt.config.ts `ignore`, vite.server.watch.ignored, and .nuxtignore in a single coordinated update.
**Warning signs:** No immediate error, but confusing config for future developers.
**Confidence:** HIGH — verified in nuxt.config.ts and .nuxtignore.

## Code Examples

### Current Silent Error Handling (what to fix)
```javascript
// import.mjs lines 54-61 — SILENT catch
for (const id of ids) {
  try {
    const text = await loadGoogleDoc(id)
    appendFile('./tmp/' + novel + '/chapters.md', '\n\n' + text)  // missing await
  } catch (error) {
    // COMPLETELY SILENT — swallows all errors
  }
}

// import.mjs lines 84-89 — SILENT catch on entire novel
async function loadAll() {
  for (const novel of Object.keys(novels)) {
    try {
      await loadNovel(novels[novel], novel)
    } catch { }  // COMPLETELY SILENT
  }
}
```

### Ported Error Handling Pattern
```javascript
// Error tracking state
let imported = 0, failed = 0, skipped = 0
const errors = []

// Per-chapter error handling: warn + continue
for (const id of ids) {
  try {
    const text = await loadGoogleDoc(id)
    await appendFile(tmpPath, '\n\n' + text)  // NOTE: await added
    imported++
  } catch (error) {
    failed++
    const msg = `[${novel}] Failed to load doc ${id}: ${error.message}`
    console.error(msg)
    errors.push(msg)
  }
}

// Per-novel error handling: warn + continue
for (const novel of Object.keys(novels)) {
  try {
    await loadNovel(novels[novel], novel)
  } catch (error) {
    const msg = `[${novel}] Novel import failed: ${error.message}`
    console.error(msg)
    errors.push(msg)
  }
}

// Summary + error file
console.log(`\nImport complete: ${imported} imported, ${failed} failed, ${skipped} skipped`)
if (errors.length > 0) {
  await writeFile('./import-errors.log', errors.join('\n') + '\n')
  console.error(`Errors written to import-errors.log`)
}
```

### readChapters.mjs Path Change
```javascript
// BEFORE (line 48):
const path = './src/content/novels/' + tag + '/' + number + '.md'

// AFTER:
const path = './content/' + tag + '/' + number + '.md'
```

### Migration Command (rsync)
```bash
# --archive: preserves permissions, timestamps
# --delete: removes files in dest not in src (clean overwrite for mga, lrg)
# --verbose: shows file list for verification
rsync --archive --delete --verbose src/content/novels/ content/
```

### Prerender Routes Expansion
```typescript
// nuxt.config.ts — expand prerender:routes for all novels
'prerender:routes': function (routes: Set<string>) {
  const novels = ['atg', 'cd', 'htk', 'issth', 'lrg', 'mga', 'mw', 'overgeared', 'rtw', 'tmw']
  for (const novel of novels) {
    routes.add(`/novels/${novel}`)
    for (const slug of getChapterSlugs(novel)) {
      routes.add(`/novels/${novel}/${slug}`)
    }
  }
}
```

### Vite Watch Ignore Update
```typescript
// nuxt.config.ts — after migration
vite: {
  server: {
    watch: {
      ignored: [
        '**/content/**',        // 13K chapter files — content.watch handles this
        '**/tmp/**', '**/build-cache/**', '**/.planning/**',
        '**/.astro/**', '**/.frontmatter/**',
      ],
    },
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Output to src/content/novels/ | Output to content/ | This migration | Nuxt Content reads from content/ |
| Silent error swallowing | Warn + continue + log file | This phase | OPS-02 requirement |
| 2 novels in content/ | All 10 novels in content/ | This migration | Full site operates from Nuxt Content |
| Prerender lrg + mga (500) only | Prerender all 13K chapters | This migration | All chapters accessible |

**Deprecated/outdated:**
- `src/content/novels/` — legacy Astro content directory, deleted after migration
- `dist/` — legacy Astro build output, deleted after migration

## Open Questions

1. **Build time for 13K chapters**
   - What we know: Current build with ~2,419 chapters (lrg+mga) is under 10 min. NODE_OPTIONS=--max-old-space-size=8192 is set.
   - What's unclear: Exact build time with 13K chapters. Linear scaling would suggest ~50 min, but SQLite processing and prerendering may not scale linearly.
   - Recommendation: Run migration and build, measure actual time. If unacceptable, increase concurrency or consider incremental prerendering.

2. **SQL dump body-stripping regex robustness**
   - What we know: The body field contains JSON minimark with escaped quotes, nested arrays, and special characters. A simple regex replacement may fail on edge cases.
   - What's unclear: Whether a regex approach is sufficient or if full SQL parsing is needed.
   - Recommendation: Start with regex approach, validate by comparing stripped dump size to expected (should be ~95% smaller). If edge cases arise, switch to proper SQL statement parsing. Alternative: parse the base64-decoded gzipped content as line-separated SQL statements and replace the body positionally (3rd column in INSERT).

3. **RSS prerender routes for additional novels**
   - What we know: Currently only mga and lrg RSS routes are prerendered (nuxt.config.ts line 54). The comment says "Add more novel RSS routes as content is migrated."
   - What's unclear: Whether this is in Phase 4 scope or a separate concern.
   - Recommendation: Add all 10 novel RSS prerender routes as part of the config cleanup in this phase.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** — scripts/import.mjs, scripts/import_ids.mjs, scripts/readChapters.mjs (direct analysis)
- **@nuxt/content module source** — node_modules/@nuxt/content/dist/module.mjs (hook behavior, dump generation at lines 1497, 3166-3317)
- **@nuxt/content client database** — node_modules/@nuxt/content/dist/runtime/internal/database.client.js (localStorage caching, dump loading)
- **@nuxt/content type definitions** — node_modules/@nuxt/content/dist/module.d.mts (FileAfterParseHook interface at lines 348-352)

### Secondary (MEDIUM confidence)
- [Nuxt Content Hooks documentation](https://content.nuxt.com/docs/advanced/hooks) — hook registration in nuxt.config.ts, afterParse examples
- [Nuxt Content Database documentation](https://content.nuxt.com/docs/advanced/database) — client-side SQLite dump mechanism
- Prior phase decisions [01-01] — EMFILE fixes, content.watch disable, vite ignore patterns

### Tertiary (LOW confidence)
- SQL dump body-stripping regex approach — untested, may need iteration for edge cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed, all tools already available
- Architecture: HIGH — existing scripts analyzed in full, path changes well understood
- Pitfalls: HIGH — afterParse hook behavior verified from module source code, EMFILE pattern documented from prior phase
- Body stripping: MEDIUM — post-process approach is correct direction but exact implementation needs validation

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable — no fast-moving dependencies)
