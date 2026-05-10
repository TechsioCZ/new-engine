import type {
  IApiKeyModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import type { Mocked } from "vitest"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getActivePublishableKey,
  provisionPublishableKey,
  resolvePublishableKeyTitle,
} from "../../../../src/utils/publishable-key"

const createApiKeyService = () =>
  ({
    listApiKeys: vi.fn(),
    createApiKeys: vi.fn(),
  }) as unknown as Mocked<IApiKeyModuleService>

const createLockingModule = () =>
  ({
    execute: vi.fn(async (_key, callback) => await callback()),
  }) as unknown as Mocked<ILockingModule>

describe("publishable-key utils", () => {
  const originalInitialPublishableKeyName =
    process.env.INITIAL_PUBLISHABLE_KEY_NAME

  afterEach(() => {
    vi.clearAllMocks()

    if (originalInitialPublishableKeyName === undefined) {
      process.env.INITIAL_PUBLISHABLE_KEY_NAME = ""
      return
    }

    process.env.INITIAL_PUBLISHABLE_KEY_NAME = originalInitialPublishableKeyName
  })

  describe("resolvePublishableKeyTitle", () => {
    it("prefers an explicit title after trimming", () => {
      process.env.INITIAL_PUBLISHABLE_KEY_NAME = "Env Title"

      expect(resolvePublishableKeyTitle("  CI Title  ")).toBe("CI Title")
    })

    it("falls back to env title before the default", () => {
      process.env.INITIAL_PUBLISHABLE_KEY_NAME = "Env Title"

      expect(resolvePublishableKeyTitle("   ")).toBe("Env Title")
    })

    it("uses the hard-coded default when no title is provided", () => {
      process.env.INITIAL_PUBLISHABLE_KEY_NAME = ""

      expect(resolvePublishableKeyTitle()).toBe("Storefront Publishable Key")
    })
  })

  describe("getActivePublishableKey", () => {
    it("returns the first non-revoked publishable key", async () => {
      const apiKeyService = createApiKeyService()
      apiKeyService.listApiKeys.mockResolvedValue([
        {
          id: "key_revoked",
          title: "CI Key",
          token: "pk_revoked",
          type: "publishable",
          revoked_at: new Date(),
        } as any,
        {
          id: "key_active",
          title: "CI Key",
          token: "pk_active",
          type: "publishable",
          revoked_at: null,
        } as any,
      ])

      const result = await getActivePublishableKey({
        apiKeyService,
        title: "CI Key",
      })

      expect(apiKeyService.listApiKeys).toHaveBeenCalledWith({
        title: "CI Key",
        type: "publishable",
      })
      expect(result).toEqual({
        apiKey: expect.objectContaining({
          id: "key_active",
          token: "pk_active",
        }),
        created: false,
        title: "CI Key",
      })
    })

    it("returns null when no active publishable key exists", async () => {
      const apiKeyService = createApiKeyService()
      apiKeyService.listApiKeys.mockResolvedValue([
        {
          id: "key_revoked",
          title: "CI Key",
          token: "pk_revoked",
          type: "publishable",
          revoked_at: new Date(),
        } as any,
      ])

      await expect(
        getActivePublishableKey({ apiKeyService, title: "CI Key" })
      ).resolves.toBeNull()
      expect(apiKeyService.createApiKeys).not.toHaveBeenCalled()
    })
  })

  describe("provisionPublishableKey", () => {
    it("returns an existing active key without creating a new one", async () => {
      const apiKeyService = createApiKeyService()
      apiKeyService.listApiKeys.mockResolvedValue([
        {
          id: "key_existing",
          title: "CI Key",
          token: "pk_existing",
          type: "publishable",
          revoked_at: null,
        } as any,
      ])

      const result = await provisionPublishableKey({
        apiKeyService,
        title: "CI Key",
        createdBy: "user_123",
      })

      expect(apiKeyService.createApiKeys).not.toHaveBeenCalled()
      expect(result).toEqual({
        apiKey: expect.objectContaining({
          id: "key_existing",
          token: "pk_existing",
        }),
        created: false,
        title: "CI Key",
      })
    })

    it("creates a new key when only revoked keys exist", async () => {
      const apiKeyService = createApiKeyService()
      apiKeyService.listApiKeys.mockResolvedValue([
        {
          id: "key_revoked",
          title: "CI Key",
          token: "pk_revoked",
          type: "publishable",
          revoked_at: new Date(),
        } as any,
      ])
      apiKeyService.createApiKeys.mockResolvedValue({
        id: "key_created",
        title: "CI Key",
        token: "pk_created",
        type: "publishable",
      } as any)

      const result = await provisionPublishableKey({
        apiKeyService,
        title: "CI Key",
        createdBy: "user_123",
      })

      expect(apiKeyService.createApiKeys).toHaveBeenCalledWith({
        title: "CI Key",
        type: "publishable",
        created_by: "user_123",
      })
      expect(result).toEqual({
        apiKey: expect.objectContaining({
          id: "key_created",
          token: "pk_created",
        }),
        created: true,
        title: "CI Key",
      })
    })

    it("uses the locking module when provided", async () => {
      const apiKeyService = createApiKeyService()
      const lockingModule = createLockingModule()
      apiKeyService.listApiKeys.mockResolvedValue([])
      apiKeyService.createApiKeys.mockResolvedValue({
        id: "key_created",
        title: "CI Key",
        token: "pk_created",
        type: "publishable",
      } as any)

      await provisionPublishableKey({
        apiKeyService,
        title: "CI Key",
        createdBy: "user_123",
        lockingModule,
      })

      expect(lockingModule.execute).toHaveBeenCalledWith(
        "publishable-key:provision:CI%20Key",
        expect.any(Function),
        { timeout: 5 }
      )
    })
  })
})
