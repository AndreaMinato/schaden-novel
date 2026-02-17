# Codebase Structure

**Analysis Date:** 2026-02-17

## Directory Layout

```
schaden-novel/
├── src/                       # Source code for Astro site
│   ├── components/            # Reusable Astro components
│   ├── content/               # Markdown/MDX chapter content
│   ├── layouts/               # Page layout templates
│   ├── pages/                 # Route definitions (Astro file-based routing)
│   ├── styles/                # Global CSS
│   ├── consts.ts              # Global constants and utilities
│   └── content.config.ts      # Content collection definitions
├── public/                    # Static assets (fonts, images)
├── scripts/                   # Utility scripts for content management
├── dist/                      # Built static site output (generated)
├── build-cache/               # Astro incremental build cache (generated)
├── .planning/                 # GSD planning documents
├── .claude/                   # Claude configuration
├── astro.config.mjs           # Astro framework configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
└── pnpm-lock.yaml             # Package manager lockfile
```

## Directory Purposes

**`src/`:**
- Purpose: All source code for the Astro site
- Contains: Components, pages, content, layouts, styles
- Key files: `consts.ts`, `content.config.ts`

**`src/components/`:**
- Purpose: Reusable Astro components (UI pieces)
- Contains: Header, Footer, navigation, chapter display components
- Key files:
  - `BaseHead.astro` - Meta tags, fonts, CSS
  - `Header.astro` - Top navigation bar
  - `Footer.astro` - Page footer with social links
  - `ResumeReading.astro` - "Continue reading" dropdown (client-side)
  - `ChapterPreview.astro` - Chapter list item card
  - `Chapters.astro` - Chapter grid container
  - `ChapterJumper.astro` - Chapter navigation component
  - `FormattedDate.astro` - Date formatting helper
  - `HeaderLink.astro` - Navigation link with active state

**`src/content/`:**
- Purpose: Content collection directory (Astro requires this structure)
- Contains: `novels/` subdirectory
- Generated: Yes (scripts populate with content)
- Committed: Partially (structure committed, novels directory may be generated or synced)

**`src/content/novels/`:**
- Purpose: Chapter content organized by novel
- Contains: Subdirectories for each novel (mga, atg, overgeared, tmw, htk, issth, cd, lrg, mw, rtw)
- Each novel directory: Markdown files named by chapter number (e.g., `145.md`, `5_b.md`)
- File format: Markdown/MDX with YAML frontmatter metadata

**`src/content/novels/{novel}/`:**
- Purpose: Store chapters for a specific novel
- Contains: Markdown chapter files (one per chapter)
- Example structure:
  ```
  src/content/novels/mga/
  ├── 1.md
  ├── 2.md
  ├── 145.md
  ├── 145_b.md
  └── ...
  ```
- Naming pattern: `{number}.md` or `{number}_{suffix}.md` where suffix is a, b, c, d

**`src/layouts/`:**
- Purpose: Page layout templates for consistent page structure
- Contains: `Chapter.astro` - Wraps individual chapter pages with header, footer, prev/next nav
- Key file: `Chapter.astro` (192 lines, contains main chapter display logic and keyboard navigation)

**`src/pages/`:**
- Purpose: Define site routes via file-based routing (Astro standard)
- Contains:
  - `index.astro` - Home page route (/)
  - `novels/index.astro` - Novel list route (/novels)
  - `novels/[novel]/index.astro` - Novel chapters route (/novels/{tag})
  - `novels/[novel]/[...slug].astro` - Individual chapter route (/novels/{tag}/{id}/)
  - `rss.xml.js` - RSS feed endpoint

**`src/styles/`:**
- Purpose: Global CSS design system
- Contains: `global.css` (155 lines)
- Key content: CSS variables, typography scales, responsive breakpoints, utility classes

**`scripts/`:**
- Purpose: Node utilities for content management
- Contains:
  - `import.mjs` - Import chapters from external source
  - `import_ids.mjs` - Import chapters by ID
  - `readChapters.mjs` - Read and process chapter files
- Usage: Run via npm scripts (e.g., `npm run import:all`, `npm run import:docs`)

**`public/`:**
- Purpose: Static assets served as-is
- Contains: Fonts (Atkinson), images, icons
- Not built: Files here are copied directly to `dist/`

**`dist/`:**
- Purpose: Built static site output
- Generated: Yes (by `npm run build`)
- Structure mirrors `src/` with HTML, CSS, JS files

**`build-cache/`:**
- Purpose: Incremental build cache for faster rebuilds
- Generated: Yes (by Astro)
- Committed: No (ignored in .gitignore)

**`.planning/codebase/`:**
- Purpose: GSD planning documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, and other analysis docs
- Format: Markdown

**`astro.config.mjs`:**
- Purpose: Astro framework configuration
- Key settings:
  - Site URL: `https://schaden-novel.netlify.app/`
  - Cache directory: `./build-cache`
  - Integrations: MDX, sitemap
  - Vite options: Manual chunking for better caching

**`tsconfig.json`:**
- Purpose: TypeScript compiler options
- Path aliases: `@/*` resolves to `src/*`

