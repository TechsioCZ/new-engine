import type {
  IAuthModuleService,
  ProjectConfigOptions,
} from "@medusajs/framework/types"
import {
  AuthWorkflowEvents,
  generateJwtToken,
  Modules,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

const RESET_PASSWORD_TOKEN_TTL_SECONDS = 15 * 60

type WorkflowInput = Readonly<{
  actorType: "customer"
  entityId: string
  jwtOptions?: ProjectConfigOptions["http"]["jwtOptions"]
  marketCode: "sk" | "cz" | "hu" | "ro"
  metadata?: Record<string, unknown>
  provider: "emailpass"
  salesChannelId: string
  secret: ProjectConfigOptions["http"]["jwtSecret"]
}>

type IssueTokenInput = Pick<
  WorkflowInput,
  | "actorType"
  | "entityId"
  | "jwtOptions"
  | "marketCode"
  | "provider"
  | "salesChannelId"
  | "secret"
>

export const createMarketBoundPasswordResetJwt = (
  input: IssueTokenInput & Readonly<{ jti: string }>
) =>
  generateJwtToken(
    {
      actor_type: input.actorType,
      entity_id: input.entityId,
      provider: input.provider,
      purpose: "reset",
      market_code: input.marketCode,
      sales_channel_id: input.salesChannelId,
    },
    {
      expiresIn: `${RESET_PASSWORD_TOKEN_TTL_SECONDS}s`,
      jwtOptions: { ...input.jwtOptions, jwtid: input.jti },
      secret: input.secret,
    }
  )

export const issueMarketBoundResetPasswordTokenStep = createStep(
  "issue-market-bound-reset-password-token",
  async (input: IssueTokenInput, { container }) => {
    const authModule = container.resolve<IAuthModuleService>(Modules.AUTH)
    const { expires_at: expiresAt, jti } =
      await authModule.createPasswordResetToken({
        entity_id: input.entityId,
        provider: input.provider,
        ttl_seconds: RESET_PASSWORD_TOKEN_TTL_SECONDS,
      })
    const token = createMarketBoundPasswordResetJwt({ ...input, jti })

    return new StepResponse(
      { expiresAt: new Date(expiresAt).toISOString(), token },
      { entityId: input.entityId, jti, provider: input.provider }
    )
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }
    try {
      await container
        .resolve<IAuthModuleService>(Modules.AUTH)
        .consumePasswordResetToken({
          entity_id: compensation.entityId,
          jti: compensation.jti,
          provider: compensation.provider,
        })
    } catch {
      // A concurrent completion may already have consumed the token.
    }
  }
)

export const generateMarketBoundResetPasswordTokenWorkflow = createWorkflow(
  "generate-market-bound-reset-password-token",
  (input: WorkflowInput) => {
    const issued = issueMarketBoundResetPasswordTokenStep(input)
    const eventData = transform({ input, issued }, (stepData) => ({
      actor_type: stepData.input.actorType,
      entity_id: stepData.input.entityId,
      metadata: {
        ...(stepData.input.metadata ?? {}),
        storefront_market_code: stepData.input.marketCode,
        storefront_sales_channel_id: stepData.input.salesChannelId,
      },
      token: stepData.issued.token,
    }))
    emitEventStep({
      data: eventData,
      eventName: AuthWorkflowEvents.PASSWORD_RESET,
    })
    return new WorkflowResponse(issued.token)
  }
)
