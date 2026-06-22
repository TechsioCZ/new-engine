import type { StaticImageData } from "next/image"

export type ReviewScores = {
  total?: number
  communication?: number
  deliveryTime?: number
  transportQuality?: number
  pickupTime?: number
  pickupQuality?: number
}

export type ReviewItem = {
  id: string
  author: string
  dateLabel: string
  message?: string
  title?: string
  rating: number
  verifiedPurchase?: boolean
  recommended?: boolean | null
  positivePoints?: readonly string[]
  negativePoints?: readonly string[]
  merchantReply?: {
    message: string
  }
  scores?: ReviewScores
}

export type ReviewTrustSource = {
  id: string
  logo: StaticImageData
  logoAlt: string
  logoWidth: number
  scoreLabel: string
  reviewCountLabel: string
}

export type HomepageReviewsData = {
  reviews: readonly ReviewItem[]
  trustSources: readonly ReviewTrustSource[]
}
