interface PromiseCacheEntry<TValue> {
  createdAt: number
  lastAccessAt: number
  value: Promise<TValue>
}

export interface PromiseCacheOptions {
  maxEntries: number
  ttlMs: number
}

export interface PromiseCache<TValue> {
  getOrCreate(key: string, factory: () => Promise<TValue>): Promise<TValue>
}

export function createPromiseCache<TValue>(
  options: PromiseCacheOptions
): PromiseCache<TValue> {
  const { maxEntries, ttlMs } = options
  const entries = new Map<string, PromiseCacheEntry<TValue>>()

  function removeExpiredEntries(now: number) {
    entries.forEach((entry, key) => {
      if (now - entry.createdAt > ttlMs) {
        entries.delete(key)
      }
    })
  }

  function removeLeastRecentlyUsedEntry() {
    let oldestKey: string | null = null
    let oldestTimestamp = Number.POSITIVE_INFINITY

    entries.forEach((entry, key) => {
      if (entry.lastAccessAt < oldestTimestamp) {
        oldestTimestamp = entry.lastAccessAt
        oldestKey = key
      }
    })

    if (oldestKey) {
      entries.delete(oldestKey)
    }
  }

  return {
    async getOrCreate(key: string, factory: () => Promise<TValue>): Promise<TValue> {
      const now = Date.now()
      removeExpiredEntries(now)

      const cached = entries.get(key)
      if (cached) {
        cached.lastAccessAt = now
        return await cached.value
      }

      // Concurrent callers for the same key share this pending request.
      // Rejections are evicted so the next caller can trigger a fresh factory call.
      const request = factory().catch((error) => {
        entries.delete(key)
        throw error
      })

      entries.set(key, {
        createdAt: now,
        lastAccessAt: now,
        value: request,
      })

      if (entries.size > maxEntries) {
        removeLeastRecentlyUsedEntry()
      }

      return await request
    },
  }
}
