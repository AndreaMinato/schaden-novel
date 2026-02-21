export default defineNuxtConfig({
  modules: ['@nuxtjs/sitemap', '@nuxt/content', '@nuxt/ui'],
  spaLoadingTemplate: true,
  css: ['~/assets/css/main.css'],
  site: {
    url: 'https://schaden-novel.netlify.app',
  },
  sitemap: {
    sitemaps: {
      pages: {
        urls: [
          '/', '/novels',
          '/novels/mga', '/novels/atg', '/novels/overgeared', '/novels/tmw',
          '/novels/htk', '/novels/issth', '/novels/cd', '/novels/lrg',
          '/novels/mw', '/novels/rtw',
        ],
        exclude: ['/novels/*/*'],
      },
      mga: { sources: ['/api/__sitemap__/urls'], include: ['/novels/mga/**'] },
      atg: { sources: ['/api/__sitemap__/urls'], include: ['/novels/atg/**'] },
      overgeared: { sources: ['/api/__sitemap__/urls'], include: ['/novels/overgeared/**'] },
      tmw: { sources: ['/api/__sitemap__/urls'], include: ['/novels/tmw/**'] },
      htk: { sources: ['/api/__sitemap__/urls'], include: ['/novels/htk/**'] },
      issth: { sources: ['/api/__sitemap__/urls'], include: ['/novels/issth/**'] },
      cd: { sources: ['/api/__sitemap__/urls'], include: ['/novels/cd/**'] },
      lrg: { sources: ['/api/__sitemap__/urls'], include: ['/novels/lrg/**'] },
      mw: { sources: ['/api/__sitemap__/urls'], include: ['/novels/mw/**'] },
      rtw: { sources: ['/api/__sitemap__/urls'], include: ['/novels/rtw/**'] },
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
        '/novels',
        '/rss.xml',
        '/novels/mga', '/novels/atg', '/novels/overgeared', '/novels/tmw',
        '/novels/htk', '/novels/issth', '/novels/cd', '/novels/lrg',
        '/novels/mw', '/novels/rtw',
        '/novels/atg/rss.xml', '/novels/cd/rss.xml', '/novels/htk/rss.xml',
        '/novels/issth/rss.xml', '/novels/lrg/rss.xml', '/novels/mga/rss.xml',
        '/novels/mw/rss.xml', '/novels/overgeared/rss.xml', '/novels/rtw/rss.xml',
        '/novels/tmw/rss.xml',
      ],
      concurrency: 4,
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
