const STORAGE_KEY = 'schaden-reading-progress'

export function useReadingProgress() {
  function save(novel: string, chapterPath: string) {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const data = raw ? JSON.parse(raw) : {}
      data[novel] = chapterPath
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Silently fail — localStorage may be unavailable
    }
  }

  function get(novel: string): string | null {
    if (!import.meta.client) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const data = raw ? JSON.parse(raw) : {}
      return data[novel] || null
    } catch {
      return null
    }
  }

  function getAll(): Record<string, string> {
    if (!import.meta.client) return {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  return { save, get, getAll }
}
