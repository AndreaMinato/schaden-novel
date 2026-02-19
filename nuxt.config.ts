export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap', '@netlify/nuxt'],
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
    database: {
      type: 'sqlite',
      filename: ':memory:',
    },
    experimental: {
      sqliteConnector: 'better-sqlite3',  // node:sqlite unavailable on AWS Lambda
    },
    watch: {
      enabled: false,  // Disable content watching — 13K chapter files cause EMFILE on dev server
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,  // CRITICAL: prevents discovering 13K chapters
      routes: [
        '/', '/404.html',
        '/rss.xml',
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
