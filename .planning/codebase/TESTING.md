# Testing Patterns

**Analysis Date:** 2026-02-17

## Test Framework

**Runner:** Not detected

**Assertion Library:** Not detected

**Configuration:** No test configuration files found

**Run Commands:** Not applicable - no test framework configured

**Status:** No testing infrastructure is currently set up in this project.

## Test File Organization

**Current State:** No test files exist in the codebase

**Observation:** No `.test.ts`, `.spec.ts`, `.test.tsx`, `.spec.tsx`, or `__tests__` directories found in `/Users/aminato/dev/schaden-novel/src`

**Recommendation if Testing Were Added:**
- Co-locate tests: `ComponentName.astro` + `ComponentName.test.ts`
- Naming: `*.test.ts` for unit tests
- Location: Adjacent to source files for quick navigation

## Test Structure

**Current Testing Approach:** Manual, browser-based

**How Testing is Currently Done:**
- No automated tests
- Functionality verified through:
  - Running `npm run dev` and manually visiting pages
  - Browser inspection of rendered output
  - Manual verification of navigation and chapter loading

## Mocking

**Framework:** Not applicable - no testing framework

**What Would Need Mocking (if tests existed):**
- `getCollection()` - Replace with mock data for chapters
- `fetch()` - Mock Google Docs export endpoints
- `localStorage` - Mock in browser environment
- File system operations - Mock `fs/promises` in Node tests
- Astro context - Mock `Astro.props`, `Astro.params`

## Fixtures and Factories

**Test Data:** Not defined

**Would Use If Testing:**
- Mock chapter collections with known IDs and metadata
- Fixture file: `src/__fixtures__/chapters.ts` (if implemented)
- Sample data structure:
  ```typescript
  export const mockChapters = [
    {
      id: 'mga/1',
      data: {
        title: 'Chapter 1',
        description: 'Test chapter',
        tags: ['mga'],
        pubDate: new Date('2025-01-01'),
        updatedDate: undefined,
        heroImage: undefined
      }
    }
  ];
  ```

## Coverage

**Requirements:** Not enforced - no test suite exists

## Test Types

**Unit Tests:** Not implemented
- Would test utility functions like `defaultSort()`
- Would test content schema validation in `content.config.ts`

**Integration Tests:** Not implemented
- Would test content collection queries
- Would test Astro page generation
- Would test RSS feed generation

**E2E Tests:** Not implemented
- Could use Playwright or similar
- Would test navigation flow
- Would test chapter rendering and display
- Would test localStorage persistence for "resume reading" feature

## Manual Testing Checklist (Current Approach)

**Page Rendering:**
- [ ] Home page loads with latest chapters from all novels
- [ ] Novel index page displays all novels with chapter counts
- [ ] Novel detail page shows chapters sorted by number
- [ ] Chapter page renders correctly with navigation

**Navigation:**
- [ ] Previous/Next chapter links work correctly
- [ ] Cmd+Left/Right keyboard shortcuts navigate between chapters
- [ ] Chapter jumper sidebar opens/closes on hover
- [ ] Mobile dropdown novel selector works

**Data:**
- [ ] Chapters display in correct sort order (numeric with suffixes _b, _c, _d)
- [ ] Publication dates format correctly in local timezone
- [ ] Hero images display when present
- [ ] Tags display correctly

**Features:**
- [ ] "Resume Reading" feature saves to localStorage
- [ ] Resume Reading restores on page load
- [ ] RSS feed generates with correct chapter links
- [ ] Sitemap includes all novel and chapter pages

## Async Testing Pattern (if testing were implemented)

**Pattern for testing async operations:**
```typescript
// Would use similar structure to:
async function testContentLoading() {
  const chapters = await getCollection('chapters');

  // Assert chapters loaded
  expect(chapters).toBeDefined();
  expect(chapters.length).toBeGreaterThan(0);

  // Assert data shape
  chapters.forEach(chapter => {
    expect(chapter.data).toHaveProperty('title');
    expect(chapter.data).toHaveProperty('pubDate');
  });
}
```

**Pattern for testing DOM state (if using jsdom):**
```typescript
// Would follow similar pattern to Chapter.astro script:
test('localStorage persistence', () => {
  const storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  };

  // Simulate saveCurrentChapter()
  // Assert localStorage contains chapter ID
});
```

## Known Testing Gaps

**Untested Components:**
- `ChapterPreview.astro` - Props rendering, links
- `FormattedDate.astro` - Date formatting with locale
- `ChapterJumper.astro` - Hover state, sidebar scroll
- `Header.astro`, `Footer.astro`, `BaseHead.astro` - Meta tags, navigation

**Untested Utilities:**
- `defaultSort()` - Complex sort logic with numeric extraction and suffix handling
- Content collection loading and caching
- RSS feed generation in `pages/rss.xml.js`

**Untested Scripts:**
- `scripts/import.mjs` - Google Docs loading, HTML parsing
- `scripts/import_ids.mjs` - ID extraction, file operations
- `scripts/readChapters.mjs` - File reading and content transformation

**Browser API Usage (not testable without browser context):**
- `localStorage` in `Chapter.astro` - Resume reading feature
- IntersectionObserver for sidebar highlighting
- Keyboard event handling (Cmd+arrow navigation)
- DOM selection and manipulation

## Critical Testing Recommendations

**High Priority:**
1. Add unit tests for `defaultSort()` function
   - Test numeric extraction from IDs
   - Test suffix handling (_b, _c, _d modifiers)
   - Test fallback to date sorting
   - Location: `src/__tests__/consts.test.ts`

2. Add tests for content schema validation
   - Test required fields (title, tags, pubDate)
   - Test optional fields (description, updatedDate, heroImage)
   - Location: `src/__tests__/content.config.test.ts`

3. Add E2E tests for critical user flows
   - Chapter navigation (previous/next)
   - Resume reading feature persistence
   - Search and filtering

**Medium Priority:**
4. Add integration tests for Astro pages
   - Test static page generation
   - Test dynamic route generation
   - Test RSS feed output format

**Nice to Have:**
5. Add component snapshot tests for UI components
6. Add accessibility tests (a11y) for keyboard navigation

## Implementation Recommendations (if adding tests)

**Framework Choice:**
- Vitest recommended (Vue/Astro friendly, fast)
- Jest alternative (larger ecosystem, more mature)
- Astro integrations: `@astrojs/web-vitals` (not testing but related)

**Setup Steps:**
1. Install: `npm install -D vitest`
2. Create config: `vitest.config.ts`
3. Add test script to `package.json`: `"test": "vitest"`
4. Create test files following `*.test.ts` pattern
5. Set up GitHub Actions for CI/CD testing

---

*Testing analysis: 2026-02-17*
