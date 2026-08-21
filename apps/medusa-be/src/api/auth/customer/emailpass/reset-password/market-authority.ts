import type { MedusaRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ApiKeyType,
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { jwtVerify } from "jose"
import { resolveNotificationMarketContext } from "../../../../../utils/notification-market-context"
import { privateFlowNotFound } from "../../../../store/private-flow-utils"

type PublishableKeyRecord = Readonly<{
  revoked_at?: Date | string | null
  sales_channels_link?: readonly Readonly<{
    sales_channel_id?: unknown
  }>[]
}>

export type MarketBoundPasswordResetClaims = Readonly<{
  entityId: string
  jti: string
  marketCode: PasswordResetMarketCode
  salesChannelId: string
}>

export type PasswordResetMarketCode = "sk" | "cz" | "hu" | "ro"

export type PasswordResetMarketAuthority = Readonly<{
  marketCode: PasswordResetMarketCode
  salesChannelId: string
}>

const PASSWORD_RESET_MARKETS = new Set<PasswordResetMarketCode>([
  "sk",
  "cz",
  "hu",
  "ro",
])

const readExactHeader = (request: MedusaRequest, name: string) => {
  const value = request.headers[name]
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

export const requirePasswordResetSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Password-reset validation is not configured."
    )
  }
  return secret
}

export const readExactPasswordResetBearerToken = (request: MedusaRequest) => {
  const authorization = readExactHeader(request, "authorization")
  if (!authorization.startsWith("Bearer ")) {
    return privateFlowNotFound()
  }
  const token = authorization.slice("Bearer ".length)
  if (!token || token !== token.trim() || token.includes(" ")) {
    return privateFlowNotFound()
  }
  return token
}

export const resolveExactPasswordResetMarketAuthority = async (
  request: MedusaRequest
): Promise<PasswordResetMarketAuthority> => {
  const publishableApiKey = readExactHeader(request, "x-publishable-api-key")
  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["revoked_at", "sales_channels_link.sales_channel_id"],
    filters: { token: publishableApiKey, type: ApiKeyType.PUBLISHABLE },
    pagination: { take: 2 },
  })
  if (data.length !== 1) {
    return privateFlowNotFound()
  }

  const apiKey = data[0] as PublishableKeyRecord
  if (
    apiKey.revoked_at &&
    new Date(apiKey.revoked_at).getTime() <= Date.now()
  ) {
    return privateFlowNotFound()
  }
  const salesChannelIds = Array.from(
    new Set(
      (apiKey.sales_channels_link ?? [])
        .map((link) => link.sales_channel_id)
        .filter(
          (id): id is string =>
            typeof id === "string" && Boolean(id) && id === id.trim()
        )
    )
  )
  if (salesChannelIds.length !== 1) {
    return privateFlowNotFound()
  }
  const salesChannelId = salesChannelIds[0] as string
  let context: Awaited<ReturnType<typeof resolveNotificationMarketContext>>
  try {
    context = await resolveNotificationMarketContext(request.scope, {
      salesChannelId,
    })
  } catch {
    return privateFlowNotFound()
  }
  if (
    context.sales_channel_id !== salesChannelId ||
    !PASSWORD_RESET_MARKETS.has(context.market_code as PasswordResetMarketCode)
  ) {
    return privateFlowNotFound()
  }
  return {
    marketCode: context.market_code as PasswordResetMarketCode,
    salesChannelId,
  }
}

export const verifyMarketBoundPasswordResetToken = async (
  token: string,
  secret: string,
  expectedAuthority: PasswordResetMarketAuthority
): Promise<MarketBoundPasswordResetClaims> => {
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"]
  try {
    payload = (await jwtVerify(token, new TextEncoder().encode(secret))).payload
  } catch {
    return privateFlowNotFound()
  }

  if (
    payload.actor_type !== "customer" ||
    payload.provider !== "emailpass" ||
    payload.purpose !== "reset" ||
    typeof payload.entity_id !== "string" ||
    !payload.entity_id ||
    typeof payload.jti !== "string" ||
    !payload.jti ||
    payload.market_code !== expectedAuthority.marketCode ||
    payload.sales_channel_id !== expectedAuthority.salesChannelId
  ) {
    return privateFlowNotFound()
  }

  return {
    entityId: payload.entity_id,
    jti: payload.jti,
    marketCode: expectedAuthority.marketCode,
    salesChannelId: expectedAuthority.salesChannelId,
  }
}
