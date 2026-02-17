# Stack Research

**Domain:** Content-heavy novel reading site — static SSG, 13K+ markdown chapters
**Researched:** 2026-02-17
**Confidence:** HIGH (all versions verified via npm, all major claims verified via official docs/WebSearch)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| nuxt | 4.3.1 | Framework | Stable since July 2025; v4 is now the current major. Nuxt 3 EOL July 2026. Use v4 now to avoid migration mid-project. |
| @nuxt/ui | 4.4.0 | UI component library | v4 unifies Nuxt UI + Nuxt UI Pro into a single free library (125+ components). Uses Tailwind CSS v4 + Reka UI for accessibility. v4 is current; do NOT install v3. |
| @nuxt/content | 3.11.2 | Markdown pipeline + chapter querying | Nuxt's official content module; v3 uses SQLite backend for fast querying. Required for structured chapter/novel collections and SSG-compatible querying. See critical caveat below. |
| tailwindcss | 4.1.18 | Styling | Bundled automatically when you install @nuxt/ui v4 — do NOT install separately or version conflicts arise. |
| typescript | (bundled in nuxt) | Type safety | Nuxt 4 ships with full TypeScript support including route types, component types, auto-generated from directory structure. No separate install needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @pinia/nuxt | 0.11.3 | Reading progress state | Use Pinia for the reading progress store (localStorage-backed). Nuxt's built-in `useState()` is sufficient for simple cases, but Pinia gives persistence plugins and better DevTools. Use for: current chapter position, reading history. |
| @nuxtjs/sitemap | 7.6.0 | XML sitemap generation | Use it — 13K pages needs sitemap for SEO. Integrates with Nuxt Content v3 via `asSitemapCollection()` in `content.config.ts`. Auto-generates `/sitemap.xml` and links in `robots.txt`. |
| @nuxtjs/feed | 2.0.0 | RSS feed generation | For per-novel RSS feeds. Official community module, v2 targets Nuxt 4. Generates RSS 2.0, Atom, and JSON Feed formats. Replaces `@astrojs/rss`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| nuxi | Nuxt CLI — dev, build, generate | Use `nuxi generate` for static output (not `nuxt build`). Command: `npx nuxi generate` produces `/dist`. |
| pnpm | Package manager | Already used in existing project. Keep. |
| vue-tsc | TypeScript type checking for Vue | Install as dev dep: `npm install -D typescript vue-tsc`. Enable in `nuxt.config.ts` via `typescript: { typeCheck: true }`. |
| @nuxt/devtools | Browser DevTools panel for Nuxt | Included in Nuxt 4 dev mode by default. Zero config. |

---

## Critical Caveat: Nuxt Content v3 + Static Site + 13K Files

**This is the most important technical decision in the stack.**

Nuxt Content v3 uses SQLite as its backend. For static hosting (`nuxi generate`), it ships a WASM SQLite build to the browser. On the **first content query in the browser** (client-side navigation), the browser downloads a dump of the **entire SQLite database** — which contains all chapter content.

**With 13,318 chapters, this dump could be hundreds of MB. This is unacceptable for a reading site.**

**How to avoid this:**

1. **Wrap every content query in `useAsyncData`** — This is mandatory. When `useAsyncData` wraps `queryCollection()`, Nuxt extracts the result into a per-page `_payload.json` at build time. Client-side navigation fetches the small per-page payload JSON instead of triggering the WASM SQLite download.

   ```ts
   // CORRECT — data is in _payload.json, no WASM SQLite needed
   const { data: chapter } = await useAsyncData(
     'chapter',
     () => queryCollection('chapters').path(route.path).first()
   )

   // WRONG — runs as bare client-side query, triggers full WASM SQLite download
   const chapter = await queryCollection('chapters').path(route.path).first()
   ```

2. **Avoid any client-side-only content queries** — No live search (full-text across all chapters), no client-side collection filtering. If you need search, implement it with a pre-built index (Fuse.js against frontmatter only, not body text).

3. **Use `nuxi generate` (not `nuxt build`)** — Full static output. Nuxt crawls all links automatically. Configure `nitro.prerender.crawlLinks: true` and seed initial routes for the crawler.

4. **Minimize what goes into Content collections** — Store only frontmatter (chapter number, title, novel slug, word count) in the collections. The body text will be prerendered to HTML anyway; you don't need to query it client-side.

---

## Installation

```bash
# Create project
npx nuxi@latest init schaden-novel
cd schaden-novel

# Core
npm install @nuxt/ui @nuxt/content

# Supporting
npm install @pinia/nuxt @nuxtjs/sitemap @nuxtjs/feed

# Dev dependencies
npm install -D typescript vue-tsc
```

`nuxt.config.ts` modules array:

```ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@pinia/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/feed',
  ],
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/sitemap.xml'],
    },
  },
  typescript: {
    typeCheck: true,
  },
})
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @nuxt/ui v4.4.0 | @nuxt/ui v3 | Never — v4 is current. v3 is the prior major. |
| @nuxt/ui v4.4.0 | shadcn-vue | If Tailwind CSS v4 + Reka UI stack is already familiar and you want headless primitives without Nuxt UI's component layer. More setup work; not justified here. |
| @nuxt/content 3.x | Custom markdown pipeline (unified + remark + rehype) | If you need full control over remark plugin chain (custom AST transforms, non-standard MDX), and are willing to manage a build plugin. Worth considering if WASM SQLite proves problematic in practice. |
| @pinia/nuxt | Nuxt built-in `useState()` | If state needs are minimal (one or two values). `useState()` has no persistence plugin — you'd implement localStorage manually. |
| @nuxtjs/feed | nuxt-feedme | nuxt-feedme has tighter Nuxt Content integration. Use it if RSS feeds should be auto-generated from Content collections. @nuxtjs/feed gives more manual control and is the older, more-tested option. |
| nuxi generate (SSG) | nuxi build (SSR/serverless on Netlify) | If you add user accounts, server-side personalisation, or need ISR. For this project (static reading site), full SSG is correct. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @nuxt/ui v3 | It is the prior major version. v4.4.0 is current as of January 2026. Installing by mistake is easy — pin to `^4.0.0` in package.json. | @nuxt/ui@^4 |
| Nuxt 3 | EOL July 2026. Starting a new project on it is wrong. | nuxt@^4 |
| `@astrojs/*` modules | Astro-specific, incompatible with Nuxt. | Nuxt-native equivalents listed above. |
| Nuxt Content v2 | v3 is current; v2 had significant I/O performance issues at scale. SQLite backend in v3 is the right choice for 13K files at build time. | @nuxt/content@^3 |
| Bare `queryCollection()` calls in components (outside `useAsyncData`) | Triggers WASM SQLite browser download on static sites. With 13K chapters this is catastrophic for performance. | Always wrap in `useAsyncData()`. |
| Full-text search against Nuxt Content on static sites | Forces WASM SQLite load in browser (entire 13K chapter database). | Pre-build a Fuse.js index of frontmatter only; serve as static JSON. |
| Separate `tailwindcss` install | Nuxt UI v4 manages Tailwind CSS v4 internally. A manual install risks version conflicts. | Let @nuxt/ui handle Tailwind. |

---

## Stack Patterns by Variant

**For chapter pages (13K routes):**
- Route: `app/pages/[novel]/[chapter].vue`
- Fetch with `useAsyncData(() => queryCollection('chapters').path(route.path).first())`
- Payload extracted to `_payload.json` — no WASM SQLite download on navigation
- Prerendered to static HTML at build time

**For novel index pages (10 routes):**
- Route: `app/pages/[novel]/index.vue`
- Query: `queryCollection('chapters').where('novel', '==', novel).select('path', 'title', 'chapter').order('chapter').all()`
- Same `useAsyncData` wrapper rule applies

**For reading progress (localStorage):**
- Pinia store with `pinia-plugin-persistedstate` (persists to localStorage automatically)
- Store: `app/stores/reading-progress.ts`

**For RSS feeds:**
- One feed per novel: `/[novel]/rss.xml`
- Config in `@nuxtjs/feed` using a `createFeedArticles` function

**For SSG on Netlify:**
- Build command: `pnpm run generate` (maps to `nuxi generate`)
- Publish directory: `dist/`
- Node version: 20.x (required — Nuxt Content v3 does not support Node 18)
- Zero additional Netlify config needed (module auto-detects Netlify environment)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| nuxt@4.3.1 | @nuxt/ui@4.x, @nuxt/content@3.x | Confirmed stable as of January 2026 |
| @nuxt/ui@4.4.0 | tailwindcss@4.x (auto-managed) | Do NOT install tailwindcss separately |
| @nuxt/content@3.11.2 | nuxt@4.x | v3 explicitly targets Nuxt 3 and 4 |
| @nuxtjs/sitemap@7.6.0 | nuxt@4.x | Updated January 28, 2026 — current |
| @pinia/nuxt@0.11.3 | nuxt@4.x, vue@3.x | In Nuxt 4 directory structure, stores live at `app/stores/` |
| Node.js | >=20.x | Nuxt Content v3 requires Node 20+; Netlify defaults to 18 — must override |

---

## Sources

- npm registry (verified 2026-02-17): nuxt@4.3.1, @nuxt/ui@4.4.0, @nuxt/content@3.11.2, @nuxtjs/sitemap@7.6.0, @pinia/nuxt@0.11.3, @nuxtjs/feed@2.0.0
- https://content.nuxt.com/docs/deploy/static — Nuxt Content v3 static hosting, WASM SQLite behavior (HIGH confidence)
- https://content.nuxt.com/docs/deploy/netlify — Zero-config Netlify deployment, Node 20 requirement (HIGH confidence)
- https://content.nuxt.com/docs/advanced/database — WASM SQLite browser download mechanism (HIGH confidence)
- https://nuxt.com/blog/v4 — Nuxt 4 release announcement, July 2025 (HIGH confidence)
- https://ui.nuxt.com/releases — Nuxt UI v4.4.0 release notes (HIGH confidence)
- https://github.com/nuxt/content/issues/3233 — Migration challenges with SQLite, 25% build time increase, WAL mode fix (MEDIUM confidence — issue thread)
- https://nuxtseo.com/docs/sitemap/guides/content — Nuxt Sitemap + Content v3 integration via asSitemapCollection() (MEDIUM confidence)
- https://developers.netlify.com/guides/isr-and-advanced-caching-with-nuxt-v4-on-netlify/ — Netlify + Nuxt 4 prerendering (MEDIUM confidence)
- https://eosl.date/eol/product/nuxt/ — Nuxt 3 EOL July 31, 2026 (MEDIUM confidence)

---

*Stack research for: Novel reading site rebuilt in Nuxt 4 (10 novels, 13,318 chapters as markdown files, SSG to Netlify)*
*Researched: 2026-02-17*
