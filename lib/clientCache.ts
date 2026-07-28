'use client'

// Simple client-side cache to persist data across page navigations
// Since Next.js does client-side transitions, this module's state remains in memory.

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache: Record<string, CacheEntry<any>> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes default TTL

export const clientCache = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    const entry = cache[key]
    if (!entry) return null
    
    // Check if cache has expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete cache[key]
      return null
    }
    return entry.data as T
  },

  set<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return
    cache[key] = {
      data,
      timestamp: Date.now()
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return
    for (const key in cache) {
      delete cache[key]
    }
  }
}
