import { createBrandSlug } from "@/lib/storefront/brands"

const BRAND_PATH_PATTERN = /\/brands\/([^/]+)/

export const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

export const normalizeComparable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sk")

export const createHandleLabel = (handle: string) => {
  const label = handle.replaceAll(/[-_]+/g, " ").trim()
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Kategória"
}

export const resolveBrandSlug = (handle: string, title: string) => {
  const brandPathMatch = handle.match(BRAND_PATH_PATTERN)
  return createBrandSlug(brandPathMatch?.[1] || handle || title)
}
