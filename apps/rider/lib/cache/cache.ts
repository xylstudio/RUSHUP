/**
 * Cache Utilities
 * Client and server-side caching helpers
 */

/**
 * In-memory cache for client-side
 */
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }>
  private maxSize: number

  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  set(key: string, data: any, ttlMs = 5 * 60 * 1000) {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)

    if (!item) return null

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

// Singleton instance
export const memoryCache = new MemoryCache()

/**
 * LocalStorage cache with expiry
 */
export const localStorageCache = {
  set(key: string, data: any, ttlMs = 5 * 60 * 1000) {
    if (typeof window === 'undefined') return

    try {
      const item = {
        data,
        expiry: Date.now() + ttlMs,
      }
      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null

      const item = JSON.parse(itemStr)

      // Check if expired
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
      return null
    }
  },

  delete(key: string) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  },

  clear() {
    if (typeof window === 'undefined') return
    localStorage.clear()
  },
}

/**
 * Cache wrapper for async functions
 */
export function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number
    storage?: 'memory' | 'localStorage'
  } = {}
): Promise<T> {
  const { ttl = 5 * 60 * 1000, storage = 'memory' } = options
  const cache = storage === 'localStorage' ? localStorageCache : memoryCache

  // Check cache first
  const cached = cache.get(key)
  if (cached !== null) {
    return Promise.resolve(cached)
  }

  // Fetch and cache
  return fetchFn().then(data => {
    cache.set(key, data, ttl)
    return data
  })
}

/**
 * Generate cache key from params
 */
export function getCacheKey(base: string, params?: Record<string, any>): string {
  if (!params) return base

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('|')

  return `${base}:${sortedParams}`
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern: string) {
  // For memory cache
  const keysToDelete: string[] = []
  memoryCache['cache'].forEach((_value, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => memoryCache.delete(key))

  // For localStorage
  if (typeof window !== 'undefined') {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key)
      }
    })
  }
}
