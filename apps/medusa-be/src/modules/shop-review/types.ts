export type ShopReviewProvider = "heureka" | "zbozi"
export type HeurekaLocale = "cs" | "sk"

export interface FetchHeurekaShopReviewsInput {
  locale?: HeurekaLocale
}

export interface ShopReviewProviderResponse {
  body: string
  content_type: string
  provider: ShopReviewProvider
  source_url: string
}
