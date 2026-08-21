// Pages Router server boundary: do not add the App-Router-only server-only marker.
import { readFile } from "node:fs/promises"
import { isAbsolute, join } from "node:path"
import type { Market } from "@/lib/url/types"
import {
  getStaticRoutePublicationDecision,
  type ParsedSegmentRegistryPublication,
  parseSegmentRegistryPublicationArtifact,
  SEGMENT_REGISTRY_PUBLICATION_ENV,
  type StaticRoutePublicationDecision,
} from "./segment-registry-publication"

export const readSegmentRegistryPublicationArtifact = async (
  market: Market,
  environment: Readonly<Record<string, string | undefined>> = process.env
): Promise<ParsedSegmentRegistryPublication> => {
  const directory = environment[SEGMENT_REGISTRY_PUBLICATION_ENV]
  if (!(directory && isAbsolute(directory))) {
    throw new Error(
      `${SEGMENT_REGISTRY_PUBLICATION_ENV} must be an absolute directory`
    )
  }
  const path = join(directory, `${market}.json`)
  const parsed = parseSegmentRegistryPublicationArtifact(
    await readFile(path, "utf8"),
    path
  )
  if (parsed.artifact.market !== market) {
    throw new Error(`segment-registry G1 artifact does not match ${market}`)
  }
  return parsed
}

export const loadStaticRoutePublicationDecision = async (
  input: Readonly<{ market: Market; routeKey: string }>,
  environment: Readonly<Record<string, string | undefined>> = process.env
): Promise<StaticRoutePublicationDecision> => {
  const withoutArtifact = getStaticRoutePublicationDecision({
    artifact: null,
    market: input.market,
    routeKey: input.routeKey,
  })
  if (withoutArtifact.kind === "not-required") {
    return withoutArtifact
  }
  try {
    const parsed = await readSegmentRegistryPublicationArtifact(
      input.market,
      environment
    )
    return getStaticRoutePublicationDecision({
      artifact: parsed.artifact,
      market: input.market,
      routeKey: input.routeKey,
    })
  } catch {
    return { kind: "rejected", reason: "artifact-unavailable" }
  }
}
