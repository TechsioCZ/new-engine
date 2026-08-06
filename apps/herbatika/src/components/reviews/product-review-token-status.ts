export type ProductReviewTokenProductStatus =
  | "missing-product-id"
  | "loading"
  | "error"
  | "not-found"
  | "ready"

export const resolveProductStatusMessage = (
  status: ProductReviewTokenProductStatus,
  messages: {
    loadFailed: string
    loading: string
    notFound: string
  },
) => {
  if (status === "loading") {
    return { status: "default" as const, text: messages.loading }
  }
  if (status === "error") {
    return {
      status: "warning" as const,
      text: messages.loadFailed,
    }
  }
  if (status === "not-found") {
    return {
      status: "warning" as const,
      text: messages.notFound,
    }
  }

  return null
}
