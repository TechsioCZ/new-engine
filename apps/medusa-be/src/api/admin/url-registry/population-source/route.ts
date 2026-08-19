import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { readPopulationSourcePage } from "../population-source"
import type { PopulationSourcePage } from "../population-source-contracts"
import { parsePopulationSourceQuery } from "../population-source-query"

export async function GET(
  request: AuthenticatedMedusaRequest,
  response: MedusaResponse<PopulationSourcePage | { message: string }>
) {
  const query = parsePopulationSourceQuery(request.query)
  if (!query) {
    return response
      .status(400)
      .json({ message: "Invalid population source query" })
  }
  const result = await readPopulationSourcePage(request, query)
  if (result.kind === "invalid") {
    return response.status(400).json({ message: result.message })
  }
  if (result.kind !== "found") {
    return response
      .status(503)
      .json({ message: "Population source is temporarily unavailable" })
  }
  return response.json(result.page)
}
