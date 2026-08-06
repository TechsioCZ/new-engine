import { MedusaError, Modules } from "@medusajs/framework/utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Import after mocks
import type { PplClient } from "../../../../../src/modules/ppl-client/client"
import { PplClientModuleService } from "../../../../../src/modules/ppl-client/service"

type FirstOverload<T> = T extends {
  (...args: infer A1): infer R1
  (...args: infer _A2): infer _R2
}
  ? (...args: A1) => R1
  : never

/**
 * `updatePplConfigs` is a generated MedusaService CRUD method with a single-
 * item and an array overload. TypeScript utility types (`Parameters`,
 * `ReturnType`) resolve overloaded members to the last-declared signature, so
 * `vi.spyOn` sees the array overload. This narrows the reference to the
 * single-item overload before spying, without any unsafe cast.
 */
const asSingleUpdatePplConfigs = (
  service: PplClientModuleService,
): {
  updatePplConfigs: FirstOverload<PplClientModuleService["updatePplConfigs"]>
} => service

const { mockPplClient } = vi.hoisted(() => ({
  mockPplClient: {
    cancelShipment: vi.fn<PplClient["cancelShipment"]>(),
    createShipmentBatch: vi.fn<PplClient["createShipmentBatch"]>(),
    downloadLabel: vi.fn<PplClient["downloadLabel"]>(),
    fetchNewToken: vi.fn<PplClient["fetchNewToken"]>(),
    getAccessPoints: vi.fn<PplClient["getAccessPoints"]>(),
    getBatchStatus: vi.fn<PplClient["getBatchStatus"]>(),
    getCodelistCountries: vi.fn<PplClient["getCodelistCountries"]>(),
    getCodelistCurrencies: vi.fn<PplClient["getCodelistCurrencies"]>(),
    getCodelistProducts: vi.fn<PplClient["getCodelistProducts"]>(),
    getCodelistServices: vi.fn<PplClient["getCodelistServices"]>(),
    getCodelistStatuses: vi.fn<PplClient["getCodelistStatuses"]>(),
    getCustomerAddresses: vi.fn<PplClient["getCustomerAddresses"]>(),
    getCustomerInfo: vi.fn<PplClient["getCustomerInfo"]>(),
    getShipmentInfo: vi.fn<PplClient["getShipmentInfo"]>(),
  },
}))

// Mock the client before importing service
vi.mock(import("../../../../../src/modules/ppl-client/client"), () => ({
  PplClient: vi.fn<() => typeof mockPplClient>(() => mockPplClient),
}))

type FieldsCodecImpl = (
  data: Record<string, unknown>,
  fields: readonly PropertyKey[],
) => Record<string, unknown>

/**
 * `vi.fn<T>()` collapses `encryptFields`/`decryptFields`'s generic
 * `<T extends Record<string, unknown>>(data: T, fields: (keyof T)[]) => T`
 * signature to one concrete call signature, which TypeScript then rejects
 * as a module-factory replacement (the real export must return exactly the
 * caller's own `T`, not a widened `Record<string, unknown>`). These
 * adapters satisfy the real generic export by keeping `data` (already
 * statically typed `T`) as the returned value and using the tracked mock
 * only as a call-recording side effect, so no cast back to `T` is needed.
 * Test code asserts on the tracked mock (`mockEncryptFields`) directly
 * instead of on the re-exported generic function. `decryptFields` has no
 * assertions in this suite, so only its adapter (not its inner mock) is
 * exported.
 */
const { decryptFields, encryptFields, mockEncryptFields } = vi.hoisted(() => {
  const hoistedMockEncryptFields = vi.fn<FieldsCodecImpl>((data) => ({
    ...data,
    _encrypted: true,
  }))
  const hoistedMockDecryptFields = vi.fn<FieldsCodecImpl>((data) => ({
    ...data,
    _decrypted: true,
  }))
  const encryptFieldsAdapter = <T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
  ): T => {
    // `data` is already statically typed `T`; the mock call below is a
    // tracked side effect only, so its widened `Record<string, unknown>`
    // return value is discarded instead of cast back to `T`.
    hoistedMockEncryptFields(data, fields)
    return data
  }
  const decryptFieldsAdapter = <T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[],
  ): T => {
    hoistedMockDecryptFields(data, fields)
    return data
  }
  return {
    decryptFields: decryptFieldsAdapter,
    encryptFields: encryptFieldsAdapter,
    mockEncryptFields: hoistedMockEncryptFields,
  }
})

