import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { resolveGLSCartContext } from "../../../../modules/fulfillment-gls/helpers/cart-context"
import {
  GLS_CLIENT_MODULE,
  type GLSClientModuleService,
} from "../../../../modules/gls-client"
import type { GLSBranch } from "../../../../modules/gls-client/types"
import type { StoreGLSBranchesSchemaType } from "./validators"

const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim()

const matchesSearch = (branch: GLSBranch, query: string): boolean => {
  if (!query) {
    return true
  }

  return normalizeSearchText(
    [
      branch.name,
      branch.nameStreet,
      branch.street,
      branch.city,
      branch.zip,
      branch.id,
    ].join(" ")
  ).includes(query)
}

export async function GET(
  request: MedusaStoreRequest<unknown, StoreGLSBranchesSchemaType>,
  response: MedusaResponse
) {
  if (process.env.FEATURE_GLS_ENABLED !== "1") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "GLS pickup points are unavailable")
  }

  const glsClient =
    request.scope.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)
  const queryService = request.scope.resolve<Query>(
    ContainerRegistrationKeys.QUERY
  )
  const { cart_id: cartId, limit, q: rawQuery } = request.validatedQuery
  const cartContext = await resolveGLSCartContext(queryService, cartId)
  const allowedSalesChannelIds =
    request.publishable_key_context?.sales_channel_ids ?? []
  if (!allowedSalesChannelIds.includes(cartContext.salesChannelId)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart was not found")
  }

  const query = normalizeSearchText(rawQuery ?? "")
  const branches = (await glsClient.getBranches(cartContext.countryCode))
    .filter((branch) => matchesSearch(branch, query))
    .slice(0, limit)

  response.json({ branches })
}
