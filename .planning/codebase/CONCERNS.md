# Codebase Concerns

**Analysis Date:** 2026-02-17

## Tech Debt

**Silent Error Swallowing in Import Scripts:**
- Issue: Empty catch blocks throughout `scripts/import.mjs` (line 88) and `scripts/import_ids.mjs` (lines 41-43) that catch and ignore all errors, making failures invisible
- Files: `scripts/import.mjs`, `scripts/import_ids.mjs`, `scripts/readChapters.mjs`
- Impact: Import failures go unnoticed. Users don't know if novel content failed to import. Silent data loss risk.
- Fix approach: Replace empty catch blocks with console.error logging; add retry logic with exponential backoff for network failures; optionally throw errors or create error logs

**Missing await on File Operations:**
- Issue: `appendFile` calls in `scripts/import.mjs` (line 57) and `scripts/import_ids.mjs` (line 40) are not awaited, causing potential race conditions and incomplete writes
- Files: `scripts/import.mjs:57`, `scripts/import_ids.mjs:40`
- Impact: File operations may complete out of order; chapters written incompletely or corrupted data written to disk
- Fix approach: Add `await` keyword before appendFile calls; consider switching to streaming if file grows very large

**Inefficient Chapter Sorting Algorithm:**
- Issue: `defaultSort()` in `src/consts.ts` (lines 18-58) uses multiple indexOf string checks and manual suffix handling (_a, _b, _c, _d) with repeated conditionals
- Files: `src/consts.ts:18-58`
- Impact: With 13,318 chapters, sorting becomes O(n²) or worse due to string operations. Noticeable slowdown on homepage load with 10+ novels
- Fix approach: Pre-parse chapter IDs into structured data (novel, number, suffix); use numeric comparison; consider memoizing results

**Hardcoded Google Doc IDs Embedded in Code:**
- Issue: Google Docs spreadsheet IDs hardcoded as strings in `scripts/import.mjs` (lines 72-82)
- Files: `scripts/import.mjs:71-82`
- Impact: Credentials/data source locations visible in git history; if these are private documents, exposure is a privacy risk; changing data sources requires code changes
- Fix approach: Move to environment variables or config file; never commit data source IDs if they reference private documents; use GitHub Secrets for CI/CD

## Known Bugs

**Unsafe innerHTML Usage:**
- Symptoms: Potential XSS vulnerability when displaying saved novels in dropdown
- Files: `src/components/ResumeReading.astro:80`
- Trigger: If localStorage data becomes corrupted or attacker can modify localStorage, malicious HTML is injected
- Workaround: Currently relayed data is only from current app (same-origin), but no Content Security Policy in place

**Regex State Bug in Chapter Reader:**
- Symptoms: Chapter parsing may fail or skip chapters in `readChapters.mjs`
- Files: `src/scripts/readChapters.mjs:80`
- Trigger: Using `regex.test()` in a loop mutates regex state; second call on same regex object may skip matches due to regex.lastIndex
- Workaround: Manually reset lastIndex or recreate regex each iteration (currently broken)

## Performance Bottlenecks

**Large Content Directory Slowing Builds:**
- Problem: 170MB of markdown content in `src/content/novels/` with 13,318 chapter files causes slow build times and memory pressure
- Files: `src/content/novels/**/*.md` (all files)
- Cause: Astro must parse every markdown file on build; with 13K files, glob loader processes everything sequentially
- Improvement path: Implement incremental content loading; split chapters into subdirectories by range (e.g., chapters 1-1000, 1001-2000); use production-only content inclusion; consider database-backed content instead of filesystem

**Memory Exhaustion During Build:**
- Problem: Build script explicitly allocates 8GB node memory (`NODE_OPTIONS=--max-old-space-size=8192` in `package.json:7`)
- Files: `package.json:7`, `build-cache/` (artifacts directory growing)
- Cause: Astro loading 13K markdown files requires significant memory for AST parsing and route generation
- Improvement path: Profile build with `--inspect` flag; implement streaming content loading; chunk builds by novel; use disk-based caching more aggressively

**No Retry Logic for Google Docs Fetch:**
- Problem: Network requests to Google Docs export API (in `scripts/import.mjs:33-43`) fail immediately on timeout with no retry
- Files: `scripts/import.mjs:33-43`
- Cause: Single fetch call; network blips cause entire import to fail
- Improvement path: Implement exponential backoff retry (3-5 attempts); add timeout parameter; handle rate limiting (429 responses)

**Inefficient Collection Querying on Homepage:**
- Problem: `src/pages/index.astro` (lines 10-37) loads all chapters into memory, then filters and sorts in JavaScript
- Files: `src/pages/index.astro:10-37`
- Cause: No collection-level filtering; reduces all 13K chapters to object, then extracts 3 per novel
- Improvement path: Filter collections at load time using loader predicates; implement pagination; pre-compute homepage data during build

## Fragile Areas

