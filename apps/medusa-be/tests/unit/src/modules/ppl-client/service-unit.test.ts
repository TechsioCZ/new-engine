import { MedusaError, Modules } from "@medusajs/framework/utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Import after mocks
import type { PplClient } from "../../../../../src/modules/ppl-client/client"
import { PplClientModuleService } from "../../../../../src/modules/ppl-client/service"
import type {
  PplCodelistCountry,
  PplOptions,
} from "../../../../../src/modules/ppl-client/types"

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

// Mock the client before importing service. Extending the real class keeps
// its private static side intact while the public seams delegate to spies.
vi.mock(
  import("../../../../../src/modules/ppl-client/client"),
  async (importOriginal) => {
    const { PplClient: ActualPplClient } = await importOriginal()

    return {
      PplClient: class MockPplClient extends ActualPplClient {
        override cancelShipment = mockPplClient.cancelShipment
        override createShipmentBatch = mockPplClient.createShipmentBatch
        override downloadLabel = mockPplClient.downloadLabel
        override fetchNewToken = mockPplClient.fetchNewToken
        override getAccessPoints = mockPplClient.getAccessPoints
        override getBatchStatus = mockPplClient.getBatchStatus
        override getCodelistCountries = mockPplClient.getCodelistCountries
        override getCodelistCurrencies = mockPplClient.getCodelistCurrencies
        override getCodelistProducts = mockPplClient.getCodelistProducts
        override getCodelistServices = mockPplClient.getCodelistServices
        override getCodelistStatuses = mockPplClient.getCodelistStatuses
        override getCustomerAddresses = mockPplClient.getCustomerAddresses
        override getCustomerInfo = mockPplClient.getCustomerInfo
        override getShipmentInfo = mockPplClient.getShipmentInfo
      },
    }
  },
)

type FieldsCodecObserver = (
  data: object,
  fields: readonly PropertyKey[],
) => void

/**
 * The exported adapters retain the source functions' generic contract while
 * non-generic observers expose calls to Vitest assertions. The transformations
 * stay in the adapters so their returned values retain the caller's exact `T`.
 */
const { decryptFields, encryptFields, mockEncryptFields } = vi.hoisted(() => {
  const hoistedMockEncryptFields = vi.fn<FieldsCodecObserver>()
  const hoistedMockDecryptFields = vi.fn<FieldsCodecObserver>()
  const encryptFieldsAdapter = <T extends object>(
    data: T,
    fields: readonly (keyof T)[],
  ): T => {
    hoistedMockEncryptFields(data, fields)
    return { ...data, _encrypted: true }
  }
  const decryptFieldsAdapter = <T extends object>(
    data: T,
    fields: readonly (keyof T)[],
  ): T => {
    hoistedMockDecryptFields(data, fields)
    return { ...data, _decrypted: true }
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
  get: vi.fn<PplCachingService["get"]>(),
  set: vi.fn<PplCachingService["set"]>(),
}

type LockExecutionBehavior =
  | { readonly kind: "never-settles" }
  | { readonly error: unknown; readonly kind: "rejects" }

const queuedLockExecutionBehaviors: LockExecutionBehavior[] = []

/** Tracked calls stay separate from the generic fake implementation. */
const mockLockingSpies = {
  execute: vi.fn<(...args: Parameters<PplLockingService["execute"]>) => void>(),
}

const mockLockingController = {
  neverSettleNext: (): void => {
    queuedLockExecutionBehaviors.push({ kind: "never-settles" })
  },
  rejectNext: (error: unknown): void => {
    queuedLockExecutionBehaviors.push({ error, kind: "rejects" })
  },
  reset: (): void => {
    queuedLockExecutionBehaviors.length = 0
  },
}

/**
 * A real generic locking fake: ordinary calls execute the supplied job as a
 * `Promise<T>`, while the controller can queue provider rejection or a lock
 * acquisition that never settles. The spies only observe calls.
 */
const neverSettlingJobResult = async <T>(job: () => Promise<T>): Promise<T> => {
  void job
  return await Promise.withResolvers<T>().promise
}

const executeWithLock: PplLockingService["execute"] = async (
  keys,
  job,
  args,
  sharedContext,
) => {
  mockLockingSpies.execute(keys, job, args, sharedContext)

  const behavior = queuedLockExecutionBehaviors.shift()
  if (behavior?.kind === "never-settles") {
    return await neverSettlingJobResult(job)
  }
  if (behavior?.kind === "rejects") {
    throw behavior.error
  }

  return await job()
}

const mockLockingService: PplLockingService = {
  execute: executeWithLock,
}

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
    container[Modules.LOCKING] = lockingService
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
    mockLockingController.reset()
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
      mockLockingController.neverSettleNext()
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
      mockLockingController.rejectNext(error)

      const service = createService()

      await expect(service.createShipmentBatch([])).rejects.toBe(error)
    })
  })

  describe("caching - codelists", () => {
    it("returns cached countries on cache hit", async () => {
      const cachedCountries = [
        { code: "CZ", name: "Czech Republic" },
        { code: "SK", name: "Slovakia" },
      ] satisfies PplCodelistCountry[]
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
          default_label_format: "Pdf",
          environment: "testing",
        } satisfies PplOptions
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
