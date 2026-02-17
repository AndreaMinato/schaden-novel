# Technology Stack

**Analysis Date:** 2026-02-17

## Languages

**Primary:**
- TypeScript - Full codebase uses TypeScript for type safety
- JavaScript (ESM) - Runtime execution in Node.js environment

**Secondary:**
- Markdown/MDX - Content files in `src/content/novels/`

## Runtime

**Environment:**
- Node.js (version not pinned, pnpm workspace)

**Package Manager:**
- pnpm - Primary package manager
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Astro 5.16.5 - Static site generator with file-based routing
  - Config: `astro.config.mjs`
  - Build system: Vite-based with Rollup bundling

**Content:**
- @astrojs/mdx 4.3.13 - MDX support for content collection schema
- @astrojs/rss 4.0.14 - RSS feed generation for novel collections
- @astrojs/sitemap 3.6.0 - Automatic sitemap generation for SEO

**Development:**
- Frontmatter CMS - VS Code-integrated content editing (config: `frontmatter.json`)

## Key Dependencies

**Critical:**
- astro 5.16.5 - Framework and build engine
- @astrojs/mdx 4.3.13 - Markdown/MDX compilation for content
- cheerio 1.1.2 - HTML parsing for Google Docs import scripts

**Build/Dev:**
- TypeScript (via astro/tsconfigs/strict) - Type checking
- Vite (included with Astro) - Dev server and bundler

## Configuration

**Environment:**
- `.env` and `.env.production` files (generated, not in repo)
- Netlify build environment variables (set in UI)
- No external API keys required for static build

**Build:**
- `tsconfig.json` - TypeScript configuration with Astro strict preset
  - Path aliases: `@/*` maps to `/src/*`
  - Base URL: `.`
  - Strict null checks enabled
- `astro.config.mjs` - Astro framework configuration
  - Site: `https://schaden-novel.netlify.app/`
  - Cache directory: `./build-cache/`
  - Dev server port: 4321
  - Markdown syntax highlighting: disabled (delegated to client)
  - Build optimization: Rollup manual chunks for astro bundle

## Platform Requirements

**Development:**
- Node.js with pnpm
- 8GB memory minimum (build script: `NODE_OPTIONS=--max-old-space-size=8192`)
- VS Code with Frontmatter extension (optional, for content editing)

**Production:**
- Netlify hosting (static site deployment)
- Build command: `NODE_OPTIONS=--max-old-space-size=8192 astro build`
- Publish directory: `/dist`
- No server-side rendering required

---

*Stack analysis: 2026-02-17*
