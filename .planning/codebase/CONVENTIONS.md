# Coding Conventions

**Analysis Date:** 2026-02-17

## Naming Patterns

**Files:**
- Component files: PascalCase for `.astro` components
  - Example: `ChapterPreview.astro`, `FormattedDate.astro`, `HeaderLink.astro`
- Config files: camelCase with descriptive suffixes
  - Example: `content.config.ts`, `astro.config.mjs`
- Utility files: camelCase
  - Example: `consts.ts`, `import.mjs`, `readChapters.mjs`
- Page files: kebab-case for dynamic segments
  - Example: `[novel]`, `[...slug]`

**Functions:**
- camelCase for all functions and async functions
  - Example: `defaultSort()`, `extractDocumentId()`, `loadGoogleDoc()`, `saveCurrentChapter()`
- Descriptive verb-noun pattern
  - Example: `formatDate()`, `loadNovel()`, `appendFile()`

**Variables:**
- camelCase for local variables and parameters
  - Example: `allChapters`, `chaptersByNovel`, `latestPubDate`
- UPPERCASE_SNAKE_CASE for module-level constants
  - Example: `SITE_TITLE`, `SITE_DESCRIPTION`
- const by default, let only when reassignment is needed

**Types:**
- PascalCase for type definitions and interfaces
  - Example: `Props`, `ChapterCollectionReturn`
- `type Props` pattern for component props in Astro
  - Located in frontmatter (between `---` markers)
  - Destructured from `Astro.props` in component body

**CSS Classes:**
- kebab-case for CSS class names
  - Example: `chapter-preview`, `mobile-nav`, `novel-section`, `sidebar-title`
- Semantic naming reflecting purpose
  - Example: `.disabled`, `.date`, `.tags`, `.hero-image`

## Code Style

**Formatting:**
- No explicit formatter configured (Prettier not enforced)
- 2-space indentation observed
- No semicolon requirements observed (optional)
- Single/double quotes used inconsistently

**Linting:**
- No ESLint configuration in root
- TypeScript strict mode enabled via `tsconfig.json` extending `astro/tsconfigs/strict`
- `strictNullChecks: true` enforced

**Type Safety:**
- TypeScript strict mode fully enabled
- All props have explicit type annotations
- Type inference used where context is clear
- Type aliases for complex objects (e.g., `Record<string, ...>`)

## Import Organization

**Order:**
1. Framework imports: `astro:*`, `@astrojs/*`
   - Example: `import { getCollection } from 'astro:content'`
2. Third-party packages
   - Example: `import { load } from 'cheerio'`
3. File system and Node APIs
   - Example: `import { mkdir, appendFile, writeFile, rm } from 'fs/promises'`
4. Local components and utilities
   - Example: `import BaseHead from "@/components/BaseHead.astro"`
5. Local functions and constants
   - Example: `import { SITE_TITLE, defaultSort } from "@/consts"`

**Path Aliases:**
- `@/*` maps to `/src/*` as defined in `tsconfig.json`
- Used consistently in imports: `@/components/`, `@/consts`
- Some imports use relative paths (`src/components/`) and should be migrated to `@/`

## Error Handling

**Patterns:**
- Early returns with guard clauses
  - Example: `if (!article) return;` prevents null reference errors
- Try-catch blocks for async operations
  - Example: Wrapping `fetch()` and file operations
- Silent catch blocks for non-critical operations
  - Example: Loading novel IDs where failures are acceptable
- Throw errors with descriptive messages
  - Example: `throw new Error("Network response was not ok")`
- Response validation before processing
  - Example: `if (!response.ok) { throw new Error(...) }`

**Error Handling in Scripts:**
- Empty catch blocks indicate acceptable failures
  - Location: `scripts/import.mjs` - failures to load individual chapters don't stop process
- No error logging for debugging
- Silent failures in document loading allow partial imports

## Logging

**Framework:** Native `console` object

**Patterns:**
- `console.log()` for status messages in scripts
  - Example: `console.log('Starting ${novel}')`, `console.log(ids)`
- No structured logging framework
- Logging used primarily in CLI scripts, not in Astro components
- No log levels (no warn, error, debug methods used)

**Best Practice:**
- Use `console.log()` for script status and debugging
- Avoid logging in production components unless necessary

## Comments

**When to Comment:**
- Complex logic and business rules
  - Example: `// Group chapters by novel tag and track latest pubDate`
  - Example: `// Primary tag is the novel`
- Important implementation details
  - Example: `// Save current chapter for resume reading`
  - Example: `// Enable incremental loading - only process changed files`
- Keyboard navigation and event handling
  - Example: `// Check if Cmd (Meta) key is pressed`
  - Example: `// Keyboard navigation for Cmd+Left/Right`

**Comment Style:**
- Single-line comments (`//`) for inline explanations
- Multi-line comments grouped above related code blocks
- No trailing comments on same line as code (one exception: `tag = chapter.data.tags[0]; // Primary tag is the novel`)

**JSDoc/TSDoc:**
- Not used in codebase
- No formal function documentation found
- Comments embedded in implementation rather than above function signatures

## Function Design

**Size:** Functions are concise and focused
- Utility functions: 5-15 lines
- Event handlers: 3-10 lines
- Data transformation: use inline arrow functions with `.map()`, `.reduce()`

**Parameters:**
- Type annotations required in TypeScript files
- Destructuring preferred for multiple parameters
  - Example: `const { id, data } = Astro.props`
  - Example: `const { novel } = Astro.params`
- Default parameters used sparingly
  - Example: `loadGoogleDoc(id, format = 'txt')`

**Return Values:**
- Explicit return statements
- Guard clauses with early returns
- No implicit returns (except in arrow functions)
- Type annotations for return types in TypeScript

## Module Design

**Exports:**
- Named exports for utilities and functions
  - Example: `export const SITE_TITLE`, `export function defaultSort()`
- Default exports for layouts and pages (Astro convention)
- Type exports for TypeScript types
  - Example: `type Props = {...}` (no export - used locally in component)

**Barrel Files:** Not used in codebase
- Each component is imported directly
- No index files with re-exports

**Astro Component Pattern:**
- Frontmatter (between `---` markers) for logic and imports
- Type Props defined at top of frontmatter
- Props destructured from `Astro.props` with type annotations
- Reactive state handled in embedded `<script>` tags

## Async/Await Pattern

**Used extensively for:**
- Content collection queries: `await getCollection('chapters')`
- File operations: `await mkdir()`, `await writeFile()`, `await rm()`
- Network requests: `await fetch()`, `await response.text()`

**Pattern:**
- Async functions explicitly declared
- Errors propagated with `throw new Error()`
- No promises without await in async contexts

---

*Convention analysis: 2026-02-17*
