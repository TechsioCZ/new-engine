import type {
  ICachingModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PPL_CLIENT_MODULE } from "../index"
import PplConfig from "../models/ppl-config"
import type { PplClientModuleService } from "../service"

vi.hoisted(() => {
  process.env["SETTINGS_ENCRYPTION_KEY"] =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
})

vi.setConfig({ testTimeout: 60_000 })

// Mock services for dependencies
const mockCacheService = {
  clear: vi.fn<ICachingModuleService["clear"]>().mockResolvedValue(),
  get: vi.fn<ICachingModuleService["get"]>().mockResolvedValue(null),
  set: vi.fn<ICachingModuleService["set"]>().mockResolvedValue(),
}

const mockLockingService = {
  execute: vi
    .fn<ILockingModule["execute"]>()
    .mockImplementation(async (_key, job) => await job()),
}

// Base64 pattern for encrypted values
const BASE64_PATTERN = /^[A-Za-z0-9+/]+=*$/u

moduleIntegrationTestRunner<PplClientModuleService>({
  injectedDependencies: {
    [Modules.CACHING]: mockCacheService,
    [Modules.LOCKING]: mockLockingService,
  },
  moduleModels: [PplConfig],
  moduleName: PPL_CLIENT_MODULE,
  moduleOptions: {
    environment: "testing",
  },
  resolve: "./src/modules/ppl-client",
  testSuite: ({ service }) => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe("config management", () => {
      it("returns disabled default config before admin setup", async () => {
        const result = await service.getConfig()
        expect(result).toStrictEqual(
          expect.objectContaining({
            client_id: null,
            client_secret: null,
            environment: "testing",
            is_enabled: false,
          }),
        )
      })

      describe("creates and retrieves config with encrypted credentials", () => {
        it("returns decrypted values immediately after creation", async () => {
          const result = await service.updateConfig({
            client_id: "test-client-id",
            client_secret: "test-secret",
            is_enabled: true,
          })

          expect(result.id).toBeDefined()
          expect(result.environment).toBe("testing")
          expect(result.is_enabled).toBeTruthy()
          expect(result.client_id).toBe("test-client-id")
          // Decrypted value returned
          expect(result.client_secret).toBe("test-secret")
        })

        it("returns decrypted values on retrieval", async () => {
          await service.updateConfig({
            client_id: "test-client-id",
            client_secret: "test-secret",
            is_enabled: true,
          })

          // Verify retrieval also returns decrypted values
          const retrieved = await service.getConfig()
          expect(retrieved?.client_secret).toBe("test-secret")
        })
      })

      it("stores encrypted values in database", async () => {
        await service.updateConfig({
          client_secret: "plaintext-secret",
        })

        // Query raw DB value via auto-generated method
        const configs = await service.listPplConfigs({
          environment: "testing",
        })
        const [rawConfig] = configs
        expect(rawConfig).toBeDefined()

        // Stored value should NOT be plaintext
        expect(rawConfig?.client_secret).not.toBe("plaintext-secret")
        // Should be base64 (encrypted)
        expect(rawConfig?.client_secret).toMatch(BASE64_PATTERN)
      })

      it("keeps existing value when updating with empty string", async () => {
        await service.updateConfig({
          client_id: "initial-id",
          client_secret: "initial-secret",
        })

        const updated = await service.updateConfig({
          client_id: "new-id",
          // Empty = keep existing
          client_secret: "",
        })

        expect(updated.client_id).toBe("new-id")
        expect(updated.client_secret).toBe("initial-secret")
      })

      it("clears value when updating with null", async () => {
        await service.updateConfig({
          client_id: "my-id",
          client_secret: "my-secret",
          cod_iban: "CZ123456",
        })

        const updated = await service.updateConfig({
          // null = clear
          cod_iban: null,
        })

        expect(updated.client_secret).toBe("my-secret")
        expect(updated.cod_iban).toBeNull()
      })
    })

    describe("getEffectiveConfig", () => {
      it("returns null when config is disabled", async () => {
        await service.updateConfig({
          client_id: "id",
          client_secret: "secret",
          is_enabled: false,
        })

        const result = await service.getEffectiveConfig()
        expect(result).toBeNull()
      })

      it("returns null when credentials are missing", async () => {
        await service.updateConfig({
          client_id: "id",
          client_secret: null,
          is_enabled: true,
        })

        const result = await service.getEffectiveConfig()
        expect(result).toBeNull()
      })

      describe("returns config when enabled with valid credentials", () => {
        it("resolves a non-null config with matching credentials", async () => {
          await service.updateConfig({
            client_id: "valid-id",
            client_secret: "valid-secret",
            default_label_format: "Pdf",
            is_enabled: true,
            sender_name: "Test Sender",
          })

          const result = await service.getEffectiveConfig()

          expect(result).not.toBeNull()
          expect(result?.client_id).toBe("valid-id")
          expect(result?.client_secret).toBe("valid-secret")
        })

        it("preserves environment and label settings", async () => {
          await service.updateConfig({
            client_id: "valid-id",
            client_secret: "valid-secret",
            default_label_format: "Pdf",
            is_enabled: true,
            sender_name: "Test Sender",
          })

          const result = await service.getEffectiveConfig()

          expect(result?.environment).toBe("testing")
          expect(result?.default_label_format).toBe("Pdf")
          expect(result?.sender_name).toBe("Test Sender")
        })
      })
    })
  },
})