## Key File Locations

**Entry Points:**
- `src/pages/index.astro` - Home page with novel sections
- `src/pages/novels/index.astro` - Novel catalog
- `src/pages/novels/[novel]/index.astro` - Novel chapter list
- `src/pages/novels/[novel]/[...slug].astro` - Chapter reader

**Configuration:**
- `astro.config.mjs` - Astro build and routing config
- `tsconfig.json` - TypeScript paths
- `package.json` - Dependencies and build scripts
- `src/content.config.ts` - Content collection schema and loaders

**Core Logic:**
- `src/consts.ts` - Global data (site title/description) and `defaultSort()` sorting function
- `src/content.config.ts` - Content loader configuration and Zod schema for chapter metadata

**Layout & Styling:**
- `src/layouts/Chapter.astro` - Chapter page wrapper with navigation
- `src/styles/global.css` - Design system and typography

**Reusable Components:**
- `src/components/Header.astro` - Navigation bar
- `src/components/Footer.astro` - Page footer
- `src/components/ResumeReading.astro` - Reading persistence UI
- `src/components/ChapterPreview.astro` - Chapter card for listings

**Content:**
- `src/content/novels/{novel}/*.md` - Chapter files with metadata frontmatter

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `ChapterPreview.astro`, `ResumeReading.astro`)
- Pages: kebab-case or PascalCase (e.g., `index.astro`, `[novel].astro`)
- Utilities: camelCase (e.g., `consts.ts`)
- Content: numbers with optional suffix (e.g., `145.md`, `145_b.md`)

**Directories:**
- lowercase (e.g., `components/`, `layouts/`, `pages/`, `content/`)
- dynamic routes: Square brackets (e.g., `[novel]/`, `[...slug].astro`)

**Variables:**
- Functions: camelCase (e.g., `defaultSort()`, `getStaticPaths()`)
- Constants: UPPER_SNAKE_CASE (e.g., `SITE_TITLE`, `SITE_DESCRIPTION`)
- Types: PascalCase (e.g., `Props`, `CollectionEntry`)

**Types:**
- Astro types: `import type { ... } from "astro:content"`
- Props interfaces: `type Props = { ... }` (inline per component)
- Zod schemas: lowercase with `Schema` suffix (e.g., `novelSchema`)

## Where to Add New Code

**New Feature (e.g., search, filtering):**
- Primary code: Create new component in `src/components/{Feature}.astro`
- Page integration: Import and use in affected page(s) under `src/pages/`
- Styling: Add scoped styles in component `<style>` block or reference `src/styles/global.css` classes
- Tests: Not applicable (static site, no test framework configured)

**New Component/Module:**
- Implementation: `src/components/{ComponentName}.astro`
- Props: Define `type Props = { ... }` at top of frontmatter
- Usage: Import in pages and other components as needed
- Example: `import MyComponent from "@/components/MyComponent.astro"`

**Utilities/Helpers:**
- Shared logic: Add to `src/consts.ts` or create new file like `src/utils/{name}.ts`
- Import pattern: `import { functionName } from "@/consts"`
- Content-related utilities: Can add to `src/content.config.ts` if collection-related

**Global Styles:**
- New CSS variables: Add to `:root` block in `src/styles/global.css`
- Component-specific styles: Use scoped CSS in `.astro` file `<style>` block
- Responsive breakpoints: Follow existing pattern (720px mobile, 900px tablet, 480px small mobile)

**New Novel:**
- Create directory: `src/content/novels/{novel_abbreviation}/`
- Add chapters: Place markdown files with naming pattern `{number}.md` or `{number}_{suffix}.md`
- Register collection: Add new `defineCollection()` in `src/content.config.ts`
- Export collection: Add to `collections` export in `src/content.config.ts`
- Map novel name: Add entry to `novelNames` object in `src/pages/index.astro` and similar pages

## Special Directories

**`build-cache/`:**
- Purpose: Astro's incremental build cache
- Generated: Yes (auto-created by Astro)
- Committed: No (.gitignore)
- Safe to delete: Yes (rebuild will regenerate)

**`dist/`:**
- Purpose: Production output (static HTML/CSS/JS)
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)
- Safe to delete: Yes (rebuild regenerates)

**`.claude/`:**
- Purpose: Claude AI configuration and generated files
- Committed: No (.gitignore excludes)
- Contains: Session state, token info

**`.planning/`:**
- Purpose: GSD (Get Stuff Done) orchestrator planning documents
- Committed: Yes (tracked in git)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONCERNS.md, etc.

## Import Patterns

**Path Aliases:**
- `@/` resolves to `src/` (defined in `tsconfig.json`)
- Usage: `import Header from "@/components/Header.astro"`

**Relative Imports:**
- From page to component: `import Component from "../components/ComponentName.astro"`
- From layout to component: `import Component from "../components/ComponentName.astro"`

**Type Imports:**
- Astro content types: `import type { CollectionEntry } from "astro:content"`
- Component props: Define inline with `type Props = { ... }`

---

*Structure analysis: 2026-02-17*
