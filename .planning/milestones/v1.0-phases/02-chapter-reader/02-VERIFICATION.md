---
phase: 02-chapter-reader
verified: 2026-02-18T09:00:00Z
status: human_needed
score: 13/13 must-haves verified
re_verification: false
human_verification:
  - test: "Open a middle chapter (e.g., /novels/lrg/50), press Cmd+Left arrow (Mac) or Ctrl+Left (Windows)"
    expected: "Browser navigates to the previous chapter without page scroll or browser default (cursor-jump) behavior"
    why_human: "defineShortcuts wiring is confirmed in code; actual Cmd+Arrow key handling requires a live browser to verify preventDefault and navigation fire correctly"
  - test: "Open /novels/lrg/1 (first chapter). Check that Previous button appears greyed-out/disabled. Press Cmd+Left."
    expected: "Previous button is visually disabled. Pressing Cmd+Left shows a 'First chapter' toast notification, not navigation."
    why_human: "disabled prop and toast call confirmed in code; visual appearance and toast rendering require browser"
  - test: "Open a chapter on a phone-sized screen (375px width) or Chrome DevTools mobile emulation"
    expected: "Chapter prose is readable with adequate padding, no horizontal overflow, buttons are touch-friendly"
    why_human: "READ-04 mobile responsiveness — px-4 sm:px-6 padding and max-w-[65ch] are confirmed in code; visual layout requires human judgment"
  - test: "Open any chapter, close the tab, reopen the browser and load the same novel detail page"
    expected: "localStorage key 'schaden-reading-progress' contains the novel slug mapped to the last-read chapter route path (e.g., {\"lrg\":\"/novels/lrg/50\"})"
    why_human: "localStorage write is confirmed in code (onMounted call); persistence across browser sessions requires actual browser verification"
  - test: "Acknowledge ROADMAP wording discrepancy: ROADMAP Success Criterion 4 says 'left or right arrow key' but the implementation uses Cmd+Left/Cmd+Right (meta_arrowleft/meta_arrowright)"
    expected: "User confirms Cmd+Arrow (as specified in CONTEXT.md user constraints) satisfies READ-03 intent"
    why_human: "The user explicitly locked 'Cmd+Left (Mac) / Ctrl+Left (Windows)' in CONTEXT.md. The ROADMAP wording omits the modifier key. A human must confirm the wording discrepancy is acceptable."
---

# Phase 2: Chapter Reader Verification Report

**Phase Goal:** Readers can open any chapter from a novel's chapter listing and read it with correct typography, prev/next navigation, keyboard shortcuts, and reading progress that survives browser sessions
**Verified:** 2026-02-18T09:00:00Z
**Status:** human_needed — all automated code checks pass; 5 items need human browser verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Plan 02-01: Layout + Chapter Listing)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Novel detail page lists all chapters in correct numeric descending order (latest first) | VERIFIED | `index.vue` line 14-17: `[...rawChapters.value].sort((a, b) => b.stem.localeCompare(a.stem, undefined, { numeric: true, sensitivity: 'base' }))` — `b` before `a` = descending |
| 2 | Chapters with suffixes like _b sort correctly (e.g., 1632, 1632_a, 1633) | VERIFIED | Same `localeCompare({ numeric: true })` — MDN-documented behavior handles `_a` suffix correctly between parent and next numeric |
| 3 | Header hides when user scrolls down and reappears when scrolling up | VERIFIED | `useAutoHideHeader.ts` line 14: `isVisible.value = currentY < lastScrollY` (up = visible); `default.vue` line 9: `:class="{ '-translate-y-full': !isVisible }"` |
| 4 | Header is always visible near the top of the page | VERIFIED | `useAutoHideHeader.ts` line 11-13: `if (currentY < 60) { isVisible.value = true }` |
| 5 | Navigating between pages scrolls to top instantly | VERIFIED | `router.options.ts` line 4-7: `scrollBehavior` returns `{ top: 0, behavior: 'instant' }` for all non-savedPosition navigations |

