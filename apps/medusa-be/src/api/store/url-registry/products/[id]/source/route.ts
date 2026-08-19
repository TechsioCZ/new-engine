import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  type PublishedProductCatalogSource,
  parseProductCatalogSourceMarket,
  readPublishedProductCatalogSource,
} from "../../../product-source"

const PUBLIC_UNAVAILABLE_MESSAGE =
  "Product availability is temporarily unavailable"

export async function GET(
  request: MedusaStoreRequest,
  response: MedusaResponse<PublishedProductCatalogSource | { message: string }>
) {
  const market = parseProductCatalogSourceMarket(request.query.market)
  if (!market) {
    return response.status(400).json({ message: "Invalid market" })
  }
  const result = await readPublishedProductCatalogSource(
    request,
    request.params.id ?? "",
    market
  )
  if (result.kind === "missing") {
    return response.status(404).json({ message: "Product was not found" })
  }
  if (result.kind === "unavailable") {
    return response.status(503).json({ message: PUBLIC_UNAVAILABLE_MESSAGE })
  }
  return response.json(result.source)
}
