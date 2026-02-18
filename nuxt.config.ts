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
  modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap'],
  css: ['~/assets/css/main.css'],
  site: {
    url: 'https://schaden-novel.netlify.app',
  },
  sitemap: {
    sitemaps: {
      pages: {
        include: ['/', '/novels', '/novels/*'],
        exclude: ['/novels/*/*'],
      },
      mga: { include: ['/novels/mga/**'] },
      atg: { include: ['/novels/atg/**'] },
      overgeared: { include: ['/novels/overgeared/**'] },
      tmw: { include: ['/novels/tmw/**'] },
      htk: { include: ['/novels/htk/**'] },
      issth: { include: ['/novels/issth/**'] },
      cd: { include: ['/novels/cd/**'] },
      lrg: { include: ['/novels/lrg/**'] },
      mw: { include: ['/novels/mw/**'] },
      rtw: { include: ['/novels/rtw/**'] },
    },
  },
  content: {
    experimental: {
      sqliteConnector: 'native',  // Node 22.5+ — avoids better-sqlite3 binding issues
    },
    watch: {
      enabled: false,  // Disable content watching — 13K chapter files cause EMFILE on dev server
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,  // CRITICAL: prevents discovering 13K chapters
      routes: [
        '/', '/200.html', '/404.html',
        '/rss.xml',
        '/novels/atg/rss.xml', '/novels/cd/rss.xml', '/novels/htk/rss.xml',
        '/novels/issth/rss.xml', '/novels/lrg/rss.xml', '/novels/mga/rss.xml',
        '/novels/mw/rss.xml', '/novels/overgeared/rss.xml', '/novels/rtw/rss.xml',
        '/novels/tmw/rss.xml',
      ],
      concurrency: 4,
    },
    hooks: {
      'prerender:routes': function (routes: Set<string>) {
        const novels = ['atg', 'cd', 'htk', 'issth', 'lrg', 'mga', 'mw', 'overgeared', 'rtw', 'tmw']
        for (const novel of novels) {
          routes.add(`/novels/${novel}`)
          for (const slug of getChapterSlugs(novel)) {
            routes.add(`/novels/${novel}/${slug}`)
          }
        }
      },
    },
  },
  routeRules: {
    '/': { prerender: true },
  },
  ignore: [],
  vite: {
    server: {
      watch: {
        ignored: [
          '**/content/**',
          '**/tmp/**', '**/build-cache/**', '**/.planning/**',
          '**/.astro/**', '**/.frontmatter/**',
        ],
      },
    },
  },
  compatibilityDate: '2025-07-15',
})