### Observable Truths (Plan 02-02: Chapter Reader)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Chapter prose displays within ~65ch max-width with comfortable line-height | VERIFIED | `[...slug].vue` line 57: `max-w-[65ch] mx-auto px-4 sm:px-6 py-8`; line 83: `prose prose-lg dark:prose-invert max-w-none leading-relaxed` |
| 7 | Chapter title appears as breadcrumb (e.g., MGA > Chapter 42) | VERIFIED | `[...slug].vue` line 31-34: `breadcrumbItems` computed with `novel.toUpperCase()` + `chapter.value?.title`; line 59: `<UBreadcrumb :items="breadcrumbItems">` |
| 8 | Prev/next buttons appear at both top and bottom of the chapter | VERIFIED | `[...slug].vue` lines 62-80 (top nav) and lines 88-106 (bottom nav) — two complete nav blocks each containing Previous and Next UButton |
| 9 | Prev button is disabled on first chapter, next button is disabled on last chapter | VERIFIED | Both nav blocks: `:disabled="!prev"` (line 65, 93) and `:disabled="!next"` (line 72, 100); `useChapterNav.ts` returns `null` for prev at index 0 and next at last index |
| 10 | Cmd+Left navigates to previous chapter, Cmd+Right navigates to next | VERIFIED | `[...slug].vue` lines 38-53: `defineShortcuts({ meta_arrowleft: ..., meta_arrowright: ... })`; `meta` maps to Cmd/Ctrl per platform via Nuxt UI |
| 11 | Toast notification shown when pressing shortcut at first or last chapter boundary | VERIFIED | `[...slug].vue` lines 43-44: `toast.add({ title: 'First chapter', color: 'neutral', duration: 2000 })`; lines 49-50: `toast.add({ title: 'Last chapter', ... })` |
| 12 | Reading progress saved to localStorage on chapter page load | VERIFIED | `[...slug].vue` lines 26-28: `onMounted(() => { useReadingProgress().save(novel, '/novels${contentPath}') })`; `useReadingProgress.ts` writes JSON to `'schaden-reading-progress'` key with SSR guard |
| 13 | Chapter page is readable on phone-sized screens | VERIFIED (code) / NEEDS HUMAN (visual) | `px-4 sm:px-6` responsive padding; `max-w-[65ch]` collapses to full width on narrow screens; `size="sm"` buttons; structural checks pass — visual layout needs human |

