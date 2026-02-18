---
phase: 04-operations
verified: 2026-02-18T14:00:00Z
status: human_needed
score: 11/12 must-haves verified
re_verification: false
human_verification:
  - test: "Run import script with a valid Google Docs URL"
    expected: "A correctly formatted markdown file is created under content/{novel}/ with title, pubDate, and tags frontmatter, and chapter body as content"
    why_human: "Cannot test against live Google Docs API programmatically — requires real TOC doc ID or chapter doc URL"
  - test: "Run import script with an unavailable Google Doc URL (invalid ID or 404)"
    expected: "Script logs error to stderr, writes to import-errors.log, continues to next chapter, and prints final summary with failed count > 0"
    why_human: "Error path behavior can only be exercised against a live HTTP response — code inspection confirms the handler is in place but live behavior requires the real Google Docs API"
---

# Phase 04: Operations Verification Report

**Phase Goal:** Developers can import new chapters from Google Docs into the Nuxt Content structure, and all 13,318 existing chapters are accessible in the rebuilt site without data loss
**Verified:** 2026-02-18T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Import scripts write chapter files to `content/{novel}/` not `src/content/novels/{novel}/` | VERIFIED | `readChapters.mjs` line 48: `const path = './content/' + tag + '/' + number + '.md'` — no `src/content` reference remains in any script |
| 2 | Errors during doc fetch are logged to stderr and import-errors.log, not silently swallowed | VERIFIED | Both scripts have `catch (error)` blocks with `console.error(msg)`, `errors.push(msg)`, and `writeFile('./import-errors.log', ...)` when failures occur — zero empty catch blocks |
| 3 | Import run prints summary: X imported, Y failed, Z skipped | VERIFIED | Both `import.mjs` and `import_ids.mjs` end with `console.log(\`\nImport complete: ${imported} imported, ${failed} failed, ${skipped} skipped\`)` |
| 4 | `appendFile` calls are awaited to prevent race conditions | VERIFIED | `import.mjs` line 60: `await appendFile(...)`, `import_ids.mjs` line 43: `await appendFile(...)` |
| 5 | All 13,318 chapter files exist under `content/` across 10 novel directories | VERIFIED | File count: atg=2157, cd=1, htk=1020, issth=1407, lrg=84, mga=2335, mw=2254, overgeared=1255, rtw=1498, tmw=1307 — total 13,318 (matches expected; cd=1 is documented as legitimate in RESEARCH.md) |
| 6 | Legacy `src/` directory no longer exists | VERIFIED | `ls /Users/aminato/dev/schaden-novel/src/` returns "No such file or directory" — not filesystem-present and 0 git-tracked files |
| 7 | Legacy `dist/` directory no longer exists | PARTIAL | `dist/` is still present on filesystem (3.0GB, gitignored, 0 git-tracked files). Summary claimed deletion but directory persists. Contains old Nuxt generate output (pre-dates `.output/public/` convention). Non-blocking: gitignored, no functional impact. |
| 8 | All 10 novels have prerender routes (not just lrg and mga) | VERIFIED | `nuxt.config.ts` lines 63-69: `const novels = ['atg','cd','htk','issth','lrg','mga','mw','overgeared','rtw','tmw']` with `for (const novel of novels)` loop adding all chapter routes via `getChapterSlugs(novel)` |
| 9 | All 10 novel RSS routes are prerendered | VERIFIED | `nuxt.config.ts` prerender routes array contains 11 RSS entries: `/rss.xml` + all 10 per-novel `/novels/{novel}/rss.xml` routes |
| 10 | `content/` is in Vite watch ignore list to prevent EMFILE | VERIFIED | `nuxt.config.ts` line 81: `'**/content/**'` in `vite.server.watch.ignored` |
| 11 | `nuxt generate` completes with all 13K chapters prerendered | VERIFIED | `find .output/public/novels -name '*.html'` returns 13,328 files (13,318 chapters + 10 novel index pages); all 10 novel collections present in `.output/public/__nuxt_content/` |
| 12 | SQL dump files have chapter bodies stripped post-build | VERIFIED | `scripts/strip-dump-bodies.mjs` exists and is substantive (165 lines, SQL-aware body column parser with base64/gzip encode-decode); SUMMARY reports 64.1MB → 2.6MB (96% reduction) |

