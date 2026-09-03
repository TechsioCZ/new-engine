import type { ProviderSendNotificationDTO } from "@medusajs/framework/types"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RESEND_CONFIG_MODULE } from "../../resend-config"
import {
  resendEmailMarketBindings,
  resendEmailMarkets,
  resendEmailTemplateKeys,
} from "../contracts"
import ResendNotificationProviderService from "../service"
import { getResendTemplateDefinition } from "../templates"

const notification: ProviderSendNotificationDTO = {
  channel: "email",
  data: {
    locale: "sk-SK",
    reset_url: "https://shop.example/reset",
    storefront_domain: "herbatica.sk",
  },
  template: "account-setup",
  to: "customer@example.test",
}

const enabledConfig = {
  api_key: "api-store-key",
  api_url: "https://api.resend.com/",
  api_store_id: "apistore_resend",
  from_email: "Herbatica <notifications@herbatica.sk>",
  market_configurations: {
    cz: {
      from_email: "Herbatica <notifications@herbatica.cz>",
      reply_to: "support@herbatica.cz",
      template_mappings: {
        "account-setup": "account-setup-template-id-cz",
      },
    },
    hu: {
      from_email: "Herbatica <notifications@herbatica.hu>",
      reply_to: "support@herbatica.hu",
      template_mappings: {
        "account-setup": "account-setup-template-id-hu",
      },
    },
    ro: {
      from_email: "Herbatica <notifications@herbatica.ro>",
      reply_to: "support@herbatica.ro",
      template_mappings: {
        "account-setup": "account-setup-template-id-ro",
      },
    },
    sk: {
      from_email: "Herbatica <notifications@herbatica.sk>",
      reply_to: "support@herbatica.sk",
      template_mappings: {
        "account-setup": "account-setup-template-id-sk",
      },
    },
  },
  request_timeout_ms: 10_000,
  template_mappings: {
    "account-setup": "account-setup-template-id",
  },
  webhook_secret: null,
}

function createProvider(config: unknown = enabledConfig) {
  const getRuntimeConfig = vi.fn().mockResolvedValue(config)
  const provider = new ResendNotificationProviderService(
    { [RESEND_CONFIG_MODULE]: { getRuntimeConfig } },
    {}
  )

  return { getRuntimeConfig, provider }
}

function createRejectedProvider(error: Error) {
  const getRuntimeConfig = vi.fn().mockRejectedValue(error)
  const provider = new ResendNotificationProviderService(
    { [RESEND_CONFIG_MODULE]: { getRuntimeConfig } },
    {}
  )

  return provider
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  })
}

