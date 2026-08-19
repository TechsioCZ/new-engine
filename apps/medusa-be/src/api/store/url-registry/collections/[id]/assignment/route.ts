import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type { CollectionUrlAssignmentResponse } from "../../../../../../modules/storefront-url-assignment/contracts"
import { readPublishedStorefrontAssignment } from "../../../utils"

const PUBLIC_UNAVAILABLE_MESSAGE =
  "Collection availability is temporarily unavailable"

export async function GET(
  request: MedusaStoreRequest,
  response: MedusaResponse<
    CollectionUrlAssignmentResponse | { message: string }
  >
) {
  const result = await readPublishedStorefrontAssignment(
    request,
    "collection",
    request.params.id ?? ""
  )

  if (result.kind === "missing") {
    return response.status(404).json({ message: "Collection was not found" })
  }
  if (result.kind === "unavailable") {
    return response.status(503).json({ message: PUBLIC_UNAVAILABLE_MESSAGE })
  }

  return response.json(result.assignment)
}
