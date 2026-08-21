import type { Market } from "@/lib/url/types"
import {
  type ParsedSegmentRegistryPublication,
  SEGMENT_REGISTRY_PUBLICATION_LOCALE,
  SEGMENT_REGISTRY_PUBLICATION_MARKETS,
  type SegmentRegistryPublicationArtifact,
} from "./contract"
import { parsePublicationRoute } from "./parse-route"
import {
  canonicalPublicationJson,
  hashPublicationBytes,
  publicationExactKeys,
  publicationRecord,
  publicationSha256,
  publicationText,
} from "./primitives"
import {
  currentPublicationTaxonomySha256,
  requiredPublicationRoutes,
} from "./taxonomy"

const parseMarket = (value: unknown): Market => {
  if (
    typeof value !== "string" ||
    !SEGMENT_REGISTRY_PUBLICATION_MARKETS.includes(value as Market)
  ) {
    throw new Error("market is invalid")
  }
  return value as Market
}

export const parseSegmentRegistryPublicationArtifact = (
  contents: string,
  label = "segment-registry G1 publication artifact"
): ParsedSegmentRegistryPublication => {
  let raw: unknown
  try {
    raw = JSON.parse(contents)
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
  if (canonicalPublicationJson(raw) !== contents) {
    throw new Error(`${label} is not canonical JSON with trailing LF`)
  }
  const input = publicationRecord(raw, label)
  publicationExactKeys(
    input,
    [
      "authorization",
      "frozenRegistry",
      "gate",
      "kind",
      "locale",
      "market",
      "readiness",
      "routes",
      "schemaVersion",
      "sourcePlan",
      "status",
      "taxonomySha256",
    ],
    label
  )
  if (
    input.authorization !== "customer-reviewed-static-content" ||
    input.gate !== "G1" ||
    input.kind !== "market-segment-registry-g1-approval" ||
    input.schemaVersion !== 1 ||
    input.status !== "approved"
  ) {
    throw new Error(`${label} identity is invalid`)
  }
  const market = parseMarket(input.market)
  const locale = SEGMENT_REGISTRY_PUBLICATION_LOCALE[market]
  if (input.locale !== locale) {
    throw new Error(`${label}.locale does not match market`)
  }
  const taxonomySha256 = publicationSha256(
    input.taxonomySha256,
    `${label}.taxonomySha256`
  )
  if (taxonomySha256 !== currentPublicationTaxonomySha256()) {
    throw new Error(`${label}.taxonomySha256 does not match this build`)
  }
  const frozenInput = publicationRecord(
    input.frozenRegistry,
    `${label}.frozenRegistry`
  )
  publicationExactKeys(
    frozenInput,
    ["kind", "ref", "sha256"],
    `${label}.frozenRegistry`
  )
  if (
    frozenInput.kind !== "market-route-segment-registry" ||
    frozenInput.ref !== "market-static-content/shared/segment-registry.json"
  ) {
    throw new Error(`${label}.frozenRegistry identity is invalid`)
  }
  const frozenRegistry = {
    kind: "market-route-segment-registry" as const,
    ref: "market-static-content/shared/segment-registry.json" as const,
    sha256: publicationSha256(
      frozenInput.sha256,
      `${label}.frozenRegistry.sha256`
    ),
  }
  const sourceInput = publicationRecord(input.sourcePlan, `${label}.sourcePlan`)
  publicationExactKeys(
    sourceInput,
    ["kind", "planSha256", "ref", "sha256"],
    `${label}.sourcePlan`
  )
  if (sourceInput.kind !== "market-static-content-import-readiness-plan") {
    throw new Error(`${label}.sourcePlan kind is invalid`)
  }
  const sourcePlan = {
    kind: "market-static-content-import-readiness-plan" as const,
    planSha256: publicationSha256(
      sourceInput.planSha256,
      `${label}.sourcePlan.planSha256`
    ),
    ref: publicationText(sourceInput.ref, `${label}.sourcePlan.ref`),
    sha256: publicationSha256(sourceInput.sha256, `${label}.sourcePlan.sha256`),
  }
  const required = requiredPublicationRoutes(market)
  if (!Array.isArray(input.routes) || input.routes.length !== required.length) {
    throw new Error(`${label}.routes does not cover required routes`)
  }
  const routes = input.routes.map((route, index) =>
    parsePublicationRoute({
      value: route,
      market,
      expected: required[index],
      frozenRegistrySha256: frozenRegistry.sha256,
      index,
    })
  )
  const readinessInput = publicationRecord(
    input.readiness,
    `${label}.readiness`
  )
  publicationExactKeys(
    readinessInput,
    ["approvedRouteCount", "ready", "requiredRouteKeys"],
    `${label}.readiness`
  )
  const requiredRouteKeys = required.map(({ routeKey }) => routeKey)
  if (
    readinessInput.ready !== true ||
    readinessInput.approvedRouteCount !== routes.length ||
    JSON.stringify(readinessInput.requiredRouteKeys) !==
      JSON.stringify(requiredRouteKeys)
  ) {
    throw new Error(`${label}.readiness is not exact/ready`)
  }
  const artifact: SegmentRegistryPublicationArtifact = {
    authorization: "customer-reviewed-static-content",
    frozenRegistry,
    gate: "G1",
    kind: "market-segment-registry-g1-approval",
    locale,
    market,
    readiness: {
      approvedRouteCount: routes.length,
      ready: true,
      requiredRouteKeys,
    },
    routes,
    schemaVersion: 1,
    sourcePlan,
    status: "approved",
    taxonomySha256,
  }
  return { artifact, sha256: hashPublicationBytes(contents) }
}
