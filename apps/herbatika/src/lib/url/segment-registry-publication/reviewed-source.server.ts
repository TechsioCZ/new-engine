import { readFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
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

type ApprovedPublication = Extract<
  StaticRoutePublicationDecision,
  Readonly<{ kind: "approved" }>
>

const resolvePublishedRef = (artifactRoot: string, ref: string): string => {
  const path = resolve(artifactRoot, ref)
  const pathFromRoot = relative(artifactRoot, path)
  if (
    !pathFromRoot ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error("reviewed static-content ref escapes the artifact root")
  }
  return path
}

const readHashBoundFile = async (
  artifactRoot: string,
  ref: string,
  expectedSha256: string
): Promise<string> => {
  const contents = await readFile(
    resolvePublishedRef(artifactRoot, ref),
    "utf8"
  )
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
  if (!(publicationDirectory && isAbsolute(publicationDirectory))) {
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

  const artifactRoot = dirname(publicationDirectory)
  const artifactRaw = await readHashBoundFile(
    artifactRoot,
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
    artifactRoot,
    artifact.payload.ref,
    artifact.payload.sha256
  )
  if (payloadRaw !== canonicalStaticContentJson(input.renderedSource)) {
    throw new Error("rendered static content has drifted from reviewed payload")
  }
}
