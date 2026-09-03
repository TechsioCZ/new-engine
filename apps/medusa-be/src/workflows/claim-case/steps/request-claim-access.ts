import { createHash, randomInt, randomUUID } from "node:crypto"
import type { CreateNotificationDTO, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CLAIM_CASE_MODULE } from "../../../modules/claim-case"
import type ClaimCaseModuleService from "../../../modules/claim-case/service"
import { resendEmailTemplates } from "../../../modules/resend/templates"
import { resolveNotificationMarketContext } from "../../../utils/notification-market-context"
import type {
  ClaimStepResult,
  RequestClaimAccessInput,
  RequestClaimAccessResult,
} from "../types"

type OrderLookup = {
  billing_address?: { country_code?: string | null } | null
  display_id: null | string
  email: null | string
  id: string
  sales_channel_id?: string | null
  shipping_address?: { country_code?: string | null } | null
}

const ACCESS_TTL_MINUTES = 15
const LEADING_HASH_PATTERN = /^#/

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function parseDisplayId(orderNumber: string) {
  const normalized = orderNumber.trim().replace(LEADING_HASH_PATTERN, "")
  const displayId = Number(normalized)

  return Number.isSafeInteger(displayId) && displayId > 0
    ? displayId
    : undefined
}

export const requestClaimAccessStep = createStep(
  "request-claim-access",
  async (input: RequestClaimAccessInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const displayId = parseDisplayId(input.order_number)
    const normalizedEmail = input.email.trim().toLowerCase()
    const fallbackChallengeId = `claimaccess_fake_${randomUUID()}`

    if (!displayId) {
      return new StepResponse<
        ClaimStepResult<RequestClaimAccessResult>,
        null | string
      >({
        notification_input: [],
        result: { accepted: true, challenge_id: fallbackChallengeId },
      })
    }

    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "sales_channel_id",
        "shipping_address.country_code",
        "billing_address.country_code",
      ],
      filters: {
        display_id: String(displayId),
        sales_channel_id: input.sales_channel_id,
      },
    })
    const orders = data as OrderLookup[]
    const order = orders.find((candidate) =>
      candidate.email
        ? candidate.email.trim().toLowerCase() === normalizedEmail &&
          candidate.sales_channel_id === input.sales_channel_id
        : false
    )

    if (!order) {
      return new StepResponse<
        ClaimStepResult<RequestClaimAccessResult>,
        null | string
      >({
        notification_input: [],
        result: { accepted: true, challenge_id: fallbackChallengeId },
      })
    }

    const marketContext = await resolveNotificationMarketContext(container, {
      countryCode:
        order.shipping_address?.country_code ??
        order.billing_address?.country_code,
      salesChannelId: order.sales_channel_id,
    })
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0")
    const expiresAt = new Date(Date.now() + ACCESS_TTL_MINUTES * 60_000)
    const service = container.resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
    const access = await service.createClaimAccesses({
      attempts: 0,
      code_hash: hashSecret(code),
      email: normalizedEmail,
      expires_at: expiresAt,
      order_id: order.id,
      sales_channel_id: input.sales_channel_id,
    })
    const notificationInput: CreateNotificationDTO[] = [
      {
        channel: "email",
        data: {
          ...marketContext,
          expires_in_minutes: ACCESS_TTL_MINUTES,
          order_display_id: String(order.display_id),
          verification_code: code,
        },
        resource_id: order.id,
        resource_type: "order",
        template: resendEmailTemplates.CLAIM_ACCESS_CODE,
        to: normalizedEmail,
        trigger_type: "claim.order_access_requested",
      },
    ]

    return new StepResponse<
      ClaimStepResult<RequestClaimAccessResult>,
      null | string
    >(
      {
        notification_input: notificationInput,
        result: { accepted: true, challenge_id: access.id },
      },
      access.id
    )
  },
  async (accessId, { container }) => {
    if (!accessId) {
      return
    }

    await container
      .resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
      .deleteClaimAccesses(accessId)
  }
)
