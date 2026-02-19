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
      crawlLinks: false,
      routes: [],  // SSR handles all routes — prerendering OOMs loading 13K chapters into memory
    },
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
