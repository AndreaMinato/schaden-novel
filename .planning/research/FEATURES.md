# Feature Research

**Domain:** Novel/web fiction chapter reading site (static, translated novels, no auth)
**Researched:** 2026-02-17
**Confidence:** MEDIUM — Table stakes and differentiators verified against Royal Road, Wuxiaworld, NovelUpdates, and WebNovel. Anti-features grounded in PROJECT.md constraints and cross-platform observation. Reader settings UX verified from multiple sources.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist on any reading site. Missing these makes the product feel broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Home page / novel catalog | Entry point; users need to see what's available and what's new | LOW | Exists in Astro site — group by novel, show recent chapters |
| Novel detail page with chapter list | Users browse a novel before committing to read; must see all chapters | LOW | Exists. 1300+ chapters per novel — needs pagination or virtual scroll |
| Chapter reader with clean prose typography | Core function; hard to read = users leave | LOW | Exists. Max-width ~720px, readable line-height, good contrast |
| Prev / next chapter navigation | Serial content; users chain-read; no nav = dead end | LOW | Exists. Top and bottom nav bars in chapter layout |
| Reading progress persistence per novel | Users close the tab and return; must resume where they left off | LOW | Exists via localStorage (saves most recent chapter per novel per device) |
| Mobile-responsive layout | Majority of novel readers read on phone; unusable mobile = lost audience | MEDIUM | Exists in Astro site but worth validating in Nuxt rebuild |
| RSS feed for new chapters | Core audience follows ongoing translations; RSS is the standard signal | LOW | Exists. Nuxt can generate via server routes or build-time |
| SEO + sitemap | Google discoverability for each chapter/novel | LOW | Exists. Nuxt generates sitemap via @nuxtjs/sitemap |
| Fast page loads | Reading UX degrades immediately with slow loads; 13K chapters makes this non-trivial | MEDIUM | Current Astro site has build memory issues; Nuxt SSG/hybrid needs profiling |

### Differentiators (Competitive Advantage)

Features that set this site apart from noisy, ad-heavy translation aggregators. Given the no-auth, static-first context, these are achievable without a backend.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dark mode / light mode toggle with localStorage persistence | Reading comfort — users read for hours; dark mode is not optional for night readers; Wuxiaworld defaults dark, Royal Road offers toggle | LOW | Implement in Nuxt with `useColorMode` (Nuxt UI built-in). Persist preference in localStorage. Respect `prefers-color-scheme` as default |
| Resume reading dashboard (multi-novel) | Returns users back to exact chapter across all 10 novels without friction | LOW | Exists in Astro site. Dropdown showing last-read chapter per novel. Worth refining in Nuxt — show timestamp recency |
| Keyboard navigation for chapter chaining | Power readers chain chapters without touching mouse; rare on small translation sites | LOW | Exists (Cmd+Arrow). Broaden to plain Arrow keys or Vim-style (j/k) since no text input conflict in reader |
| Chapter jumper / in-reader chapter list | 1300+ chapter novels need a quick way to jump mid-series without leaving the reader | MEDIUM | Exists as hover sidebar in Astro site. Nuxt version should be a slide-out drawer with virtual scroll for perf |
| Latest updates feed on home page | Returning users want to see what's new since last visit, per novel | LOW | Exists. Show N most recent chapters per novel sorted by pubDate. Simple and high value |
| Reader settings panel (font size, line height) | Extended reading sessions benefit from personalization; user-controlled comfort settings persist in localStorage | MEDIUM | NOT in existing site. Common on Wuxiaworld, all major platforms. Font size + line height toggles stored in localStorage. No auth needed |
| Novel synopsis / description page | Users unfamiliar with the novel need context before starting chapter 1 | LOW | NOT in existing site. One static metadata page per novel with synopsis, chapter count, status. Low effort, high value for new visitors |
| Clean, ad-free reading experience | Translation aggregators are notoriously ad-heavy; zero ads is a genuine differentiator | LOW | Side effect of static, no-monetization site. Preserve this intentionally — no analytics scripts beyond minimal |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural additions but are wrong for this site's constraints and scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| User accounts / authentication | "Save my progress to the cloud", "sync across devices" | Entire architecture must change; no DB; Netlify static doesn't support server-side sessions; out of scope per PROJECT.md | localStorage progress is sufficient for single-device use; cloud sync is explicitly out of scope |
| Comments / community features | Social engagement; reader feedback loop | Requires auth, moderation, backend; PROJECT.md explicitly excludes social features | Readers can discuss via external communities (Reddit, Discord). Site focus is reading, not community |
| Full-text search across all 13K chapters | "Find that scene where X happens" | 170MB of markdown content; client-side full-text search (e.g. Fuse.js) will time out or be impractical; Algolia/Typesense requires backend | Provide chapter-level search within a single novel's index using a simple filter; acceptable scope |
| Offline / PWA mode with downloaded chapters | Read without internet | 170MB content makes offline caching impractical; service worker caching all chapters would be enormous; browser limits cap storage | Rely on browser's native caching via HTTP cache headers (Netlify CDN) for recently visited chapters |
| Rating / review system | "Rate this novel" | Requires auth + backend storage; static site can't persist ratings per user | Link to external aggregators (NovelUpdates) for community ratings |
| Real-time chapter notifications (push/email) | "Notify me when chapter drops" | Static site with no server; real-time push requires backend service | RSS feed is the correct no-auth notification primitive; works with existing feed readers |
| Monetization / chapter unlocking | Revenue model | Fundamentally changes user experience; content is translated, not original; legal complexity with unlock paywalls | Keep site free. RSS subscribers and return visitors are the audience |
| Mobile app (iOS/Android) | Native reading experience | Separate codebase; scope explosion; PWA on a well-built Nuxt site is sufficient for mobile | Ensure mobile web is first-class; consider minimal PWA manifest for "Add to Home Screen" |

