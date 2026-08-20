import type { RegisterGoneRequest, UrlRegistryCommand } from "../contracts"
import { UrlRegistryError } from "../errors"
import type { GoneCommandDraft } from "./command-finalizer"
import {
  assertEntityKind,
  assertInteger,
  assertMarket,
  assertSegment,
  assertUuid,
} from "./input-validation"
import { parseEntitySlugValue } from "./row-codec"
import type { SqlExecutor } from "./sql"
import { SLUG_COLUMNS } from "./sql-fragments"

export const registerGoneSlug = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<RegisterGoneRequest>,
  createId: () => string
): Promise<GoneCommandDraft> => {
  const { request } = command
  if (request.expectedVersion !== 0) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Register-gone expectedVersion must be 0"
    )
  }
  assertMarket(request.slug.market)
  assertEntityKind(request.slug.kind)
  assertSegment(request.slug.normalizedSlug, "normalizedSlug")
  assertInteger(request.slug.normalizationVersion, "normalizationVersion", 1)
  const slugId = createId()
  assertUuid(slugId, "generated slugId")
  const inserted = await executor.query(
    `INSERT INTO url_registry.url_entity_slug (
       id, market, kind, normalized_slug, route_id, disposition,
       normalization_version
     ) VALUES ($1, $2, $3, $4, NULL, 'gone', $5)
     RETURNING ${SLUG_COLUMNS}`,
    [
      slugId,
      request.slug.market,
      request.slug.kind,
      request.slug.normalizedSlug,
      request.slug.normalizationVersion,
    ]
  )
  if (inserted.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Gone slug insert did not return exactly one row"
    )
  }
  const slug = parseEntitySlugValue(inserted.rows[0])
  return {
    kind: "gone",
    slug,
    outcome: "applied",
    routeId: null,
    affectedRouteIds: [],
    previousVersion: null,
    resultVersion: null,
    details: {
      market: slug.market,
      kind: slug.kind,
      normalizedSlug: slug.normalizedSlug,
    },
    beforeState: null,
    tags: [
      `feed:${slug.market}`,
      `market:${slug.market}`,
      `navigation:${slug.market}`,
      `route-family:${slug.market}:${slug.kind}`,
      `route-slug:${slug.market}:${slug.kind}:${slug.normalizedSlug}`,
      `sitemap:${slug.market}`,
    ],
  }
}