**Score:** 13/13 truths verified at code level (5 human verification items for behavior/visual confirmation)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/composables/useAutoHideHeader.ts` | Scroll direction detection, exports `useAutoHideHeader` | VERIFIED | 26 lines, substantive rAF-throttled scroll listener, exports named function |
| `app/router.options.ts` | Scroll-to-top on navigation, contains `scrollBehavior` | VERIFIED | 8 lines, exports `RouterConfig` with `scrollBehavior` returning `{ top: 0, behavior: 'instant' }` |
| `app/layouts/default.vue` | Default layout with auto-hide header, main slot | VERIFIED | 20 lines, fixed header with `-translate-y-full` toggle, `<slot />` in `<main class="pt-14">` |
| `app/app.vue` | Wraps NuxtPage in NuxtLayout | VERIFIED | 7 lines, `<NuxtLayout><NuxtPage /></NuxtLayout>` inside `<UApp>` |
| `app/pages/novels/[novel]/index.vue` | Chapter listing with descending natural sort | VERIFIED | 37 lines, `queryCollection` + `localeCompare({ numeric: true })` descending sort, styled ul with NuxtLink per chapter |
| `app/composables/useChapterNav.ts` | Fetch sorted chapters, compute prev/next, exports `useChapterNav` | VERIFIED | 33 lines, async export, ascending sort, `currentIndex` computed, `prev`/`next` computed refs returning null at boundaries |
| `app/composables/useReadingProgress.ts` | localStorage read/write per novel, exports `useReadingProgress` | VERIFIED | 28 lines, `import.meta.client` SSR guard, try/catch, JSON object keyed by novel slug, exports `{ save, get }` |
| `app/pages/novels/[novel]/[...slug].vue` | Full chapter reader with typography, nav, shortcuts, progress | VERIFIED | 109 lines, substantive implementation with `ContentRenderer`, dual nav, `defineShortcuts`, `onMounted` progress save |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/layouts/default.vue` | `app/composables/useAutoHideHeader.ts` | composable call for header visibility | WIRED | Line 2: `const { isVisible } = useAutoHideHeader()` — imported via Nuxt auto-import; used in `:class` binding line 9 |
| `app/pages/novels/[novel]/index.vue` | `queryCollection` | content query + `localeCompare.*numeric` | WIRED | Lines 7-10: `queryCollection(novel as any).select(...).all()`; lines 14-16: `localeCompare(a.stem, undefined, { numeric: true })` |
| `app/app.vue` | `app/layouts/default.vue` | `NuxtLayout` component | WIRED | Lines 3-5: `<NuxtLayout><NuxtPage /></NuxtLayout>` |
| `app/pages/novels/[novel]/[...slug].vue` | `app/composables/useChapterNav.ts` | composable call for prev/next data | WIRED | Line 23: `const { prev, next } = await useChapterNav(novel, contentPath)` — prev/next used in both nav blocks |
| `app/pages/novels/[novel]/[...slug].vue` | `app/composables/useReadingProgress.ts` | save progress on component mount | WIRED | Lines 26-28: `onMounted(() => { useReadingProgress().save(novel, ...) })` |
| `app/pages/novels/[novel]/[...slug].vue` | `defineShortcuts` (Nuxt UI) | keyboard shortcut registration | WIRED | Lines 38-53: `defineShortcuts({ meta_arrowleft: ..., meta_arrowright: ... })` with navigateTo + toast boundary |
| `app/composables/useChapterNav.ts` | `queryCollection` | fetch chapter metadata for navigation | WIRED | Lines 2-7: `useAsyncData(... () => queryCollection(novel as any).select(...).all())` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CATL-03 | 02-01 | User can view novel detail page with full chapter listing | SATISFIED | `app/pages/novels/[novel]/index.vue`: queries all chapters, sorts descending by natural numeric order, renders ul with NuxtLink per chapter, shows chapter count |
| READ-01 | 02-02 | User can read a chapter with clean prose typography (max-width, readable line-height) | SATISFIED | `[...slug].vue`: `max-w-[65ch]`, `prose prose-lg dark:prose-invert`, `leading-relaxed`, `ContentRenderer` for markdown |
| READ-02 | 02-02 | User can navigate to prev/next chapter via buttons at top and bottom of reader | SATISFIED | Dual `<nav>` blocks with `UButton :to :disabled` — boundary disabled state confirmed via `useChapterNav` null return |
| READ-03 | 02-02 | User can navigate chapters using keyboard arrow keys | SATISFIED (see note) | `defineShortcuts({ meta_arrowleft, meta_arrowright })` — keyboard navigation works via Cmd+Arrow. ROADMAP SC4 says "left or right arrow key" but user CONTEXT.md locked Cmd+Arrow specifically. Needs human acknowledgment. |
| READ-04 | 02-02 | Chapter page is mobile-responsive and readable on phone screens | SATISFIED (needs human visual check) | `px-4 sm:px-6` responsive padding, `max-w-[65ch]` flows to full width on narrow screens, `size="sm"` touch-friendly buttons, `prose-lg` scaling |
| PROG-01 | 02-02 | User's reading progress (last chapter per novel) persists in localStorage | SATISFIED | `useReadingProgress.ts` writes JSON to `localStorage`, persists across sessions; `onMounted` call in `[...slug].vue` triggers on every chapter load |

**Orphaned requirements:** None. All 6 requirements (CATL-03, READ-01, READ-02, READ-03, READ-04, PROG-01) are claimed by plans 02-01 and 02-02. No additional Phase 2 requirements in REQUIREMENTS.md traceability table.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found |

