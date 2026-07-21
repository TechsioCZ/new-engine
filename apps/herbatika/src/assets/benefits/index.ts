import type { StaticImageData } from "next/image"
import type {
  HomepageBenefitTranslationKey,
} from "@/components/homepage/homepage.data.types"
import delivery from "./doprava.avif"
import products from "./produkty.avif"
import returns from "./vraceni.avif"
import customers from "./zakaznici.avif"

type BenefitDefinition = {
  id: number
  image: StaticImageData
  translationKey: HomepageBenefitTranslationKey
}

export const BENEFITS = [
  {
    id: 1,
    image: delivery,
    translationKey: "home.benefits.fast_delivery",
  },
  {
    id: 2,
    image: returns,
    translationKey: "home.benefits.satisfaction_guarantee",
  },
  {
    id: 3,
    image: products,
    translationKey: "home.benefits.own_products",
  },
  {
    id: 4,
    image: customers,
    translationKey: "home.benefits.trusted_customers",
  },
] satisfies readonly BenefitDefinition[]
