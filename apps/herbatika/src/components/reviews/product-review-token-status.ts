export type ProductReviewTokenProductStatus =
  | "missing-product-id"
  | "loading"
  | "error"
  | "not-found"
  | "ready"

export const resolveProductStatusMessage = (
  status: ProductReviewTokenProductStatus,
  messages: {
    loading: string
    loadFailed: string
    notFound: string
  }
) => {
  switch (status) {
    case "loading":
      return { status: "default" as const, text: messages.loading }
    case "error":
      return {
        status: "warning" as const,
        text: messages.loadFailed,
      }
    case "not-found":
      return {
        status: "warning" as const,
        text: messages.notFound,
      }
    default:
      return null
  }
}
