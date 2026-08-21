import { createHash, randomBytes } from "node:crypto"
import type { CreateNotificationDTO, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CLAIM_CASE_MODULE } from "../../../modules/claim-case"
import type ClaimCaseModuleService from "../../../modules/claim-case/service"
import { resendEmailTemplates } from "../../../modules/resend/templates"
import { resolveCustomerNotificationMarketContext } from "../../../utils/customer-notification-market-context"
import { resolveNotificationMarketContext } from "../../../utils/notification-market-context"
import type {
  ClaimStepResult,
  CreateClaimInput,
  CreateClaimResult,
  VerifiedOrderItem,
} from "../types"

type OrderLookup = {
  billing_address?: { country_code?: string | null } | null
  customer_id: null | string
  display_id: number | string
  email: null | string
  id: string
  items: VerifiedOrderItem[]
  sales_channel_id?: string | null
  shipping_address?: { country_code?: string | null } | null
}

type CompensationInput = {
  access_id?: string
  claim_id: string
  item_ids: string[]
}

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function createCaseNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `RMA-${date}-${randomBytes(4).toString("hex").toUpperCase()}`
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getAdminEmails() {
  return (process.env.CLAIMS_ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function invalidAccessError() {
  return new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Verified order access is invalid or expired."
  )
}

function resolveClaimItems(input: CreateClaimInput, order?: OrderLookup) {
  return input.items.map((requestedItem) => {
    if (!order) {
      if (!requestedItem.title) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Item title is required for a manual claim."
        )
      }
      return {
        order_item_id: null,
        product_id: null,
        quantity: requestedItem.quantity,
        title: requestedItem.title,
        variant_id: null,
      }
    }

    const orderItem = order.items.find(
      (candidate) => candidate.id === requestedItem.order_item_id
    )
    if (!orderItem || requestedItem.quantity > orderItem.quantity) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A selected item or quantity does not belong to the verified order."
      )
    }
    return {
      order_item_id: orderItem.id,
      product_id: orderItem.product_id,
      quantity: requestedItem.quantity,
      title: orderItem.title,
      variant_id: orderItem.variant_id,
    }
  })
}

export const createClaimStep = createStep(
  "create-claim",
  async (input: CreateClaimInput, { container }) => {
    const service = container.resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
    const normalizedEmail = normalizeEmail(input.email)
    let accessId: string | undefined
    let order: OrderLookup | undefined

    if (input.access_token) {
      const access = (
        await service.listClaimAccesses(
          { access_token_hash: hashSecret(input.access_token) },
          { take: 1 }
        )
      )[0]
      if (
        !access?.verified_at ||
        access.used_at ||
        access.expires_at.getTime() <= Date.now() ||
        normalizeEmail(access.email) !== normalizedEmail
      ) {
        throw invalidAccessError()
      }

      const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "email",
          "customer_id",
          "sales_channel_id",
          "shipping_address.country_code",
          "billing_address.country_code",
          "items.id",
          "items.title",
          "items.quantity",
          "items.product_id",
          "items.variant_id",
        ],
        filters: { id: access.order_id },
      })
      order = data[0] as OrderLookup | undefined
      if (!order) {
        throw invalidAccessError()
      }
      accessId = access.id
    }

    const marketContext = order
      ? await resolveNotificationMarketContext(container, {
          countryCode:
            order.shipping_address?.country_code ??
            order.billing_address?.country_code,
          salesChannelId: order.sales_channel_id,
        })
      : await resolveCustomerNotificationMarketContext(container, {
          email: normalizedEmail,
        })
    const resolvedItems = resolveClaimItems(input, order)

    const submittedAt = new Date()
    const caseNumber = createCaseNumber()
    const claim = await service.createClaimCases({
      attachment_urls: input.attachment_urls
        ? { urls: input.attachment_urls }
        : null,
      case_number: caseNumber,
      customer_id: order?.customer_id ?? null,
      defect_description: input.defect_description ?? null,
      defect_discovered_at: input.defect_discovered_at
        ? new Date(input.defect_discovered_at)
        : null,
      email: normalizedEmail,
      order_display_id: order ? String(order.display_id) : input.order_number,
      order_id: order?.id ?? null,
      purchase_details: input.purchase_details ?? null,
      reason: input.reason ?? null,
      requested_resolution: input.requested_resolution ?? null,
      status: "submitted",
      submitted_at: submittedAt,
      type: input.type,
    })
    const items = await service.createClaimItems(
      resolvedItems.map((item) => ({ ...item, claim_id: claim.id }))
    )

    if (accessId) {
      await service.updateClaimAccesses({ id: accessId, used_at: submittedAt })
    }

    const notificationData = {
      ...marketContext,
      case_number: caseNumber,
      case_type: input.type,
      items: resolvedItems.map((item) => ({
        quantity: item.quantity,
        title: item.title,
      })),
      order_display_id: order ? String(order.display_id) : input.order_number,
      requested_resolution: input.requested_resolution,
    }
    const recipients = Array.from(
      new Set([normalizedEmail, ...getAdminEmails()])
    )
    const notificationInput: CreateNotificationDTO[] = recipients.map((to) => ({
      channel: "email",
      data: notificationData,
      receiver_id:
        to === normalizedEmail ? (order?.customer_id ?? undefined) : undefined,
      resource_id: claim.id,
      resource_type: "claim_case",
      template: resendEmailTemplates.CLAIM_CONFIRMATION,
      to,
      trigger_type: "claim.submitted",
    }))

    return new StepResponse<
      ClaimStepResult<CreateClaimResult>,
      CompensationInput
    >(
      {
        notification_input: notificationInput,
        result: { case_number: caseNumber, status: "submitted" },
      },
      {
        access_id: accessId,
        claim_id: claim.id,
        item_ids: items.map((item) => item.id),
      }
    )
  },
  async (input, { container }) => {
    if (!input) {
      return
    }
    const service = container.resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
    if (input.item_ids.length) {
      await service.deleteClaimItems(input.item_ids)
    }
    await service.deleteClaimCases(input.claim_id)
    if (input.access_id) {
      await service.updateClaimAccesses({ id: input.access_id, used_at: null })
    }
  }
)
