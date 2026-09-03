import { describe, expect, it, vi } from "vitest"
import {
  resendEmailMarketBindings,
  resendEmailMarkets,
  resendEmailTemplateKeys,
} from "../../resend/contracts"
import ResendConfigModuleService from "../service"

const templateMappings = Object.fromEntries(
  resendEmailTemplateKeys.map((template) => [template, `tmpl_${template}`])
)

const marketConfigurations = Object.fromEntries(
  resendEmailMarkets.map((market) => {
    const domain = resendEmailMarketBindings[market].senderDomain
    return [
      market,
      {
        from_email: `Herbatica <notifications@${domain}>`,
        reply_to: `support@${domain}`,
        template_mappings: Object.fromEntries(
          resendEmailTemplateKeys.map((template) => [
            template,
            `tmpl_${market}_${template}`,
          ])
        ),
      },
    ]
  })
)

function createService(record: Record<string, unknown> | undefined) {
  const service = Object.create(
    ResendConfigModuleService.prototype
  ) as ResendConfigModuleService

  vi.spyOn(service, "listResendConfigs").mockResolvedValue(
    record ? [record as never] : []
  )

  return service
}

function createEnabledConfigurationService(
  configuredMarkets: Record<string, unknown>
) {
  const record = {
    api_store_id: "apistore_resend",
    api_url: "https://api.resend.com",
    configuration_key: "default",
    from_email: null,
    id: "resend_config_1",
    is_enabled: false,
    market_configurations: configuredMarkets,
    product_review_request_delay_minutes: 10_080,
    request_timeout_ms: 10_000,
    template_mappings: {},
    webhook_secret: null,
  }
  const service = createService(record)
  Object.assign(service, {
    apiStoreService_: {
      retrieveApiStoreConfig: vi.fn().mockResolvedValue({
        enabled: true,
        has_api_key: true,
        id: "apistore_resend",
      }),
    },
  })
  vi.spyOn(service, "updateResendConfigs").mockImplementation(
    async (input) => ({ ...record, ...input }) as never
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

  it("returns exact four-market sender, reply-to, and template routing without a global sender", async () => {
    const service = createService({
      api_store_id: "apistore_resend",
      api_url: "https://api.resend.com",
      from_email: null,
      is_enabled: true,
      market_configurations: marketConfigurations,
      product_review_request_delay_minutes: 10_080,
      request_timeout_ms: 10_000,
      template_mappings: {},
      webhook_secret: null,
    })
    Object.assign(service, {
      apiStoreService_: {
        retrieveApiStoreSecrets: vi.fn().mockResolvedValue({
          api_key: " secret-key ",
          enabled: true,
        }),
      },
    })

    const runtime = await service.getRuntimeConfig()

    expect(runtime.api_key).toBe("secret-key")
    expect(runtime.from_email).toBe("")
    expect(runtime.market_configurations).toEqual(marketConfigurations)
  })

  it("rejects a persisted market sender tuple cross-wired to another domain", async () => {
    const service = createService({
      api_store_id: "apistore_resend",
      api_url: "https://api.resend.com",
      from_email: null,
      is_enabled: true,
      market_configurations: {
        ...marketConfigurations,
        hu: {
          ...marketConfigurations.hu,
          reply_to: "support@herbatica.ro",
        },
      },
      product_review_request_delay_minutes: 10_080,
      request_timeout_ms: 10_000,
      template_mappings: templateMappings,
      webhook_secret: null,
    })

    await expect(service.getRuntimeConfig()).rejects.toThrow(
      "HU From Email and Reply-To must use herbatica.hu"
    )
  })

  it("enables Resend only with the complete exact four-market tuple", async () => {
    const service = createEnabledConfigurationService(marketConfigurations)

    await expect(
      service.updateConfig({ is_enabled: true })
    ).resolves.toMatchObject({
      is_enabled: true,
      market_configurations: marketConfigurations,
    })
  })

  it.each([
    [
      "one market is missing",
      Object.fromEntries(
        Object.entries(marketConfigurations).filter(
          ([market]) => market !== "ro"
        )
      ),
      "configuring every email template for all four markets",
    ],
    [
      "one template is missing",
      {
        ...marketConfigurations,
        cz: {
          ...marketConfigurations.cz,
          template_mappings: {
            ...marketConfigurations.cz.template_mappings,
            "account-setup": "",
          },
        },
      },
      "configuring every email template for all four markets",
    ],
    [
      "a From Email is missing",
      {
        ...marketConfigurations,
        hu: { ...marketConfigurations.hu, from_email: "" },
      },
      "HU From Email and Reply-To must use herbatica.hu",
    ],
    [
      "a Reply-To is missing",
      {
        ...marketConfigurations,
        sk: { ...marketConfigurations.sk, reply_to: "" },
      },
      "SK From Email and Reply-To must use herbatica.sk",
    ],
  ])("refuses enablement when %s", async (_case, configuredMarkets, message) => {
    const service = createEnabledConfigurationService(configuredMarkets)

    await expect(service.updateConfig({ is_enabled: true })).rejects.toThrow(
      message
    )
  })

  it("keeps a legacy global-only configuration disabled", async () => {
    const service = createEnabledConfigurationService({})

    await expect(
      service.updateConfig({
        from_email: "Herbatica <notifications@herbatica.sk>",
        is_enabled: false,
        template_mappings: templateMappings,
      })
    ).resolves.toMatchObject({
      from_email: "Herbatica <notifications@herbatica.sk>",
      is_enabled: false,
      market_configurations: {},
    })
  })

  it("rejects an already-enabled legacy global-only runtime record", async () => {
    const service = createService({
      api_store_id: "apistore_resend",
      api_url: "https://api.resend.com",
      from_email: "Herbatica <notifications@herbatica.sk>",
      is_enabled: true,
      market_configurations: {},
      product_review_request_delay_minutes: 10_080,
      request_timeout_ms: 10_000,
      template_mappings: templateMappings,
      webhook_secret: null,
    })

    await expect(service.getRuntimeConfig()).rejects.toThrow(
      "complete sender and template configuration for all four markets"
    )
  })
})
