import { categoryImagesAtoK } from "./category-images-a-to-k"
import { categoryImagesLtoP } from "./category-images-l-to-p"
import { categoryImagesPtoR } from "./category-images-p-to-r"
import { categoryImagesStoZ } from "./category-images-s-to-z"

export const categoryImagesBySlug = {
  ...categoryImagesAtoK,
  ...categoryImagesLtoP,
  ...categoryImagesPtoR,
  ...categoryImagesStoZ,
}

export type CategoryImageSlug = keyof typeof categoryImagesBySlug