// Mock encryption utilities
vi.mock(import("../../../../../src/utils/encryption"), () => ({
  decryptFields,
  encryptFields,
}))

type InjectedDependencies = ConstructorParameters<
  typeof PplClientModuleService
>[0]
type PplLogger = InjectedDependencies["logger"]
type PplCachingService = NonNullable<
  InjectedDependencies[typeof Modules.CACHING]
>
type PplLockingService = NonNullable<
  InjectedDependencies[typeof Modules.LOCKING]
>

const mockCacheService = {
  clear: vi.fn<PplCachingService["clear"]>(),
  computeKey: vi.fn<PplCachingService["computeKey"]>(),
  computeTags: vi.fn<PplCachingService["computeTags"]>(),
  get: vi.fn<PplCachingService["get"]>(),
  set: vi.fn<PplCachingService["set"]>(),
}

const mockLockingService = {
  acquire: vi.fn<PplLockingService["acquire"]>(),
  execute: vi
    .fn<PplLockingService["execute"]>()
    .mockImplementation(async (_key, fn) => await fn()),
  release: vi.fn<PplLockingService["release"]>(),
  releaseAll: vi.fn<PplLockingService["releaseAll"]>(),
}

/**
 * `vi.fn<T>()` erases a generic method's type parameter, so
 * `mockLockingService.execute` resolves as `Promise<unknown>` rather than
 * the real `execute<T>(...): Promise<T>`'s `Promise<T>`. `T` no longer
 * exists at runtime once the mock resolves (there is nothing left to
 * check), so this assertion signature documents that erasure instead of
 * using an `as` cast to bridge the two. `T` is inferred from `witness`
 * (the caller's own `job`) rather than passed explicitly, so it is not a
 * redundant type parameter.
 */
const assertResolvesTo: <T>(
  value: unknown,
  witness: () => Promise<T>,
) => asserts value is T = () => {
  // Intentionally empty: `T` is a type-only bridge over an erased mock
  // return value, not a runtime-checkable invariant.
}

/**
 * Satisfies the real generic `ILockingModule` shape by delegating every
 * call to the tracked `mockLockingService`, so test assertions on
 * `mockLockingService` keep working unchanged.
 */
const toLockingModule = (
  locking: typeof mockLockingService,
): PplLockingService => ({
  acquire: async (keys, args, sharedContext) => {
    await locking.acquire(keys, args, sharedContext)
  },
  execute: async (keys, job, args, sharedContext) => {
    const result = await locking.execute(keys, job, args, sharedContext)
    assertResolvesTo(result, job)
    return result
  },
  release: async (keys, args, sharedContext) =>
    await locking.release(keys, args, sharedContext),
  releaseAll: async (args, sharedContext) => {
    await locking.releaseAll(args, sharedContext)
  },
})

const mockLogger = {
  activity: vi.fn<PplLogger["activity"]>(),
  debug: vi.fn<PplLogger["debug"]>(),
  error: vi.fn<PplLogger["error"]>(),
  failure: vi.fn<PplLogger["failure"]>(),
  http: vi.fn<PplLogger["http"]>(),
  info: vi.fn<PplLogger["info"]>(),
  log: vi.fn<PplLogger["log"]>(),
  panic: vi.fn<PplLogger["panic"]>(),
  progress: vi.fn<PplLogger["progress"]>(),
  setLogLevel: vi.fn<PplLogger["setLogLevel"]>(),
  shouldLog: vi.fn<PplLogger["shouldLog"]>(),
  silly: vi.fn<PplLogger["silly"]>(),
  success: vi.fn<PplLogger["success"]>(),
  unsetLogLevel: vi.fn<PplLogger["unsetLogLevel"]>(),
  verbose: vi.fn<PplLogger["verbose"]>(),
  warn: vi.fn<PplLogger["warn"]>(),
}