**Score: 11/12 truths verified** (truth 7 is partial — `dist/` filesystem cleanup incomplete; non-blocking)

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `scripts/readChapters.mjs` | Chapter splitter with corrected output path | Yes | Yes (107 lines, full readline logic) | Imported by both `import.mjs` and `import_ids.mjs` | VERIFIED |
| `scripts/import.mjs` | TOC-based Google Docs importer with error handling | Yes | Yes (109 lines, loadGoogleDoc + cheerio HTML parsing + error tracking) | Calls `writeChapters` from `readChapters.mjs` | VERIFIED |
| `scripts/import_ids.mjs` | Direct-ID Google Docs importer with error handling | Yes | Yes (93 lines, same error handling pattern as import.mjs) | Calls `writeChapters` from `readChapters.mjs` | VERIFIED |
| `nuxt.config.ts` | Full-site prerender config for all 10 novels | Yes | Yes (89 lines, all 10 novels in loop, 11 RSS routes, Vite ignore) | Drives `nuxt generate` prerender via `getChapterSlugs` | VERIFIED |
| `.nuxtignore` | Updated ignore patterns without legacy dirs | Yes | Yes (5 entries, no `src/**` or `dist/**`) | Nuxt module scanning | VERIFIED |
| `scripts/strip-dump-bodies.mjs` | Post-build SQL dump body stripper | Yes | Yes (165 lines, SQL-aware positional column parser) | Reads/writes `.output/public/__nuxt_content/*/sql_dump.txt` | VERIFIED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/readChapters.mjs` | `content/{tag}/` | `createFile` output path | WIRED | Line 48: `const path = './content/' + tag + '/' + number + '.md'` — `writeFileSync(path, ...)` on line 57 |
| `scripts/import.mjs` | `scripts/readChapters.mjs` | `import { writeChapters }` | WIRED | Line 3: `import { writeChapters } from './readChapters.mjs'`; called at line 71: `await writeChapters('./tmp/' + novel + '/chapters.md', novel)` |
| `scripts/import_ids.mjs` | `scripts/readChapters.mjs` | `import { writeChapters }` | WIRED | Line 3: `import { writeChapters } from './readChapters.mjs'`; called at line 54: `await writeChapters('./tmp/' + novel + '/chapters.md', novel)` |
| `nuxt.config.ts` prerender:routes | `content/{novel}/` | `getChapterSlugs` reads filenames | WIRED | `getChapterSlugs(novel)` at lines 5-13 reads `content/{novel}/*.md` filenames; used in prerender loop line 66 |
| `nuxt.config.ts` vite.server.watch.ignored | `content/` | glob pattern prevents EMFILE | WIRED | Line 81: `'**/content/**'` in `vite.server.watch.ignored` array |
| `scripts/strip-dump-bodies.mjs` | `.output/public/__nuxt_content/` | reads and rewrites sql_dump files | WIRED | Line 94: `const dumpDir = resolve('.output/public/__nuxt_content')`; line 110: `resolve(dumpDir, collection, 'sql_dump.txt')` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OPS-01 | 04-01 | Google Docs import script ports existing chapter import workflow to new project | SATISFIED | `readChapters.mjs` writes to `./content/{tag}/{number}.md`; both import scripts use `writeChapters`; Google Docs fetch + cheerio link extraction unchanged |
| OPS-02 | 04-01 | Import script handles errors visibly (fix existing silent error swallowing) | SATISFIED | All 4 catch blocks across both scripts have `console.error(msg)` + `errors.push(msg)`; summary printed after every run; `import-errors.log` written on failure; zero empty catch blocks |
| OPS-03 | 04-02, 04-03 | Existing ~13,318 markdown chapters migrate to Nuxt Content structure | SATISFIED | 13,318 `.md` files in `content/`; 13,328 HTML files in `.output/public/novels/`; all 10 novels in prerender loop; human approved browser verification in 04-03 Task 2 |

All three phase requirement IDs are accounted for. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `content/cd/1.md` | body | Chapter body is a single character `"1"` — appears to be a minimal/test import | Info | cd novel is documented as "legitimate - novel in early import" in RESEARCH.md. Import logic is correct; this reflects the source data state. |
| `dist/` (filesystem) | N/A | Old Nuxt generate output not cleaned up (3.0GB, gitignored). Plan said to delete, summary said deleted, but directory persists. | Warning | Non-blocking: gitignored (0 git-tracked files), no effect on build or chapter accessibility. Consumes 3GB disk. |

### Human Verification Required

### 1. Import Script Live Run

**Test:** Run `node scripts/import.mjs` with actual Google Docs IDs (or run a single-novel variant pointing at the atg TOC document ID in the `novels` object)
**Expected:** Script fetches chapters, writes `.md` files to `content/atg/`, prints `Import complete: N imported, 0 failed, 0 skipped`; new chapter files have correct frontmatter (`title: Capitolo N`, `pubDate`, `tags: [atg]`)
**Why human:** Cannot exercise a live HTTP fetch against Google Docs API programmatically. Code inspection confirms all paths, logic, and error handling are correct but actual download+write behavior requires real external service access.

### 2. Error Handling Live Test

**Test:** Temporarily modify `novels` object in `import.mjs` to include a known-invalid doc ID, run the script
**Expected:** Script logs error to stderr (`[atg] Failed to load doc INVALID_ID: ...`), writes `import-errors.log`, continues to next chapter, prints `Import complete: N imported, 1 failed, 0 skipped`
**Why human:** Rate-limit and unavailability scenarios require live Google Docs API interaction. Code path is confirmed correct by inspection but behavior can only be exercised end-to-end.

### Gaps Summary

No blocking gaps found. All success criteria are met at the code-verification level:

1. Import scripts write to the correct `content/{novel}/` path (verified by grep)
2. Error handling replaces all formerly-silent catch blocks (verified by code inspection — 4 catch blocks across both files, all substantive)
3. 13,318 chapters are present in `content/` and 13,328 HTML pages are in `.output/public/novels/` (verified by file counts)

The `dist/` cleanup is incomplete (directory persists on disk) but is gitignored with zero git-tracked files and has no functional impact on the site or import workflow. A manual `rm -rf dist/` would complete the cleanup but is not blocking.

Human verification of the import script against a live Google Docs endpoint remains the only unresolved item.

---

_Verified: 2026-02-18T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
