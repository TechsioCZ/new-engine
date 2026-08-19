import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  type CatalogTranslationProof,
  isCatalogMarket,
  isCatalogTranslationEntityKind,
} from "../../../../../../utils/catalog-translation"
import { readAdminCatalogTranslation } from "../../../utils"

export async function GET(
  request: AuthenticatedMedusaRequest,
  response: MedusaResponse<CatalogTranslationProof | { message: string }>
) {
  const entityKind = request.params.entityKind
  const entityId = request.params.id ?? ""
  const market = request.query.market
  if (
    !(isCatalogTranslationEntityKind(entityKind) && isCatalogMarket(market))
  ) {
    return response.status(400).json({ message: "Invalid catalog translation" })
  }

  const result = await readAdminCatalogTranslation(
    request,
    entityKind,
    entityId,
    market
  )
  if (result.kind === "missing") {
    return response.status(404).json({
      message: `Exact ${result.localeCode} Translation record was not found`,
    })
  }
  if (result.kind !== "found") {
    return response
      .status(503)
      .json({ message: "Catalog translation state is temporarily unavailable" })
  }
  return response.json(result.proof)
}
