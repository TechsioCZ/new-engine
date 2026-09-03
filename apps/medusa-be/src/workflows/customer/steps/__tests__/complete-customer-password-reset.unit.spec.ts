import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowSdkMock = vi.hoisted(() => {
  class StepResponse<TOutput> {
    output: TOutput

    constructor(output: TOutput) {
      this.output = output
    }
  }

  return {
    StepResponse,
    steps: new Map<string, (...args: unknown[]) => unknown>(),
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  StepResponse: workflowSdkMock.StepResponse,
  createStep: vi.fn(
    (name: string, handler: (...args: unknown[]) => unknown) => {
      workflowSdkMock.steps.set(name, handler)
      return handler
    }
  ),
}))

type ResetToken = {
  entity_id: string
  expires_at?: Date | null | string
  provider_identity: {
    entity_id: string
    provider: string
  }
}

const validResetToken = (): ResetToken => ({
  entity_id: "customer@example.test",
  expires_at: new Date(Date.now() + 60_000),
  provider_identity: {
    entity_id: "customer@example.test",
    provider: "emailpass",
  },
})

function createResetContext(token: ResetToken) {
  const updateProvider = vi.fn().mockResolvedValue({
    authIdentity: { id: "auth_identity_123" },
    success: true,
  })
  const consumePasswordResetToken = vi.fn().mockResolvedValue(undefined)
  const authModuleService = {
    consumePasswordResetToken,
    updateProvider,
  }
  const raw = vi.fn().mockResolvedValue(undefined)
  const database = {
    transaction: vi.fn(
      async (task: (connection: { raw: typeof raw }) => Promise<unknown>) =>
        task({ raw })
    ),
  }
  const graph = vi.fn().mockResolvedValue({ data: [token] })
  const container = {
    resolve: vi
      .fn()
      .mockReturnValueOnce(authModuleService)
      .mockReturnValueOnce(database)
      .mockReturnValueOnce({ graph }),
  }

  return {
    consumePasswordResetToken,
    container,
    graph,
    raw,
    updateProvider,
  }
}

const resetInput = {
  entity_id: "customer@example.test",
  jti: "reset-jti-123",
  password: "new-password",
}

describe("complete customer password reset step", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await import("../complete-customer-password-reset")
  })

  it.each([
    { expires_at: undefined, label: "missing" },
    { expires_at: null, label: "null" },
    { expires_at: "not-a-date", label: "malformed" },
    { expires_at: new Date(Number.NaN), label: "non-finite" },
  ])("rejects a token with $label expires_at before any auth mutation", async ({
    expires_at: expiresAt,
  }) => {
    const token = validResetToken()
    const tokenUnderTest =
      expiresAt === undefined
        ? {
            entity_id: token.entity_id,
            provider_identity: token.provider_identity,
          }
        : { ...token, expires_at: expiresAt }
    const { consumePasswordResetToken, container, updateProvider } =
      createResetContext(tokenUnderTest)
    const step = workflowSdkMock.steps.get("complete-customer-password-reset")

    expect(step).toBeDefined()
    await expect(step?.(resetInput, { container })).rejects.toThrow(
      "Resource was not found."
    )
    expect(updateProvider).not.toHaveBeenCalled()
    expect(consumePasswordResetToken).not.toHaveBeenCalled()
  })

  it("leaves the token retriable when the provider update fails", async () => {
    const firstAttempt = createResetContext(validResetToken())
    firstAttempt.updateProvider.mockResolvedValueOnce({
      authIdentity: undefined,
      error: "Provider update failed",
      success: false,
    })
    const step = workflowSdkMock.steps.get("complete-customer-password-reset")

    expect(step).toBeDefined()
    await expect(
      step?.(resetInput, { container: firstAttempt.container })
    ).rejects.toThrow("Provider update failed")
    expect(firstAttempt.consumePasswordResetToken).not.toHaveBeenCalled()

    const retry = createResetContext(validResetToken())
    const result = (await step?.(resetInput, {
      container: retry.container,
    })) as { output: { auth_identity_id: string } }

    expect(result.output).toEqual({ auth_identity_id: "auth_identity_123" })
    expect(retry.updateProvider).toHaveBeenCalledOnce()
    expect(retry.consumePasswordResetToken).toHaveBeenCalledOnce()
  })
})
