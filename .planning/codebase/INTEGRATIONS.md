# External Integrations

**Analysis Date:** 2026-02-17

## APIs & External Services

**Google Docs Export API:**
- Service: Google Docs (via export endpoint)
- What it's used for: Importing novel chapters from Google Docs
- SDK/Client: Native `fetch` API (no SDK)
- Auth: Public read access to shared docs (document ID only)
- Implementation: `scripts/import.mjs` and `scripts/import_ids.mjs`
  - Exports as HTML: `https://docs.google.com/document/d/{ID}/export?format=html`
  - Exports as text: `https://docs.google.com/document/d/{ID}/export?format=txt`

**Content Sources:**
- Novel data loaded from Google Docs with hardcoded document IDs in `scripts/import.mjs`:
  - atg: `1UAr63ltyIGu9a8cbxL7nziRYzJeW2X_x96oWyEMxhbA`
  - cd: `1i2opAYNXvXzMrPJI5E4b-8xNtx1vj0iL3lRBFbD-sgk`
  - htk: `1c3IGtRohe6IklxlFy2Cn0Ts__WbQQBX-ikNJ7wCZx30`
  - issth: `1XNSlUXLISdDebkLiWmRx90Utc5MfJjbxk0qezNwlqHM`
  - lrg: `1NlmUC5zJDSA1GeOP-zXzeOiSD8LGufki2AIB5equGQE`
  - mga: `1p_XRL5cg2KaBDZpC2YSkKT1TsO8gUdvj2HZDskB2rOg`
  - mw: `17m97EysE3iS2x1ufHCUZHBBXMzpmqyzIo7erIp60Z6A`
  - overgeared: `1ltYlFG6qnH-rT8-aPtbCJeGZepsR_AX8x2mK9ieVGng`
  - rtw: `1UlpiIFhcvkDo_yB9YKpgubhRmxeSFxZKtcflD2Sunok`
  - tmw: `1AKE2CdyIllmsBW3ItSwlE7E9VjQMRYduZFla_vY5mPU`

## Data Storage

**Databases:**
- Not applicable - Static site with no database

**File Storage:**
- Local filesystem only
- Content stored in: `src/content/novels/[novel-name]/`
- Markdown/MDX files with YAML frontmatter
- Build cache: `build-cache/`
- Compiled output: `dist/`

**Caching:**
- Astro incremental content loading via `generateId()` in `src/content.config.ts`
- File-based content collection cache (only changed files processed)
- Vite build cache via `build-cache/` directory

## Authentication & Identity

**Auth Provider:**
- None - Static site with no authentication
- Google Docs access: Public document sharing (no auth required, URL-based access only)

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- Build logs: Console output from `astro build` and scripts
- Import scripts use console.log for import progress tracking

## CI/CD & Deployment

**Hosting:**
- Netlify (static site hosting)
- Site: `https://schaden-novel.netlify.app/`
- Config: `.netlify/netlify.toml`

**CI Pipeline:**
- Netlify automated builds (triggered on git push to main)
- Build command: `pnpm run build` → `NODE_OPTIONS=--max-old-space-size=8192 astro build`
- Publish directory: `dist/`
- No pre-build hooks configured

**Deployment Workflow:**
- Git-based: Changes pushed to GitHub → Netlify auto-builds
- Manual deployment available: `pnpm run deploy` (requires Netlify CLI)
- Publish command: `netlify deploy --prod --dir=dist --no-build`

## Environment Configuration

**Required env vars:**
- None required for static builds
- Optional: `.env` and `.env.production` (if using build-time environment variables)

**Secrets location:**
- Netlify environment variables (set in Netlify UI)
- No secrets tracked in repository

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- RSS feed: `https://schaden-novel.netlify.app/rss.xml` (generated via @astrojs/rss)
- Sitemap: `https://schaden-novel.netlify.app/sitemap-index.xml` (generated via @astrojs/sitemap)

## Content Management Integration

**Frontmatter CMS:**
- VS Code extension for editing content in `src/content/novels/`
- Config: `frontmatter.json`
- Manages: Title, description, tags (atg, cd, htk, lrg, mga, mw, overgeared, rtw, tmw), publish date, hero image
- Preview host: `http://localhost:4321`

## Git Integration

**GitHub/Git:**
- Version control via git
- Workflow command: `pnpm git:sync` - adds content, commits, pushes, resets
- Publish workflow: `pnpm publish` - imports docs → syncs git → deploys to Netlify

---

*Integration audit: 2026-02-17*