---

## Feature Dependencies

```
[Novel catalog (home page)]
    └──requires──> [Novel detail page]
                       └──requires──> [Chapter reader]
                                          └──requires──> [Prev/next nav]
                                          └──enhances──> [Keyboard nav]
                                          └──enhances──> [Reading progress]
                                          └──enhances──> [Reader settings (font/theme)]

[Reading progress (localStorage)]
    └──requires──> [Chapter reader loads]
    └──enhances──> [Resume reading dashboard] (uses stored progress)

[Dark mode toggle]
    └──enhances──> [Reader settings panel] (can bundle together or ship dark mode first)

[Novel synopsis page]
    └──enhances──> [Novel detail page] (synopsis is part of novel detail or a dedicated page)

[RSS feed]
    └──independent──> [Sitemap] (both build-time, no runtime dependency)

[Chapter jumper sidebar]
    └──requires──> [Chapter list data available in reader context]
    └──enhances──> [Chapter reader]
```

### Dependency Notes

- **Chapter reader requires prev/next nav:** Serial content without navigation is a dead end — bundle these in the same phase.
- **Reading progress requires chapter reader:** Progress is saved when a chapter page loads; cannot exist without the reader.
- **Resume reading dashboard requires reading progress:** The dropdown reads from the same localStorage keys written by the reader.
- **Chapter jumper requires chapter list data in reader context:** Nuxt's `useAsyncData` or content composables need to fetch the novel's chapter index while inside the chapter route. Verify Nuxt Content v3 supports this query pattern.
- **Reader settings enhances dark mode:** Dark mode can ship before a full settings panel. Ship dark mode toggle first (LOW complexity), then expand to a settings drawer with font/line-height controls (MEDIUM complexity).

---

## MVP Definition

This is a rebuild of a proven site, so "MVP" means parity with the existing Astro site, not greenfield exploration. Parity is P1; enhancements are P2/P3.

### Launch With — Parity (v1)

The minimum needed to replace the Astro site without regressions.

- [ ] Home page with novel catalog and recent chapters per novel — core entry point
- [ ] Novel detail page with full chapter list — browsing prerequisite
- [ ] Chapter reader with clean prose typography — core value
- [ ] Prev / next chapter navigation (top + bottom) — serial content requirement
- [ ] Keyboard navigation (arrow keys) — proven feature, existing users expect it
- [ ] Reading progress persistence via localStorage — resume reading, existing users rely on it
- [ ] Resume reading dropdown (multi-novel) — existing users rely on it
- [ ] RSS feed — existing subscribers depend on it
- [ ] SEO sitemap — existing search ranking depends on it
- [ ] Google Docs import script (ported to Nuxt) — operational necessity for adding chapters
- [ ] Netlify deployment — existing hosting infrastructure

### Add After Parity (v1.x)

Add once core parity is stable and deployed.

- [ ] Dark mode toggle — HIGH user value, LOW complexity; add immediately after parity
- [ ] Novel synopsis page — LOW complexity, improves new visitor experience
- [ ] Reader font size / line height settings — MEDIUM value, MEDIUM complexity; add when dark mode is in

