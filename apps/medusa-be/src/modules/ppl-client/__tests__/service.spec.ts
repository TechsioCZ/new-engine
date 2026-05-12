import { beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  process.env.SETTINGS_ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
})

vi.setConfig({ testTimeout: 60_000 })

vi.mock("../client", () => ({
  PplClient: vi.fn().mockImplementation(() => ({
    fetchNewToken: vi.fn(),
  })),
}))

import { Modules } from "@medusajs/framework/utils"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { PPL_CLIENT_MODULE } from "../index"
import PplConfig from "../models/ppl-config"
import type { PplClientModuleService } from "../service"

// Mock services for dependencies
const mockCacheService = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
}

const mockLockingService = {
  execute: vi.fn().mockImplementation(async (_key, fn) => fn()),
}

// Base64 pattern for encrypted values
const BASE64_PATTERN = /^[A-Za-z0-9+/]+=*$/

moduleIntegrationTestRunner<PplClientModuleService>({
  moduleName: PPL_CLIENT_MODULE,
  moduleModels: [PplConfig],
  resolve: "./src/modules/ppl-client",
  moduleOptions: {
    environment: "testing",
  },
  injectedDependencies: {
    [Modules.CACHING]: mockCacheService,
    [Modules.LOCKING]: mockLockingService,
  },
  testSuite: ({ service }) => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe("config management", () => {
      it("returns disabled default config before admin setup", async () => {
        const result = await service.getConfig()
        expect(result).toEqual(
          expect.objectContaining({
            client_id: null,
            client_secret: null,
            environment: "testing",
            is_enabled: false,
          })
        )
      })

      it("creates and retrieves config with encrypted credentials", async () => {
        const result = await service.updateConfig({
          is_enabled: true,
          client_id: "test-client-id",
          client_secret: "test-secret",
        })

        expect(result.id).toBeDefined()
        expect(result.environment).toBe("testing")
        expect(result.is_enabled).toBe(true)
        expect(result.client_id).toBe("test-client-id")
        // Decrypted value returned
        expect(result.client_secret).toBe("test-secret")

        // Verify retrieval also returns decrypted values
        const retrieved = await service.getConfig()
        expect(retrieved?.client_secret).toBe("test-secret")
      })

      it("stores encrypted values in database", async () => {
        await service.updateConfig({
          client_secret: "plaintext-secret",
        })

        // Query raw DB value via auto-generated method
        const configs = await service.listPplConfigs({
          environment: "testing",
        })
        const rawConfig = configs[0]
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
          client_secret: "", // Empty = keep existing
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
          cod_iban: null, // null = clear
        })

        expect(updated.client_secret).toBe("my-secret")
        expect(updated.cod_iban).toBeNull()
      })
    })

    describe("getEffectiveConfig", () => {
      it("returns null when config is disabled", async () => {
        await service.updateConfig({
          is_enabled: false,
          client_id: "id",
          client_secret: "secret",
        })

        const result = await service.getEffectiveConfig()
        expect(result).toBeNull()
      })

      it("returns null when credentials are missing", async () => {
        await service.updateConfig({
          is_enabled: true,
          client_id: "id",
          client_secret: null,
        })

        const result = await service.getEffectiveConfig()
        expect(result).toBeNull()
      })

      it("returns config when enabled with valid credentials", async () => {
        await service.updateConfig({
          is_enabled: true,
          client_id: "valid-id",
          client_secret: "valid-secret",
          default_label_format: "Pdf",
          sender_name: "Test Sender",
        })

        const result = await service.getEffectiveConfig()

        expect(result).not.toBeNull()
        expect(result?.client_id).toBe("valid-id")
        expect(result?.client_secret).toBe("valid-secret")
        expect(result?.environment).toBe("testing")
        expect(result?.default_label_format).toBe("Pdf")
        expect(result?.sender_name).toBe("Test Sender")
      })
    })
  },
})
