import {
  type CatalogPopulationEntity,
  type ContentPopulationEntity,
  type POPULATION_CATALOG_KINDS,
  type PopulationBinding,
  PopulationManifestError,
} from "./manifest-contracts"
import {
  assertPopulationExactKeys,
  populationText,
} from "./manifest-primitives"

export const parseCatalogAuthority = (
  authority: Record<string, unknown>,
  label: string,
  binding: PopulationBinding,
  entityKind: (typeof POPULATION_CATALOG_KINDS)[number]
): CatalogPopulationEntity["authority"] => {
  if (entityKind === "product") {
    assertPopulationExactKeys(
      authority,
      [
        "kind",
        "locale",
        "metadataSchemaVersion",
        "publicationStatus",
        "salesChannelId",
        "sourceEntityExists",
        "translationVerified",
      ],
      label
    )
    if (
      authority.kind !== "medusa-product-publication" ||
      authority.metadataSchemaVersion !== 1 ||
      authority.publicationStatus !== "published" ||
      authority.sourceEntityExists !== true ||
      authority.translationVerified !== true ||
      authority.locale !== binding.locale ||
      authority.salesChannelId !== binding.salesChannelId
    ) {
      throw new PopulationManifestError(
        `${label} is not authoritative product publication metadata`
      )
    }
    return {
      kind: "medusa-product-publication",
      locale: binding.locale,
      metadataSchemaVersion: 1,
      publicationStatus: "published",
      salesChannelId: binding.salesChannelId,
      sourceEntityExists: true,
      translationVerified: true,
    }
  }
  assertPopulationExactKeys(
    authority,
    [
      "assignmentId",
      "kind",
      "locale",
      "publicationStatus",
      "salesChannelId",
      "sourceEntityExists",
      "translationVerified",
    ],
    label
  )
  if (
    authority.kind !== "medusa-published-assignment" ||
    authority.publicationStatus !== "published" ||
    authority.sourceEntityExists !== true ||
    authority.translationVerified !== true ||
    authority.locale !== binding.locale ||
    authority.salesChannelId !== binding.salesChannelId
  ) {
    throw new PopulationManifestError(
      `${label} is not an authoritative catalog assignment`
    )
  }
  return {
    assignmentId: populationText(
      authority.assignmentId,
      `${label}.assignmentId`
    ),
    kind: "medusa-published-assignment",
    locale: binding.locale,
    publicationStatus: "published",
    salesChannelId: binding.salesChannelId,
    sourceEntityExists: true,
    translationVerified: true,
  }
}

export const parseContentAuthority = (
  authority: Record<string, unknown>,
  label: string,
  binding: PopulationBinding
): ContentPopulationEntity["authority"] => {
  assertPopulationExactKeys(
    authority,
    ["documentStatus", "kind", "locale", "slugMappingId", "stableIdVerified"],
    label
  )
  if (
    authority.kind !== "payload-published-document" ||
    authority.documentStatus !== "published" ||
    authority.stableIdVerified !== true ||
    authority.locale !== binding.locale
  ) {
    throw new PopulationManifestError(
      `${label} is not an authoritative CMS document`
    )
  }
  return {
    documentStatus: "published",
    kind: "payload-published-document",
    locale: binding.locale,
    slugMappingId: populationText(
      authority.slugMappingId,
      `${label}.slugMappingId`
    ),
    stableIdVerified: true,
  }
}
