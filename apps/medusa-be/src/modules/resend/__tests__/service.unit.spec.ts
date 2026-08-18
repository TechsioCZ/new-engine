import type { ProviderSendNotificationDTO } from "@medusajs/framework/types"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RESEND_CONFIG_MODULE } from "../../resend-config"
import ResendNotificationProviderService from "../service"

const notification: ProviderSendNotificationDTO = {
  channel: "email",
  data: { locale: "sk-SK", reset_url: "https://shop.example/reset" },
  template: "account-setup",
  to: "customer@example.test",
}

const enabledConfig = {
  api_key: "api-store-key",
  api_url: "https://resend.example/",
  api_store_id: "apistore_resend",
  from_email: "store@example.test",
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
      data: { locale: "hu-HU", reset_url: "https://shop.example/reset" },
    })
    const [url, request] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>

    expect(result).toEqual({ id: "email_123" })
    expect(url).toBe("https://resend.example/emails")
    expect(new Headers(request?.headers).get("authorization")).toBe(
      "Bearer api-store-key"
    )
    expect(body.from).toBe("store@example.test")
    expect(body.subject).toBe("A regisztráció befejezése")
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
        data: { reset_url: "https://shop.example/reset" },
      })
    ).rejects.toThrow("Missing Resend email template variables")
    await expect(
      provider.send({
        ...notification,
        data: { locale: "sk-SK", reset_url: " " },
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
        },
      })
    ).rejects.toThrow("Invalid Resend email template variables")
  })

  it("rejects an unsupported locale", async () => {
    const { provider } = createProvider()

    await expect(
      provider.send({
        ...notification,
        data: { locale: "en-US", reset_url: "https://shop.example/reset" },
      })
    ).rejects.toThrow("Unsupported Resend email locale")
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

  it("rejects an invalid API URL", async () => {
    const { provider } = createProvider({
      ...enabledConfig,
      api_url: "file:///tmp/resend",
    })

    await expect(provider.send(notification)).rejects.toThrow(
      "valid HTTP(S) URL"
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
