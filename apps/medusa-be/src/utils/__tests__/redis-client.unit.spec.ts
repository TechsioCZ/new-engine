import { Modules } from "@medusajs/framework/utils"
import { RedisClient } from "../redis-client"

type CacheStore = Map<string, unknown>

function createCacheService(store: CacheStore) {
  return {
    get: jest.fn(async ({ key }: { key: string }) =>
      store.has(key) ? store.get(key) : null
    ),
    set: jest.fn(async ({ key, data }: { key: string; data: unknown }) => {
      store.set(key, data)
    }),
    clear: jest.fn(async () => {}),
  }
}

function createLockingService() {
  return {
    execute: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  }
}

function createRedisClient(store = new Map<string, unknown>()) {
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  const cacheService = createCacheService(store)
  const lockingService = createLockingService()

  const client = new RedisClient({
    logger: logger as any,
    [Modules.CACHING]: cacheService as any,
    [Modules.LOCKING]: lockingService as any,
  })

  return {
    client,
    logger,
    cacheService,
    lockingService,
    store,
  }
}

describe("RedisClient", () => {
  it("warns and runs in local-only mode when cache/locking services are unavailable", async () => {
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }

    const client = new RedisClient({ logger: logger as any })

    expect(client.isCacheAvailable()).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cache or locking service not available")
    )

    await expect(
      client.withLock("key", async () => "ok", { timeout: 1 })
    ).resolves.toBe("ok")
  })

  it("refetches when cached value does not pass parser validation", async () => {
    const { client, logger, store } = createRedisClient()
    store.set("company-check:test-key", { corrupted: true })

    const fetcher = jest.fn(async () => ({ value: "fresh" }))
    const parser = (value: unknown): { value: string } | undefined => {
      if (
        value &&
        typeof value === "object" &&
        "value" in value &&
        typeof (value as { value: unknown }).value === "string"
      ) {
        return value as { value: string }
      }

      return undefined
    }

    const first = await client.getOrSet("company-check:test-key", fetcher, {
      parser,
      ttl: 60,
    })
    const second = await client.getOrSet("company-check:test-key", fetcher, {
      parser,
      ttl: 60,
    })

    expect(first).toEqual({ value: "fresh" })
    expect(second).toEqual({ value: "fresh" })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cache value validation failed")
    )
  })

  it("supports cacheNull with ttl callback receiving null values", async () => {
    const { client, cacheService } = createRedisClient()
    const fetcher = jest.fn(async () => null)
    const ttl = jest.fn((value: string | null) => (value === null ? 45 : 90))

    const first = await client.getOrSet("company-check:null-key", fetcher as any, {
      parser: (value: unknown) => (typeof value === "string" ? value : undefined),
      cacheNull: true,
      ttl,
    })
    const second = await client.getOrSet("company-check:null-key", fetcher as any, {
      parser: (value: unknown) => (typeof value === "string" ? value : undefined),
      cacheNull: true,
      ttl,
    })

    expect(first).toBeNull()
    expect(second).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(ttl).toHaveBeenCalledWith(null)
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:null-key",
        ttl: 45,
      })
    )
  })

  it("round-trips primitive values through wrapping/unwrapping", async () => {
    const { client } = createRedisClient()

    await client.set("company-check:primitive-key", 123, { ttl: 30 })
    const cached = await client.get("company-check:primitive-key")

    expect(cached).toBe(123)
  })

  it("does not unwrap user objects that match wrapper sentinel keys", async () => {
    const { client } = createRedisClient()
    const userObject = {
      __medusa_redis_client_wrapped__: true,
      __medusa_redis_client_wrapped_v__: 1,
      value: { from: "user" },
    }

    await client.set("company-check:sentinel-object-key", userObject, { ttl: 30 })
    const cached = await client.get("company-check:sentinel-object-key")

    expect(cached).toEqual(userObject)
  })

  it("handles cache operation errors gracefully and logs warnings", async () => {
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }
    const cacheService = {
      get: jest.fn(async () => {
        throw new Error("read failed")
      }),
      set: jest.fn(async () => {
        throw new Error("write failed")
      }),
      clear: jest.fn(async () => {
        throw new Error("clear failed")
      }),
    }
    const lockingService = createLockingService()

    const client = new RedisClient({
      logger: logger as any,
      [Modules.CACHING]: cacheService as any,
      [Modules.LOCKING]: lockingService as any,
    })

    await expect(client.get("k")).resolves.toBeUndefined()
    await expect(client.set("k", 1, { ttl: 10 })).resolves.toBeUndefined()
    await expect(client.clearByKey("k")).resolves.toBeUndefined()
    await expect(client.clearByTags(["tag"])).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cache read failed")
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cache write failed")
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cache clear failed")
    )
  })

  it("falls back to local execution when lock acquisition fails before start", async () => {
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }
    const cacheService = createCacheService(new Map())
    const lockingService = {
      execute: jest.fn(async () => {
        throw new Error("lock unavailable")
      }),
    }
    const client = new RedisClient({
      logger: logger as any,
      [Modules.CACHING]: cacheService as any,
      [Modules.LOCKING]: lockingService as any,
    })

    const result = await client.withLock("lock-key", async () => "local")

    expect(result).toBe("local")
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Cache lock not acquired")
    )
  })

  it("rethrows lock errors when fallback is disabled or step already started", async () => {
    const cacheService = createCacheService(new Map())
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }

    const noFallbackClient = new RedisClient({
      logger: logger as any,
      [Modules.CACHING]: cacheService as any,
      [Modules.LOCKING]: {
        execute: jest.fn(async () => {
          throw new Error("lock failed")
        }),
      } as any,
    })

    await expect(
      noFallbackClient.withLock("lock", async () => "x", {
        allowFallback: false,
      })
    ).rejects.toThrow("lock failed")

    const startedThenFailedClient = new RedisClient({
      logger: logger as any,
      [Modules.CACHING]: cacheService as any,
      [Modules.LOCKING]: {
        execute: jest.fn(async (_key: string, fn: () => Promise<unknown>) => {
          await fn()
          throw new Error("failed after start")
        }),
      } as any,
    })

    await expect(
      startedThenFailedClient.withLock("lock", async () => "x")
    ).rejects.toThrow("failed after start")
  })

  it("no-ops cache operations when cache service is unavailable", async () => {
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }
    const client = new RedisClient({ logger: logger as any })

    await expect(client.get("k")).resolves.toBeUndefined()
    await expect(client.set("k", 123, { ttl: 10, tags: ["tag"] })).resolves.toBeUndefined()
    await expect(client.clearByKey("k")).resolves.toBeUndefined()
  })

  it("sets tags when non-empty tags are provided", async () => {
    const { client, cacheService } = createRedisClient()

    await client.set("company-check:tags-key", { value: 1 }, {
      ttl: 30,
      tags: ["company-check", "vat"],
    })

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:tags-key",
        ttl: 30,
        tags: ["company-check", "vat"],
      })
    )
  })

  it("does not call clearByTags when no tags are provided", async () => {
    const { client, cacheService } = createRedisClient()

    await client.clearByTags([])

    expect(cacheService.clear).not.toHaveBeenCalled()
  })

  it("returns cached value populated while lock is held and skips fetcher", async () => {
    const store = new Map<string, unknown>()
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }
    const cacheService = createCacheService(store)
    const lockingService = {
      execute: jest.fn(async (_key: string, fn: () => Promise<unknown>) => {
        store.set("company-check:lock-filled-key", {
          __medusa_redis_client_wrapped__: true,
          __medusa_redis_client_wrapped_v__: 1,
          value: "from-lock-cache",
        })
        return fn()
      }),
    }

    const client = new RedisClient({
      logger: logger as any,
      [Modules.CACHING]: cacheService as any,
      [Modules.LOCKING]: lockingService as any,
    })
    const fetcher = jest.fn(async () => "from-fetcher")

    const value = await client.getOrSet("company-check:lock-filled-key", fetcher, {
      lockKey: "company-check:lock:key",
      parser: (cached) => (typeof cached === "string" ? cached : undefined),
    })

    expect(value).toBe("from-lock-cache")
    expect(fetcher).not.toHaveBeenCalled()
    expect(lockingService.execute).toHaveBeenCalledTimes(1)
  })

  it("invokes ttl callback with non-null values", async () => {
    const { client, cacheService } = createRedisClient()
    const ttl = jest.fn((value: string) => (value.length > 0 ? 90 : 0))

    const value = await client.getOrSet(
      "company-check:ttl-value-key",
      async () => "resolved-value",
      {
        parser: (cached) => (typeof cached === "string" ? cached : undefined),
        ttl,
      }
    )

    expect(value).toBe("resolved-value")
    expect(ttl).toHaveBeenCalledWith("resolved-value")
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:ttl-value-key",
        ttl: 90,
      })
    )
  })

  it("covers safeResolve logger, unknown key, and exception fallback paths", () => {
    const logger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }
    const client = new RedisClient({ logger: logger as any })

    expect((client as any).safeResolve({ logger }, "logger")).toBe(logger)
    expect((client as any).safeResolve({}, "unknown-key")).toBeNull()

    const throwingContainer = new Proxy(
      {},
      {
        get() {
          throw new Error("container access failed")
        },
      }
    )
    expect((client as any).safeResolve(throwingContainer, Modules.CACHING)).toBeNull()
  })
})
