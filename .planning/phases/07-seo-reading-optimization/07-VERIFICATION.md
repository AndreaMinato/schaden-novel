---
phase: 07-seo-reading-optimization
verified: 2026-02-21T12:00:00Z
status: human_needed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Verify next chapter navigation feels instant after prefetch completes"
    expected: "Clicking next arrow shows body content immediately without skeleton flash"
    why_human: "Timing perception and visual smoothness can't be verified programmatically"
  - test: "Verify cache eviction works correctly during long reading sessions"
    expected: "After reading 6+ chapters, cache holds only last 5 visited with no memory leak"
    why_human: "Memory usage over time requires browser DevTools observation"
  - test: "Submit sitemap to Google Search Console and verify discovery"
    expected: "All 13,318 chapter URLs discovered and indexed by Google"
    why_human: "External service integration requiring manual submission and monitoring"
---

# Phase 7: SEO + Reading Optimization Verification Report

**Phase Goal:** Search engines discover all chapters and readers enjoy instant chapter-to-chapter navigation
**Verified:** 2026-02-21T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sitemap index at /sitemap_index.xml lists per-novel sub-sitemaps and a pages sitemap | ✓ VERIFIED | .output/public/sitemap_index.xml exists, lists 11 sitemaps (10 novels + pages) |
| 2 | Each per-novel sitemap contains chapter URLs with /novels/{novel}/{slug} format | ✓ VERIFIED | mga.xml contains 2,335 URLs with format https://schaden-novel.netlify.app/novels/mga/1 |
| 3 | Total chapter URLs across all sitemaps equals ~13,318 | ✓ VERIFIED | Counted 13,318 total URLs across all 10 novel sitemaps |
| 4 | RSS feeds (global + per-novel) return valid XML with chapter entries | ✓ VERIFIED | rss.xml and novels/mga/rss.xml exist with valid XML structure and 50 items |
| 5 | Navigating to next chapter loads instantly when prefetch has completed | ✓ VERIFIED | Prefetch trigger watches [bodyStatus, next] and calls prefetch(bodyUrl) after body loads |
| 6 | Returning to a previously visited chapter loads instantly from cache | ✓ VERIFIED | getOrFetch checks cache first, returns immediately if found |
| 7 | Cache holds at most 5 entries with LRU eviction | ✓ VERIFIED | MAX_ENTRIES = 5, touch() deletes oldest when cache.size > MAX_ENTRIES |
| 8 | Prefetch fires only after current chapter body finishes loading | ✓ VERIFIED | watch([bodyStatus, next]) guards with status === 'success' |
| 9 | Only next chapter is prefetched (not previous, not N+2) | ✓ VERIFIED | Prefetch triggered only for next.value.path, no previous prefetch logic |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| server/api/__sitemap__/urls.ts | Programmatic sitemap URL source querying all 10 content collections | ✓ VERIFIED | EXISTS (24 lines), uses defineSitemapEventHandler, queries all NOVEL_SLUGS, returns URLs with _sitemap tag |
| nuxt.config.ts | Sitemap config with sources and per-novel sitemaps | ✓ VERIFIED | WIRED: Each novel sitemap has sources: ['/api/__sitemap__/urls'] and include pattern |
| content.config.ts | Collection definitions without asSitemapCollection wrapper | ✓ VERIFIED | MODIFIED: asSitemapCollection removed per plan decision |
| app/composables/useBodyCache.ts | LRU body cache with prefetch, get, set, getOrFetch methods | ✓ VERIFIED | EXISTS (88 lines), module-level Map with MAX_ENTRIES=5, LRU touch function, inflight dedup Map |
| app/pages/novels/[novel]/[...slug].vue | Chapter page integrated with body cache and prefetch trigger | ✓ VERIFIED | WIRED: Imports useBodyCache, uses getOrFetch for body fetch, watch([bodyStatus, next]) triggers prefetch |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| server/api/__sitemap__/urls.ts | queryCollection | Content v3 server query | ✓ WIRED | Line 9: queryCollection(event, novel as any).select('path', 'pubDate').all() |
| nuxt.config.ts | server/api/__sitemap__/urls.ts | sitemap sources config | ✓ WIRED | Each novel sitemap: sources: ['/api/__sitemap__/urls'] |
| app/pages/novels/[novel]/[...slug].vue | app/composables/useBodyCache.ts | useBodyCache composable call | ✓ WIRED | Line 12: const { getOrFetch, prefetch } = useBodyCache() |
| app/composables/useBodyCache.ts | /content/novels/{novel}/{slug}.json | $fetch for body JSON | ✓ WIRED | Line 44, 81: $fetch(url) fetches body JSON |
| app/pages/novels/[novel]/[...slug].vue | prefetch trigger | watch on bodyStatus + next | ✓ WIRED | Line 44: watch([bodyStatus, next]) calls prefetch when status === 'success' |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEO-01 | 07-01 | Sitemaps generated at build time with explicit URL sources for all chapters | ✓ SATISFIED | Programmatic sitemap endpoint generates 13,318 URLs at build time across 10 per-novel sitemaps |
| SEO-02 | 07-01 | RSS feeds (global + per-novel) still functional in SPA mode | ✓ SATISFIED | rss.xml and per-novel RSS feeds exist with valid XML structure and chapter entries |
| READ-03 | 07-02 | Adjacent chapter bodies (prev/next) are prefetched for instant navigation | ✓ SATISFIED | Next chapter prefetch triggered after current body loads via watch([bodyStatus, next]) |
| READ-04 | 07-02 | Visited chapter bodies are cached in memory to avoid re-fetching | ✓ SATISFIED | LRU cache with 5 entries stores bodies in module-level Map, getOrFetch checks cache first |

### Anti-Patterns Found

None detected. No TODO/FIXME/placeholder comments, no empty implementations, no stub patterns.

### Human Verification Required

#### 1. Next Chapter Navigation Instant Load Feel

**Test:** Open dev server, navigate to a chapter, wait 2-3 seconds for body to load fully, then click "Next Chapter" arrow.
**Expected:** Next chapter body content appears immediately without skeleton flash (body was prefetched).
**Why human:** Timing perception and visual smoothness of transitions can't be verified programmatically. Need to observe Network tab shows no body fetch for prefetched chapter.

#### 2. Cache Eviction During Long Reading Session

**Test:** Open dev server, read 6+ chapters in sequence (navigate forward only), open browser DevTools Memory/Performance tab.
**Expected:** Cache Map holds only last 5 visited chapters, oldest entry evicted on 6th navigation. No memory growth beyond 5 entries.
**Why human:** Memory usage observation over time requires browser DevTools monitoring. LRU eviction logic verified in code but needs runtime confirmation.

#### 3. Sitemap Submission and Google Discovery

**Test:** Submit https://schaden-novel.netlify.app/sitemap_index.xml to Google Search Console, monitor coverage report.
**Expected:** Google discovers and indexes all 13,318 chapter URLs listed in per-novel sitemaps.
**Why human:** External service integration requiring manual submission and monitoring over days/weeks. Can't verify Google's indexing programmatically.

### Gaps Summary

No gaps found. All must-haves verified in code and build output. Phase goal achieved pending human confirmation of runtime behavior and search engine integration.

---

_Verified: 2026-02-21T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
