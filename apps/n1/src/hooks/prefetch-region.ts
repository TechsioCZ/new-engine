export function shouldResetPrefetchForRegion(
  previousRegionId: string | null | undefined,
  nextRegionId: string | null | undefined
): boolean {
  return previousRegionId !== nextRegionId
}

const PREFETCH_MANAGER_ALLOWED_PATHS = new Set(["/"])

const isPrefetchManagerRouteAllowed = (pathname: string): boolean =>
  PREFETCH_MANAGER_ALLOWED_PATHS.has(pathname)

export function shouldRunRootPrefetch(params: {
  enabled: boolean
  regionId?: string
  hasPrefetched: boolean
}): boolean {
  return Boolean(params.enabled && params.regionId && !params.hasPrefetched)
}

export function shouldRunPrefetchManager(params: {
  pathname: string
  regionId?: string
  hasPrefetched: boolean
}): boolean {
  if (!params.regionId) {
    return false
  }
  if (params.hasPrefetched) {
    return false
  }
  if (!isPrefetchManagerRouteAllowed(params.pathname)) {
    return false
  }
  return true
}
