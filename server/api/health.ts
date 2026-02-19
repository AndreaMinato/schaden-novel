export default defineEventHandler(async () => {
  const start = performance.now()
  try {
    // Query one collection to prove SQLite database is working
    const chapters = await queryCollection('mga').count()
    const latency = Math.round(performance.now() - start)
    return {
      status: 'ok',
      database: 'sqlite',
      connector: 'better-sqlite3',
      latency_ms: latency,
      content_count: chapters,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      status: 'error',
      database: 'sqlite',
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
})
