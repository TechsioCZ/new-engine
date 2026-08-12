import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { cleanSearchText } from "../../../../../modules/meilisearch/documents"
import { persistedSearchProfileToRuntime } from "../../../../../modules/meilisearch/profiles"
import {
  buildProductResultFilter,
  isAcceptedProductHit,
} from "../../../../../modules/meilisearch/search-results"
import { MEILISEARCH } from "../../../../../workflows/meilisearch"
import {
  getSearchProfileService,
  retrieveSearchProfileOrThrow,
} from "../../utils"
import type { AdminSearchProfileTestSchemaType } from "../../validators"

export async function POST(
  request: MedusaRequest<AdminSearchProfileTestSchemaType>,
  response: MedusaResponse
) {
  const service = getSearchProfileService(request.scope)
  const persisted = await retrieveSearchProfileOrThrow(
    service,
    request.params.id ?? ""
  )
  const profile = persistedSearchProfileToRuntime(persisted)
  const { limit, type } = request.validatedBody
  const query = cleanSearchText(request.validatedBody.query)
  const meilisearch = request.scope.resolve<MeiliSearchService>(MEILISEARCH)
  const result = await meilisearch.search(profile.indexes[type], query, {
    paginationOptions: { limit, offset: 0 },
    filter:
      type === "product"
        ? buildProductResultFilter(profile.separateVariantResults, query)
        : undefined,
    additionalOptions: {
      showRankingScore: true,
      ...(type === "product" && !query
        ? { sort: ["facet_popularity:desc"] }
        : {}),
    },
  })
  const hits = Array.isArray(result.hits) ? result.hits : []
  const acceptedHits =
    type === "product" && query
      ? hits.filter((hit) =>
          isAcceptedProductHit(
            hit,
            query,
            profile.minimumRankingScore,
            profile.strict
          )
        )
      : hits

  response.json({
    profile: profile.key,
    type,
    query,
    minimum_ranking_score:
      type === "product" ? profile.minimumRankingScore : null,
    hits: acceptedHits,
    raw_hit_count: hits.length,
    processing_time_ms:
      (result as unknown as { processingTimeMs?: number }).processingTimeMs ??
      null,
  })
}
