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
