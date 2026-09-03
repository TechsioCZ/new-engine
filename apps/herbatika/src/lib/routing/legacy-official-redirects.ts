import { ROUTE_SEGMENT_REGISTRY } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"

/**
 * Legacy category slugs that the official Herbatica storefronts still publish
 * but that this engine can never serve directly.
 *
 * The URL registry slug grammar is `^[a-z0-9-]+$`, so a slug containing an
 * underscore cannot be stored as a registry alias on the owning entity. These
 * paths would otherwise 404 for every inbound link, bookmark, and indexed
 * result that still points at the official slug.
 *
 * The map is keyed by market, then by the raw legacy slug exactly as the
 * official storefront publishes it (lowercase). The value is the current local
 * category slug that owns the same content; the redirect target is rebuilt from
 * the market's own category type prefix, so no market's public grammar is
 * hardcoded here.
 *
 * Operators extend this table by adding entries. Only category paths belong
 * here — static pages keep their own routing (for example `sk:doprava_platby`
 * is a static page and is deliberately absent).
 */
export const LEGACY_OFFICIAL_PATH_REDIRECTS: Readonly<
  Record<Market, Readonly<Record<string, string>>>
> = Object.freeze({
  cz: Object.freeze({}),
  hu: Object.freeze({}),
  ro: Object.freeze({}),
  sk: Object.freeze({
    // Official https://www.herbatica.sk/vlasy_vypadavanie_lupiny/
    // "Podpora a rast vlasov"
    vlasy_vypadavanie_lupiny: "podpora-a-rast-vlasov",
  }),
})

/**
 * Resolve the permanent redirect target for a legacy official category path.
 *
 * Returns the canonical public path for this market, or `null` when the request
 * is not a two-segment category path whose slug is a known legacy slug.
 */
export const resolveLegacyOfficialCategoryRedirect = (
  market: Market,
  segments: readonly string[]
): string | null => {
  if (segments.length !== 2) {
    return null
  }
  const categoriesPrefix =
    ROUTE_SEGMENT_REGISTRY[market].typePrefixes.categories
  if ((segments[0] ?? "").toLowerCase() !== categoriesPrefix) {
    return null
  }
  const target =
    LEGACY_OFFICIAL_PATH_REDIRECTS[market][(segments[1] ?? "").toLowerCase()]
  return target ? `/${categoriesPrefix}/${target}` : null
}
