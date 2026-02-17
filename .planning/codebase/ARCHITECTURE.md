# Architecture

**Analysis Date:** 2026-02-17

## Pattern Overview

**Overall:** Content-driven static site generator with client-side enhancements.

**Key Characteristics:**
- Astro-based static generation with markdown/MDX content
- Multi-novel support with shared layout and navigation infrastructure
- Client-side localStorage for reading state persistence
- Keyboard-driven navigation for enhanced reading experience
- Server-side route generation from content metadata

## Layers

**Content Layer:**
- Purpose: Store raw chapter data as markdown/MDX files with frontmatter metadata
- Location: `src/content/novels/{novel}/`
- Contains: Markdown files (one per chapter) with title, description, tags, pubDate, heroImage
- Depends on: Astro content collection system
- Used by: Pages, layouts, and content queries

**Route Generation Layer:**
- Purpose: Generate static routes from content metadata and dynamic path parameters
- Location: `src/pages/novels/[novel]/[...slug].astro` and `src/pages/novels/[novel]/index.astro`
- Contains: `getStaticPaths()` functions that extract novel and chapter IDs from content
- Depends on: Content layer, Astro content API
- Used by: Browser navigation, sitemap generation

**Page Layer:**
- Purpose: Define site structure and aggregate content for display
- Location: `src/pages/`
- Contains:
  - `index.astro` - Home page with latest chapters grouped by novel
  - `novels/index.astro` - Novel catalog with chapter counts
  - `novels/[novel]/index.astro` - Novel chapter listing page
  - `novels/[novel]/[...slug].astro` - Individual chapter reader
  - `rss.xml.js` - RSS feed generation
- Depends on: Layout layer, component layer, content queries
- Used by: Browser routing, static site generation

**Layout Layer:**
- Purpose: Wrap page content with consistent structure, header/footer, and navigation UI
- Location: `src/layouts/Chapter.astro`
- Contains: Chapter page template with prev/next navigation, reading persistence, keyboard shortcuts
- Depends on: Component layer
- Used by: Chapter page rendering

**Component Layer:**
- Purpose: Reusable UI pieces for consistent design and functionality
- Location: `src/components/`
- Contains:
  - `BaseHead.astro` - Meta tags, fonts, stylesheets
  - `Header.astro` - Navigation bar with ResumeReading button
  - `Footer.astro` - Copyright, social links, RSS
  - `ResumeReading.astro` - Dropdown showing recently read chapters (client-side)
  - `ChapterPreview.astro` - Chapter card for listings (title, date, tags)
  - `Chapters.astro` - Container for chapter lists with grid styling
  - `ChapterJumper.astro` - Navigation component for jumping between chapters
  - `FormattedDate.astro` - Date formatting utility
  - `HeaderLink.astro` - Navigation link with active state styling
- Depends on: Global styles, content types
- Used by: Pages and layouts

**Utilities Layer:**
- Purpose: Global constants and shared functions
- Location: `src/consts.ts`, `src/content.config.ts`
- Contains:
  - `SITE_TITLE`, `SITE_DESCRIPTION` - Global metadata
  - `defaultSort()` - Sort chapters by number (with _b, _c, _d suffixes) then by date
  - `novelSchema` - Zod schema for chapter metadata validation
  - Collection definitions for each novel
- Depends on: Nothing
- Used by: All pages, layouts, and components

**Styles Layer:**
- Purpose: Global CSS design system and theme
- Location: `src/styles/global.css`
- Contains: CSS variables, typography, responsive design, utilities
- Depends on: Nothing
- Used by: All pages and components

## Data Flow

**Chapter Display Flow:**

1. **Content Loading**: Astro loader scans `src/content/novels/{novel}/*.{md,mdx}` files
2. **Parsing**: Content collection extracts metadata (title, tags, pubDate) and markdown body
3. **Route Generation**: `getStaticPaths()` creates routes for each novel and chapter
4. **Page Rendering**: Route matches `novels/[novel]/[...slug].astro`, loads chapter with ID
5. **Layout Wrapping**: Chapter content wrapped in `Chapter.astro` layout with nav controls
6. **Component Rendering**: Layout embeds Header, Footer, ChapterPreview components
7. **Client Hydration**: JavaScript runs, reads localStorage for resume state
8. **Static Output**: Astro generates HTML files in `dist/` directory

**Reading State Persistence:**

1. User visits chapter page
2. `Chapter.astro` script saves `{ novel, slug, timestamp }` to `localStorage.savedChapters[novel]`
3. `ResumeReading.astro` component reads localStorage on page load
4. Dropdown populates with recently read chapters sorted by timestamp
5. User clicks dropdown link to jump to saved chapter

**Navigation Flow:**

