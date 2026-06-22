import googleLogo from "@/assets/third-parties/google.avif"
import heurekaLogo from "@/assets/third-parties/heureka.avif"
import verifiedCustomerBadge from "@/assets/third-parties/overeny-zakaznik.avif"
import zboziLogo from "@/assets/third-parties/zbozi-seznam.avif"
import type {
  ReviewItem,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"

export const PRODUCT_REVIEWS: readonly ReviewItem[] = [
  {
    id: "review-denisa",
    author: "Denisa Sczyrzická",
    dateLabel: "26.11.2025",
    message:
      "Veľmi som spokojná s Vilcacorou, účinky sú viditeľné už po týždni používania.",
    rating: 5,
    verifiedPurchase: true,
  },
  {
    id: "review-anonymous",
    author: "Anonymne",
    dateLabel: "26.11.2025",
    message: "Funguje",
    rating: 5,
  },
  {
    id: "review-maria",
    author: "Maria Marton",
    dateLabel: "26.11.2025",
    message: "Som spokojna s formulou oleja v globulkach.",
    rating: 5,
    verifiedPurchase: true,
  },
  {
    id: "review-jozef",
    author: "Jozef Sokolovský",
    dateLabel: "26.11.2025",
    message: "Produkt je kvalitný a veľmi rýchle dodanie odporúčam.",
    rating: 5,
    verifiedPurchase: true,
  },
]

export const REVIEW_TRUST_SOURCES: readonly ReviewTrustSource[] = [
  {
    id: "heureka",
    logo: heurekaLogo,
    logoAlt: "Heureka",
    logoWidth: 106,
    scoreLabel: "100%",
    reviewCountLabel: "(2129x)",
  },
  {
    id: "zbozi",
    logo: zboziLogo,
    logoAlt: "Zboží.cz",
    logoWidth: 105,
    scoreLabel: "97%",
    reviewCountLabel: "(692x)",
  },
  {
    id: "google",
    logo: googleLogo,
    logoAlt: "Google",
    logoWidth: 80,
    scoreLabel: "5,0/5",
    reviewCountLabel: "(85x)",
  },
]

export const REVIEW_VERIFIED_CUSTOMER_BADGE = verifiedCustomerBadge
