import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { Mock } from "vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
// Import after mocks
import { PplClientModuleService } from "../../../../../src/modules/ppl-client/service"
import { encryptFields } from "../../../../../src/utils/encryption"

const { mockPplClient } = vi.hoisted(() => ({
  mockPplClient: {
    fetchNewToken: vi.fn(),
    getCodelistCountries: vi.fn(),
    getCodelistCurrencies: vi.fn(),
    getCodelistProducts: vi.fn(),
    getCodelistServices: vi.fn(),
    getCodelistStatuses: vi.fn(),
    createShipmentBatch: vi.fn(),
    getBatchStatus: vi.fn(),
    getShipmentInfo: vi.fn(),
    cancelShipment: vi.fn(),
    getAccessPoints: vi.fn(),
    getCustomerInfo: vi.fn(),
    getCustomerAddresses: vi.fn(),
    downloadLabel: vi.fn(),
  },
}))

// Mock the client before importing service
vi.mock("../../../../../src/modules/ppl-client/client", () => ({
  PplClient: vi.fn(function PplClient() {
    return mockPplClient
  }),
}))

// Mock encryption utilities
vi.mock("../../../../../src/utils/encryption", () => ({
  encryptFields: vi.fn((data) => ({ ...data, _encrypted: true })),
  decryptFields: vi.fn((data) => ({ ...data, _decrypted: true })),
}))

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
}

const mockLockingService = {
  execute: vi.fn().mockImplementation(async (_key, fn) => fn()),
}

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

const validOptions = {
  environment: "testing" as const,
}

const mockEffectiveConfig = {
  client_id: "test-client-id",
  client_secret: "test-client-secret",
  environment: "testing" as const,
  default_label_format: "Pdf" as const,
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
  }> = {}
) => ({
  id: "config-1",
  environment: "testing" as const,
  is_enabled: true,
  client_id: "id",
  client_secret: "secret",
  default_label_format: "Pdf",
  cod_bank_account: null,
  cod_bank_code: null,
  cod_iban: null,
  cod_swift: null,
  sender_name: null,
  sender_street: null,
  sender_city: null,
  sender_zip_code: null,
  sender_country: null,
  sender_phone: null,
  sender_email: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
})

const createService = (
  options = validOptions,
  cacheService: typeof mockCacheService | null = mockCacheService,
  lockingService: typeof mockLockingService | null = mockLockingService
) => {
  const service = new PplClientModuleService(
    {
      logger: mockLogger,
      [Modules.CACHING]: cacheService,
      [Modules.LOCKING]: lockingService,
    } as any,
    options
  )
  // Mock getEffectiveConfig by default to bypass DB dependency
  // Tests that need to test config behavior should override this
  vi.spyOn(service, "getEffectiveConfig").mockResolvedValue(mockEffectiveConfig)
  return service
}

