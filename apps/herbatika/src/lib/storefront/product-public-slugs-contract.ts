export type ProductPublicSlugsResponse = Readonly<{
  mode: "handles" | "registry"
  slugs_by_id: Readonly<Record<string, string>>
}>

export const PRODUCT_PUBLIC_SLUGS_GATEWAY_PATH =
  "/api/storefront/product/public-slugs"

export const PRODUCT_PUBLIC_SLUGS_MAX_IDS = 48

const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$/

export const isValidProductSourceId = (value: string): boolean =>
  SOURCE_ID_PATTERN.test(value)

export const parseProductPublicSlugsResponse = (
  payload: unknown
): ProductPublicSlugsResponse => {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid product public slugs response.")
  }
  const { mode, slugs_by_id: slugsById } = payload as {
    mode?: unknown
    slugs_by_id?: unknown
  }
  if (mode !== "handles" && mode !== "registry") {
    throw new Error("Invalid product public slugs response mode.")
  }
  if (typeof slugsById !== "object" || slugsById === null) {
    throw new Error("Invalid product public slugs response map.")
  }
  const entries = Object.entries(slugsById).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  )
  return { mode, slugs_by_id: Object.fromEntries(entries) }
}
