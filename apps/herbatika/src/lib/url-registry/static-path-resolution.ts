import { UrlRegistryError } from "./errors"
import type { StaticRoutePath, StaticRouteSnapshot } from "./model"
import type {
  SourceReadResult,
  StaticRouteResolution,
  StaticRouteResolveInput,
} from "./reads"
import { buildStaticSegments } from "./static-route-segments"

type Candidate = Readonly<{
  matchedPath: readonly [StaticRoutePath, ...StaticRoutePath[]]
  remainderSegments: readonly string[]
  snapshot: StaticRouteSnapshot
}>

type ResolutionIndex = Readonly<{
  activeByKey: ReadonlyMap<string, StaticRouteSnapshot>
  pathsByParent: ReadonlyMap<string | null, readonly StaticRoutePath[]>
}>

const MAX_PUBLIC_PATH_SEGMENTS = 32
const MAX_PUBLIC_SEGMENT_LENGTH = 256

const assertInput = (input: StaticRouteResolveInput) => {
  if (!(["sk", "cz", "hu", "ro"] as const).includes(input.market)) {
    throw new UrlRegistryError("INVALID_COMMAND", "Unsupported market")
  }
  if (
    !Array.isArray(input.pathSegments) ||
    input.pathSegments.length > MAX_PUBLIC_PATH_SEGMENTS
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      `pathSegments accepts at most ${MAX_PUBLIC_PATH_SEGMENTS} segments`
    )
  }
  for (const segment of input.pathSegments) {
    if (
      typeof segment !== "string" ||
      segment.length === 0 ||
      segment.length > MAX_PUBLIC_SEGMENT_LENGTH ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      [...segment].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint <= 0x1f || codePoint === 0x7f
      })
    ) {
      throw new UrlRegistryError(
        "INVALID_COMMAND",
        "Invalid public path segment"
      )
    }
  }
}

const normalizedStaticSegment = (segment: string) => segment.toLowerCase()

const appendMatchedPath = (
  ancestors: readonly StaticRoutePath[],
  path: StaticRoutePath
): readonly [StaticRoutePath, ...StaticRoutePath[]] => {
  const first = ancestors[0]
  return first ? [first, ...ancestors.slice(1), path] : [path]
}

const chooseCandidate = (
  candidates: readonly Candidate[]
): SourceReadResult<Candidate> => {
  if (candidates.length === 0) {
    return { kind: "missing" }
  }
  const maximumDepth = Math.max(
    ...candidates.map((candidate) => candidate.matchedPath.length)
  )
  const deepest = candidates.filter(
    (candidate) => candidate.matchedPath.length === maximumDepth
  )
  if (deepest.length !== 1) {
    return {
      causeCode: "AMBIGUOUS_STATIC_PATH_RESOLUTION",
      kind: "invalid-response",
    }
  }
  return { kind: "found", value: deepest[0] }
}

const indexSnapshots = (
  snapshots: readonly StaticRouteSnapshot[],
  market: StaticRouteResolveInput["market"]
): SourceReadResult<ResolutionIndex> => {
  const activeByKey = new Map<string, StaticRouteSnapshot>()
  const pathsByParent = new Map<string | null, StaticRoutePath[]>()
  for (const routeSnapshot of snapshots) {
    if (routeSnapshot.route.market !== market) {
      return {
        causeCode: "CROSS_MARKET_STATIC_ROUTE",
        kind: "invalid-response",
      }
    }
    if (routeSnapshot.route.status !== "active") {
      continue
    }
    const routeKey = routeSnapshot.route.staticRouteKey
    if (activeByKey.has(routeKey)) {
      return {
        causeCode: "DUPLICATE_ACTIVE_STATIC_ROUTE_KEY",
        kind: "invalid-response",
      }
    }
    activeByKey.set(routeKey, routeSnapshot)
    for (const path of routeSnapshot.pathHistory) {
      if (path.market !== market || path.routeKey !== routeKey) {
        return {
          causeCode: "INVALID_STATIC_PATH_PROJECTION",
          kind: "invalid-response",
        }
      }
      const paths = pathsByParent.get(path.parentRouteKey) ?? []
      paths.push(path)
      pathsByParent.set(path.parentRouteKey, paths)
    }
  }
  return { kind: "found", value: { activeByKey, pathsByParent } }
}

const collectCandidates = (
  index: ResolutionIndex,
  pathSegments: readonly string[]
): readonly Candidate[] => {
  const candidates: Candidate[] = []
  const visit = (
    path: StaticRoutePath,
    ancestors: readonly StaticRoutePath[],
    inputIndex: number,
    visited: ReadonlySet<string>
  ) => {
    const routeSnapshot = index.activeByKey.get(path.routeKey)
    if (!routeSnapshot || visited.has(path.routeKey)) {
      return
    }
    if (
      normalizedStaticSegment(pathSegments[inputIndex] ?? "") !== path.segment
    ) {
      return
    }
    const nextPath = appendMatchedPath(ancestors, path)
    const nextInputIndex = inputIndex + 1
    const suffix = pathSegments.slice(nextInputIndex)
    if (
      (path.matchMode === "exact" && suffix.length === 0) ||
      path.matchMode === "prefix"
    ) {
      candidates.push({
        matchedPath: nextPath,
        remainderSegments: suffix,
        snapshot: routeSnapshot,
      })
    }
    if (suffix.length === 0) {
      return
    }
    const nextVisited = new Set(visited).add(path.routeKey)
    for (const child of index.pathsByParent.get(path.routeKey) ?? []) {
      visit(child, nextPath, nextInputIndex, nextVisited)
    }
  }

  for (const rootPath of index.pathsByParent.get(null) ?? []) {
    visit(rootPath, [], 0, new Set())
  }
  return candidates
}

export const resolveStaticRouteSnapshots = (
  snapshots: readonly StaticRouteSnapshot[],
  input: StaticRouteResolveInput
): SourceReadResult<StaticRouteResolution> => {
  assertInput(input)
  if (input.pathSegments.length === 0) {
    return { kind: "missing" }
  }
  const index = indexSnapshots(snapshots, input.market)
  if (index.kind !== "found") {
    return index
  }
  const selected = chooseCandidate(
    collectCandidates(index.value, input.pathSegments)
  )
  if (selected.kind !== "found") {
    return selected
  }
  const {
    matchedPath,
    remainderSegments,
    snapshot: routeSnapshot,
  } = selected.value
  const canonicalStaticSegments = buildStaticSegments(
    routeSnapshot,
    index.value.activeByKey
  )
  if (!canonicalStaticSegments) {
    return {
      causeCode: "INVALID_STATIC_PUBLIC_PROJECTION_HIERARCHY",
      kind: "invalid-response",
    }
  }
  if (
    remainderSegments.length > 0 &&
    routeSnapshot.currentPath.matchMode !== "prefix"
  ) {
    return { kind: "missing" }
  }
  const [canonicalRoot, ...canonicalDescendants] = canonicalStaticSegments
  const canonicalPathSegments: readonly [string, ...string[]] = [
    canonicalRoot,
    ...canonicalDescendants,
    ...remainderSegments,
  ]
  return {
    kind: "found",
    value: {
      canonicalPathSegments,
      disposition: matchedPath.some((path) => path.disposition === "alias")
        ? "alias"
        : "current",
      matchedPath,
      remainderSegments,
      route: routeSnapshot.route,
    },
  }
}
