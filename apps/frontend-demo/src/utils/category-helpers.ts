import type { Category } from "@/lib/server/categories"
import { categoryMap } from "@/lib/static-data/categories"

const categoriesById: Record<string, Category> = categoryMap

export function getCategoryIdByHandle(handle: string): string | undefined {
  return Object.values(categoriesById).find((cat) => cat.handle === handle)?.id
}

export function getCategoryIdsByHandles(handles: string[]): string[] {
  return handles
    .map((handle) => getCategoryIdByHandle(handle))
    .filter((id) => id !== undefined)
}
