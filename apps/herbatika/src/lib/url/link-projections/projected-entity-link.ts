import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import type { EntityUrlKind } from "@/lib/url-registry/model"

export type PublicSlugProjection = Readonly<{
  publicSlug?: string | null
}>

/**
 * Builds an entity link only from a URL-registry projection. Source handles,
 * CMS slugs, and display titles are deliberately not accepted as fallbacks.
 */
export const buildProjectedEntityPath = (
  kind: EntityUrlKind,
  projection: PublicSlugProjection | null | undefined,
  market: Market
): string | null => {
  const publicSlug = projection?.publicSlug
  return publicSlug ? buildPath({ kind, slug: publicSlug }, market) : null
}
