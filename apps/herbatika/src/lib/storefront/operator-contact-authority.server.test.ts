import { createHash } from "node:crypto"
import type { FlatStorefrontMessages } from "@techsio/storefront-i18n/core/messages"
import { describe, expect, it } from "vitest"
import { canonicalStaticContentJson } from "../../../scripts/market-static-content/primitives"
import {
  STATIC_CONTENT_KINDS,
  STATIC_CONTENT_LOCALE_BY_MARKET,
  STATIC_CONTENT_POLICY_VERSIONS,
  type StaticContentMarket,
} from "../../../scripts/market-static-content/types"
import { applyOperatorContactAuthority } from "./operator-contact-authority.server"

const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex")

const SOURCE_HOST = {
  cz: "www.herbatica.cz",
  hu: "www.herbatica.hu",
  ro: "www.herbatica.ro",
  sk: "www.herbatica.sk",
} as const

const baseMessages = {
  "navigation.contact.email_display": "ahoj@herbatica.sk",
  "navigation.contact.email_href": "mailto:ahoj@herbatica.sk",
  "navigation.contact.hours": "(Po–Pia: 09:00–16:00)",
  "navigation.contact.phone_display": "+421 2/321 123 45",
  "navigation.contact.phone_href": "tel:+421232112345",
} satisfies FlatStorefrontMessages

