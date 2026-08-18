import { beforeEach, describe, expect, it, vi } from "vitest"

const run = vi.hoisted(() => vi.fn())
const sendForgotPasswordWorkflow = vi.hoisted(() => vi.fn(() => ({ run })))

vi.mock("../../../../src/workflows/send-forgot-password", () => ({
  sendForgotPasswordWorkflow,
}))

describe("reset password subscriber", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts the storefront workflow only for customer identities", async () => {
    const { default: resetPasswordHandler } = await import(
      "../../../../src/subscribers/reset-password"
    )
    const container = { resolve: vi.fn() }

    await resetPasswordHandler({
      container,
      event: {
        data: {
          actor_type: "customer",
          entity_id: "customer@example.test",
          metadata: { storefront_market_code: " cz " },
          token: "token",
        },
      },
    } as never)

    expect(sendForgotPasswordWorkflow).toHaveBeenCalledWith(container)
    expect(run).toHaveBeenCalledWith({
      input: {
        email: "customer@example.test",
        storefrontMarketCode: "cz",
        token: "token",
      },
    })
  })

  it("preserves the customer-history fallback when reset metadata has no market", async () => {
    const { default: resetPasswordHandler } = await import(
      "../../../../src/subscribers/reset-password"
    )

    await resetPasswordHandler({
      container: { resolve: vi.fn() },
      event: {
        data: {
          actor_type: "customer",
          entity_id: "legacy-customer@example.test",
          metadata: {},
          token: "token",
        },
      },
    } as never)

    expect(run).toHaveBeenCalledWith({
      input: { email: "legacy-customer@example.test", token: "token" },
    })
  })

  it.each([
    "user",
    "admin",
    "",
  ])("ignores non-customer actor type %s", async (actorType) => {
    const { default: resetPasswordHandler } = await import(
      "../../../../src/subscribers/reset-password"
    )

    await resetPasswordHandler({
      container: { resolve: vi.fn() },
      event: {
        data: {
          actor_type: actorType,
          entity_id: "admin@example.test",
          token: "token",
        },
      },
    } as never)

    expect(sendForgotPasswordWorkflow).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })
})
