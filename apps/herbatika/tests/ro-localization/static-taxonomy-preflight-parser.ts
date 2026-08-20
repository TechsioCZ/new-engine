import {
  demoStaticRoutes,
  type StaticTaxonomyPreflightRow,
} from "./static-taxonomy-preflight-contract"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const record = (value: unknown, label: string) => {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  const keys = Object.keys(value).sort()
  if (keys.join("\0") !== [...expected].sort().join("\0")) {
    throw new Error(`${label} has unexpected fields`)
  }
}

const nullableText = (value: unknown, label: string) => {
  if (value === null) {
    return null
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be null or non-empty text`)
  }
  return value
}

const parseCurrentPaths = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value.map((path, index) => {
    const pathLabel = `${label}[${index}]`
    const input = record(path, pathLabel)
    exactKeys(input, ["matchMode", "parentRouteKey", "segment"], pathLabel)
    const matchMode = nullableText(input.matchMode, `${pathLabel}.matchMode`)
    const segment = nullableText(input.segment, `${pathLabel}.segment`)
    if (!(matchMode && segment)) {
      throw new Error(`${pathLabel} fields must be non-null`)
    }
    return {
      matchMode,
      parentRouteKey: nullableText(
        input.parentRouteKey,
        `${pathLabel}.parentRouteKey`
      ),
      segment,
    }
  })
}

const parsePreflightRow = (
  item: unknown,
  index: number,
  expectedKeys: ReadonlySet<string>,
  seen: Set<string>
): StaticTaxonomyPreflightRow => {
  const label = `preflight[${index}]`
  const input = record(item, label)
  exactKeys(
    input,
    [
      "currentPaths",
      "equivalenceKey",
      "indexPolicy",
      "routeId",
      "routeKey",
      "status",
      "version",
    ],
    label
  )
  if (
    typeof input.routeKey !== "string" ||
    !expectedKeys.has(input.routeKey) ||
    seen.has(input.routeKey)
  ) {
    throw new Error(`${label}.routeKey is unexpected or duplicated`)
  }
  seen.add(input.routeKey)
  const currentPaths = parseCurrentPaths(
    input.currentPaths,
    `${label}.currentPaths`
  )
  const routeId = nullableText(input.routeId, `${label}.routeId`)
  const equivalenceKey = nullableText(
    input.equivalenceKey,
    `${label}.equivalenceKey`
  )
  const indexPolicy = nullableText(input.indexPolicy, `${label}.indexPolicy`)
  const status = nullableText(input.status, `${label}.status`)
  const version = input.version
  if (routeId === null) {
    if (
      equivalenceKey !== null ||
      indexPolicy !== null ||
      status !== null ||
      version !== null ||
      currentPaths.length !== 0
    ) {
      throw new Error(`${label} absent route evidence is inconsistent`)
    }
  } else if (
    !(UUID_PATTERN.test(routeId) && Number.isSafeInteger(version)) ||
    Number(version) < 1
  ) {
    throw new Error(`${label} existing route identity/version is invalid`)
  }
  return {
    currentPaths,
    equivalenceKey,
    indexPolicy,
    routeId,
    routeKey: input.routeKey,
    status,
    version: version as null | number,
  }
}

export const parseStaticTaxonomyPreflight = (
  value: unknown
): readonly StaticTaxonomyPreflightRow[] => {
  if (!Array.isArray(value)) {
    throw new Error("Static taxonomy preflight must be an array")
  }
  const expectedKeys = new Set(
    demoStaticRoutes().map((route) => route.routeKey)
  )
  if (value.length !== expectedKeys.size) {
    throw new Error(
      `Static taxonomy preflight must contain ${expectedKeys.size} rows`
    )
  }
  const seen = new Set<string>()
  return value
    .map((item, index) => parsePreflightRow(item, index, expectedKeys, seen))
    .sort((left, right) => left.routeKey.localeCompare(right.routeKey))
}
