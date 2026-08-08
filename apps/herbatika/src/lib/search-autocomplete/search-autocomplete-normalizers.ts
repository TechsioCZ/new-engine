import { createBrandSlug } from "@/lib/storefront/brands"

const BRAND_PATH_PATTERN = /\/brands\/[^/]+/u

export const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

export const createHandleLabel = (handle: string) => {
  const label = handle.replaceAll(/[-_]+/gu, " ").trim()
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : ""
}

export const resolveBrandSlug = (handle: string, title: string) => {
  const brandPath = BRAND_PATH_PATTERN.exec(handle)?.[0]
  const brandSlug = brandPath?.slice("/brands/".length)
  const slugSource =
    brandSlug !== undefined && brandSlug.length > 0 ? brandSlug : handle
  return createBrandSlug(slugSource.length > 0 ? slugSource : title)
}
