import { categoryImagesAtoP } from "./category-images-a-to-p"
import { categoryImagesPtoZ } from "./category-images-p-to-z"

export const categoryImagesBySlug = {
  ...categoryImagesAtoP,
  ...categoryImagesPtoZ,
}

export type CategoryImageSlug = keyof typeof categoryImagesBySlug
