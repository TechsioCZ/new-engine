import type {
  ICachingModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export type RedisClientDependencies = {
  logger?: Logger
  [Modules.CACHING]?: ICachingModuleService
  [Modules.LOCKING]?: ILockingModule
}

type RedisClientOptions = {
  name?: string
}

type LockOptions = {
  timeout?: number
  allowFallback?: boolean
}

type SetOptions = {
  ttl?: number
  tags?: string[]
}

type CacheValueParser<T> = (value: unknown) => T | undefined

type GetOrSetOptions<T> = {
  parser: CacheValueParser<T>
  ttl?: number | ((value: T) => number)
  tags?: string[]
  lockKey?: string
  lockTimeout?: number
  cacheNull?: false
}

type GetOrSetOptionsWithNull<T> = Omit<
  GetOrSetOptions<T>,
  "ttl" | "cacheNull"
> & {
  parser: CacheValueParser<T>
  ttl?: number | ((value: T | null) => number)
  cacheNull: true
}

const WRAPPED_VALUE_KEY = "__medusa_redis_client_wrapped__"
const WRAPPED_VALUE_VERSION_KEY = "__medusa_redis_client_wrapped_v__"
const WRAPPED_VALUE_VERSION = 1

type WrappedCacheValue = {
  [WRAPPED_VALUE_KEY]: true
  [WRAPPED_VALUE_VERSION_KEY]: number
  value: unknown
}

export class RedisClient {
  private readonly cacheService_: ICachingModuleService | null
  private readonly lockingService_: ILockingModule | null
  private readonly logger_: Logger | null
  private readonly prefix_: string

  constructor(container: RedisClientDependencies, options: RedisClientOptions = {}) {
    this.logger_ = container.logger ?? null
    this.cacheService_ = this.safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )
    this.lockingService_ = this.safeResolve<ILockingModule>(
      container,
      Modules.LOCKING
    )
    this.prefix_ = options.name ? `${options.name}: ` : ""

    if (!(this.cacheService_ && this.lockingService_)) {
      this.logger_?.warn(
        `${this.prefix_}Cache or locking service not available. Using local-only mode (not suitable for multi-container).`
      )
    }
  }

  isCacheAvailable(): boolean {
    return !!this.cacheService_
  }

  async get(key: string): Promise<unknown | null | undefined> {
    if (!this.cacheService_) {
      return undefined
    }

    try {
      const cached = await this.cacheService_.get({ key })
      if (cached === null || cached === undefined) {
        return undefined
      }
      return this.unwrapCacheValue(cached)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_?.warn(`${this.prefix_}Cache read failed: ${message}`)
      return undefined
    }
  }

  async set<T>(key: string, data: T, options: SetOptions = {}): Promise<void> {
    if (!this.cacheService_) {
      return
    }

    try {
      const payload: {
        key: string
        data: object
        ttl?: number
        tags?: string[]
      } = {
        key,
        data: this.wrapCacheValue(data),
      }

      if (options.ttl !== undefined) {
        payload.ttl = options.ttl
      }

      if (options.tags && options.tags.length > 0) {
        payload.tags = options.tags
      }

      await this.cacheService_.set(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_?.warn(`${this.prefix_}Cache write failed: ${message}`)
    }
  }

  async clearByKey(key: string): Promise<void> {
    if (!this.cacheService_) {
      return
    }

    try {
      await this.cacheService_.clear({ key })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_?.warn(`${this.prefix_}Cache clear failed: ${message}`)
    }
  }

  async clearByTags(tags: string[]): Promise<void> {
    if (!this.cacheService_ || tags.length === 0) {
      return
    }

    try {
      await this.cacheService_.clear({ tags })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_?.warn(`${this.prefix_}Cache clear failed: ${message}`)
    }
  }

  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    if (!this.lockingService_) {
      return fn()
    }

    const allowFallback = options.allowFallback ?? true

    let started = false
    try {
      const wrappedFn = async () => {
        started = true
        return fn()
      }

      return await this.lockingService_.execute(lockKey, wrappedFn, {
        timeout: options.timeout ?? 5,
      })
    } catch (error) {
      if (allowFallback && !started) {
        this.logger_?.warn(
          `${this.prefix_}Cache lock not acquired, using local fallback`
        )
        return fn()
      }
      throw error
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: GetOrSetOptions<T>
  ): Promise<T>
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: GetOrSetOptionsWithNull<T>
  ): Promise<T | null>
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: GetOrSetOptions<T> | GetOrSetOptionsWithNull<T>
  ): Promise<T | null> {
    const parseCachedValue = (cached: unknown): T | null | undefined => {
      if (cached === undefined) {
        return undefined
      }

      if (cached === null) {
        return options.cacheNull ? null : undefined
      }

      const parsed = options.parser(cached)
      if (parsed === undefined) {
        this.logger_?.warn(
          `${this.prefix_}Cache value validation failed for key: ${key}`
        )
        return undefined
      }

      return parsed
    }

    const cached = parseCachedValue(await this.get(key))
    if (cached !== undefined && (cached !== null || options.cacheNull)) {
      return cached
    }

    const run = async (): Promise<T | null> => {
      const cachedAfterLock = parseCachedValue(await this.get(key))
      if (
        cachedAfterLock !== undefined &&
        (cachedAfterLock !== null || options.cacheNull)
      ) {
        return cachedAfterLock
      }

      const value = await fetcher()
      const shouldCache = options.cacheNull
        ? value !== undefined
        : value !== null && value !== undefined

      if (shouldCache) {
        let ttl: number | undefined
        if (typeof options.ttl === "function") {
          if (value === null) {
            ttl = options.cacheNull ? options.ttl(value) : undefined
          } else {
            ttl = options.ttl(value)
          }
        } else {
          ttl = options.ttl
        }
        await this.set(key, value, { ttl, tags: options.tags })
      }

      return value
    }

    if (!options.lockKey) {
      return run()
    }

    return this.withLock<T | null>(options.lockKey, run, {
      timeout: options.lockTimeout,
    })
  }

  private safeResolve<T>(
    container: RedisClientDependencies,
    key: string
  ): T | null {
    try {
      if (key === "logger") {
        const value = container.logger
        return value == null ? null : (value as T)
      }

      if (key === Modules.CACHING) {
        const value = container[Modules.CACHING]
        return value == null ? null : (value as T)
      }

      if (key === Modules.LOCKING) {
        const value = container[Modules.LOCKING]
        return value == null ? null : (value as T)
      }

      return null
    } catch {
      return null
    }
  }

  private wrapCacheValue(value: unknown): object {
    const wrapped: WrappedCacheValue = {
      [WRAPPED_VALUE_KEY]: true,
      [WRAPPED_VALUE_VERSION_KEY]: WRAPPED_VALUE_VERSION,
      value,
    }
    return wrapped
  }

  private unwrapCacheValue(value: unknown): unknown {
    if (
      value &&
      typeof value === "object" &&
      (value as WrappedCacheValue)[WRAPPED_VALUE_KEY] === true &&
      (value as WrappedCacheValue)[WRAPPED_VALUE_VERSION_KEY] ===
        WRAPPED_VALUE_VERSION &&
      Object.keys(value).length === 3 &&
      "value" in (value as WrappedCacheValue)
    ) {
      return (value as WrappedCacheValue).value
    }
    return value
  }
}