const validOptions = {
  environment: "testing" as const,
}

const mockEffectiveConfig = {
  client_id: "test-client-id",
  client_secret: "test-client-secret",
  default_label_format: "Pdf" as const,
  environment: "testing" as const,
}

/** Factory for mock PplConfigDTO objects */
const createMockConfig = (
  overrides: Partial<{
    id: string
    environment: "testing" | "production"
    is_enabled: boolean
    client_id: string | null
    client_secret: string | null
    default_label_format: string
    cod_bank_account: string | null
    cod_bank_code: string | null
    cod_iban: string | null
    cod_swift: string | null
    sender_name: string | null
    sender_street: string | null
    sender_city: string | null
    sender_zip_code: string | null
    sender_country: string | null
    sender_phone: string | null
    sender_email: string | null
  }> = {},
) => ({
  client_id: "id",
  client_secret: "secret",
  cod_bank_account: null,
  cod_bank_code: null,
  cod_iban: null,
  cod_swift: null,
  created_at: new Date(),
  default_label_format: "Pdf",
  deleted_at: null,
  environment: "testing" as const,
  id: "config-1",
  is_enabled: true,
  sender_city: null,
  sender_country: null,
  sender_email: null,
  sender_name: null,
  sender_phone: null,
  sender_street: null,
  sender_zip_code: null,
  updated_at: new Date(),
  ...overrides,
})

const createContainer = (
  cacheService: typeof mockCacheService | null = mockCacheService,
  lockingService: typeof mockLockingService | null = mockLockingService,
): InjectedDependencies => {
  const container: InjectedDependencies = { logger: mockLogger }
  if (cacheService) {
    container[Modules.CACHING] = cacheService
  }
  if (lockingService) {
    container[Modules.LOCKING] = toLockingModule(lockingService)
  }
  return container
}

const createService = (
  options = validOptions,
  cacheService: typeof mockCacheService | null = mockCacheService,
  lockingService: typeof mockLockingService | null = mockLockingService,
) => {
  const service = new PplClientModuleService(
    createContainer(cacheService, lockingService),
    options,
  )
  // Mock getEffectiveConfig by default to bypass DB dependency.
  // Tests that need to test config behavior should override this.
  vi.spyOn(service, "getEffectiveConfig").mockResolvedValue(mockEffectiveConfig)
  return service
}