**Import/Export Pipeline:**
- Files: `scripts/import.mjs`, `scripts/import_ids.mjs`, `scripts/readChapters.mjs` (entire pipeline)
- Why fragile: Multiple dependencies on external Google Docs API; no validation of export format; regex-based parsing assumes consistent formatting; if Google changes export format, entire pipeline breaks silently
- Safe modification: Add unit tests with sample Google Doc exports; validate chapter format before writing; add version detection for export format; implement dry-run mode with detailed logging
- Test coverage: No tests exist for import scripts; no fixtures for various Google Doc scenarios

**Chapter Navigation Logic:**
- Files: `src/pages/novels/[novel]/[...slug].astro:29-31`, `src/layouts/Chapter.astro:129-145`
- Why fragile: Navigation assumes chapters exist at prev/next indices in sorted array; if sort order changes, navigation breaks; no validation that prev/next exist before generating links
- Safe modification: Add getNeighboringChapters() helper with null checks; add aria-disabled attribute; test with missing chapters
- Test coverage: No tests for navigation with edge cases (first/last chapter)

**LocalStorage Resume Reading:**
- Files: `src/components/ResumeReading.astro:26-49`, `src/layouts/Chapter.astro:102-120`
- Why fragile: Assumes savedChapters structure is always `{novel: {chapterId, timestamp}}`; no migration if structure changes; corruption of localStorage entry breaks dropdown
- Safe modification: Implement versioning in localStorage schema; add validation function; clear invalid entries instead of crashing
- Test coverage: No tests for localStorage edge cases (full, corrupted, wrong format)

## Security Considerations

**XSS Risk via innerHTML in ResumeReading:**
- Risk: If localStorage is compromised or corrupted, untrusted HTML could be injected into DOM
- Files: `src/components/ResumeReading.astro:80` (innerHTML assignment)
- Current mitigation: Data only comes from same-origin localStorage; no user input involved currently
- Recommendations: Replace innerHTML with textContent or createElement methods; add Content Security Policy header; validate chapterId format before rendering

**Hardcoded Data Source Identifiers:**
- Risk: Google Docs IDs in code expose data source infrastructure; if these are private docs, access control depends only on ID secrecy
- Files: `scripts/import.mjs:71-82`
- Current mitigation: Google Docs IDs are long hexadecimal strings; public access requires sharing link
- Recommendations: Move to environment variables; rotate IDs periodically; use service account with restricted permissions; monitor access logs

**Network Request Logging:**
- Risk: `scripts/import.mjs:38` logs full response object on network error, which may contain sensitive headers or error details
- Files: `scripts/import.mjs:38`
- Current mitigation: Only shown in console during manual import runs
- Recommendations: Log only status code and message; never log full response; implement rate-limit detection (429 status)

## Scaling Limits

**Content Directory as Filesystem Bottleneck:**
- Current capacity: 13,318 chapters, 170MB total; build takes ~60+ seconds with 8GB memory allocation
- Limit: Beyond 50K chapters, filesystem scanning and markdown parsing become prohibitively slow; single glob loader blocks other build processes
- Scaling path: Migrate to database (SQLite, Postgres) with indexed queries; implement pagination at collection level; pre-generate static pages for evergreen content; use CDN for chapter distribution

**Build Memory Requirement:**
- Current capacity: Explicitly requires 8GB Node heap; any machine with less memory will fail
- Limit: If chapters/metadata grow 3-5x, 16GB may be needed; CI/CD runners may not have sufficient memory
- Scaling path: Split content into multiple builds; implement streaming markdown parser; compress chapter metadata; pre-build static pages incrementally

**Route Generation:**
- Current capacity: 13,318 routes generated at build time
- Limit: Beyond 50K routes, Astro's build cache may become slow; SSG (Static Site Generation) output directory may exceed filesystem or CDN limits
- Scaling path: Implement on-demand route generation (SSR for some paths); split output into multiple CDN namespaces; use dynamic imports to defer route loading

## Test Coverage Gaps

**Import Scripts Untested:**
- What's not tested: Happy path Google Docs export parsing; error handling for malformed documents; retry logic (doesn't exist); chapter number extraction regex
- Files: `scripts/import.mjs`, `scripts/import_ids.mjs`, `scripts/readChapters.mjs`
- Risk: Breaks silently; new novels fail to import without visibility; chapter data corrupted or lost
- Priority: **High** - currently only validated by manual testing

**Navigation Edge Cases:**
- What's not tested: First chapter (no prev), last chapter (no next), missing intermediate chapters
- Files: `src/pages/novels/[novel]/[...slug].astro`, `src/layouts/Chapter.astro`
- Risk: Broken links; TypeErrors if prev/next are undefined; confusing UX
- Priority: **Medium** - affects user experience but caught during manual browsing

**LocalStorage Resilience:**
- What's not tested: Quota exceeded, storage disabled, corrupted JSON, missing fields
- Files: `src/components/ResumeReading.astro`, `src/layouts/Chapter.astro`
- Risk: Resume reading feature silently fails; no fallback; console errors not visible to users
- Priority: **Medium** - affects user retention but graceful degradation exists

---

*Concerns audit: 2026-02-17*
