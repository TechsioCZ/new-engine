export type ProductReviewTokenProductStatus =
  | "missing-product-id"
  | "loading"
  | "error"
  | "not-found"
  | "ready"

export type ProductReviewTokenStatusMessage = {
  status: "default" | "warning"
  text: string
}

export const resolveProductStatusMessage = (
  status: ProductReviewTokenProductStatus
): ProductReviewTokenStatusMessage | null => {
  switch (status) {
    case "loading":
      return { status: "default" as const, text: "Načítavam produkt." }
    case "error":
      return {
        status: "warning" as const,
        text: "Produkt sa nepodarilo načítať. Recenziu môžete odoslať aj tak.",
      }
    case "not-found":
      return {
        status: "warning" as const,
        text: "Produkt sa nepodarilo nájsť. Skontrolujte prosím odkaz z emailu.",
      }
    case "missing-product-id":
    case "ready":
      return null
  }
}
