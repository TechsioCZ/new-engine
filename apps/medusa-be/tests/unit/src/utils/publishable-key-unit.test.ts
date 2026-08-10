import type {
  ApiKeyDTO,
  Context,
  CreateApiKeyDTO,
  IApiKeyModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import type { Mock, Mocked } from "vitest"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getActivePublishableKey,
  provisionPublishableKey,
  resolvePublishableKeyTitle,
} from "../../../../src/utils/publishable-key"

interface ApiKeyServiceStub {
  createApiKeys: (
    data: CreateApiKeyDTO,
    sharedContext?: Context,
  ) => Promise<ApiKeyDTO>
  listApiKeys: IApiKeyModuleService["listApiKeys"]
}
type ExecuteCall = (
  keys: string | string[],
  job: () => Promise<unknown>,
  args?: { provider?: string; timeout?: number },
  sharedContext?: Context,
) => void

interface LockingModuleStub extends Pick<ILockingModule, "execute"> {
  executeMock: Mock<ExecuteCall>
}

const createApiKeyService = (): Mocked<ApiKeyServiceStub> => ({
  createApiKeys: vi.fn<ApiKeyServiceStub["createApiKeys"]>(),
  listApiKeys: vi.fn<IApiKeyModuleService["listApiKeys"]>(),
})

const createLockingModule = (): LockingModuleStub => {
  const executeMock = vi.fn<ExecuteCall>()
  const execute: ILockingModule["execute"] = async <T>(
    keys: string | string[],
    job: () => Promise<T>,
    args?: { provider?: string; timeout?: number },
    sharedContext?: Context,
  ): Promise<T> => {
    if (sharedContext === undefined) {
      executeMock(keys, job, args)
    } else {
      executeMock(keys, job, args, sharedContext)
    }
    return await job()
  }

  return { execute, executeMock }
}

const objectContaining = (value: object): unknown =>
  expect.objectContaining(value)

const createApiKey = (
  overrides: Partial<ApiKeyDTO> & Pick<ApiKeyDTO, "id" | "token">,
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
    process.env["INITIAL_PUBLISHABLE_KEY_NAME"]

  afterEach(() => {
    vi.clearAllMocks()

    if (originalInitialPublishableKeyName === undefined) {
      process.env["INITIAL_PUBLISHABLE_KEY_NAME"] = ""
      return
    }

    process.env["INITIAL_PUBLISHABLE_KEY_NAME"] =
      originalInitialPublishableKeyName
  })

  describe(resolvePublishableKeyTitle, () => {
    it("prefers an explicit title after trimming", () => {
      process.env["INITIAL_PUBLISHABLE_KEY_NAME"] = "Env Title"

      expect(resolvePublishableKeyTitle("  CI Title  ")).toBe("CI Title")
    })

    it("falls back to env title before the default", () => {
      process.env["INITIAL_PUBLISHABLE_KEY_NAME"] = "Env Title"

      expect(resolvePublishableKeyTitle("   ")).toBe("Env Title")
    })

    it("uses the hard-coded default when no title is provided", () => {
      process.env["INITIAL_PUBLISHABLE_KEY_NAME"] = ""

      expect(resolvePublishableKeyTitle()).toBe("Storefront Publishable Key")
    })
  })

  describe(getActivePublishableKey, () => {
    it("returns the first non-revoked publishable key", async () => {
      const apiKeyService = createApiKeyService()
      apiKeyService.listApiKeys.mockResolvedValue([
        createApiKey({
          id: "key_revoked",
          revoked_at: new Date(),
          token: "pk_revoked",
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
      expect(result).toStrictEqual({
        apiKey: objectContaining({
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
          revoked_at: new Date(),
          token: "pk_revoked",
        }),
      ])

      await expect(
        getActivePublishableKey({ apiKeyService, title: "CI Key" }),
      ).resolves.toBeNull()
      expect(apiKeyService.createApiKeys).not.toHaveBeenCalled()
    })
  })

  describe(provisionPublishableKey, () => {
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
        createdBy: "user_123",
        title: "CI Key",
      })

      expect(apiKeyService.createApiKeys).not.toHaveBeenCalled()
      expect(result).toStrictEqual({
        apiKey: objectContaining({
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
          revoked_at: new Date(),
          token: "pk_revoked",
        }),
      ])
      apiKeyService.createApiKeys.mockResolvedValue(
        createApiKey({ id: "key_created", token: "pk_created" }),
      )

      const result = await provisionPublishableKey({
        apiKeyService,
        createdBy: "user_123",
        title: "CI Key",
      })

      expect(apiKeyService.createApiKeys).toHaveBeenCalledWith({
        created_by: "user_123",
        title: "CI Key",
        type: "publishable",
      })
      expect(result).toStrictEqual({
        apiKey: objectContaining({
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
        createApiKey({ id: "key_created", token: "pk_created" }),
      )

      await provisionPublishableKey({
        apiKeyService,
        createdBy: "user_123",
        lockingModule,
        title: "CI Key",
      })

      expect(lockingModule.executeMock).toHaveBeenCalledWith(
        "publishable-key:provision:CI%20Key",
        expect.any(Function),
        { timeout: 5 },
      )
    })
  })
})
