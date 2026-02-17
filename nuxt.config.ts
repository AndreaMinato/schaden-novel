import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Read actual chapter filenames for prerender routes (avoids hardcoded ranges)
function getChapterSlugs(novel: string): string[] {
  try {
    const dir = resolve('content', novel)
    return readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
  } catch {
    return []
  }
}

export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  content: {
    experimental: {
      sqliteConnector: 'native',  // Node 22.5+ — avoids better-sqlite3 binding issues
    },
    watch: {
      enabled: false,  // Disable content watching — 13K files in src/ cause EMFILE on dev server
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,  // CRITICAL: prevents discovering 13K chapters
      routes: ['/', '/200.html', '/404.html'],
      concurrency: 4,
    },
    hooks: {
      'prerender:routes': function (routes: Set<string>) {
        // Prerender all lrg chapters from actual filenames
        for (const slug of getChapterSlugs('lrg')) {
          routes.add(`/novels/lrg/${slug}`)
        }
        // Prerender first ~500 mga chapters for benchmark
        const mgaSlugs = getChapterSlugs('mga')
          .map(Number)
          .filter(n => !isNaN(n) && n <= 500)
        for (const slug of mgaSlugs) {
          routes.add(`/novels/mga/${slug}`)
        }
        // Novel index pages
        routes.add('/novels/lrg')
        routes.add('/novels/mga')
      },
    },
  },
  routeRules: {
    '/': { prerender: true },
  },
  vite: {
    server: {
      watch: {
        // Ignore old Astro content (13K files) to avoid EMFILE on dev server
        ignored: ['**/src/**', '**/tmp/**', '**/build-cache/**'],
      },
    },
  },
  compatibilityDate: '2025-07-15',
})