All `return []` and `return null` occurrences are defensive guard clauses (`if (!rawChapters.value)`, `if (!import.meta.client)`, catch-block fallbacks) — not stubs.

---

## Human Verification Required

### 1. Keyboard shortcut navigation

**Test:** Open a middle chapter (e.g., `/novels/lrg/50`). Press Cmd+Left Arrow (Mac) or Ctrl+Left Arrow (Windows).
**Expected:** Browser navigates to the previous chapter page. No cursor jump, no default browser behavior.
**Why human:** `defineShortcuts` wiring is confirmed in code. Actual key handling, `preventDefault`, and navigation require a live browser.

### 2. Boundary toast notification

**Test:** Open `/novels/lrg/1` (first chapter). Verify Previous button is visually greyed out. Press Cmd+Left.
**Expected:** Previous button appears disabled. Pressing Cmd+Left shows a "First chapter" toast in the corner, not navigation.
**Why human:** `:disabled` prop and `toast.add` call confirmed in code; visual disabled state and toast rendering need browser.

### 3. Mobile readability (READ-04)

**Test:** Open a chapter in Chrome DevTools mobile emulation at 375px width (iPhone SE), or on a real phone.
**Expected:** Chapter prose is readable, no horizontal overflow, padding is adequate, prev/next buttons are comfortably tappable.
**Why human:** `px-4 sm:px-6` and `max-w-[65ch]` are confirmed in code; visual layout and readability are subjective.

### 4. localStorage persistence across sessions

**Test:** Open any chapter. Close the tab/browser completely. Open a new browser window and check `localStorage.getItem('schaden-reading-progress')` in DevTools console.
**Expected:** Returns a JSON string like `{"lrg":"/novels/lrg/50"}` — the last-read chapter route path per novel.
**Why human:** `onMounted` + `localStorage.setItem` confirmed in code; cross-session persistence requires actual browser.

### 5. ROADMAP success criterion 4 wording acknowledgment

**Test:** Read ROADMAP.md Phase 2 Success Criterion 4: "Pressing the left or right arrow key navigates to the previous or next chapter without triggering any scroll or browser-default behavior."
**Expected:** User confirms that the implementation (Cmd+Arrow, not plain Arrow) satisfies this intent. The ROADMAP wording omits the Cmd modifier that was explicitly locked in CONTEXT.md.
**Why human:** The user's own CONTEXT.md specifies "Cmd+Left (Mac) / Ctrl+Left (Windows)". The RESEARCH.md confirms this decision. The ROADMAP wording is slightly imprecise. A human must confirm the discrepancy is acceptable and optionally update the ROADMAP wording.

---

## Gaps Summary

No implementation gaps. All must-have truths are verified at the code level (exists, substantive, wired). The 5 human verification items are behavioral and visual checks that cannot be confirmed programmatically.

One note worth flagging: the ROADMAP Success Criterion 4 says "left or right arrow key" but the implementation uses Cmd+Left/Cmd+Right. This is not a gap — it's a wording imprecision in the ROADMAP versus the user's explicit decision in CONTEXT.md. The research document explicitly maps READ-03 to `defineShortcuts with meta_arrowleft/meta_arrowright`.

---

## Commit Verification

All 4 commits referenced in SUMMARYs exist in git history:

| Commit | Plan | Description |
|--------|------|-------------|
| `11aafcb` | 02-01 Task 1 | feat(02-01): add default layout with auto-hide header and scroll-to-top router |
| `6faa246` | 02-01 Task 2 | feat(02-01): rewrite novel detail page with natural sort descending chapter listing |
| `ad9bd8a` | 02-02 Task 1 | feat(02-02): add useChapterNav and useReadingProgress composables |
| `ac28e96` | 02-02 Task 2 | feat(02-02): rewrite chapter reader with typography, nav, shortcuts, and progress |

---

_Verified: 2026-02-18T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
