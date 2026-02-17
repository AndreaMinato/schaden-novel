# Project Research Summary

**Project:** schaden-novel — Nuxt 4 rebuild of translated novel reading site
**Domain:** Content-heavy static reading site (10 novels, 13,318 chapters, SSG to Netlify)
**Researched:** 2026-02-17
**Confidence:** MEDIUM-HIGH — stack verified via npm/official docs (HIGH); architecture patterns confirmed via official Nuxt Content v3 docs (HIGH); build-time performance at 13K scale inferred from benchmarks not direct measurement (MEDIUM); feature analysis against competitor sites (MEDIUM)

---

## Executive Summary

This is a rebuild of a proven Astro-based novel reading site into Nuxt 4. The target product is a static, no-auth reading site serving 10 translated novels across 13,318 markdown chapters, deployed to Netlify CDN. The recommended approach is Nuxt 4 + @nuxt/content v3 + @nuxt/ui v4, using full SSG via `nuxi generate`. Because this is a rebuild, not a greenfield project, the MVP is defined as parity with the existing Astro site — not exploration. The major architectural bets are: per-novel Nuxt Content collections (10 collections instead of one monolithic), metadata-only queries for all listing views, and all content queries wrapped in `useAsyncData` to route data through `_payload.json` files instead of triggering WASM SQLite browser downloads.

The single highest-risk technical decision is how Nuxt Content v3 handles static deployments. It ships a full SQLite database dump to the browser on the first client-side content query. With 13,318 chapters and 170MB of source markdown, this dump could reach 100MB+ and make chapter-to-chapter navigation unacceptable. The mitigation is strict: every `queryCollection()` call must be wrapped in `useAsyncData()`, which causes Nuxt to extract the result into a per-page `_payload.json` at build time, bypassing the WASM SQLite download entirely. Violating this pattern anywhere in the codebase reintroduces the problem. This is not a polish concern — it is an architectural constraint that must be enforced from day one.

