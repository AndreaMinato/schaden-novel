# Phase 4: Operations - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Port the existing Google Docs import script to work with Nuxt Content directory structure, and migrate all 13,318 existing chapters from src/content/novels/ into content/. After migration, clean up legacy directories. The site must build successfully with all content.

</domain>

<decisions>
## Implementation Decisions

### Import workflow
- Port existing script from scripts/ directory — keep same CLI interface (same flags/args)
- Script imports publicly accessible Google Docs — no authentication needed
- No known bugs to fix — faithful port, just update output paths to Nuxt Content structure
- Output goes to content/{novel}/ instead of src/content/novels/{novel}/

### Migration approach
- Simple cp/rsync from src/content/novels/* to content/* — files are already compatible, no frontmatter changes needed
- Overwrite the 2 novels already in content/ (mga, lrg) with src/content versions for consistency
- Delete legacy src/ and dist/ directories after successful migration
- Strip chapter bodies from SQLite dump using content:file:afterParse hook — keep queries lean, render from markdown files

### Error handling
- Import script: warn and continue on failure (bad URL, rate limit, parse error) — don't stop for individual chapter failures
- Log errors to a file (e.g., import-errors.log) in addition to stderr
- Print summary at end of every run: X imported, Y failed, Z skipped

### Validation
- File count comparison per novel between src/content and content/ + manual spot-check
- Run nuxt generate after migration to confirm full build with 13K chapters succeeds
- Overwrite existing content/ novels to ensure all 10 novels come from the same source

### Claude's Discretion
- Body-stripping hook implementation details
- rsync flags vs cp approach for file copy
- Exact log file format and location

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-operations*
*Context gathered: 2026-02-18*