const reviewedAuthorityEnv = (market: StaticContentMarket) => {
  const locale = STATIC_CONTENT_LOCALE_BY_MARKET[market]
  const entryId = "operator-contact"
  const sourceSnapshotSha256 = "1".repeat(64)
  const segmentRegistrySha256 = "2".repeat(64)
  const source = {
    rawSnapshotSha256: sourceSnapshotSha256,
    retrievedAt: "2026-08-21T10:00:00.000Z",
    url: `https://${SOURCE_HOST[market]}/contact-source`,
  }
  const reviewedPayloadRaw = canonicalStaticContentJson({
    contact: {
      emailDisplay: "contact@example.com",
      emailHref: "mailto:contact@example.com",
      hours: "Mon–Fri 09:00–16:00",
      phoneDisplay: "+420 123 456 789",
      phoneHref: "tel:+420123456789",
      socialLinks: [
        {
          href: "https://www.facebook.com/example",
          platform: "facebook",
        },
      ],
    },
    entryId,
    kind: "market-operator-contact-reviewed-payload",
    locale,
    market,
    schemaVersion: 1,
  })
  const staticContentArtifactRaw = canonicalStaticContentJson({
    contentKind: "operator-identity",
    entryId,
    kind: "market-static-content",
    locale,
    market,
    payload: {
      kind: "market-static-content-reviewed-payload",
      mediaType: "application/json",
      ref: `market-static-content/${market}/payload/${entryId}.json`,
      sha256: hash(reviewedPayloadRaw),
    },
    policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
    provenance: "reviewed-official-source",
    schemaVersion: 1,
    segmentRegistrySha256,
    source,
  })
  const artifactSha256 = hash(staticContentArtifactRaw)
  const approvalRaw = (role: "editorial" | "legal") =>
    canonicalStaticContentJson({
      approvedAt: "2026-08-21T11:00:00.000Z",
      approvedBy: `${role}-reviewer`,
      contentKind: "operator-identity",
      entryId,
      kind: `market-static-content-${role}-approval`,
      locale,
      market,
      reference: `${market.toUpperCase()}-${role.toUpperCase()}-OPERATOR`,
      schemaVersion: 1,
      status: "approved",
      subject: {
        policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
        segmentRegistrySha256,
        sourceSnapshotSha256,
        staticContentArtifactRef: `market-static-content/${market}/${entryId}.json`,
        staticContentArtifactSha256: artifactSha256,
      },
    })
  const editorialApprovalRaw = approvalRaw("editorial")
  const legalApprovalRaw = approvalRaw("legal")

  const manifestApproval = (
    role: "editorial" | "legal",
    id: string,
    entryArtifactSha256: string,
    approvalSha256: string
  ) => ({
    approvalArtifact: {
      kind: `market-static-content-${role}-approval`,
      mediaType: "application/json",
      ref: `market-static-content/${market}/approvals/${role}/${id}.json`,
      sha256: approvalSha256,
    },
    approvedAt: "2026-08-21T11:00:00.000Z",
    approvedBy: `${role}-reviewer`,
    artifactSha256: entryArtifactSha256,
    reference:
      id === entryId
        ? `${market.toUpperCase()}-${role.toUpperCase()}-OPERATOR`
        : `${market.toUpperCase()}-${role.toUpperCase()}-${id}`,
    sourceSnapshotSha256,
    status: "approved",
  })

  const entries = STATIC_CONTENT_KINDS.map((contentKind, index) => {
    const id =
      contentKind === "operator-identity" ? entryId : `fixture-${contentKind}`
    const entryArtifactSha256 =
      contentKind === "operator-identity"
        ? artifactSha256
        : String((index % 8) + 1).repeat(64)
    const editorialSha256 =
      contentKind === "operator-identity"
        ? hash(editorialApprovalRaw)
        : String(((index + 1) % 8) + 1).repeat(64)
    const legalSha256 =
      contentKind === "operator-identity"
        ? hash(legalApprovalRaw)
        : String(((index + 2) % 8) + 1).repeat(64)
    return {
      approvals: {
        editorial: manifestApproval(
          "editorial",
          id,
          entryArtifactSha256,
          editorialSha256
        ),
        legal: manifestApproval("legal", id, entryArtifactSha256, legalSha256),
      },
      artifact: {
        kind: "market-static-content",
        mediaType: "application/json",
        ref: `market-static-content/${market}/${id}.json`,
        sha256: entryArtifactSha256,
      },
      contentKind,
      id,
      provenance: "reviewed-official-source",
      source,
    }
  })
  const staticContentCollectionRaw = canonicalStaticContentJson({
    entries: entries
      .map((entry, index) => ({
        contentKind: entry.contentKind,
        entryId: entry.id,
        payloadRef: `market-static-content/${market}/payload/${entry.id}.json`,
        payloadSha256:
          entry.id === entryId
            ? hash(reviewedPayloadRaw)
            : String(((index + 3) % 8) + 1).repeat(64),
        ref: entry.artifact.ref,
        sha256: entry.artifact.sha256,
      }))
      .sort((left, right) =>
        `${left.contentKind}:${left.entryId}`.localeCompare(
          `${right.contentKind}:${right.entryId}`,
          "en"
        )
      ),
    kind: "market-static-content-collection",
    locale,
    market,
    policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
    ready: true,
    schemaVersion: 1,
    segmentRegistrySha256,
  })
  const approvalCollectionRaw = (role: "editorial" | "legal") =>
    canonicalStaticContentJson({
      entries: entries
        .map((entry) => ({
          contentKind: entry.contentKind,
          entryId: entry.id,
          ref: entry.approvals[role].approvalArtifact.ref,
          sha256: entry.approvals[role].approvalArtifact.sha256,
          sourceSnapshotSha256,
          staticContentArtifactRef: entry.artifact.ref,
          staticContentArtifactSha256: entry.artifact.sha256,
        }))
        .sort((left, right) =>
          `${left.contentKind}:${left.entryId}`.localeCompare(
            `${right.contentKind}:${right.entryId}`,
            "en"
          )
        ),
      kind: `market-static-content-${role}-approval-collection`,
      locale,
      market,
      policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
      ready: true,
      schemaVersion: 1,
      segmentRegistrySha256,
    })
  const editorialApprovalCollectionRaw = approvalCollectionRaw("editorial")
  const legalApprovalCollectionRaw = approvalCollectionRaw("legal")
  const sourceManifestRaw = JSON.stringify({
    authorization: "customer-reviewed-static-content",
    capturedAt: "2026-08-21T12:00:00.000Z",
    entries,
    kind: "market-static-content-source-manifest",
    locale,
    market,
    marketArtifacts: {
      editorialApproval: {
        kind: "market-static-content-editorial-approval-collection",
        mediaType: "application/json",
        ref: `market-static-content/${market}/approvals/editorial.json`,
        sha256: hash(editorialApprovalCollectionRaw),
      },
      legalApproval: {
        kind: "market-static-content-legal-approval-collection",
        mediaType: "application/json",
        ref: `market-static-content/${market}/approvals/legal.json`,
        sha256: hash(legalApprovalCollectionRaw),
      },
      staticContent: {
        kind: "market-static-content-collection",
        mediaType: "application/json",
        ref: `market-static-content/${market}/static-content.json`,
        sha256: hash(staticContentCollectionRaw),
      },
    },
    operatorContactAuthority: {
      editorialApprovalReference: `${market.toUpperCase()}-EDITORIAL-OPERATOR`,
      entryId,
      fieldCoverage: {
        email: "approved",
        "legal-entity": "approved",
        phone: "approved",
        "social-ids": "approved",
        "support-origin": "approved",
      },
      legalApprovalReference: `${market.toUpperCase()}-LEGAL-OPERATOR`,
      market,
    },
    provenance: "reviewed-official-source",
    schemaVersion: 1,
    segmentRegistry: {
      kind: "market-route-segment-registry",
      ref: "market-static-content/shared/segment-registry.json",
      sha256: segmentRegistrySha256,
    },
  })
  return JSON.stringify({
    authorities: [
      {
        editorialApprovalCollectionRaw,
        editorialApprovalRaw,
        legalApprovalCollectionRaw,
        legalApprovalRaw,
        market,
        reviewedPayloadRaw,
        sourceManifestRaw,
        staticContentCollectionRaw,
        staticContentArtifactRaw,
      },
    ],
    kind: "herbatika-operator-contact-reviewed-authorities",
    schemaVersion: 1,
  })
}

