import type { ParsedMarketStaticContentPlan } from "../../../scripts/market-static-content/plan-parser"
import type {
  MarketStaticContentOperation,
  StaticContentKind,
} from "../../../scripts/market-static-content/types"
import {
  requiredPublicationRoutes,
  SEGMENT_REGISTRY_PUBLICATION_LOCALE,
  SEGMENT_REGISTRY_PUBLICATION_MARKETS,
} from "./segment-registry-publication"
import { entityKeyForStaticPage } from "./segment-registry-publication/parse-route"

export const publicationFixtureSha = (value: string) => value.repeat(64)

const operation = (
  market: (typeof SEGMENT_REGISTRY_PUBLICATION_MARKETS)[number],
  contentKind: StaticContentKind,
  id: string
): MarketStaticContentOperation => {
  const artifactSha256 = publicationFixtureSha(market === "cz" ? "a" : "b")
  const approval = (role: "editorial" | "legal") => ({
    approvalArtifact: {
      kind: `market-static-content-${role}-approval` as const,
      mediaType: "application/json" as const,
      ref: `market-static-content/${market}/approvals/${role}/${id}.json`,
      sha256: publicationFixtureSha(role === "editorial" ? "c" : "d"),
    },
    approvedAt: "2026-08-20T12:00:00.000Z",
    approvedBy: `${role}-reviewer`,
    artifactSha256,
    reference: `${market.toUpperCase()}-${role.toUpperCase()}-${id}`,
    sourceSnapshotSha256: publicationFixtureSha("e"),
    status: "approved" as const,
  })
  return {
    approvals: { editorial: approval("editorial"), legal: approval("legal") },
    artifact: {
      kind: "market-static-content",
      mediaType: "application/json",
      ref: `market-static-content/${market}/${id}.json`,
      sha256: artifactSha256,
    },
    contentKind,
    entityKey: `${market}:${contentKind}:${id}`,
    locale: SEGMENT_REGISTRY_PUBLICATION_LOCALE[market],
    market,
    ready: true,
    source: {
      rawSnapshotSha256: publicationFixtureSha("e"),
      retrievedAt: "2026-08-20T10:00:00.000Z",
      url: `https://herbatica.${market}/${id}`,
    },
  }
}

export const parsedPublicationPlanFixture =
  (): ParsedMarketStaticContentPlan => {
    const operations = SEGMENT_REGISTRY_PUBLICATION_MARKETS.flatMap(
      (market) => {
        const routeOperations = requiredPublicationRoutes(market).map(
          ({ staticPageKey }) => {
            const [, kind, id] = entityKeyForStaticPage(
              market,
              staticPageKey
            ).split(":")
            return operation(market, kind as StaticContentKind, id)
          }
        )
        const presentKinds = new Set(
          routeOperations.map(({ contentKind }) => contentKind)
        )
        const kinds = [
          "about",
          "cms-legal",
          "cms-static",
          "faq",
          "footer",
          "homepage-hero",
          "operator-identity",
        ] as const
        const fillers = kinds.flatMap((kind) =>
          presentKinds.has(kind) ? [] : [operation(market, kind, kind)]
        )
        return [...routeOperations, ...fillers]
      }
    )
    return {
      plan: {
        authorization: "customer-reviewed-static-content",
        kind: "market-static-content-import-readiness-plan",
        operations,
        planSha256: publicationFixtureSha("1"),
        readiness: {
          markets: [] as never,
          ready: true,
          requiredContentKinds: [
            "about",
            "cms-legal",
            "cms-static",
            "faq",
            "footer",
            "homepage-hero",
            "operator-identity",
          ],
        },
        schemaVersion: 1,
        sourceManifests: SEGMENT_REGISTRY_PUBLICATION_MARKETS.map((market) => ({
          capturedAt: "2026-08-20T14:00:00.000Z",
          locale: SEGMENT_REGISTRY_PUBLICATION_LOCALE[market],
          manifestSha256: publicationFixtureSha("2"),
          market,
          marketArtifacts: {
            editorialApproval: {
              kind: "market-static-content-editorial-approval-collection",
              mediaType: "application/json",
              ref: `market-static-content/${market}/approvals/editorial.json`,
              sha256: publicationFixtureSha("6"),
            },
            legalApproval: {
              kind: "market-static-content-legal-approval-collection",
              mediaType: "application/json",
              ref: `market-static-content/${market}/approvals/legal.json`,
              sha256: publicationFixtureSha("7"),
            },
            staticContent: {
              kind: "market-static-content-collection",
              mediaType: "application/json",
              ref: `market-static-content/${market}/static-content.json`,
              sha256: publicationFixtureSha("8"),
            },
          },
          operatorContactAuthority: {} as never,
          segmentRegistry: {
            kind: "market-route-segment-registry",
            ref: "market-static-content/shared/segment-registry.json",
            sha256: publicationFixtureSha("f"),
          },
        })),
      },
      sha256: publicationFixtureSha("3"),
    }
  }
