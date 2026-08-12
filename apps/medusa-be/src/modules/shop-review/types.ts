export type ShopReviewProvider = "heureka" | "zbozi"
export type HeurekaLocale = "cs" | "sk"

export type FetchHeurekaShopReviewsInput = {
  locale?: HeurekaLocale
}

export type ShopReviewProviderResponse = {
  body: string
  content_type: string
  provider: ShopReviewProvider
  source_url: string
}
