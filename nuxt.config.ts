export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  content: {
    experimental: {
      sqliteConnector: 'native',  // Node 22.5+ — avoids better-sqlite3 binding issues
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,  // CRITICAL: prevents discovering 13K chapters
      routes: ['/', '/200.html', '/404.html'],
      concurrency: 4,
    },
  },
  routeRules: {
    '/': { prerender: true },
  },
  compatibilityDate: '2025-07-15',
})