The second risk is build time. Nuxt SSG with 13,318 pages on Netlify will likely exceed 30 minutes (Netlify's default timeout) and exhaust the 300 build minutes/month free tier in 1-2 deploys. The solution is selective prerendering: pre-render only listing pages and the first 1-3 chapters of each novel, then use SPA fallback for all other chapter pages. This must be validated with a benchmark (500 chapters) before the full content migration is committed. Both risks must be resolved in the infrastructure phase before building any features.

---

## Key Findings

### Recommended Stack

The stack is Nuxt 4 (v4.3.1), @nuxt/ui v4.4.0, and @nuxt/content v3.11.2. Nuxt 4 is the current major (Nuxt 3 reaches EOL July 2026); @nuxt/ui v4 consolidates the previously separate Nuxt UI and Nuxt UI Pro into one free library with 125+ components and Tailwind CSS v4 managed internally — do not install Tailwind separately. Supporting packages are @pinia/nuxt for reading progress persistence, @nuxtjs/sitemap for the 13K-page sitemap, and @nuxtjs/feed for per-novel RSS. Netlify requires Node 22.5+ (not the default 18.x) to use `nativeSqlite: true`, which eliminates the `better-sqlite3` native binding failures common with pnpm v10+.

**Core technologies:**
- nuxt@4.3.1: Framework — current major, avoids mid-project migration from v3
- @nuxt/content@3.11.2: Markdown pipeline — SQLite backend, required for structured chapter queries; WASM SQLite behavior is the critical constraint
- @nuxt/ui@4.4.0: UI components — includes Tailwind v4, Reka UI, 125+ components; do not install tailwindcss separately
- @pinia/nuxt@0.11.3: Reading progress state — Pinia gives persistence plugin for localStorage-backed stores
- @nuxtjs/sitemap@7.6.0: XML sitemap — required for SEO at 13K pages; integrates with content collections
- @nuxtjs/feed@2.0.0: RSS feeds — per-novel RSS feeds, v2 targets Nuxt 4

**Critical version constraints:**
- Node.js >= 22.5.0 on Netlify (required for `nativeSqlite: true`; Netlify defaults to 18.x — must override in site config)
- Do NOT install tailwindcss separately — @nuxt/ui v4 manages it internally

### Expected Features

This is a rebuild, so "MVP" means parity with the existing Astro site. All P1 features already exist in production; the task is migration without regressions. P2 features are improvements not yet in the Astro site.

**Must have — parity (P1):**
- Home page with novel catalog and recent chapters — core entry point
- Novel detail page with full chapter list — browsing prerequisite
- Chapter reader with clean prose typography — core product value
- Prev/next chapter navigation (top + bottom) — serial content requirement; fix known boundary bug from Astro
- Keyboard navigation (arrow keys) — existing users rely on it
- Reading progress persistence via localStorage — existing users rely on it
- Resume reading dropdown across all 10 novels — existing users rely on it
- RSS feed — existing subscribers depend on it
- SEO sitemap — existing search ranking depends on it
- Google Docs import script (ported from Astro) — operational necessity

**Should have — differentiators (P2, add after parity):**
- Dark mode / light mode toggle with localStorage persistence — HIGH value, LOW complexity; implement with `useColorMode`
- Novel synopsis page per novel — LOW complexity, improves new visitor conversion
- Reader settings panel (font size, line height) — MEDIUM complexity; common on Wuxiaworld/Royal Road

**Defer to v2+:**
- Chapter jumper sidebar in reader — MEDIUM complexity; useful but not blocking
- Within-novel chapter search / filter — depends on Nuxt Content query capabilities at 13K scale
- Scroll position memory within a chapter — LOW priority

**Anti-features (explicitly exclude):**
- User accounts / authentication — requires full architecture change; out of scope
- Full-text search across all 13K chapters — 170MB of content; client-side Fuse.js will time out; Algolia requires backend
- Offline / PWA chapter caching — 170MB makes service worker caching impractical
- Comments, ratings, monetization — require auth + backend; out of scope per project constraints

### Architecture Approach

The architecture is pure SSG: all content lives as markdown files under `content/novels/[novel]/`, Nuxt Content v3 parses them into SQLite at build time, `nuxi generate` prerender them to static HTML, and Netlify CDN serves them. The key structural choice is 10 per-novel collections in `content.config.ts` instead of one monolithic collection — this prevents every chapter list query from scanning all 13,318 records. Client-side interactivity (reading progress, keyboard nav, resume reading) lives in composables and is SSR-safe via VueUse's `useLocalStorage`. Chapter-to-chapter navigation after the first page load uses `_payload.json` files (pre-generated per route by `useAsyncData`) rather than the WASM SQLite dump.

**Major components:**
1. `content.config.ts` — 10 per-novel collection definitions; enforces schema (title, pubDate, stem); required before any page can query content
2. `app/pages/novels/[novel]/[chapter].vue` — chapter reader; highest-risk component; uses `ContentRenderer`, `queryCollectionItemSurroundings`, chapter layout, keyboard nav, reading progress save
3. `app/pages/novels/[novel]/index.vue` — chapter listing; metadata-only query with `.select(['path','title','pubDate'])` + `.order('path','ASC')`; validates content query patterns
4. `app/pages/index.vue` — home page; latest N chapters per novel; builds on listing patterns
5. `app/composables/useReadingProgress.ts` — VueUse `useLocalStorage` wrapper (SSR-safe); read/write last chapter per novel
6. `app/composables/useKeyboardNav.ts` — `useEventListener` for arrow key chapter navigation
7. `server/routes/feed.xml.ts` — per-novel RSS; server-side content query; limit to 50 items per novel
8. `scripts/import.mjs` — Google Docs to markdown pipeline; port with bug fixes (add retry, remove silent error swallowing, move Doc IDs to .env)

**Build order (architecture-implied):**
`content.config.ts` → composables → layouts → components → novel detail page → chapter reader → catalog/home → RSS → Netlify config → scripts

### Critical Pitfalls

1. **Netlify build timeout (13K pages)** — Full `nuxt generate` of 13,318 pages will likely run 60-200+ minutes, exceeding Netlify's 30-minute timeout and the 300 build minutes/month free tier. Prevention: selective prerender (listing pages + first 1-3 chapters per novel only); SPA fallback for remaining chapter pages. Must benchmark with 500 chapters in Phase 1 before full content migration.

2. **WASM SQLite dump downloaded to every browser** — Nuxt Content v3 static sites download the full SQLite database to the browser on the first client-side content query. With 13K chapters, this could be 100MB+. Prevention: wrap every `queryCollection()` in `useAsyncData()` — this is non-negotiable and must be enforced throughout. Never use bare `queryCollection()` in components. Validate SQLite size after ingesting one novel before proceeding.

3. **`better-sqlite3` native binding failure with pnpm** — pnpm v10+ does not run postinstall scripts by default; `better-sqlite3` installs without its native binary and fails on Netlify CI. Prevention: set `content: { experimental: { nativeSqlite: true } }` in `nuxt.config.ts` AND set Node 22.5+ in Netlify site config. Also add `enable-pre-post-scripts=true` to `.npmrc` as a secondary guard.

4. **Dynamic chapter routes not discovered by Nitro crawler** — Nuxt's prerender crawler follows `<a>` links from the root; if chapter listing pages paginate or omit links, thousands of routes are silently missed. Prevention: add a Nitro hook that enumerates all chapter routes from the content collection at build time (`nitro:config` hook), or ensure every chapter appears as a link in the novel detail page. Verify post-build: `find dist/ -name "*.html" | wc -l` must match expected chapter count.

5. **SSR hydration mismatch from `localStorage` access** — accessing `localStorage` or `window` outside `onMounted` crashes SSR/build. Prevention: use VueUse's `useLocalStorage` (SSR-aware) everywhere; wrap `ResumeReading` component in `<ClientOnly>` to prevent hydration warnings.

---

## Implications for Roadmap

Based on combined research, 5 phases are suggested. Phases 1-3 achieve full parity; Phase 4 adds differentiators; Phase 5 handles operations.

### Phase 1: Infrastructure and Content Architecture Foundation

**Rationale:** Every other phase depends on a validated build pipeline, correct Netlify configuration, and confirmed content architecture. The WASM SQLite dump size and build time are unknowns at 13K scale — they must be measured before content migration, not after. A wrong answer here requires architecture rewrites.

**Delivers:** Nuxt 4 project initialized, Netlify configured correctly (Node 22+, nativeSqlite, pnpm .npmrc), `content.config.ts` with 10 per-novel collections defined, one novel's chapters migrated to validate SQLite size and build time, selective prerender strategy confirmed, Netlify deploy pipeline green.

**Addresses:** Table stakes infrastructure for all P1 features.

**Avoids:** Build timeout (Netlify), `better-sqlite3` binding failure, WASM SQLite catastrophe, SPA fallback misconfiguration.

**Research flag:** Needs validation — SQLite dump size with one novel's chapters is unknown. If `.data/content/contents.sqlite` exceeds 10MB for one novel (~2,300 chapters), the chapter body storage strategy must change before proceeding. This is a go/no-go decision point.

---

### Phase 2: Core Reading Experience (Chapter Reader)

**Rationale:** ARCHITECTURE.md identifies the chapter reader as the highest-risk component because it combines the most moving parts: content queries, `ContentRenderer`, `queryCollectionItemSurroundings`, chapter layout, keyboard nav, and reading progress. Build it first to surface Nuxt Content v3 compatibility issues before investing time in catalog/home pages. Novel detail page (chapter listing) is built first as the simpler validation step.

**Delivers:** Fully functional chapter reader with prev/next navigation, keyboard nav (arrow keys), reading progress persistence (localStorage), chapter layout. Novel detail page with full chapter list. Route discovery configuration with Nitro hooks.

**Addresses:** Chapter reader, prev/next nav, keyboard nav, reading progress (all P1 parity).

**Avoids:** Route discovery failure (Nitro hook for enumeration), hydration mismatch (VueUse `useLocalStorage`), metadata-only queries in listing view, WASM SQLite pattern (every query in `useAsyncData`).

**Research flag:** May need targeted research on `queryCollectionItemSurroundings` behavior when chapter pages use SPA fallback (not prerendered). This exact interaction is not well-documented.

---

### Phase 3: Full Site + Complete Parity

**Rationale:** Once the chapter reader pipeline is validated end-to-end, the surrounding site (catalog, home, resume reading) can be built quickly. All components follow patterns already proven in Phase 2. RSS and sitemap are build-time outputs with low implementation risk. This phase completes all P1 parity features and makes the site deployable as a production replacement for the Astro site.

**Delivers:** Home page with latest chapters grouped by novel, novel catalog page, `ResumeReading` component (reads localStorage on mount), RSS feed (per-novel, 50 chapters each), sitemap (all 13K routes), complete P1 feature parity.

**Addresses:** All remaining P1 features: home, catalog, resume reading, RSS, sitemap.

**Avoids:** RSS feed too large (limit to 50 items per novel; validate with `wc -c`), full chapter body in listing queries (select only metadata), prev/next boundary bugs (fix known Astro bug — test first and last chapter navigation).

**Research flag:** Standard patterns — skip `research-phase`. Listing pages, RSS, and sitemap are well-documented with Nuxt Content v3.

---

### Phase 4: Enhancements (P2)

**Rationale:** After parity is stable in production, add differentiators. All P2 features are LOW-MEDIUM complexity and do not touch the content architecture. Dark mode ships first (lowest complexity, highest user value); synopsis and reader settings follow.

**Delivers:** Dark mode / light mode toggle (Nuxt UI `useColorMode`, persisted in localStorage), novel synopsis page per novel (static metadata page), reader settings panel (font size + line height, persisted in localStorage).

**Addresses:** P2 features from FEATURES.md.

**Research flag:** Standard patterns — skip `research-phase`. Nuxt UI `useColorMode` is documented; localStorage settings persistence is established pattern.

---

### Phase 5: Operations and Import Pipeline

**Rationale:** The Google Docs import script is a developer workflow tool, not part of the site. It can be ported independently of the site build. Port with known bug fixes (silent error swallowing, missing `await`, no retry logic) and security improvements (Google Doc IDs to `.env`). This phase also addresses build optimization (Netlify build cache, trigger strategy).

**Delivers:** Ported `scripts/import.mjs` with retry logic, visible error handling, and Doc IDs in environment variables. Netlify build trigger strategy (avoid rebuilding on every commit for content-only updates). Build caching configured.

**Avoids:** Import script bugs propagated from Astro, Google Doc ID security issue, Netlify build minutes exhausted from unnecessary rebuilds.

**Research flag:** Standard patterns — skip `research-phase`. Node.js scripting patterns are established.

---

### Phase Ordering Rationale

- Phase 1 must be first because SQLite dump size and build time are unknown; they gate every downstream decision.
- Phase 2 must come before catalog/home (Phase 3) because the chapter reader is highest-risk and validates the entire content pipeline.
- Phase 3 completes parity before adding enhancements; parity must be production-stable first.
- Phase 4 (enhancements) comes after proven parity to avoid scope creep during the migration.
- Phase 5 (operations) is decoupled from site development and can overlap with Phase 3-4 if needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm; WASM SQLite behavior verified via official Nuxt Content docs and developer benchmarks |
| Features | MEDIUM | Table stakes and differentiators verified against Royal Road, Wuxiaworld, NovelUpdates; existing Astro site is authoritative source for parity features |
| Architecture | MEDIUM | Patterns confirmed via official docs; build-time behavior at 13,318 pages is extrapolated from community benchmarks, not direct measurement |
| Pitfalls | MEDIUM-HIGH | Build timeout risk is MEDIUM (community-reported, not measured for this exact project); better-sqlite3 failure is HIGH (multiple confirmed issues); WASM SQLite size is MEDIUM (extrapolated from 200-episode podcast case study) |

**Overall confidence:** MEDIUM — The approach is well-grounded, but two critical unknowns (SQLite dump size at 13K scale, actual build time) cannot be resolved until Phase 1 benchmarks run. These unknowns have known mitigation paths but must be measured before committing to the full architecture.

### Gaps to Address

- **SQLite dump size at 13K scale:** No direct measurement exists for this novel corpus. Must measure after ingesting one full novel in Phase 1. If the dump exceeds 10MB per novel, the architecture must shift to Option B (metadata-only in Nuxt Content, separate body rendering pipeline). This is the most consequential unknown.

- **Build time at 13K pages:** Community benchmarks suggest 60-200+ minutes. Selective prerender (listing pages + SPA fallback for chapters) is the mitigation, but the exact prerender count and time must be validated in Phase 1. The SPA fallback approach changes UX for deep-linked chapter URLs (no prerendered HTML means slower TTFB and weaker SEO for individual chapters).

- **`queryCollectionItemSurroundings` + SPA fallback interaction:** If chapter pages are not prerendered (SPA fallback mode), it is unclear whether `queryCollectionItemSurroundings` behaves correctly for client-rendered routes. May need targeted research or an alternative prev/next implementation using precomputed frontmatter links.

- **Chapter suffix sorting (`_b`, `_c`):** The existing Astro site has known sorting issues with chapter suffixes. The sort algorithm must be rewritten in Phase 2 (numeric comparison, not lexicographic). No gaps in understanding the fix, but must not be carried over from Astro.

---

## Sources

### Primary (HIGH confidence)
- https://content.nuxt.com/docs/deploy/static — WASM SQLite static hosting behavior
- https://content.nuxt.com/docs/advanced/database — SQLite dump mechanism
- https://content.nuxt.com/docs/collections/define — Per-novel collection patterns
- https://content.nuxt.com/docs/utils/query-collection — queryCollection API
- https://nuxt.com/blog/v4 — Nuxt 4 release, directory structure changes
- https://ui.nuxt.com/releases — @nuxt/ui v4.4.0 features
- https://vueuse.org/core/uselocalstorage/ — SSR-safe localStorage via VueUse
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nuxt/ — Netlify + Nuxt 4
- npm registry (verified 2026-02-17) — all package versions
- Existing Astro site codebase (`/src/layouts/Chapter.astro`, `/src/components/ResumeReading.astro`) — authoritative parity reference

### Secondary (MEDIUM confidence)
- https://damieng.com/blog/2024/05/14/nuxt-content-db-and-size/ — SQLite dump size: 200 podcast episodes = 25.1MB
- https://github.com/nuxt/nuxt/discussions/26689 — SSG build times: 2,500 pages ≈ 17 min
- https://github.com/nuxt/content/issues/3233 — SQLite BUSY errors during large generate
- https://github.com/nuxt/content/issues/3483 — better-sqlite3 binding failure with pnpm v10+
- https://github.com/nuxt/nuxt/issues/14115 — Dynamic routes not auto-discovered in generate
- https://zhul.in/en/2025/10/20/nuxt-content-v3-z-array-query-challenge/ — Array field LIKE workaround (reason to use per-novel collections instead)
- Royal Road, Wuxiaworld, NovelUpdates — competitor feature analysis

### Tertiary (LOW confidence)
- https://www.netlify.com/pricing/ — 300 build minutes/month free tier (HIGH confidence for the number, LOW for extrapolated impact)
- Community forum reports on Netlify OOM errors with large Nuxt builds

---

*Research completed: 2026-02-17*
*Ready for roadmap: yes*
