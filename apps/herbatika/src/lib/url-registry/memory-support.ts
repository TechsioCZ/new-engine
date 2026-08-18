import type { UrlRouteKind } from "./model"

export type MemoryIdKind = "route" | "slug" | "static-path" | "audit" | "outbox"

export type InMemoryUrlRegistryOptions = Readonly<{
  now?: () => Date
  createId?: (kind: MemoryIdKind) => string
}>

export const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

export const sortedUnique = (values: readonly string[]) =>
  [...new Set(values)].sort()

export type EquivalenceCandidate = Readonly<{
  market: "sk" | "cz" | "hu" | "ro"
  kind: UrlRouteKind
  equivalenceKey: string | null
  excludedRouteId?: string
}>
