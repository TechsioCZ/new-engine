import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  InvalidCollectionUrlAssignmentError,
  parseCollectionAssignmentPage,
} from "../../../../../modules/storefront-url-assignment/contracts"
import {
  readPublishedStorefrontAssignmentPage,
  type StorefrontAssignmentPage,
} from "../../utils"

const PUBLIC_UNAVAILABLE_MESSAGE =
  "Collection availability is temporarily unavailable"

export async function GET(
  request: MedusaStoreRequest,
  response: MedusaResponse<StorefrontAssignmentPage | { message: string }>
) {
  let page: { limit: number; offset: number }
  try {
    page = parseCollectionAssignmentPage(request.query)
  } catch (error) {
    if (error instanceof InvalidCollectionUrlAssignmentError) {
      return response.status(400).json({ message: "Invalid pagination" })
    }
    return response.status(503).json({ message: PUBLIC_UNAVAILABLE_MESSAGE })
  }

  const result = await readPublishedStorefrontAssignmentPage(
    request,
    "collection",
    page
  )
  if (result.kind === "unavailable") {
    return response.status(503).json({ message: PUBLIC_UNAVAILABLE_MESSAGE })
  }

  return response.json(result.page)
}
