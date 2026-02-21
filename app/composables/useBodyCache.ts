// Body cache with LRU eviction and next-chapter prefetch
// Module-level state: singleton across SPA navigations, lost on refresh

const MAX_ENTRIES = 5
const cache = new Map<string, any>()
const inflight = new Map<string, Promise<any>>()

/** LRU touch: delete + re-insert at end, evict oldest if over limit */
function touch(key: string, value: any): void {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > MAX_ENTRIES) {
    // Map iterator yields in insertion order; first key is oldest (LRU)
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

/** Consistent URL builder for cache keys */
export function bodyUrl(novel: string, slug: string): string {
  return `/content/novels/${novel}/${slug}.json`
}

export function useBodyCache() {
  /** Return cached value (touch to mark recently used) or null */
  function get(url: string): any | null {
    const value = cache.get(url)
    if (value !== undefined) {
      touch(url, value)
      return value
    }
    return null
  }

  /** Store in cache with LRU touch */
  function set(url: string, data: any): void {
    touch(url, data)
  }

  /** Prefetch a URL into cache. Silent failure. Skips if cached or inflight. */
  function prefetch(url: string): Promise<void> {
    if (cache.has(url) || inflight.has(url)) return Promise.resolve()

    const promise = $fetch(url)
      .then((data) => {
        touch(url, data)
      })
      .catch(() => {
        // Silent failure -- prefetch is best-effort
      })
      .finally(() => {
        inflight.delete(url)
      })

    inflight.set(url, promise)
    return promise
  }

  /** Cache-aware fetch: check cache, await inflight, or fresh $fetch */
  async function getOrFetch(url: string): Promise<any> {
    // Check cache first (instant)
    const cached = cache.get(url)
    if (cached !== undefined) {
      touch(url, cached)
      return cached
    }

    // Await in-flight prefetch if exists (avoids duplicate request)
    const pending = inflight.get(url)
    if (pending) {
      await pending
      // Prefetch should have stored it -- return from cache
      const afterPrefetch = cache.get(url)
      if (afterPrefetch !== undefined) {
        touch(url, afterPrefetch)
        return afterPrefetch
      }
    }

    // Fresh fetch
    const data = await $fetch(url)
    touch(url, data)
    return data
  }

  return { get, set, prefetch, getOrFetch }
}
