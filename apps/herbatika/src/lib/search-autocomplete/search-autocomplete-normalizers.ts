import { createBrandSlug } from "@/lib/storefront/brands"

const BRAND_PATH_PATTERN = /\/brands\/([^/]+)/

export const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

export const normalizeComparable = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .toLocaleLowerCase("sk")

export const createHandleLabel = (handle: string) => {
  const label = handle.replaceAll(/[-_]+/g, " ").trim()
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : ""
}

export const resolveBrandSlug = (handle: string, title: string) => {
  const brandPathMatch = BRAND_PATH_PATTERN.exec(handle)
  return createBrandSlug(brandPathMatch?.[1] || handle || title)
}
