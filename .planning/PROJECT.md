# Schaden Novel

## What This Is

A novel chapter reading site rebuilt from scratch in Nuxt + Nuxt UI, replacing the existing Astro static site. Hosts 10+ translated novels (~13,000 chapters) with a clean reading experience, chapter navigation, and reading progress tracking. Deployed to Netlify.

## Core Value

Readers can find and read novel chapters with a smooth, uninterrupted reading experience.

## Requirements

### Validated

<!-- Proven valuable from existing Astro site -->

- ✓ Multi-novel catalog with chapter listings — existing
- ✓ Individual chapter reader with formatted text — existing
- ✓ Prev/next chapter navigation — existing
- ✓ Keyboard shortcuts for chapter navigation — existing
- ✓ Reading progress persistence via localStorage — existing
- ✓ Google Docs chapter import workflow — existing
- ✓ Direct markdown chapter editing — existing
- ✓ RSS feed for new chapters — existing
- ✓ SEO sitemap generation — existing
- ✓ Netlify static deployment — existing

### Active

- [ ] Rebuild site in Nuxt 4 with Nuxt UI
- [ ] Migrate existing markdown/MDX chapters to Nuxt content system
- [ ] Home page with latest chapters grouped by novel
- [ ] Novel catalog page with chapter counts
- [ ] Novel detail page with full chapter listing
- [ ] Chapter reader page with clean typography
- [ ] Prev/next chapter navigation in reader
- [ ] Keyboard navigation (arrow keys for prev/next)
- [ ] Reading progress persistence (localStorage — resume where you left off)
- [ ] Google Docs import script (port existing scripts)
- [ ] RSS feed generation
- [ ] Sitemap generation
- [ ] Netlify deployment

### Out of Scope

- Authentication/user accounts — static reading site, no login needed
- Database backend — content lives as files, no DB
- Comments or social features — reading-focused
- Real-time features — static/SSG deployment
- Mobile app — web only

## Context

- Existing Astro site at https://schaden-novel.netlify.app/
- ~13,318 chapters across 10 novels (170MB of markdown)
- Content imported from Google Docs via custom scripts (cheerio HTML parsing)
- Novels: atg, cd, htk, issth, lrg, mga, mw, overgeared, rtw, tmw
- Current site has build performance issues due to content volume (8GB memory needed)
- Known bugs in import scripts (silent error swallowing, missing awaits)
- Chapter sorting algorithm is inefficient for 13K+ chapters

## Constraints

- **Stack**: Nuxt 4 + Nuxt UI — user's chosen framework
- **Hosting**: Netlify — keep existing deployment platform
- **Content**: Must migrate ~13K existing markdown chapters
- **Build**: Must handle 170MB content without excessive memory/time
- **No auth**: Static site, no server-side user state

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nuxt 4 + Nuxt UI over Astro | Better UI components, Vue ecosystem, SSR/dynamic capability | — Pending |
| Keep Netlify hosting | Already configured, familiar | — Pending |
| Migrate markdown content | 13K chapters of proven content, not starting fresh | — Pending |

---
*Last updated: 2026-02-17 after initialization*
