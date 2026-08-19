import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type { CollectionUrlAssignmentResponse } from "../../../../../../modules/storefront-url-assignment/contracts"
import { readPublishedStorefrontAssignment } from "../../../utils"

export async function GET(
  request: MedusaStoreRequest,
  response: MedusaResponse<
    CollectionUrlAssignmentResponse | { message: string }
  >
) {
  const result = await readPublishedStorefrontAssignment(
    request,
    "brand",
    request.params.id ?? ""
  )
  if (result.kind === "missing") {
    return response.status(404).json({ message: "Brand was not found" })
  }
  if (result.kind === "unavailable") {
    return response
      .status(503)
      .json({ message: "Brand availability is temporarily unavailable" })
  }
  return response.json(result.assignment)
}
