import {
  parseMarketStaticContentApprovalArtifact,
  parseMarketStaticContentApprovalCollectionArtifact,
  parseMarketStaticContentArtifact,
  parseMarketStaticContentCollectionArtifact,
} from "../../../scripts/market-static-content/artifact-contract"
import { parseMarketStaticContentManifest } from "../../../scripts/market-static-content/manifest"
import type { OperatorContactAuthorityRawFiles } from "./operator-contact-authority-env.server"
import {
  type OperatorContact,
  operatorContactSha256,
  parseReviewedOperatorContactPayload,
} from "./operator-contact-payload.server"

const samePolicyVersions = (
  left: Readonly<Record<"checkoutConsent" | "registrationTerms", string>>,
  right: Readonly<Record<"checkoutConsent" | "registrationTerms", string>>
) =>
  left.checkoutConsent === right.checkoutConsent &&
  left.registrationTerms === right.registrationTerms

const parseVerifiedCollections = (
  files: OperatorContactAuthorityRawFiles,
  manifest: ReturnType<typeof parseMarketStaticContentManifest>
) => {
  const staticCollection = parseMarketStaticContentCollectionArtifact(
    files.staticContentCollectionRaw
  )
  const editorialCollection =
    parseMarketStaticContentApprovalCollectionArtifact(
      files.editorialApprovalCollectionRaw,
      "editorial"
    )
  const legalCollection = parseMarketStaticContentApprovalCollectionArtifact(
    files.legalApprovalCollectionRaw,
    "legal"
  )
  if (
    manifest.marketArtifacts.staticContent.sha256 !==
      operatorContactSha256(files.staticContentCollectionRaw) ||
    manifest.marketArtifacts.editorialApproval.sha256 !==
      operatorContactSha256(files.editorialApprovalCollectionRaw) ||
    manifest.marketArtifacts.legalApproval.sha256 !==
      operatorContactSha256(files.legalApprovalCollectionRaw) ||
    [staticCollection, editorialCollection, legalCollection].some(
      (collection) =>
        collection.market !== files.market ||
        collection.locale !== manifest.locale ||
        collection.segmentRegistrySha256 !== manifest.segmentRegistry.sha256
    )
  ) {
    throw new Error(
      "operator contact aggregate artifacts do not match manifest"
    )
  }
  return { editorialCollection, legalCollection, staticCollection }
}

export const resolveReviewedOperatorContact = (
  files: OperatorContactAuthorityRawFiles
): OperatorContact => {
  const manifest = parseMarketStaticContentManifest(
    files.sourceManifestRaw,
    `${files.market} operator contact source manifest`
  )
  if (manifest.market !== files.market) {
    throw new Error("operator contact source manifest has the wrong market")
  }
  const authority = manifest.operatorContactAuthority
  const entry = manifest.entries.find(
    (candidate) =>
      candidate.id === authority.entryId &&
      candidate.contentKind === "operator-identity"
  )
  if (!entry) {
    throw new Error("operator contact authority entry is missing")
  }

  const { editorialCollection, legalCollection, staticCollection } =
    parseVerifiedCollections(files, manifest)

  const artifactSha256 = operatorContactSha256(files.staticContentArtifactRaw)
  const editorialApprovalSha256 = operatorContactSha256(
    files.editorialApprovalRaw
  )
  const legalApprovalSha256 = operatorContactSha256(files.legalApprovalRaw)
  const staticCollectionEntry = staticCollection.entries.find(
    (candidate) =>
      candidate.entryId === entry.id &&
      candidate.contentKind === "operator-identity"
  )
  const editorialCollectionEntry = editorialCollection.entries.find(
    (candidate) =>
      candidate.entryId === entry.id &&
      candidate.contentKind === "operator-identity"
  )
  const legalCollectionEntry = legalCollection.entries.find(
    (candidate) =>
      candidate.entryId === entry.id &&
      candidate.contentKind === "operator-identity"
  )
  if (
    !(
      staticCollectionEntry &&
      editorialCollectionEntry &&
      legalCollectionEntry
    ) ||
    entry.artifact.sha256 !== artifactSha256 ||
    entry.approvals.editorial.approvalArtifact.sha256 !==
      editorialApprovalSha256 ||
    entry.approvals.legal.approvalArtifact.sha256 !== legalApprovalSha256 ||
    staticCollectionEntry.sha256 !== artifactSha256 ||
    staticCollectionEntry.payloadSha256 !==
      operatorContactSha256(files.reviewedPayloadRaw) ||
    editorialCollectionEntry.sha256 !== editorialApprovalSha256 ||
    editorialCollectionEntry.staticContentArtifactSha256 !== artifactSha256 ||
    legalCollectionEntry.sha256 !== legalApprovalSha256 ||
    legalCollectionEntry.staticContentArtifactSha256 !== artifactSha256
  ) {
    throw new Error(
      "operator contact raw artifacts do not match manifest hashes"
    )
  }

  const artifact = parseMarketStaticContentArtifact(
    files.staticContentArtifactRaw,
    `${files.market} operator contact static-content artifact`
  )
  const editorial = parseMarketStaticContentApprovalArtifact(
    files.editorialApprovalRaw,
    "editorial"
  )
  const legal = parseMarketStaticContentApprovalArtifact(
    files.legalApprovalRaw,
    "legal"
  )
  if (
    [artifact, editorial, legal].some(
      (item) =>
        item.market !== files.market ||
        item.locale !== manifest.locale ||
        item.entryId !== entry.id ||
        item.contentKind !== "operator-identity"
    ) ||
    editorial.reference !== authority.editorialApprovalReference ||
    legal.reference !== authority.legalApprovalReference
  ) {
    throw new Error("operator contact artifacts are not identity-bound")
  }
  for (const approval of [editorial, legal]) {
    if (
      approval.subject.staticContentArtifactSha256 !== artifactSha256 ||
      approval.subject.sourceSnapshotSha256 !==
        artifact.source.rawSnapshotSha256 ||
      approval.subject.segmentRegistrySha256 !==
        artifact.segmentRegistrySha256 ||
      !samePolicyVersions(
        approval.subject.policyVersions,
        artifact.policyVersions
      )
    ) {
      throw new Error(
        "operator contact approval subject does not match artifact"
      )
    }
  }
  if (
    artifact.source.rawSnapshotSha256 !== entry.source.rawSnapshotSha256 ||
    artifact.source.url !== entry.source.url ||
    artifact.payload.sha256 !== operatorContactSha256(files.reviewedPayloadRaw)
  ) {
    throw new Error("operator contact artifact does not match reviewed sources")
  }
  return parseReviewedOperatorContactPayload(files.reviewedPayloadRaw, {
    entryId: entry.id,
    market: files.market,
  })
}
