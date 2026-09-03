import { createHash } from "node:crypto"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke) => invoke),
  StepResponse: class StepResponse<TPayload> {
    data: TPayload

    constructor(data: TPayload) {
      this.data = data
    }
  },
}))

describe("completeCustomerPasswordResetStep", () => {
  const consumePasswordResetToken = vi.fn()
  const graph = vi.fn()
  const raw = vi.fn()
  const transaction = vi.fn(async (task) => task({ raw }))
  const updateProvider = vi.fn()
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === Modules.AUTH) {
        return { consumePasswordResetToken, updateProvider }
      }
      if (key === ContainerRegistrationKeys.PG_CONNECTION) {
        return { transaction }
      }
      if (key === ContainerRegistrationKeys.QUERY) {
        return { graph }
      }
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
  const input = {
    entity_id: "customer@example.com",
    jti: "jti_reset_1",
    password: "new-secure-password",
  }

  beforeEach(() => {
    consumePasswordResetToken.mockReset().mockResolvedValue(undefined)
    graph.mockReset().mockResolvedValue({
      data: [
        {
          entity_id: input.entity_id,
          expires_at: new Date(Date.now() + 60_000),
          provider_identity: {
            entity_id: input.entity_id,
            provider: "emailpass",
          },
        },
      ],
    })
    raw.mockReset().mockResolvedValue(undefined)
    transaction.mockClear()
    updateProvider.mockReset().mockResolvedValue({
      authIdentity: { id: "auth_identity_1" },
      success: true,
    })
    container.resolve.mockClear()
  })

  const runStep = async () => {
    const { completeCustomerPasswordResetStep } = await import(
      "../../../../../src/workflows/customer/steps/complete-customer-password-reset"
    )
    return await completeCustomerPasswordResetStep(input, { container })
  }

  it("serializes, updates, and consumes one exact emailpass token", async () => {
    const response = await runStep()
    const tokenHash = createHash("sha256").update(input.jti).digest("hex")

    expect(raw).toHaveBeenCalledWith(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [`customer-password-reset:${tokenHash}`]
    )
    expect(graph).toHaveBeenCalledWith({
      entity: "auth_password_reset_token",
      fields: [
        "entity_id",
        "expires_at",
        "provider_identity.entity_id",
        "provider_identity.provider",
      ],
      filters: { token_hash: tokenHash },
      pagination: { take: 1 },
    })
    expect(updateProvider).toHaveBeenCalledWith("emailpass", {
      entity_id: input.entity_id,
      password: input.password,
    })
    expect(consumePasswordResetToken).toHaveBeenCalledWith({
      entity_id: input.entity_id,
      jti: input.jti,
      provider: "emailpass",
    })
    expect(raw.mock.invocationCallOrder[0]).toBeLessThan(
      graph.mock.invocationCallOrder[0]
    )
    expect(graph.mock.invocationCallOrder[0]).toBeLessThan(
      updateProvider.mock.invocationCallOrder[0]
    )
    expect(updateProvider.mock.invocationCallOrder[0]).toBeLessThan(
      consumePasswordResetToken.mock.invocationCallOrder[0]
    )
    expect(response.data).toEqual({ auth_identity_id: "auth_identity_1" })
  })

  it("leaves the token retriable when the provider update fails", async () => {
    updateProvider
      .mockResolvedValueOnce({
        authIdentity: null,
        error: "Invalid password",
        success: false,
      })
      .mockResolvedValueOnce({
        authIdentity: { id: "auth_identity_1" },
        success: true,
      })

    await expect(runStep()).rejects.toMatchObject({
      message: "Invalid password",
      type: MedusaError.Types.UNAUTHORIZED,
    })
    expect(consumePasswordResetToken).not.toHaveBeenCalled()

    await expect(runStep()).resolves.toMatchObject({
      data: { auth_identity_id: "auth_identity_1" },
    })
    expect(consumePasswordResetToken).toHaveBeenCalledOnce()
  })

  it("fails closed before updating for an unknown token", async () => {
    graph.mockResolvedValue({ data: [] })

    await expect(runStep()).rejects.toMatchObject({
      type: MedusaError.Types.NOT_FOUND,
    })
    expect(updateProvider).not.toHaveBeenCalled()
    expect(consumePasswordResetToken).not.toHaveBeenCalled()
  })
})