### Future Consideration (v2+)

Defer until parity is stable and in production.

- [ ] Chapter jumper sidebar in reader — medium complexity; useful for power users navigating deep into a novel
- [ ] Within-novel chapter search / filter — useful for 1300+ chapter novels; complexity depends on Nuxt Content query capabilities
- [ ] Scroll position memory within a chapter — minor QoL; low priority compared to chapter-level progress

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Home page + novel catalog | HIGH | LOW | P1 |
| Novel detail page + chapter list | HIGH | LOW | P1 |
| Chapter reader (typography) | HIGH | LOW | P1 |
| Prev / next navigation | HIGH | LOW | P1 |
| Keyboard navigation | MEDIUM | LOW | P1 |
| Reading progress (localStorage) | HIGH | LOW | P1 |
| Resume reading dashboard | HIGH | LOW | P1 |
| RSS feed | MEDIUM | LOW | P1 |
| Sitemap | LOW | LOW | P1 |
| Google Docs import script | HIGH (operational) | MEDIUM | P1 |
| Dark mode toggle | HIGH | LOW | P2 |
| Novel synopsis page | MEDIUM | LOW | P2 |
| Reader settings (font/line-height) | MEDIUM | MEDIUM | P2 |
| Chapter jumper sidebar | MEDIUM | MEDIUM | P3 |
| Within-novel chapter search | MEDIUM | MEDIUM | P3 |
| Scroll position memory | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (parity with existing site)
- P2: Should have, add when possible (improvements over existing site)
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Royal Road | Wuxiaworld | NovelUpdates | Our Approach |
|---------|------------|------------|--------------|--------------|
| Dark/light mode | Toggle available | Dark by default | Light only | Implement toggle, persist in localStorage |
| Reading progress | Server-side (auth required) | Server-side (auth required) | Reading list (auth) | localStorage, no auth — per-device only |
| Chapter navigation | Prev/next buttons | Prev/next buttons | External links to source sites | Prev/next buttons + keyboard shortcuts |
| Chapter list / TOC | Expandable, paginated | Per-novel chapter index | External links | Novel detail page + chapter jumper in reader |
| Font customization | Size + font family toggle | Basic | None | Font size + line height via reader settings panel |
| RSS | Yes | Yes | Yes | Yes — core feature |
| Ads | Yes (heavy) | Yes | Yes (heavy) | No ads — intentional differentiator |
| Auth required for progress | Yes | Yes | Yes | No — localStorage approach |
| Mobile app | iOS + Android | iOS + Android | None | Mobile-first web; minimal PWA if warranted |
| Novel synopsis / description | Yes | Yes | Extensive metadata | Add basic synopsis page per novel |
| Search | Full site search | Full site search | Genre + tag filters | Not feasible at 13K chapters static; within-novel chapter filter only |

---

## Sources

- [Royal Road features observed directly](https://www.royalroad.com/fictions/best-rated) — MEDIUM confidence (WebFetch, current)
- [Wuxiaworld features observed directly](https://www.wuxiaworld.com/) — MEDIUM confidence (WebFetch, current)
- [NovelUpdates reading list and genre features](https://www.novelupdates.com/reading-list/) — MEDIUM confidence (WebSearch + URL)
- [WebNR: no-auth localStorage reading progress pattern](https://www.webnovel.win/blog/2025/01/14/webnr-10-your-new-favorite-way-to-read-web-novels-without-big-brother-watching/) — LOW confidence (WebSearch only, single source)
- [Dark mode localStorage persistence patterns](https://www.ma-no.org/en/web-design/css/persistent-dark-mode-with-css-and-js) — MEDIUM confidence (multiple sources agree, well-established pattern)
- [2026 State of Reading Report — discovery via personal recommendations](https://www.prnewswire.com/news-releases/the-2026-state-of-reading-report-human-recommendations-surpass-algorithms-in-the-ai-era-302637200.html) — LOW confidence (general reading market, not web fiction specific)
- Existing Astro site codebase (`/src/layouts/Chapter.astro`, `/src/components/ResumeReading.astro`, `/src/pages/index.astro`) — HIGH confidence (direct inspection of proven feature implementations)
- Project constraints from `.planning/PROJECT.md` — HIGH confidence (authoritative source for scope)

---
*Feature research for: novel chapter reading site (static, 10 translated novels, ~13K chapters, no auth)*
*Researched: 2026-02-17*
