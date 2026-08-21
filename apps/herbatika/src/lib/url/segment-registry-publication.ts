// biome-ignore-all lint/performance/noBarrelFile: This is the stable publication-contract surface consumed by SSR, SEO, scripts, and readiness gates.
export type {
  ParsedSegmentRegistryPublication,
  SegmentRegistryPublicationArtifact,
  StaticRoutePublicationDecision,
} from "./segment-registry-publication/contract"
export {
  SEGMENT_REGISTRY_PUBLICATION_ENV,
  SEGMENT_REGISTRY_PUBLICATION_LOCALE,
  SEGMENT_REGISTRY_PUBLICATION_MARKETS,
} from "./segment-registry-publication/contract"
export { getStaticRoutePublicationDecision } from "./segment-registry-publication/decision"
export { parseSegmentRegistryPublicationArtifact } from "./segment-registry-publication/parser"
export {
  canonicalPublicationJson,
  hashPublicationBytes,
} from "./segment-registry-publication/primitives"
export {
  currentPublicationTaxonomySha256,
  requiredPublicationRoutes,
} from "./segment-registry-publication/taxonomy"
