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
