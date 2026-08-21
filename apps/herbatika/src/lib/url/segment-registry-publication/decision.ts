import type { Market } from "@/lib/url/types"
import type {
  SegmentRegistryPublicationArtifact,
  StaticRoutePublicationDecision,
} from "./contract"
import { requiredPublicationRoutes } from "./taxonomy"

export const getStaticRoutePublicationDecision = (
  input: Readonly<{
    artifact: SegmentRegistryPublicationArtifact | null
    market: Market
    routeKey: string
  }>
): StaticRoutePublicationDecision => {
  if (
    !requiredPublicationRoutes(input.market).some(
      ({ staticPageKey }) => staticPageKey === input.routeKey
    )
  ) {
    return { kind: "not-required", reason: "route-not-indexable" }
  }
  if (!input.artifact) {
    return { kind: "rejected", reason: "artifact-unavailable" }
  }
  if (input.artifact.market !== input.market) {
    return { kind: "rejected", reason: "market-mismatch" }
  }
  const route = input.artifact.routes.find(
    (candidate) => candidate.staticPageKey === input.routeKey
  )
  if (!route) {
    return { kind: "rejected", reason: "route-not-approved" }
  }
  return {
    evidence: {
      editorialApprovalReference: route.editorialApproval.reference,
      frozenRegistrySha256: route.frozenRegistrySha256,
      legalApprovalReference: route.legalApproval.reference,
      staticContentArtifactSha256: route.staticContentArtifact.sha256,
    },
    kind: "approved",
  }
}
