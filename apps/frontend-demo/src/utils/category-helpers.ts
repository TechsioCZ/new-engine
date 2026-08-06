import type { Category } from "@/lib/server/categories"
import { categoryMap } from "@/lib/static-data/categories"

const categoriesById: Record<string, Category> = categoryMap

export const getCategoryIdByHandle = (handle: string): string | undefined =>
  Object.values(categoriesById).find((cat) => cat.handle === handle)?.id

export const getCategoryIdsByHandles = (handles: string[]): string[] =>
  handles
    .map((handle) => getCategoryIdByHandle(handle))
    .filter((id) => id !== undefined)