describe("PplClientModuleService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear mockResolvedValueOnce queue (clearAllMocks doesn't do this)
    mockCacheService.get.mockReset()
    mockLockingService.execute.mockReset()
    mockLockingService.execute.mockImplementation(async (_key, fn) => fn())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("constructor", () => {
    it("handles optional dependency resolution errors gracefully", () => {
      const container: Record<string, unknown> = { logger: mockLogger }
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

      const service = new PplClientModuleService(container as any, validOptions)

      expect(service).toBeInstanceOf(PplClientModuleService)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "PPL: Cache or locking service not available. Using local-only mode (not suitable for multi-container)."
      )
    })
  })

  describe("token management", () => {
    it("returns cached token when valid and not expired", async () => {
      const futureExpiry = Date.now() + 120_000 // 2 minutes from now
      mockCacheService.get
        .mockResolvedValueOnce(null) // rate limit - acquireRateLimitSlot first
        .mockResolvedValueOnce({
          accessToken: "cached-token",
          expiresAt: futureExpiry,
        }) // token

      const service = createService()
      await service.createShipmentBatch([])

      expect(mockPplClient.fetchNewToken).not.toHaveBeenCalled()
      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith(
        "cached-token",
        [],
        undefined
      )
    })

    it("fetches new token when cached token expired", async () => {
      const pastExpiry = Date.now() - 1000
      mockCacheService.get
        .mockResolvedValueOnce(null) // rate limit for shipment
        .mockResolvedValueOnce({
          accessToken: "old-token",
          expiresAt: pastExpiry,
        }) // expired token
        .mockResolvedValueOnce(null) // rate limit for token fetch

      mockPplClient.fetchNewToken.mockResolvedValue({
        accessToken: "new-token",
        expiresAt: Date.now() + 1_800_000,
      })

      const service = createService()
      await service.createShipmentBatch([])

      expect(mockPplClient.fetchNewToken).toHaveBeenCalled()
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: "ppl:oauth:token" })
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

      expect(mockPplClient.fetchNewToken).toHaveBeenCalled()
      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith(
        "fallback-token",
        [],
        undefined
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
        .mockResolvedValueOnce({ timestamp: recentTimestamp }) // rate limit - triggers wait
        .mockResolvedValueOnce({
          accessToken: "token",
          expiresAt: Date.now() + 120_000,
        }) // token - valid, no refetch needed

      const service = createService()
      const promise = service.createShipmentBatch([])

      // Advance well past MIN_INTERVAL to ensure sleep completes
      await vi.advanceTimersByTimeAsync(MIN_INTERVAL * 2)
      await promise

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: "ppl:rate:last_request" })
      )
      expect(mockPplClient.fetchNewToken).not.toHaveBeenCalled()
    })
  })

  describe("caching - codelists", () => {
    it("returns cached countries on cache hit", async () => {
      const cachedCountries = [{ code: "CZ" }, { code: "SK" }]
      mockCacheService.get.mockResolvedValueOnce(cachedCountries) // cache hit for countries

      const service = createService()
      const result = await service.getCachedCountries()

      expect(result).toEqual(cachedCountries)
      expect(mockPplClient.getCodelistCountries).not.toHaveBeenCalled()
    })

    it("fetches and caches countries on cache miss", async () => {
      const freshCountries = [{ code: "CZ" }]
      mockCacheService.get
        .mockResolvedValueOnce(null) // cache miss for countries
        .mockResolvedValueOnce(null) // rate limit
        .mockResolvedValueOnce({
          accessToken: "token",
          expiresAt: Date.now() + 120_000,
        }) // token

      mockPplClient.getCodelistCountries.mockResolvedValue(freshCountries)

      const service = createService()
      const result = await service.getCachedCountries()

      expect(result).toEqual(freshCountries)
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "ppl:codelist:countries",
          tags: ["ppl", "ppl:codelists"],
        })
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

      expect(mockPplClient.fetchNewToken).toHaveBeenCalled()
    })
  })

  describe("config management", () => {
    beforeEach(() => {
      encryptFields.mockClear()
    })

    describe("updateConfig - sensitive field handling", () => {
      it("removes empty string from sensitive fields (keep existing)", async () => {
        const service = createService()
        // Mock getConfig to return existing config
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({
            client_id: "existing-id",
            client_secret: "existing-secret",
          })
        )
        // Mock updatePplConfigs
        vi.spyOn(service, "updatePplConfigs").mockResolvedValue({
          id: "config-1",
          environment: "testing",
          is_enabled: true,
          client_id: "new-id",
          client_secret: "existing-secret",
        } as any)

        await service.updateConfig({
          client_id: "new-id",
          client_secret: "", // Empty string = keep existing
        })

        // encryptFields should NOT receive client_secret (it was filtered out)
        const encryptCallArgs = (encryptFields as Mock).mock.calls[0][0]
        expect(encryptCallArgs).not.toHaveProperty("client_secret")
        expect(encryptFields).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Array)
        )
      })

      it("passes null through to clear sensitive field", async () => {
        const service = createService()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({
            client_id: "existing-id",
            client_secret: "existing-secret",
          })
        )
        vi.spyOn(service, "updatePplConfigs").mockResolvedValue({
          id: "config-1",
          client_secret: null,
        } as any)

        await service.updateConfig({
          client_secret: null, // null = clear the value
        })

        // encryptFields should receive null (to clear the value)
        expect(encryptFields).toHaveBeenCalledWith(
          expect.objectContaining({ client_secret: null }),
          expect.any(Array)
        )
      })
    })

    describe("getEffectiveConfig", () => {
      // Helper to create service without the default mock
      const createServiceForConfigTests = () =>
        new PplClientModuleService(
          {
            logger: mockLogger,
            [Modules.CACHING]: mockCacheService,
            [Modules.LOCKING]: mockLockingService,
          } as any,
          validOptions
        )

      it("returns cached config on cache hit", async () => {
        const cachedConfig = {
          client_id: "cached-id",
          client_secret: "cached-secret",
          environment: "testing",
        }
        mockCacheService.get.mockResolvedValueOnce(cachedConfig)

        const service = createServiceForConfigTests()
        const result = await service.getEffectiveConfig()

        expect(result).toEqual(cachedConfig)
      })

      it("returns null when PPL is disabled", async () => {
        mockCacheService.get.mockResolvedValueOnce(null) // cache miss

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({ is_enabled: false })
        )

        const result = await service.getEffectiveConfig()

        expect(result).toBeNull()
      })

      it("returns null when client_id is missing", async () => {
        mockCacheService.get.mockResolvedValueOnce(null)

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({ client_id: null })
        )

        const result = await service.getEffectiveConfig()

        expect(result).toBeNull()
      })

      it("returns null when client_secret is missing", async () => {
        mockCacheService.get.mockResolvedValueOnce(null)

        const service = createServiceForConfigTests()
        vi.spyOn(service, "getConfig").mockResolvedValue(
          createMockConfig({ client_secret: null })
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
          })
        )

        const result = await service.getEffectiveConfig()

        expect(result).toEqual(
          expect.objectContaining({
            client_id: "valid-id",
            client_secret: "valid-secret",
            environment: "testing",
            default_label_format: "Pdf",
            cod_bank_account: "123456",
            cod_bank_code: "0100",
            sender_name: "Test Sender",
          })
        )
        expect(mockCacheService.set).toHaveBeenCalledWith(
          expect.objectContaining({
            key: "ppl:config",
            ttl: 60,
            tags: ["ppl"],
          })
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