const criticalTemplateConfiguration = Object.fromEntries(
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

const criticalTemplateData = (
  market: (typeof resendEmailMarkets)[number],
  template: (typeof resendEmailTemplateKeys)[number]
) => {
  const definition = getResendTemplateDefinition(template)
  const data: Record<string, unknown> = {
    country_code: market,
    locale: resendEmailMarketBindings[market].locale,
    market_code: market,
    storefront_domain: resendEmailMarketBindings[market].storefrontDomain,
  }
  for (const variable of definition.requiredVariables) {
    if (variable === "locale") {
      continue
    }
    if (variable === "items" || variable === "products") {
      data[variable] = [{ quantity: 1, title: "Sample" }]
    } else if (variable === "expires_in_minutes") {
      data[variable] = 15
    } else {
      data[variable] = `sample_${variable}`
    }
  }
  return data
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("ResendNotificationProviderService", () => {
  it("does not accept provider options as runtime credentials", () => {
    expect(() =>
      ResendNotificationProviderService.validateOptions({
        api_key: "legacy-key",
      })
    ).not.toThrow()
  })

  it("returns the real Resend id and uses API Store credentials and localized subject", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: "email_123" }))
    vi.stubGlobal("fetch", fetchMock)

    const { provider } = createProvider()
    const result = await provider.send({
      ...notification,
      data: {
        locale: "hu-HU",
        reset_url: "https://shop.example/reset",
        storefront_domain: "herbatica.hu",
      },
    })
    const [url, request] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>

    expect(result).toEqual({ id: "email_123" })
    expect(url).toBe("https://api.resend.com/emails")
    expect(new Headers(request?.headers).get("authorization")).toBe(
      "Bearer api-store-key"
    )
    expect(body.from).toBe("Herbatica <notifications@herbatica.hu>")
    expect(body.reply_to).toBe("support@herbatica.hu")
    expect(body.subject).toBe("A regisztráció befejezése")
    expect(body.template).toEqual({
      id: "account-setup-template-id-hu",
      variables: expect.objectContaining({
        locale: "hu-HU",
        storefront_domain: "herbatica.hu",
      }),
    })
  })

  it.each([
    ["sk-SK", "herbatica.sk", "sk"],
    ["cs-CZ", "herbatica.cz", "cz"],
    ["hu-HU", "herbatica.hu", "hu"],
    ["ro-RO", "herbatica.ro", "ro"],
  ])("routes %s and %s to the exact %s sender and template", async (locale, storefrontDomain, market) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: `email_${market}` }))
    vi.stubGlobal("fetch", fetchMock)

    await createProvider().provider.send({
      ...notification,
      data: {
        locale,
        reset_url: "https://shop.example/reset",
        storefront_domain: storefrontDomain,
      },
    })

    const [, request] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String(request?.body)) as {
      from: string
      reply_to: string
      template: { id: string }
    }
    expect(body).toMatchObject({
      from: `Herbatica <notifications@herbatica.${market}>`,
      reply_to: `support@herbatica.${market}`,
      template: { id: `account-setup-template-id-${market}` },
    })
  })

  it.each([
    [{ locale: "sk-SK" }, "missing domain"],
    [
      { locale: "sk-SK", storefront_domain: "herbatica.cz" },
      "cross-wired domain",
    ],
    [
      { locale: "en-US", storefront_domain: "herbatica.sk" },
      "unsupported locale",
    ],
    [
      { locale: "sk-SK", storefront_domain: "HERBATICA.SK" },
      "non-canonical domain",
    ],
  ])("fails closed for a %s tuple", async (marketData) => {
    const { getRuntimeConfig, provider } = createProvider()

    await expect(
      provider.send({
        ...notification,
        data: {
          ...marketData,
          reset_url: "https://shop.example/reset",
        },
      })
    ).rejects.toThrow("exact supported locale and storefront domain tuple")
    expect(getRuntimeConfig).not.toHaveBeenCalled()
  })

  it("rejects a configured sender or reply-to outside the routed market domain", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)
    const { provider } = createProvider({
      ...enabledConfig,
      market_configurations: {
        ...enabledConfig.market_configurations,
        sk: {
          ...enabledConfig.market_configurations.sk,
          reply_to: "support@herbatica.cz",
        },
      },
    })

    await expect(provider.send(notification)).rejects.toThrow(
      "sender configuration does not match the SK notification market"
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(
    resendEmailMarkets.flatMap((market) =>
      resendEmailTemplateKeys.map((template) => ({ market, template }))
    )
  )("routes $template through the exact $market critical-template configuration", async ({
    market,
    template,
  }) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: `email_${market}_${template}` }))
    vi.stubGlobal("fetch", fetchMock)

    await createProvider({
      ...enabledConfig,
      market_configurations: criticalTemplateConfiguration,
    }).provider.send({
      channel: "email",
      data: criticalTemplateData(market, template),
      template,
      to: "customer@example.test",
    })

    const [, request] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String(request?.body)) as {
      from: string
      reply_to: string
      template: { id: string }
    }
    const domain = resendEmailMarketBindings[market].senderDomain
    expect(body).toMatchObject({
      from: `Herbatica <notifications@${domain}>`,
      reply_to: `support@${domain}`,
      template: { id: `tmpl_${market}_${template}` },
    })
  })

  it.each([
    "market_code",
    "country_code",
  ] as const)("rejects a %s cross-wired to the resolved locale and domain tuple", async (field) => {
    const { getRuntimeConfig, provider } = createProvider()

    await expect(
      provider.send({
        ...notification,
        data: {
          ...notification.data,
          [field]: "cz",
        },
      })
    ).rejects.toThrow("market context is cross-wired")
    expect(getRuntimeConfig).not.toHaveBeenCalled()
  })

  it("rejects a legacy global-only runtime configuration", async () => {
    await expect(
      createProvider({
        ...enabledConfig,
        market_configurations: {},
      }).provider.send(notification)
    ).rejects.toThrow("configuration is missing the SK notification market")
  })

  it("rejects an unsupported notification channel", async () => {
    const { provider } = createProvider()

    await expect(
      provider.send({ ...notification, channel: "feed" })
    ).rejects.toThrow("does not support channel feed")
  })

  it("rejects an empty notification recipient", async () => {
    const { provider } = createProvider()

    await expect(provider.send({ ...notification, to: " " })).rejects.toThrow(
      "recipient is required"
    )
  })

  it("rejects an unknown template", async () => {
    const { provider } = createProvider()

    await expect(
      provider.send({ ...notification, template: "unknown-template" })
    ).rejects.toThrow("Couldn't find a Resend email template")
  })

  it("rejects a missing or empty required template variable", async () => {
    const { provider } = createProvider()

    await expect(
      provider.send({
        ...notification,
        data: {
          locale: "sk-SK",
          storefront_domain: "herbatica.sk",
        },
      })
    ).rejects.toThrow("Missing Resend email template variables")
    await expect(
      provider.send({
        ...notification,
        data: {
          locale: "sk-SK",
          reset_url: " ",
          storefront_domain: "herbatica.sk",
        },
      })
    ).rejects.toThrow("Missing Resend email template variables")
  })

  it("rejects an invalid optional template variable", async () => {
    const { provider } = createProvider()

    await expect(
      provider.send({
        ...notification,
        data: {
          customer_id: new Date(),
          locale: "sk-SK",
          reset_url: "https://shop.example/reset",
          storefront_domain: "herbatica.sk",
        },
      })
    ).rejects.toThrow("Invalid Resend email template variables")
  })

  it("rejects an unsupported locale and domain tuple", async () => {
    const { provider } = createProvider()

    await expect(
      provider.send({
        ...notification,
        data: {
          locale: "en-US",
          reset_url: "https://shop.example/reset",
          storefront_domain: "herbatica.sk",
        },
      })
    ).rejects.toThrow("exact supported locale and storefront domain tuple")
  })

  it("propagates missing or disabled linked Resend configuration errors", async () => {
    const missing = createRejectedProvider(
      new Error("Resend is not configured")
    )
    const disabled = createRejectedProvider(new Error("Resend is disabled"))

    await expect(missing.send(notification)).rejects.toThrow(
      "Resend is not configured"
    )
    await expect(disabled.send(notification)).rejects.toThrow(
      "Resend is disabled"
    )
  })

  it.each([
    "http://api.resend.com",
    "https://resend.example",
    "https://api.resend.com/alternate",
  ])("rejects an untrusted API URL: %s", async (apiUrl) => {
    const { provider } = createProvider({
      ...enabledConfig,
      api_url: apiUrl,
    })

    await expect(provider.send(notification)).rejects.toThrow(
      "trusted HTTPS origin"
    )
  })

  it("rejects transport and API failures", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)

    fetchMock.mockRejectedValueOnce(new Error("network unavailable"))
    await expect(createProvider().provider.send(notification)).rejects.toThrow(
      "network unavailable"
    )

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "template rejected" }, 422)
    )
    await expect(createProvider().provider.send(notification)).rejects.toThrow(
      "status 422: template rejected"
    )
  })

  it("rejects malformed success responses", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)

    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }))
    await expect(createProvider().provider.send(notification)).rejects.toThrow(
      "malformed JSON response"
    )

    fetchMock.mockResolvedValueOnce(jsonResponse({ id: " " }))
    await expect(createProvider().provider.send(notification)).rejects.toThrow(
      "without an email id"
    )
  })

  it("rejects a timed-out request", async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_url, request) =>
        new Promise<Response>((_resolve, reject) => {
          request?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
          )
        })
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = expect(
      createProvider({ ...enabledConfig, request_timeout_ms: 5 }).provider.send(
        notification
      )
    ).rejects.toThrow("timed out after 5ms")
    await vi.advanceTimersByTimeAsync(5)
    await result
  })
})