describe("applyOperatorContactAuthority", () => {
  it("keeps validated existing Slovak contacts authoritative", () => {
    expect(applyOperatorContactAuthority("sk", baseMessages)).toMatchObject({
      "navigation.contact.authority_status": "available",
      "navigation.contact.authority_source": "sk-existing",
      "navigation.contact.email_href": "mailto:ahoj@herbatica.sk",
      "navigation.contact.phone_href": "tel:+421232112345",
    })
  })

  it.each([
    "cz",
    "hu",
    "ro",
  ] as const)("falls back to %s storefront messages without reviewed authority", (market) => {
    expect(applyOperatorContactAuthority(market, baseMessages)).toMatchObject({
      "navigation.contact.authority_status": "available",
      "navigation.contact.authority_source": "sk-existing",
      "navigation.contact.email_href": "mailto:ahoj@herbatica.sk",
      "navigation.contact.phone_href": "tel:+421232112345",
    })
  })

  it("accepts a payload only when manifest, artifact, and both approvals match", () => {
    expect(
      applyOperatorContactAuthority(
        "cz",
        baseMessages,
        reviewedAuthorityEnv("cz")
      )
    ).toMatchObject({
      "navigation.contact.authority_status": "available",
      "navigation.contact.authority_source": "reviewed",
      "navigation.contact.email_display": "contact@example.com",
      "navigation.contact.phone_display": "+420 123 456 789",
      "navigation.contact.phone_href": "tel:+420123456789",
      "navigation.contact.social_links":
        '[{"href":"https://www.facebook.com/example","platform":"facebook"}]',
    })
  })

  it("falls back to messages when the reviewed authority is for another market", () => {
    expect(
      applyOperatorContactAuthority(
        "hu",
        baseMessages,
        reviewedAuthorityEnv("cz")
      )
    ).toMatchObject({
      "navigation.contact.authority_status": "available",
      "navigation.contact.authority_source": "sk-existing",
      "navigation.contact.phone_href": "tel:+421232112345",
    })
  })

  it("does not let a different market authority disable existing SK contact", () => {
    expect(
      applyOperatorContactAuthority(
        "sk",
        baseMessages,
        reviewedAuthorityEnv("cz")
      )
    ).toMatchObject({
      "navigation.contact.authority_source": "sk-existing",
      "navigation.contact.authority_status": "available",
      "navigation.contact.phone_href": "tel:+421232112345",
    })
  })

  it("falls back to messages on payload byte drift after approval", () => {
    const raw = reviewedAuthorityEnv("cz")
    const envelope = JSON.parse(raw)
    envelope.authorities[0].reviewedPayloadRaw =
      envelope.authorities[0].reviewedPayloadRaw.replace(
        "+420 123 456 789",
        "+420 999 999 999"
      )
    expect(
      applyOperatorContactAuthority(
        "cz",
        baseMessages,
        JSON.stringify(envelope)
      )
    ).toMatchObject({
      "navigation.contact.authority_status": "available",
      "navigation.contact.authority_source": "sk-existing",
      "navigation.contact.phone_href": "tel:+421232112345",
    })
  })

  it("falls back to messages on malformed or incomplete authority envelopes", () => {
    expect(
      applyOperatorContactAuthority(
        "cz",
        baseMessages,
        JSON.stringify({
          authorities: [],
          extra: true,
          kind: "herbatika-operator-contact-reviewed-authorities",
          schemaVersion: 1,
        })
      )
    ).toMatchObject({
      "navigation.contact.authority_status": "available",
      "navigation.contact.authority_source": "sk-existing",
      "navigation.contact.phone_href": "tel:+421232112345",
    })
  })
})
