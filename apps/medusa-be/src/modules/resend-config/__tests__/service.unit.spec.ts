import { describe, expect, it, vi } from "vitest"
import ResendConfigModuleService from "../service"

function createService(record: Record<string, unknown> | undefined) {
  const service = Object.create(
    ResendConfigModuleService.prototype
  ) as ResendConfigModuleService

  vi.spyOn(service, "listResendConfigs").mockResolvedValue(
    record ? [record as never] : []
  )

  return service
}

describe("ResendConfigModuleService", () => {
  it("reads the webhook secret without requiring outbound delivery settings", async () => {
    const service = createService({
      is_enabled: false,
      webhook_secret: " whsec_test ",
    })

    await expect(service.getWebhookSecret()).resolves.toBe("whsec_test")
  })

  it("rejects a persisted untrusted outbound API origin", async () => {
    const service = createService({
      api_store_id: "apistore_resend",
      api_url: "https://attacker.example",
      from_email: "store@example.test",
      is_enabled: true,
      product_review_request_delay_minutes: 10_080,
      request_timeout_ms: 10_000,
      template_mappings: {},
      webhook_secret: null,
    })
    Object.assign(service, {
      apiStoreService_: {
        retrieveApiStoreSecrets: vi.fn().mockResolvedValue({
          api_key: "secret-key",
          enabled: true,
        }),
      },
    })

    await expect(service.getRuntimeConfig()).rejects.toThrow(
      "trusted HTTPS origin"
    )
  })
})
