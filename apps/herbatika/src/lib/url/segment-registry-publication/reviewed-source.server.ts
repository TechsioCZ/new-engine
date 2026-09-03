import type { Market, StaticRootPageKey } from "@/lib/url/types"
import { parseMarketStaticContentArtifact } from "../../../../scripts/market-static-content/artifact-contract"
import {
  canonicalStaticContentJson,
  hashStaticContentBytes,
} from "../../../../scripts/market-static-content/primitives"
import {
  SEGMENT_REGISTRY_PUBLICATION_ENV,
  SEGMENT_REGISTRY_PUBLICATION_LOCALE,
  type StaticRoutePublicationDecision,
} from "../segment-registry-publication"
import { contentKindForStaticPage, entityKeyForStaticPage } from "./parse-route"
import {
  closeSecureArtifactBoundary,
  openSecureArtifactBoundary,
  readSecureArtifactText,
  type SecureArtifactBoundary,
} from "./secure-artifact-reader.server"

type ApprovedPublication = Extract<
  StaticRoutePublicationDecision,
  Readonly<{ kind: "approved" }>
>

const readHashBoundFile = async (
  boundary: SecureArtifactBoundary,
  ref: string,
  expectedSha256: string
): Promise<string> => {
  const contents = await readSecureArtifactText(boundary, ref)
  if (hashStaticContentBytes(contents) !== expectedSha256) {
    throw new Error(`${ref} does not match its approved SHA-256`)
  }
  return contents
}

/**
 * Assert that the exact source which SSR is about to render is the canonical
 * reviewed payload transitively bound by the route's G1 approval.
 *
 * The configured G1 directory is `<artifact-root>/segment-registry-g1`; its
 * logical refs are resolved only below the adjacent artifact root.
 */
export const assertReviewedStaticRouteSource = async (
  input: Readonly<{
    market: Market
    pageKey: StaticRootPageKey
    publication: ApprovedPublication
    renderedSource: unknown
  }>,
  environment: Readonly<Record<string, string | undefined>> = process.env
): Promise<void> => {
  const publicationDirectory = environment[SEGMENT_REGISTRY_PUBLICATION_ENV]
  if (!publicationDirectory) {
    throw new Error(
      `${SEGMENT_REGISTRY_PUBLICATION_ENV} must be an absolute directory`
    )
  }

  const entryId = entityKeyForStaticPage(input.market, input.pageKey).split(
    ":"
  )[2]
  const expectedArtifactRef = `market-static-content/${input.market}/${entryId}.json`
  if (
    input.publication.evidence.staticContentArtifactRef !== expectedArtifactRef
  ) {
    throw new Error("G1 approval references the wrong static-content artifact")
  }

  const boundary = await openSecureArtifactBoundary(publicationDirectory)
  try {
    const artifactRaw = await readHashBoundFile(
      boundary,
      expectedArtifactRef,
      input.publication.evidence.staticContentArtifactSha256
    )
    const artifact = parseMarketStaticContentArtifact(
      artifactRaw,
      expectedArtifactRef
    )
    if (
      artifact.market !== input.market ||
      artifact.locale !== SEGMENT_REGISTRY_PUBLICATION_LOCALE[input.market] ||
      artifact.entryId !== entryId ||
      artifact.contentKind !== contentKindForStaticPage(input.pageKey)
    ) {
      throw new Error("reviewed static-content artifact identity is invalid")
    }

    const payloadRaw = await readHashBoundFile(
      boundary,
      artifact.payload.ref,
      artifact.payload.sha256
    )
    if (payloadRaw !== canonicalStaticContentJson(input.renderedSource)) {
      throw new Error(
        "rendered static content has drifted from reviewed payload"
      )
    }
  } finally {
    await closeSecureArtifactBoundary(boundary)
  }
}