1. Home page (`index.astro`):
   - Queries all chapters via `getCollection("chapters")`
   - Groups by primary tag (novel), takes 3 latest per novel
   - Displays as sections with sidebar nav (desktop) or dropdown (mobile)
   - Scroll tracking via IntersectionObserver highlights active section

2. Novel listing (`novels/index.astro`):
   - Counts chapters per novel, sorts by count descending
   - Displays grid of novel cards with chapter counts
   - Each card links to novel chapter listing

3. Chapter listing (`novels/[novel]/index.astro`):
   - Filters chapters by tag matching novel parameter
   - Sorts via `defaultSort()` function
   - Displays full list of chapters with ChapterPreview components

4. Single chapter (`novels/[novel]/[...slug].astro`):
   - Loads chapter by ID, renders MDX content
   - Finds prev/next chapters in sorted list
   - Provides keyboard navigation (Cmd+Left/Right arrows)

**State Management:**

- **Build-time**: Chapter metadata and routes generated during build
- **Client-side**: localStorage tracks reading progress per novel
- **URL state**: Current novel and chapter implicit in URL path
- **Component state**: ResumeReading dropdown open/close managed via `aria-expanded` attribute

## Key Abstractions

**Content Collection:**
- Purpose: Abstract over filesystem chapter storage, provide queryable content interface
- Examples: `src/content.config.ts` defines 11 collection types (chapters, mga, atg, overgeared, etc.)
- Pattern: Each collection uses Astro's `glob()` loader with `generateId()` to create stable IDs like `{novel}/{chapter_number}`

**Novel Metadata Schema:**
- Purpose: Validate chapter frontmatter structure
- Pattern: Zod schema at `src/content.config.ts` enforces: title, description (optional), tags array, pubDate, updatedDate (optional), heroImage (optional)
- Reused across all 11 collections

**Chapter Sorting:**
- Purpose: Order chapters numerically while respecting multi-part chapters (e.g., Chapter 5_b, 5_c)
- Location: `src/consts.ts` → `defaultSort()` function
- Pattern: Parse numeric ID prefix, add decimal suffix for _b (0.1), _c (0.2), _d (0.3), fall back to pubDate if not numeric
- Used in all listing views

**Route Generation Pattern:**
- Purpose: Convert content IDs to URL paths
- Pattern: Extract novel and slug from content ID (format: `{novel}/{chapter_id}`)
- Used in: Pages with `getStaticPaths()` to generate all possible routes at build time
- Example: Content ID `mga/145_c` becomes URL `/novels/mga/145_c/`

## Entry Points

**Static Pages:**
- Location: `src/pages/`
- `index.astro` - Home page, shows latest chapters grouped by novel
- `novels/index.astro` - Novel catalog, lists all novels with chapter counts
- `rss.xml.js` - RSS feed endpoint

**Dynamic Pages:**
- `novels/[novel]/index.astro` - Novel's chapter listing, parameter: novel tag (mga, atg, etc.)
- `novels/[novel]/[...slug].astro` - Individual chapter reader, parameters: novel tag + chapter ID

**Route Parameters:**
- `[novel]`: One of (mga, atg, overgeared, tmw, htk, issth, cd, lrg, mw, rtw)
- `[...slug]`: Chapter number (e.g., 145, 5_c) - spread parameter captures full path

## Error Handling

**Strategy:** Build-time validation + graceful client-side fallbacks

**Patterns:**
- Content validation: Zod schema in `content.config.ts` catches malformed frontmatter during build
- Missing chapters: Novel listing filters by available tags from content
- Navigation edge cases: `prev` and `next` variables in Chapter layout can be undefined; links get `.disabled` class, pointer-events disabled
- localStorage failures: ResumeReading component safely checks for localStorage existence, shows empty state if no saved chapters
- Keyboard navigation: Verifies link exists before following; prevents default only on valid navigation

## Cross-Cutting Concerns

**Logging:** Not implemented (static site, no server-side logs)

**Validation:**
- Schema validation: Zod schemas enforce chapter metadata types at build time
- Link validation: All chapter links generated from actual content IDs, no broken links possible
- Date parsing: Zod's coerce.date() handles string to Date conversion

**Authentication:** Not applicable (public static site, no auth required)

**Styling:**
- Global design system in `src/styles/global.css` defines CSS variables for colors, spacing, typography
- Component-scoped styles via Astro's scoped CSS in .astro files
- Responsive design breakpoints: 720px (mobile), 900px (sidebar collapse), 480px (mobile resume button)

**Performance Considerations:**
- Static generation ensures fast page loads (no server processing)
- Cache directory at `build-cache/` for incremental builds
- MDX parsing and rendering happens at build time, not runtime
- Client-side JavaScript minimal: localStorage API, IntersectionObserver, event listeners only
- Chunking configuration in astro.config.mjs extracts `astro` to separate chunk for caching

---

*Architecture analysis: 2026-02-17*
