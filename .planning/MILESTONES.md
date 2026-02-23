# Milestones

## v1.0 MVP (Shipped: 2026-02-18)

**Phases:** 4 | **Plans:** 9 | **LOC:** 1,096 (TS/Vue/MJS)
**Content:** 13,318 chapters across 10 novels | **Routes:** 26,694 prerendered
**Timeline:** 2026-02-17 → 2026-02-18

**Key accomplishments:**
1. Nuxt 4 + Nuxt Content v3 + Nuxt UI scaffolded with per-novel collections and static output
2. Chapter reader with 65ch prose column, prev/next nav, keyboard shortcuts, and reading progress
3. Home page, catalog, resume reading dropdown — full Astro site parity
4. RSS feeds + multi-sitemap for 10 novels — search engine and feed reader discovery
5. Google Docs import scripts ported with error handling overhaul (3 silent catches fixed)
6. 13,318 chapters migrated and built (26,694 routes in ~10 min), SQL dumps stripped 96%

**Delivered:** Complete Astro-to-Nuxt rebuild of a 10-novel, 13K-chapter reading site with clean typography, chapter navigation, reading progress, RSS feeds, sitemaps, and a Google Docs import pipeline.

---


## v1.1 SPA Migration (Shipped: 2026-02-23)

**Phases:** 3 (5-7) | **Plans:** 5 | **Tasks:** 9
**Files:** 12 changed (355 insertions, 242 deletions)
**Timeline:** 2026-02-18 → 2026-02-22 (4 days)

**Key accomplishments:**
1. Body-extractor Nuxt module extracting 13,318 minimark bodies to JSON, SQL dumps stripped to 2.7MB, build cut from 10min to 87s
2. SPA fallback routing via netlify.toml with branded dark-theme loading spinner
3. Split-fetch chapter reader: SQLite metadata (instant await) + JSON body (skeleton loading)
4. Programmatic sitemap sources providing 13,318 chapter URLs across 10 per-novel sub-sitemaps
5. LRU body cache with next-chapter prefetch for instant chapter-to-chapter navigation

**Delivered:** Eliminated 10-minute full-SSG builds by switching to SPA mode with on-demand chapter body loading. Build dropped from 26K prerendered routes (10 min) to 14 shell pages (87 seconds). Chapters load client-side via split-fetch (WASM SQLite metadata + static JSON body) with skeleton loading, LRU caching, and next-chapter prefetch.

---

