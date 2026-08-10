import googleLogo from "@/assets/third-parties/google.avif"
import heurekaLogo from "@/assets/third-parties/heureka.avif"
import zboziLogo from "@/assets/third-parties/zbozi-seznam.avif"
import type {
  ReviewItem,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"

const REVIEW_AUTHOR_DENISA = "Denisa Sczyrzická"
const REVIEW_DATE_LABEL = "26.11.2025"

export const PRODUCT_REVIEWS: readonly ReviewItem[] = [
  {
    author: REVIEW_AUTHOR_DENISA,
    dateLabel: REVIEW_DATE_LABEL,
    id: "review-denisa",
    message:
      "Veľmi som spokojná s Vilcacorou, účinky sú viditeľné už po týždni používania.",
    rating: 5,
    verifiedPurchase: true,
  },
  {
    author: "Anonymne",
    dateLabel: REVIEW_DATE_LABEL,
    id: "review-anonymous",
    message: "Funguje",
    rating: 5,
  },
  {
    author: "Maria Marton",
    dateLabel: REVIEW_DATE_LABEL,
    id: "review-maria",
    message: "Som spokojna s formulou oleja v globulkach.",
    rating: 5,
    verifiedPurchase: true,
  },
  {
    author: "Jozef Sokolovský",
    dateLabel: REVIEW_DATE_LABEL,
    id: "review-jozef",
    message: "Produkt je kvalitný a veľmi rýchle dodanie odporúčam.",
    rating: 5,
    verifiedPurchase: true,
  },
]

export const HEUREKA_REVIEWS: readonly ReviewItem[] = [
  {
    author: REVIEW_AUTHOR_DENISA,
    dateLabel: REVIEW_DATE_LABEL,
    id: "heureka-review-denisa-delivery",
    message:
      "Veľmi som spokojná s Vilcacorou, účinky sú viditeľné už po týždni používania. Ďakujem!",
    rating: 5,
    title: "Rýchle doručenie",
  },
  {
    author: REVIEW_AUTHOR_DENISA,
    dateLabel: REVIEW_DATE_LABEL,
    id: "heureka-review-denisa-packaging",
    message: "Funguje",
    rating: 5,
    title: "dobre zabalené",
  },
  {
    author: REVIEW_AUTHOR_DENISA,
    dateLabel: REVIEW_DATE_LABEL,
    id: "heureka-review-denisa-ok",
    message: "Ok",
    rating: 5,
  },
  {
    author: REVIEW_AUTHOR_DENISA,
    dateLabel: REVIEW_DATE_LABEL,
    id: "heureka-review-denisa-vilcacora",
    message:
      "Veľmi som spokojná s Vilcacorou, účinky sú viditeľné už po týždni používania. Ďakujem vám Herbatica!",
    rating: 5,
    title: "Rýchle doručenie",
  },
]

export const REVIEW_TRUST_SOURCES: readonly ReviewTrustSource[] = [
  {
    id: "heureka",
    logo: heurekaLogo,
    logoAlt: "Heureka",
    logoWidth: 106,
    reviewCountLabel: "(2129x)",
    scoreLabel: "100%",
  },
  {
    id: "zbozi",
    logo: zboziLogo,
    logoAlt: "Zboží.cz",
    logoWidth: 105,
    reviewCountLabel: "(692x)",
    scoreLabel: "97%",
  },
  {
    id: "google",
    logo: googleLogo,
    logoAlt: "Google",
    logoWidth: 80,
    reviewCountLabel: "(85x)",
    scoreLabel: "5,0/5",
  },
]
