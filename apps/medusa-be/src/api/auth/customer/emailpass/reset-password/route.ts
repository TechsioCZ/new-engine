import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { generateMarketBoundResetPasswordTokenWorkflow } from "../../../../../workflows/generate-market-bound-reset-password-token"
import { setPrivateNoStore } from "../../../../store/private-flow-utils"
import { resolveExactPasswordResetMarketAuthority } from "./market-authority"

type ResetPasswordRequestBody = Readonly<{
  identifier: string
  metadata?: Record<string, unknown>
}>

type ResetPasswordRequest = MedusaRequest & {
  validatedBody: ResetPasswordRequestBody
}

export async function POST(
  request: ResetPasswordRequest,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const authority = await resolveExactPasswordResetMarketAuthority(request)
  const { identifier, metadata } = request.validatedBody
  const { http } = request.scope.resolve(
    ContainerRegistrationKeys.CONFIG_MODULE
  ).projectConfig

  await generateMarketBoundResetPasswordTokenWorkflow(request.scope).run({
    input: {
      actorType: "customer",
      entityId: identifier,
      jwtOptions: http.jwtOptions,
      marketCode: authority.marketCode,
      metadata: {
        ...(metadata ?? {}),
        storefront_market_code: authority.marketCode,
        storefront_sales_channel_id: authority.salesChannelId,
      },
      provider: "emailpass",
      salesChannelId: authority.salesChannelId,
      secret: http.jwtSecret,
    },
    throwOnError: false,
  })

  response.sendStatus(201)
}
