import type { EntityRouteIdentity, EntityUrlKind } from "./model"

export const URLR_SOURCE_SYSTEM_BY_KIND = {
  article: "payload",
  brand: "medusa",
  campaign: "medusa",
  category: "medusa",
  collection: "medusa",
  page: "payload",
  product: "medusa",
} as const satisfies Record<EntityUrlKind, "medusa" | "payload">

export const createUrlRegistrySourceIdentity = (
  kind: EntityUrlKind,
  sourceId: string
): EntityRouteIdentity => ({
  sourceId,
  sourceSystem: URLR_SOURCE_SYSTEM_BY_KIND[kind],
  sourceType: kind,
  staticRouteKey: null,
  targetType: "entity",
})
