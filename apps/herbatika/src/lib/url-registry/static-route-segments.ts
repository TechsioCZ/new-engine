import type { StaticRouteSnapshot } from "./model"

export const buildStaticSegments = (
  snapshot: StaticRouteSnapshot,
  byKey: ReadonlyMap<string, StaticRouteSnapshot>
): readonly [string, ...string[]] | null => {
  const segments: string[] = []
  const visited = new Set<string>()
  let current: StaticRouteSnapshot | undefined = snapshot

  while (current) {
    const routeKey = current.route.staticRouteKey
    if (visited.has(routeKey)) {
      return null
    }
    visited.add(routeKey)
    segments.unshift(current.currentPath.segment)
    const parentKey = current.currentPath.parentRouteKey
    if (!parentKey) {
      break
    }
    current = byKey.get(parentKey)
    if (!current) {
      return null
    }
  }

  const first = segments[0]
  return first ? [first, ...segments.slice(1)] : null
}
