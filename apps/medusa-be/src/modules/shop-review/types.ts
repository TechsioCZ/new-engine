export type ShopReviewProvider = "heureka" | "zbozi"
export type HeurekaLocale = "cs" | "sk"
export type HeurekaReviewKind = "product" | "shop"

export type FetchHeurekaShopReviewsInput = {
  locale?: HeurekaLocale
}

export type FetchHeurekaReviewsInput = FetchHeurekaShopReviewsInput & {
  kind?: HeurekaReviewKind
}

export type ShopReviewProviderResponse = {
  body: string
  content_type: string
  provider: ShopReviewProvider
  source_url: string
}

export type ShopReviewTrustSummary = {
  provider: "zbozi"
  review_count: number
  score: number
  updated_at: string
}