describe(PplClientModuleService, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear mockResolvedValueOnce queue (clearAllMocks doesn't do this)
    mockCacheService.get.mockReset()
    mockLockingService.execute.mockReset()
    mockLockingService.execute.mockImplementation(
      async (_key, fn) => await fn(),
    )
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("constructor", () => {
    it("handles optional dependency resolution errors gracefully", () => {
      const container: InjectedDependencies = {
        logger: mockLogger,
      }
      Object.defineProperty(container, Modules.CACHING, {
        get() {
          throw new Error("cache resolution failed")
        },
      })
      Object.defineProperty(container, Modules.LOCKING, {
        get() {
          throw new Error("locking resolution failed")
        },
      })

      const service = new PplClientModuleService(container, validOptions)

      expect(service).toBeInstanceOf(PplClientModuleService)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "PPL: Cache or locking service not available. Using local-only mode (not suitable for multi-container).",
      )
    })
  })

  describe("token management", () => {
    it("returns cached token when valid and not expired", async () => {
      const futureExpiry = Date.now() + 120_000
      // 2 minutes from now
      mockCacheService.get
        .mockResolvedValueOnce(null)
        // rate limit - acquireRateLimitSlot first
        .mockResolvedValueOnce({
          accessToken: "cached-token",
          expiresAt: futureExpiry,
        })
      // token

      const service = createService()
      await service.createShipmentBatch([])

      expect(mockPplClient.fetchNewToken).not.toHaveBeenCalled()
      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith(
        "cached-token",
        [],
        undefined,
      )
    })

    it("fetches new token when cached token expired", async () => {
      const pastExpiry = Date.now() - 1000
      mockCacheService.get
        .mockResolvedValueOnce(null)
        // rate limit for shipment
        .mockResolvedValueOnce({
          accessToken: "old-token",
          expiresAt: pastExpiry,
        })
        // expired token
        .mockResolvedValueOnce(null)
      // rate limit for token fetch

      mockPplClient.fetchNewToken.mockResolvedValue({
        accessToken: "new-token",
        expiresAt: Date.now() + 1_800_000,
      })

      const service = createService()
      await service.createShipmentBatch([])

      expect(mockPplClient.fetchNewToken).toHaveBeenCalledWith()
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: "ppl:oauth:token" }),
      )
    })

    it("uses local fallback when Redis unavailable", async () => {
      // MIN_REQUEST_INTERVAL_MS = 40 in service.ts
      const MIN_INTERVAL = 40
      const fixedNow = new Date("2025-01-15T12:00:00Z").getTime()
      vi.setSystemTime(fixedNow)

      mockPplClient.fetchNewToken.mockResolvedValue({
        accessToken: "fallback-token",
        expiresAt: fixedNow + 1_800_000,
      })

      const service = createService(validOptions, null, null)
      // createShipmentBatch calls acquireRateLimitSlot twice:
      // 1. Before getToken() - elapsed is huge (from 0), no wait
      // 2. Inside getToken() when fetching - elapsed is 0 (same tick), needs wait
      const promise = service.createShipmentBatch([])
      await vi.advanceTimersByTimeAsync(MIN_INTERVAL * 2)
      await promise

      expect(mockPplClient.fetchNewToken).toHaveBeenCalledWith()
      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith(
        "fallback-token",
        [],
        undefined,
      )
    })

    it("throws MedusaError when token fetch fails", async () => {
      mockCacheService.get.mockResolvedValue(null)
      mockPplClient.fetchNewToken.mockRejectedValue(new Error("Auth failed"))

      const service = createService()

      await expect(service.createShipmentBatch([])).rejects.toThrow(MedusaError)
    })
  })

  describe("rate limiting", () => {
    // MIN_REQUEST_INTERVAL_MS = 40 in service.ts
    const MIN_INTERVAL = 40

    it("waits when under MIN_REQUEST_INTERVAL", async () => {
      const elapsedSinceLastRequest = 10
      const recentTimestamp = Date.now() - elapsedSinceLastRequest

      // Call order: acquireRateLimitSlot() -> getToken()
      mockCacheService.get
        .mockResolvedValueOnce({ timestamp: recentTimestamp })
        // rate limit - triggers wait
        .mockResolvedValueOnce({
          accessToken: "token",
          expiresAt: Date.now() + 120_000,
        })
      // token - valid, no refetch needed

      const service = createService()
      const promise = service.createShipmentBatch([])

      // Advance well past MIN_INTERVAL to ensure sleep completes
      await vi.advanceTimersByTimeAsync(MIN_INTERVAL * 2)
      await promise

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: "ppl:rate:last_request" }),
      )
      expect(mockPplClient.fetchNewToken).not.toHaveBeenCalled()
    })

    it("uses local fallback when lock acquisition stalls past the timeout", async () => {
      // A provider that never grants the lock within the service's own
      // acquisition timeout (LOCK_ACQUIRE_TIMEOUT_MS = 5000 in service.ts).
      const { promise: neverSettles } = Promise.withResolvers<unknown>()
      mockLockingService.execute.mockReturnValueOnce(neverSettles)
      mockCacheService.get.mockResolvedValueOnce({
        accessToken: "cached-token",
        expiresAt: Date.now() + 120_000,
      })

      const service = createService()
      const promise = service.createShipmentBatch([])

      await vi.advanceTimersByTimeAsync(5000)
      await promise

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "PPL: Rate limit lock timed out, using local fallback",
      )
      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith(
        "cached-token",
        [],
        undefined,
      )
    })

    it.each([
      ["a plain provider error", new Error("locking provider unavailable")],
      [
        "an unrelated Medusa conflict",
        new MedusaError(MedusaError.Types.CONFLICT, "resource conflict"),
      ],
    ])("rethrows %s", async (_, error) => {
      mockLockingService.execute.mockRejectedValueOnce(error)

      const service = createService()

      await expect(service.createShipmentBatch([])).rejects.toBe(error)
    })
  })

  describe("caching - codelists", () => {
    it("returns cached countries on cache hit", async () => {
      const cachedCountries = [{ code: "CZ" }, { code: "SK" }]
      mockCacheService.get.mockResolvedValueOnce(cachedCountries)
      // cache hit for countries

      const service = createService()
      const result = await service.getCachedCountries()

      expect(result).toStrictEqual(cachedCountries)
      expect(mockPplClient.getCodelistCountries).not.toHaveBeenCalled()
    })

    it("fetches and caches countries on cache miss", async () => {
      const freshCountries = [{ code: "CZ", name: "Czech Republic" }]
      mockCacheService.get
        .mockResolvedValueOnce(null)
        // cache miss for countries
        .mockResolvedValueOnce(null)
        // rate limit
        .mockResolvedValueOnce({
          accessToken: "token",
          expiresAt: Date.now() + 120_000,
        })
      // token

      mockPplClient.getCodelistCountries.mockResolvedValue(freshCountries)

      const service = createService()
      const result = await service.getCachedCountries()

      expect(result).toStrictEqual(freshCountries)
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "ppl:codelist:countries",
          tags: ["ppl", "ppl:codelists"],
        }),
      )
    })
  })

  describe("cache invalidation", () => {
    it("invalidateCodelists clears tagged cache", async () => {
      const service = createService()
      await service.invalidateCodelists()

      expect(mockCacheService.clear).toHaveBeenCalledWith({
        tags: ["ppl:codelists"],
      })
    })

    it("invalidateAllCaches clears all PPL caches", async () => {
      const service = createService()
      await service.invalidateAllCaches()

      expect(mockCacheService.clear).toHaveBeenCalledWith({
        tags: ["ppl"],
      })
    })

    it("invalidateAllCaches clears local fallback when Redis unavailable", async () => {
      // MIN_REQUEST_INTERVAL_MS = 40 in service.ts
      const MIN_INTERVAL = 40
      const fixedNow = new Date("2025-01-15T12:00:00Z").getTime()
      vi.setSystemTime(fixedNow)

      const service = createService(validOptions, null, null)

      // Prime local fallback
      mockPplClient.fetchNewToken.mockResolvedValue({
        accessToken: "token",
        expiresAt: fixedNow + 1_800_000,
      })
      // First call - needs timer advance for rate limit sleep inside getToken()
      const primePromise = service.createShipmentBatch([])
      await vi.advanceTimersByTimeAsync(MIN_INTERVAL * 2)
      await primePromise

      // Invalidate
      await service.invalidateAllCaches()

      // Advance time past rate limit interval before next call
      await vi.advanceTimersByTimeAsync(MIN_INTERVAL * 2)

      // Next call should fetch new token (cache was invalidated)
      mockPplClient.fetchNewToken.mockClear()
      const secondPromise = service.createShipmentBatch([])
      await vi.advanceTimersByTimeAsync(MIN_INTERVAL * 2)
      await secondPromise

      expect(mockPplClient.fetchNewToken).toHaveBeenCalledWith()
    })
  })

  describe("config management", () => {
    beforeEach(() => {
      mockEncryptFields.mockClear()
    })

    describe("updateConfig - sensitive field handling", () => {
      it("removes empty string from sensitive fields (keep existing)", async () => {
        const service = createService()
        // Mock getConfig to return existing config
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({
            client_id: "existing-id",
            client_secret: "existing-secret",
          }),
        )
        // Mock updatePplConfigs
        vi.spyOn(
          asSingleUpdatePplConfigs(service),
          "updatePplConfigs",
        ).mockResolvedValue(
          createMockConfig({
            client_id: "new-id",
            client_secret: "existing-secret",
          }),
        )

        await service.updateConfig({
          client_id: "new-id",
          client_secret: "",
          // Empty string = keep existing
        })

        // encryptFields should NOT receive client_secret (it was filtered out)
        const [encryptCall] = mockEncryptFields.mock.calls
        expect(encryptCall).toBeDefined()
        if (encryptCall === undefined) {
          throw new Error("Expected encryptFields call")
        }
        const [encryptCallArgs] = encryptCall
        expect(encryptCallArgs).not.toHaveProperty("client_secret")
        expect(mockEncryptFields).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Array),
        )
      })

      it("passes null through to clear sensitive field", async () => {
        const service = createService()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({
            client_id: "existing-id",
            client_secret: "existing-secret",
          }),
        )
        vi.spyOn(
          asSingleUpdatePplConfigs(service),
          "updatePplConfigs",
        ).mockResolvedValue(createMockConfig({ client_secret: null }))

        await service.updateConfig({
          client_secret: null,
          // null = clear the value
        })

        // encryptFields should receive null (to clear the value)
        expect(mockEncryptFields).toHaveBeenCalledWith(
          expect.objectContaining({ client_secret: null }),
          expect.any(Array),
        )
      })
    })

    describe("getEffectiveConfig", () => {
      // Helper to create service without the default mock
      const createServiceForConfigTests = () =>
        new PplClientModuleService(createContainer(), validOptions)

      it("returns cached config on cache hit", async () => {
        const cachedConfig = {
          client_id: "cached-id",
          client_secret: "cached-secret",
          environment: "testing",
        }
        mockCacheService.get.mockResolvedValueOnce(cachedConfig)

        const service = createServiceForConfigTests()
        const result = await service.getEffectiveConfig()

        expect(result).toStrictEqual(cachedConfig)
      })

      it("returns null when PPL is disabled", async () => {
        mockCacheService.get.mockResolvedValueOnce(null)
        // cache miss

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({ is_enabled: false }),
        )

        const result = await service.getEffectiveConfig()

        expect(result).toBeNull()
      })

      it("returns null when client_id is missing", async () => {
        mockCacheService.get.mockResolvedValueOnce(null)

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({ client_id: null }),
        )

        const result = await service.getEffectiveConfig()

        expect(result).toBeNull()
      })

      it("returns null when client_secret is missing", async () => {
        mockCacheService.get.mockResolvedValueOnce(null)

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({ client_secret: null }),
        )

        const result = await service.getEffectiveConfig()

        expect(result).toBeNull()
      })

      it("caches valid config in Redis", async () => {
        mockCacheService.get.mockResolvedValueOnce(null)

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({
            client_id: "valid-id",
            client_secret: "valid-secret",
            cod_bank_account: "123456",
            cod_bank_code: "0100",
            sender_name: "Test Sender",
          }),
        )

        const result = await service.getEffectiveConfig()

        expect(result).toStrictEqual(
          expect.objectContaining({
            client_id: "valid-id",
            client_secret: "valid-secret",
            cod_bank_account: "123456",
            cod_bank_code: "0100",
            default_label_format: "Pdf",
            environment: "testing",
            sender_name: "Test Sender",
          }),
        )
        expect(mockCacheService.set).toHaveBeenCalledWith(
          expect.objectContaining({
            key: "ppl:config",
            tags: ["ppl"],
            ttl: 60,
          }),
        )
      })
    })

    describe("invalidateConfigCache", () => {
      it("clears config cache and resets client", async () => {
        const service = createService()

        await service.invalidateConfigCache()

        expect(mockCacheService.clear).toHaveBeenCalledWith({
          key: "ppl:config",
        })
      })
    })
  })
})
