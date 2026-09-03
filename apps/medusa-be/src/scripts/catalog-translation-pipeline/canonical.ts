import { createHash } from "node:crypto"

export const stableCatalogTranslationJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableCatalogTranslationJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}:${stableCatalogTranslationJson(child)}`
      )
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

export const hashCatalogTranslationValue = (value: unknown) =>
  createHash("sha256").update(stableCatalogTranslationJson(value)).digest("hex")

export const hashCatalogTranslationBytes = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex")
