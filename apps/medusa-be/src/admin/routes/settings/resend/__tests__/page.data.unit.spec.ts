import { describe, expect, it } from "vitest"
import { buildMarketConfigState, buildResendConfigSubmitResult } from "../page"

describe("buildMarketConfigState", () => {
  it("defaults all four markets when no configuration exists", () => {
    const state = buildMarketConfigState({})

    expect(Object.keys(state).sort()).toEqual(["cz", "hu", "ro", "sk"])
    expect(state.sk).toEqual({
      from_email: "",
      reply_to: "",
      template_mappings: {},
    })
  })

  it("hydrates only the provided market without touching the others", () => {
    const state = buildMarketConfigState({
      cz: {
        from_email: "cz@example.com",
        reply_to: "cz-reply@example.com",
        template_mappings: { "order-placed": "tmpl-cz" },
      },
    })

    expect(state.cz).toEqual({
      from_email: "cz@example.com",
      reply_to: "cz-reply@example.com",
      template_mappings: { "order-placed": "tmpl-cz" },
    })
    expect(state.sk).toEqual({
      from_email: "",
      reply_to: "",
      template_mappings: {},
    })
    expect(state.hu).toEqual({
      from_email: "",
      reply_to: "",
      template_mappings: {},
    })
    expect(state.ro).toEqual({
      from_email: "",
      reply_to: "",
      template_mappings: {},
    })
  })
})

describe("buildResendConfigSubmitResult", () => {
  const baseForm = {
    apiStoreId: "as_123",
    clearWebhookSecret: false,
    fromEmail: "store@example.com",
    isEnabled: true,
    marketConfigurations: buildMarketConfigState({
      sk: {
        from_email: "sk@example.com",
        reply_to: "sk-reply@example.com",
        template_mappings: { "order-placed": "tmpl-sk" },
      },
    }),
    productReviewDelayMinutes: "10080",
    requestTimeoutMs: "10000",
    templateMappings: { "order-placed": "tmpl-default" },
    webhookSecret: "",
  }

  it("builds a valid payload including per-market configuration", () => {
    const result = buildResendConfigSubmitResult(baseForm)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected ok result")
    }

    expect(result.body).toEqual({
      api_store_id: "as_123",
      from_email: "store@example.com",
      is_enabled: true,
      request_timeout_ms: 10_000,
      product_review_request_delay_minutes: 10_080,
      template_mappings: { "order-placed": "tmpl-default" },
      market_configurations: baseForm.marketConfigurations,
    })
  })

  it("does not lose other markets when only one market is edited", () => {
    const result = buildResendConfigSubmitResult(baseForm)

    if (!result.ok) {
      throw new Error("expected ok result")
    }

    const marketConfigurations = result.body
      .market_configurations as typeof baseForm.marketConfigurations

    expect(marketConfigurations.cz).toEqual({
      from_email: "",
      reply_to: "",
      template_mappings: {},
    })
    expect(marketConfigurations.sk.from_email).toBe("sk@example.com")
  })

  it("rejects a request timeout outside the allowed bounds", () => {
    const result = buildResendConfigSubmitResult({
      ...baseForm,
      requestTimeoutMs: "500",
    })

    expect(result).toEqual({
      error: "Request Timeout must be between 1000 and 120000 ms",
      ok: false,
    })
  })

  it("rejects a review delay outside the allowed bounds", () => {
    const result = buildResendConfigSubmitResult({
      ...baseForm,
      productReviewDelayMinutes: "525601",
    })

    expect(result).toEqual({
      error: "Review Request Delay must be between 0 and 525600 minutes",
      ok: false,
    })
  })

  it("clears the webhook secret when requested", () => {
    const result = buildResendConfigSubmitResult({
      ...baseForm,
      clearWebhookSecret: true,
      webhookSecret: "whsec_should_be_ignored",
    })

    if (!result.ok) {
      throw new Error("expected ok result")
    }

    expect(result.body.webhook_secret).toBeNull()
  })

  it("sets a trimmed webhook secret when provided", () => {
    const result = buildResendConfigSubmitResult({
      ...baseForm,
      webhookSecret: "  whsec_abc123  ",
    })

    if (!result.ok) {
      throw new Error("expected ok result")
    }

    expect(result.body.webhook_secret).toBe("whsec_abc123")
  })

  it("omits webhook_secret from the payload when unchanged", () => {
    const result = buildResendConfigSubmitResult(baseForm)

    if (!result.ok) {
      throw new Error("expected ok result")
    }

    expect(result.body.webhook_secret).toBeUndefined()
  })
})
