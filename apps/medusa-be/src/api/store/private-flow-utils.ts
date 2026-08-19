import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

type RequestWithStoreContext = MedusaRequest & {
  auth_context?: {
    actor_id?: unknown
    actor_type?: unknown
  } | null
  publishable_key_context?: {
    sales_channel_ids?: unknown
  } | null
}

export const PRIVATE_FLOW_NOT_FOUND_MESSAGE = "Resource was not found."

export const privateFlowNotFound = (): never => {
  throw new MedusaError(
    MedusaError.Types.NOT_FOUND,
    PRIVATE_FLOW_NOT_FOUND_MESSAGE
  )
}

export const setPrivateNoStore = (response: MedusaResponse) => {
  response.setHeader("Cache-Control", "private, no-store")
  response.setHeader("Pragma", "no-cache")
}

export const resolveExactMarketSalesChannelId = (
  request: RequestWithStoreContext
) => {
  const value = request.publishable_key_context?.sales_channel_ids
  const ids = Array.isArray(value) ? value : []
  const uniqueIds = Array.from(
    new Set(
      ids.filter((id): id is string => typeof id === "string" && Boolean(id))
    )
  )

  if (uniqueIds.length !== 1) {
    return privateFlowNotFound()
  }

  return uniqueIds[0] as string
}

export const resolveOptionalCustomerId = (
  request: RequestWithStoreContext
): string | undefined => {
  const auth = request.auth_context

  return auth?.actor_type === "customer" && typeof auth.actor_id === "string"
    ? auth.actor_id
    : undefined
}

export const requireExactBodyString = (body: unknown, key: string): string => {
  if (!(body && typeof body === "object")) {
    return privateFlowNotFound()
  }

  const value = (body as Record<string, unknown>)[key]
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    value.includes("\0")
  ) {
    return privateFlowNotFound()
  }

  return value
}
