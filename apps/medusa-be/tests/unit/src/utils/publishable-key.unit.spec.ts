import type { ApiKeyDTO, ILockingModule } from "@medusajs/framework/types"
import type { Mocked } from "vitest"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getActivePublishableKey,
  provisionPublishableKey,
  resolvePublishableKeyTitle,
} from "../../../../src/utils/publishable-key"

type ApiKeyServiceStub = {
  createApiKeys: (data: {
    created_by: string
    title: string
    type: "publishable"
  }) => Promise<ApiKeyDTO>
  listApiKeys: (filters: {
    title: string
    type: "publishable"
  }) => Promise<ApiKeyDTO[]>
}
type LockingModuleStub = Pick<ILockingModule, "execute">

const createApiKeyService = (): Mocked<ApiKeyServiceStub> => ({
  listApiKeys: vi.fn(),
  createApiKeys: vi.fn(),
})

/**
 * `ILockingModule["execute"]` is a genuinely generic method (`<T>(...) =>
 * Promise<T>`). Vitest's `Mock<T>` type loses genericity when wrapping a
 * generic call signature, so the mock is built from a simpler, non-generic
 * implementation shape and cast once at this single boundary.
 */
const createLockingModule = (): LockingModuleStub => ({
  execute: vi.fn(
    async (_key: string | string[], callback: () => Promise<unknown>) =>
      await callback()
  ) as ILockingModule["execute"],
})

const createApiKey = (
  overrides: Partial<ApiKeyDTO> & Pick<ApiKeyDTO, "id" | "token">
): ApiKeyDTO => ({
  created_at: new Date(),
  created_by: "user_123",
  deleted_at: null,
  last_used_at: null,
  redacted: `${overrides.token.slice(0, 3)}...`,
  revoked_at: null,
  revoked_by: null,
  title: "CI Key",
  type: "publishable",
  updated_at: new Date(),
  ...overrides,
})

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
        createApiKey({
          id: "key_revoked",
          token: "pk_revoked",
          revoked_at: new Date(),
        }),
        createApiKey({
          id: "key_active",
          token: "pk_active",
        }),
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
        createApiKey({
          id: "key_revoked",
          token: "pk_revoked",
          revoked_at: new Date(),
        }),
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
        createApiKey({
          id: "key_existing",
          token: "pk_existing",
        }),
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
        createApiKey({
          id: "key_revoked",
          token: "pk_revoked",
          revoked_at: new Date(),
        }),
      ])
      apiKeyService.createApiKeys.mockResolvedValue(
        createApiKey({ id: "key_created", token: "pk_created" })
      )

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
      apiKeyService.createApiKeys.mockResolvedValue(
        createApiKey({ id: "key_created", token: "pk_created" })
      )

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
