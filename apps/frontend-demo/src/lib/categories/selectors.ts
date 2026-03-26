import type { CategoryRegistry } from "./types"

export const getCategoryIdByHandle = (
  registry: CategoryRegistry,
  handle: string
): string | undefined => registry.categoryMapByHandle[handle]?.id

export const getCategoryIdsByHandles = (
  registry: CategoryRegistry,
  handles: string[]
): string[] =>
  handles
    .map((handle) => getCategoryIdByHandle(registry, handle))
    .filter((id): id is string => Boolean(id))
