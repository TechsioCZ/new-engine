import type {
  AddressParts,
  SmartSuggestCountryCode,
  SuggestionAttribution,
} from "@techsio/smart-suggest-core"
import type {
  AddressRankedCandidate,
  AddressRankingCandidate,
} from "@techsio/smart-suggest-indexing"
import {
  createAddressIndexDocument,
  rankAddressCandidates,
  scoreAddressRecordQuality,
} from "@techsio/smart-suggest-indexing"
import type {
  AddressRecord,
  AddressRecordSourceLineage,
  AddressRecordVisibility,
  AddressSearchRecordInput,
  AddressTombstoneRecordInput,
  DataSourceRecord,
  ImportRunRecord,
  SmartSuggestRepositories,
  SmartSuggestStorageEffect,
  SmartSuggestStorageError,
} from "@techsio/smart-suggest-storage"
import type {
  AddressSnapshotRow,
  AddressSnapshotSourceLineage,
  AddressSnapshotVisibilityMetadata,
  AddressTombstoneRow,
} from "./address-snapshot"
import type {
  RuianOfficialBaselineCsvChunk,
  RuianOfficialBaselineCsvRowsOptions,
  RuianOfficialCsvSnapshotChange,
} from "./ruian-official-baseline"
import {
  parseRuianOfficialCsvSnapshotChanges as parseRuianOfficialCsvSnapshotChangesImplementation,
  parseRuianOfficialCsvSnapshotRows as parseRuianOfficialCsvSnapshotRowsImplementation,
} from "./ruian-official-baseline"
import type {
  ParseRuianAddressSnapshotRowOptions,
  ParseRuianAddressTombstoneRowOptions,
  RuianAddressSnapshotParseResult,
  RuianAddressSnapshotRowsParseResult,
  RuianAddressSnapshotSourceRow,
  RuianAddressTombstoneParseResult,
} from "./ruian-snapshot"

export type {
  RuianOfficialBaselineCsvChunk,
  RuianOfficialBaselineCsvDelimiter,
  RuianOfficialBaselineCsvParseError,
  RuianOfficialBaselineCsvRowsOptions,
  RuianOfficialCsvSnapshotChange,
} from "./ruian-official-baseline"

import { Schema } from "effect"
import {
  all,
  catch as catchEffect,
  type Effect,
  fail,
  gen,
  map,
  succeed,
  try as tryEffect,
  tryPromise,
} from "effect/Effect"
import {
  mapRuianAddressSnapshotRows as mapRuianAddressSnapshotRowsImplementation,
  parseRuianAddressSnapshotRow as parseRuianAddressSnapshotRowImplementation,
  parseRuianAddressTombstoneRow as parseRuianAddressTombstoneRowImplementation,
} from "./ruian-snapshot"
import {
  assertSmartSuggestSourceAllowsPermanentImport,
  requireSmartSuggestSourcePolicy,
  type SmartSuggestPermanentImportPolicyError,
  type SmartSuggestSourcePolicy,
  type SmartSuggestSourcePolicyNotFoundError,
} from "./source-catalog"

export type {
  AddressSearchVisibility,
  AddressSnapshotRow,
  AddressSnapshotRuianIdentifiers,
  AddressSnapshotSourceLineage,
  AddressSnapshotVisibilityMetadata,
  AddressTombstoneRow,
} from "./address-snapshot"
export type {
  ParseRuianAddressSnapshotRowOptions,
  ParseRuianAddressTombstoneRowOptions,
  RuianAddressSnapshotParseError,
  RuianAddressSnapshotParseErrorCode,
  RuianAddressSnapshotParseResult,
  RuianAddressSnapshotRowsParseResult,
  RuianAddressSnapshotSourceRow,
  RuianAddressTombstoneParseResult,
} from "./ruian-snapshot"

export const parseRuianAddressSnapshotRow = (
  sourceRow: RuianAddressSnapshotSourceRow,
  options: ParseRuianAddressSnapshotRowOptions = {}
): RuianAddressSnapshotParseResult =>
  parseRuianAddressSnapshotRowImplementation(sourceRow, options)

export const parseRuianAddressTombstoneRow = (
  sourceRow: RuianAddressSnapshotSourceRow,
  options: ParseRuianAddressTombstoneRowOptions = {}
): RuianAddressTombstoneParseResult =>
  parseRuianAddressTombstoneRowImplementation(sourceRow, options)

export const mapRuianAddressSnapshotRows = (
  sourceRows: readonly RuianAddressSnapshotSourceRow[],
  options: ParseRuianAddressSnapshotRowOptions = {}
): RuianAddressSnapshotRowsParseResult =>
  mapRuianAddressSnapshotRowsImplementation(sourceRows, options)

export const parseRuianOfficialCsvSnapshotRows = (
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  options: RuianOfficialBaselineCsvRowsOptions = {}
): AsyncGenerator<AddressSnapshotRow> =>
  parseRuianOfficialCsvSnapshotRowsImplementation(chunks, options)

export const parseRuianOfficialCsvSnapshotChanges = (
  chunks: AsyncIterable<RuianOfficialBaselineCsvChunk>,
  options: RuianOfficialBaselineCsvRowsOptions = {}
): AsyncGenerator<RuianOfficialCsvSnapshotChange> =>
  parseRuianOfficialCsvSnapshotChangesImplementation(chunks, options)

export type SampleAddressFixture = {
  id: string
  sourceId: string
  countryCode: SmartSuggestCountryCode
  parts: AddressParts
  quality: number
  latitude?: number
  longitude?: number
}

export type SeedSampleDatasetResult = {
  sources: readonly DataSourceRecord[]
  records: readonly AddressRecord[]
}

export type AddressImportSource = Omit<
  DataSourceRecord,
  "createdAt" | "updatedAt"
> & {
  shardCountryCode: SmartSuggestCountryCode
  snapshotUri?: string
}

export type AuthoritativeAddressSnapshotMetadata = {
  datasetVersion: string
  modificationNoteSha256?: string
  region?: string
  shardCountryCode: SmartSuggestCountryCode
  snapshotUri?: string
  sourceId: string
  sourceName?: string
}

export type AddressImportRowError = {
  index: number
  message: string
  rowId?: string
}

export type AddressDatasetImportOptions = {
  chunkSize?: number
  repositories: SmartSuggestRepositories
  rows:
    | readonly AddressSnapshotRow[]
    | AsyncIterable<AddressSnapshotRow | RuianOfficialCsvSnapshotChange>
  runId: string
  source: AddressImportSource
  sourceLineage?: AddressSnapshotSourceLineage
}

export type AddressDatasetImportResult = {
  errors: readonly AddressImportRowError[]
  importRun: ImportRunRecord
  insertedRows: number
  rawSnapshotStoredInD1: false
  restartable: true
  shardCountryCode: SmartSuggestCountryCode
  snapshotUri?: string
  source: DataSourceRecord
  tombstonedRows: number
  totalRows: number
  upsertedRows: number
}

export type AddressDatasetImportEffectError =
  | AddressDatasetImportFailedError
  | AddressImportCachePolicyError
  | AddressImportCountryCoverageError
  | AddressImportShardMismatchError
  | AddressImportSourceKindMismatchError
  | AddressImportSourceSchemaError
  | RuianDeltaContinuityError
  | SmartSuggestPermanentImportPolicyError
  | SmartSuggestSourcePolicyNotFoundError
  | SmartSuggestStorageError

export type AddressDatasetImportEffect = Effect<
  AddressDatasetImportResult,
  AddressDatasetImportEffectError,
  never
>

const SmartSuggestCountryCodeSchema = Schema.String.check(
  Schema.isPattern(/^[A-Z]{2}$/u)
)

const NonNegativeIntSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

const ProviderCachePolicyKindSchema = Schema.Literals([
  "none",
  "permanent",
  "ttl",
])

const SuggestionSourceKindSchema = Schema.Literals([
  "cache",
  "live-provider",
  "owned-dataset",
])

const SuggestionAttributionSchema = Schema.Struct({
  label: Schema.NonEmptyString,
  license: Schema.optionalKey(Schema.NonEmptyString),
  url: Schema.optionalKey(Schema.NonEmptyString),
})

const ProviderCachePolicySchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("permanent"),
  }),
  Schema.Struct({
    kind: Schema.Literal("ttl"),
    ttlSeconds: Schema.Int.check(Schema.isGreaterThan(0)),
  }),
])

export const AddressImportRowErrorSchema = Schema.Struct({
  index: NonNegativeIntSchema,
  message: Schema.String,
  rowId: Schema.optionalKey(Schema.NonEmptyString),
})

export const AddressImportSourceSchema = Schema.Struct({
  attribution: SuggestionAttributionSchema,
  cachePolicy: ProviderCachePolicySchema,
  countryCode: SmartSuggestCountryCodeSchema,
  datasetVersion: Schema.optionalKey(Schema.NonEmptyString),
  id: Schema.NonEmptyString,
  modificationNoteSha256: Schema.optionalKey(Schema.NonEmptyString),
  name: Schema.NonEmptyString,
  region: Schema.optionalKey(Schema.NonEmptyString),
  shardCountryCode: SmartSuggestCountryCodeSchema,
  snapshotUri: Schema.optionalKey(Schema.NonEmptyString),
  sourceKind: SuggestionSourceKindSchema,
})

export type DecodedAddressImportSource = Schema.Schema.Type<
  typeof AddressImportSourceSchema
>

export class AddressImportSourceSchemaError extends Schema.TaggedErrorClass<AddressImportSourceSchemaError>()(
  "AddressImportSourceSchemaError",
  {
    message: Schema.String,
    sourceId: Schema.String,
  }
) {}

export class AddressImportSourceKindMismatchError extends Schema.TaggedErrorClass<AddressImportSourceKindMismatchError>()(
  "AddressImportSourceKindMismatchError",
  {
    actualKind: SuggestionSourceKindSchema,
    expectedKind: SuggestionSourceKindSchema,
    message: Schema.String,
    sourceId: Schema.NonEmptyString,
  }
) {}

export class AddressImportCachePolicyError extends Schema.TaggedErrorClass<AddressImportCachePolicyError>()(
  "AddressImportCachePolicyError",
  {
    cachePolicyKind: ProviderCachePolicyKindSchema,
    message: Schema.String,
    sourceId: Schema.NonEmptyString,
  }
) {}

export class AddressImportShardMismatchError extends Schema.TaggedErrorClass<AddressImportShardMismatchError>()(
  "AddressImportShardMismatchError",
  {
    message: Schema.String,
    shardCountryCode: SmartSuggestCountryCodeSchema,
    sourceCountryCode: SmartSuggestCountryCodeSchema,
    sourceId: Schema.NonEmptyString,
  }
) {}

export class AddressImportCountryCoverageError extends Schema.TaggedErrorClass<AddressImportCountryCoverageError>()(
  "AddressImportCountryCoverageError",
  {
    message: Schema.String,
    shardCountryCode: SmartSuggestCountryCodeSchema,
    sourceId: Schema.NonEmptyString,
  }
) {}

const RuianDeltaContinuityReasonSchema = Schema.Literals([
  "latest-import-missing-atom-entry-id",
  "no-completed-baseline-or-delta",
  "out-of-order-atom-entry-id",
  "previous-atom-entry-id-missing",
])

export class RuianDeltaContinuityError extends Schema.TaggedErrorClass<RuianDeltaContinuityError>()(
  "RuianDeltaContinuityError",
  {
    latestImportRunId: Schema.optionalKey(Schema.NonEmptyString),
    message: Schema.String,
    previousAtomEntryId: Schema.optionalKey(Schema.NonEmptyString),
    reason: RuianDeltaContinuityReasonSchema,
    runId: Schema.NonEmptyString,
    shardCountryCode: SmartSuggestCountryCodeSchema,
    sourceId: Schema.NonEmptyString,
  }
) {}

export class AddressDatasetImportFailedError extends Schema.TaggedErrorClass<AddressDatasetImportFailedError>()(
  "AddressDatasetImportFailedError",
  {
    insertedRows: NonNegativeIntSchema,
    message: Schema.String,
    runId: Schema.NonEmptyString,
    shardCountryCode: SmartSuggestCountryCodeSchema,
    sourceId: Schema.NonEmptyString,
    tombstonedRows: NonNegativeIntSchema,
    totalRows: NonNegativeIntSchema,
  }
) {}

const decodeAddressImportSource = Schema.decodeUnknownSync(
  AddressImportSourceSchema
)
const decodeAddressImportRowError = Schema.decodeUnknownSync(
  AddressImportRowErrorSchema
)

const readStringField = (input: unknown, field: string) => {
  if (typeof input !== "object" || input === null || !(field in input)) {
    return
  }

  const value = (input as Record<string, unknown>)[field]

  return typeof value === "string" ? value : undefined
}

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const isTaggedEffectError = (
  error: unknown
): error is { readonly _tag: string } =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  typeof (error as { readonly _tag?: unknown })._tag === "string"

const assertValidAddressImportSource = (source: AddressImportSource) => {
  try {
    decodeAddressImportSource(source)
  } catch (error) {
    throw new AddressImportSourceSchemaError({
      message: `Invalid Smart Suggest address import source: ${toErrorMessage(
        error,
        "schema validation failed"
      )}`,
      sourceId: readStringField(source, "id") ?? "<unknown>",
    })
  }
}

export const RUIAN_SAMPLE_ATTRIBUTION = {
  label: "RUIAN sample",
  license: "CC BY 4.0",
  url: "https://ruian.cuzk.cz/",
} satisfies SuggestionAttribution

export const REGISTER_ADRIES_SAMPLE_ATTRIBUTION = {
  label: "Register adries sample",
  license: "CC BY 4.0",
  url: "https://www.geoportal.sk/sk/udaje/registre/register-adries/",
} satisfies SuggestionAttribution

export const OPENADDRESSES_SAMPLE_ATTRIBUTION = {
  label: "OpenAddresses sample",
  license: "source-dependent sample fixture",
  url: "https://openaddresses.io/",
} satisfies SuggestionAttribution

export const RUIAN_CZ_SAMPLE_SOURCE = {
  attribution: RUIAN_SAMPLE_ATTRIBUTION,
  cachePolicy: { kind: "permanent" },
  countryCode: "CZ",
  datasetVersion: "sample-2026-06-26",
  id: "ruian-cz-sample",
  name: "RUIAN CZ sample",
  sourceKind: "owned-dataset",
} satisfies Omit<DataSourceRecord, "createdAt" | "updatedAt">

export const REGISTER_ADRIES_SK_SAMPLE_SOURCE = {
  attribution: REGISTER_ADRIES_SAMPLE_ATTRIBUTION,
  cachePolicy: { kind: "permanent" },
  countryCode: "SK",
  datasetVersion: "sample-2026-06-26",
  id: "register-adries-sk-sample",
  name: "Register adries SK sample",
  sourceKind: "owned-dataset",
} satisfies Omit<DataSourceRecord, "createdAt" | "updatedAt">

export const OPENADDRESSES_US_CA_SAMPLE_SOURCE = {
  attribution: OPENADDRESSES_SAMPLE_ATTRIBUTION,
  cachePolicy: { kind: "permanent" },
  countryCode: "US",
  datasetVersion: "sample-2026-06-26",
  id: "openaddresses-us-ca-sample",
  name: "OpenAddresses US CA sample",
  region: "CA",
  sourceKind: "owned-dataset",
} satisfies Omit<DataSourceRecord, "createdAt" | "updatedAt">

export const SAMPLE_DATA_SOURCES = [
  RUIAN_CZ_SAMPLE_SOURCE,
  REGISTER_ADRIES_SK_SAMPLE_SOURCE,
  OPENADDRESSES_US_CA_SAMPLE_SOURCE,
] satisfies readonly Omit<DataSourceRecord, "createdAt" | "updatedAt">[]

export const CZ_SAMPLE_ADDRESSES = [
  {
    countryCode: "CZ",
    id: "cz-ruian-k-louzi-1258-12",
    latitude: 50.065,
    longitude: 14.463,
    parts: {
      city: "Praha 10",
      countryCode: "CZ",
      district: "Vršovice",
      houseNumber: "1258",
      orientationNumber: "12",
      postalCode: "101 00",
      street: "K Louži",
    },
    quality: 0.99,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "CZ",
    id: "cz-ruian-k-louzi-1258-7",
    latitude: 50.0651,
    longitude: 14.4632,
    parts: {
      city: "Praha 10",
      countryCode: "CZ",
      district: "Vršovice",
      houseNumber: "1258",
      orientationNumber: "7",
      postalCode: "101 00",
      street: "K Louži",
    },
    quality: 0.98,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "CZ",
    id: "cz-ruian-k-louzi-784-3",
    latitude: 50.0648,
    longitude: 14.4628,
    parts: {
      city: "Praha 10",
      countryCode: "CZ",
      district: "Vršovice",
      houseNumber: "784",
      orientationNumber: "3",
      postalCode: "101 00",
      street: "K Louži",
    },
    quality: 0.97,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "CZ",
    id: "cz-ruian-k-louzi-1312-1",
    latitude: 50.0646,
    longitude: 14.4625,
    parts: {
      city: "Praha 10",
      countryCode: "CZ",
      district: "Vršovice",
      houseNumber: "1312",
      orientationNumber: "1",
      postalCode: "101 00",
      street: "K Louži",
    },
    quality: 0.96,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "CZ",
    id: "cz-ruian-vaclavske-namesti-832-19",
    latitude: 50.081,
    longitude: 14.425,
    parts: {
      city: "Praha",
      countryCode: "CZ",
      district: "Praha 1",
      houseNumber: "832",
      orientationNumber: "19",
      postalCode: "110 00",
      street: "Václavské náměstí",
    },
    quality: 0.98,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "CZ",
    id: "cz-ruian-vinohradska-12-34",
    latitude: 50.075,
    longitude: 14.437,
    parts: {
      city: "Praha",
      countryCode: "CZ",
      district: "Praha 2",
      houseNumber: "12",
      orientationNumber: "34",
      postalCode: "120 00",
      street: "Vinohradská",
    },
    quality: 0.96,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "CZ",
    id: "cz-ruian-masarykova-12",
    latitude: 49.193,
    longitude: 16.608,
    parts: {
      city: "Brno",
      countryCode: "CZ",
      houseNumber: "12",
      postalCode: "602 00",
      street: "Masarykova",
    },
    quality: 0.94,
    sourceId: RUIAN_CZ_SAMPLE_SOURCE.id,
  },
] satisfies readonly SampleAddressFixture[]

export const SK_SAMPLE_ADDRESSES = [
  {
    countryCode: "SK",
    id: "sk-register-adries-hlavna-7",
    latitude: 48.148,
    longitude: 17.108,
    parts: {
      city: "Bratislava",
      countryCode: "SK",
      houseNumber: "7",
      postalCode: "811 01",
      street: "Hlavná",
    },
    quality: 0.97,
    sourceId: REGISTER_ADRIES_SK_SAMPLE_SOURCE.id,
  },
  {
    countryCode: "SK",
    id: "sk-register-adries-zizkova-45",
    latitude: 49.223,
    longitude: 18.74,
    parts: {
      city: "Žilina",
      countryCode: "SK",
      houseNumber: "45",
      postalCode: "010 01",
      street: "Žižkova",
    },
    quality: 0.95,
    sourceId: REGISTER_ADRIES_SK_SAMPLE_SOURCE.id,
  },
] satisfies readonly SampleAddressFixture[]

export const OPENADDRESSES_US_CA_SAMPLE_ADDRESSES = [
  {
    countryCode: "US",
    id: "us-openaddresses-ca-mission-1",
    latitude: 37.793,
    longitude: -122.394,
    parts: {
      city: "San Francisco",
      countryCode: "US",
      houseNumber: "1",
      postalCode: "94105",
      region: "CA",
      street: "Mission St",
    },
    quality: 0.9,
    sourceId: OPENADDRESSES_US_CA_SAMPLE_SOURCE.id,
  },
] satisfies readonly SampleAddressFixture[]

export const SAMPLE_ADDRESS_FIXTURES = [
  ...CZ_SAMPLE_ADDRESSES,
  ...SK_SAMPLE_ADDRESSES,
  ...OPENADDRESSES_US_CA_SAMPLE_ADDRESSES,
] satisfies readonly SampleAddressFixture[]

const sampleSourceById = new Map(
  SAMPLE_DATA_SOURCES.map((source) => [source.id, source])
)

const sampleAttributionForSourceId = (sourceId: string) =>
  sampleSourceById.get(sourceId)?.attribution ??
  OPENADDRESSES_SAMPLE_ATTRIBUTION

export const sampleAddressFixtureToRecordInput = (
  fixture: SampleAddressFixture
): AddressSearchRecordInput => {
  const indexDocument = createAddressIndexDocument(fixture.parts)
  const record: AddressSearchRecordInput = {
    attribution: sampleAttributionForSourceId(fixture.sourceId),
    countryCode: fixture.countryCode,
    displayLabel: indexDocument.displayLabel,
    id: fixture.id,
    parts: fixture.parts,
    quality: fixture.quality,
    searchLabel: indexDocument.searchLabel,
    sourceId: fixture.sourceId,
  }

  if (fixture.latitude !== undefined) {
    record.latitude = fixture.latitude
  }

  if (fixture.longitude !== undefined) {
    record.longitude = fixture.longitude
  }

  return record
}

export const seedSampleAddressDatasetsEffect = (
  repositories: SmartSuggestRepositories
): SmartSuggestStorageEffect<SeedSampleDatasetResult> =>
  gen(function* () {
    const sources = yield* all(
      SAMPLE_DATA_SOURCES.map((source) =>
        repositories.dataSources.registerDataSource(source)
      )
    )
    const records = yield* repositories.addressRecords.upsertAddressRecords(
      SAMPLE_ADDRESS_FIXTURES.map(sampleAddressFixtureToRecordInput)
    )

    return { records, sources }
  })

type SampleAddressRankingCandidate = AddressSearchRecordInput &
  AddressRankingCandidate & {
    address: AddressParts
    confidence: number
  }

export const searchSampleAddressFixtures = (
  query: string,
  options: {
    countryCode?: SmartSuggestCountryCode
    limit?: number
  } = {}
) => {
  const candidates: SampleAddressRankingCandidate[] =
    SAMPLE_ADDRESS_FIXTURES.filter(
      (fixture) =>
        options.countryCode === undefined ||
        fixture.countryCode === options.countryCode
    ).map((fixture) => {
      const recordInput = sampleAddressFixtureToRecordInput(fixture)

      return {
        ...recordInput,
        address: recordInput.parts,
        confidence: recordInput.quality,
      }
    })

  const rankingOptions =
    options.limit === undefined ? {} : { limit: options.limit }

  return rankAddressCandidates(query, candidates, rankingOptions).map(
    ({
      candidate,
      reasons,
      score,
    }: AddressRankedCandidate<SampleAddressRankingCandidate>) => ({
      ...candidate,
      ranking: { reasons, score },
    })
  )
}

const DEFAULT_IMPORT_CHUNK_SIZE = 500

const normalizeImportMetadataSegment = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

export const createAddressImportRunId = (
  metadata: AuthoritativeAddressSnapshotMetadata
) =>
  [
    "import",
    normalizeImportMetadataSegment(metadata.sourceId),
    normalizeImportMetadataSegment(metadata.shardCountryCode),
    metadata.region === undefined
      ? undefined
      : normalizeImportMetadataSegment(metadata.region),
    normalizeImportMetadataSegment(metadata.datasetVersion),
  ]
    .filter(
      (segment): segment is string =>
        segment !== undefined && segment.length > 0
    )
    .join("-")

const toSourceAttribution = (
  policy: SmartSuggestSourcePolicy
): SuggestionAttribution => {
  const attribution: SuggestionAttribution = {
    label: policy.attribution.label,
  }

  if (policy.attribution.license !== undefined) {
    attribution.license = policy.attribution.license
  }

  if (policy.attribution.url !== undefined) {
    attribution.url = policy.attribution.url
  }

  return attribution
}

const assertSourceCoversShardCountry = (
  policy: SmartSuggestSourcePolicy,
  shardCountryCode: SmartSuggestCountryCode
) => {
  if (
    policy.countryCoverage.kind === "countries" &&
    !policy.countryCoverage.countryCodes.includes(shardCountryCode)
  ) {
    throw new AddressImportCountryCoverageError({
      message: `Source "${policy.id}" does not cover import shard country ${shardCountryCode}.`,
      shardCountryCode,
      sourceId: policy.id,
    })
  }
}

export const createAuthoritativeAddressImportSource = (
  metadata: AuthoritativeAddressSnapshotMetadata
): AddressImportSource => {
  assertSmartSuggestSourceAllowsPermanentImport(metadata.sourceId)

  const policy = requireSmartSuggestSourcePolicy(metadata.sourceId)
  assertSourceCoversShardCountry(policy, metadata.shardCountryCode)

  const source: AddressImportSource = {
    attribution: toSourceAttribution(policy),
    cachePolicy: { kind: "permanent" },
    countryCode: metadata.shardCountryCode,
    datasetVersion: metadata.datasetVersion,
    id: policy.id,
    name: metadata.sourceName ?? policy.name,
    shardCountryCode: metadata.shardCountryCode,
    sourceKind: policy.sourceKind,
  }

  if (metadata.region !== undefined) {
    source.region = metadata.region
  }

  if (metadata.snapshotUri !== undefined) {
    source.snapshotUri = metadata.snapshotUri
  }
  if (metadata.modificationNoteSha256 !== undefined) {
    source.modificationNoteSha256 = metadata.modificationNoteSha256
  }

  return source
}

export const assertAddressImportSourceAllowsPermanentImport = (
  source: AddressImportSource
) => {
  assertValidAddressImportSource(source)
  assertSmartSuggestSourceAllowsPermanentImport(source.id)

  const policy = requireSmartSuggestSourcePolicy(source.id)
  assertSourceCoversShardCountry(policy, source.shardCountryCode)

  if (source.sourceKind !== policy.sourceKind) {
    throw new AddressImportSourceKindMismatchError({
      actualKind: source.sourceKind,
      expectedKind: policy.sourceKind,
      message: `Import source "${source.id}" kind ${source.sourceKind} does not match catalog kind ${policy.sourceKind}.`,
      sourceId: source.id,
    })
  }

  if (source.cachePolicy.kind !== "permanent") {
    throw new AddressImportCachePolicyError({
      cachePolicyKind: source.cachePolicy.kind,
      message: `Import source "${source.id}" must use permanent cache policy for authoritative snapshot imports.`,
      sourceId: source.id,
    })
  }
}

const IMPORT_RUN_ERROR_SUMMARY_MAX_LENGTH = 1000

const toBoundedImportRunErrorSummary = (message: string) => {
  if (message.length <= IMPORT_RUN_ERROR_SUMMARY_MAX_LENGTH) {
    return message
  }

  return `${message.slice(0, IMPORT_RUN_ERROR_SUMMARY_MAX_LENGTH - 16)}... [truncated]`
}

const toImportRunErrorSummary = (errors: readonly AddressImportRowError[]) => {
  if (errors.length === 0) {
    return
  }

  return toBoundedImportRunErrorSummary(
    errors
      .slice(0, 5)
      .map((error) => decodeAddressImportRowError(error))
      .map((error) => `row:${error.index}:${error.message}`)
      .join("; ")
  )
}

type ImportableAddressParts = AddressParts & {
  city: string
  countryCode: SmartSuggestCountryCode
}

const isImportableAddressParts = (
  parts: AddressParts
): parts is ImportableAddressParts =>
  parts.countryCode !== undefined &&
  parts.city !== undefined &&
  (parts.street !== undefined ||
    parts.line1 !== undefined ||
    parts.houseNumber !== undefined)

const toAddressRecordSourceLineage = ({
  row,
  runId,
}: {
  row: AddressSnapshotRow
  runId: string | undefined
}): AddressRecordSourceLineage | undefined => {
  if (row.sourceLineage === undefined) {
    return
  }

  const sourceLineage: AddressRecordSourceLineage = {
    ...row.sourceLineage,
    sourceRecordId:
      row.ruian?.addressPlaceCode ?? row.sourceLineage.sourceRowId,
    sourceRecordType: "address-place",
  }

  if (runId !== undefined) {
    sourceLineage.lastImportRunId = runId
  }

  return sourceLineage
}

const toAddressRecordVisibility = (
  visibility: AddressSnapshotVisibilityMetadata | undefined
): AddressRecordVisibility | undefined => {
  if (visibility === undefined) {
    return
  }

  const replicationStatus = visibility.invalid === true ? "invalid" : "active"
  const recordVisibility: AddressRecordVisibility = {
    replicationStatus,
    searchVisible: visibility.searchVisibility === "searchable",
  }

  if (visibility.changeProposalGlobalId !== undefined) {
    recordVisibility.changeProposalGlobalId = visibility.changeProposalGlobalId
  }
  if (visibility.invalid !== undefined) {
    recordVisibility.invalid = visibility.invalid
  }
  if (visibility.reason !== undefined) {
    recordVisibility.reason = visibility.reason
  }
  if (visibility.sourceStatus !== undefined) {
    recordVisibility.sourceStatus = visibility.sourceStatus
  }
  if (visibility.transactionId !== undefined) {
    recordVisibility.transactionId = visibility.transactionId
  }
  if (visibility.validFrom !== undefined) {
    recordVisibility.validFrom = visibility.validFrom
  }
  if (visibility.validTo !== undefined) {
    recordVisibility.validTo = visibility.validTo
  }

  return recordVisibility
}

const applySnapshotRecordMetadata = ({
  record,
  row,
  runId,
}: {
  record: AddressSearchRecordInput
  row: AddressSnapshotRow
  runId: string | undefined
}) => {
  const sourceLineage = toAddressRecordSourceLineage({ row, runId })
  const visibility = toAddressRecordVisibility(row.visibility)

  if (row.latitude !== undefined) {
    record.latitude = row.latitude
  }
  if (row.longitude !== undefined) {
    record.longitude = row.longitude
  }
  if (row.ruian !== undefined) {
    record.ruian = row.ruian
  }
  if (sourceLineage !== undefined) {
    record.sourceLineage = sourceLineage
  }
  if (visibility !== undefined) {
    record.replicationStatus = visibility.replicationStatus
    record.searchVisible = visibility.searchVisible
    record.visibility = visibility
  }
}

export const normalizeAddressSnapshotRowForImport = (
  row: AddressSnapshotRow,
  source: AddressImportSource,
  index: number,
  runId?: string
): AddressSearchRecordInput | AddressImportRowError => {
  if (row.id.trim() === "") {
    return { index, message: "Missing row id." }
  }

  if (!isImportableAddressParts(row.parts)) {
    return {
      index,
      message:
        "Address row needs countryCode, city, and street, line1, or houseNumber.",
      rowId: row.id,
    }
  }

  if (row.parts.countryCode !== source.shardCountryCode) {
    return {
      index,
      message: `Address row country ${row.parts.countryCode} does not match shard ${source.shardCountryCode}.`,
      rowId: row.id,
    }
  }

  const indexDocument = createAddressIndexDocument(row.parts)
  const quality = scoreAddressRecordQuality(row.parts)
  const record: AddressSearchRecordInput = {
    attribution: source.attribution,
    countryCode: row.parts.countryCode,
    displayLabel: indexDocument.displayLabel,
    id: row.id,
    parts: row.parts,
    quality: row.quality ?? quality.score,
    searchLabel: indexDocument.searchLabel,
    sourceId: source.id,
  }

  applySnapshotRecordMetadata({ record, row, runId })

  return record
}

const chunkRecords = <TRecord>(
  records: readonly TRecord[],
  chunkSize: number
) => {
  const chunks: TRecord[][] = []

  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize))
  }

  return chunks
}

export const chunkAddressSnapshotRows = (
  rows: readonly AddressSnapshotRow[],
  chunkSize = DEFAULT_IMPORT_CHUNK_SIZE
) => chunkRecords(rows, Math.max(1, Math.trunc(chunkSize)))

type AddressDatasetImportInput =
  | AddressSnapshotRow
  | RuianOfficialCsvSnapshotChange

async function* chunkAddressSnapshotRowInput(
  rows:
    | readonly AddressSnapshotRow[]
    | AsyncIterable<AddressDatasetImportInput>,
  chunkSize: number
) {
  if (Array.isArray(rows)) {
    yield* chunkAddressSnapshotRows(rows, chunkSize)
    return
  }

  let chunk: AddressDatasetImportInput[] = []

  for await (const row of rows) {
    chunk.push(row)

    if (chunk.length >= chunkSize) {
      yield chunk
      chunk = []
    }
  }

  if (chunk.length > 0) {
    yield chunk
  }
}

type AddressDatasetImportChunkReader = () => Effect<
  readonly AddressDatasetImportInput[] | undefined,
  unknown,
  never
>

const createAddressDatasetImportChunkReader = (
  rows:
    | readonly AddressSnapshotRow[]
    | AsyncIterable<AddressDatasetImportInput>,
  chunkSize: number
): AddressDatasetImportChunkReader => {
  if (Array.isArray(rows)) {
    const chunks = chunkAddressSnapshotRows(rows, chunkSize)
    let index = 0

    return () => {
      const chunk = chunks[index]
      index += 1

      return succeed(chunk)
    }
  }

  const iterator = chunkAddressSnapshotRowInput(rows, chunkSize)[
    Symbol.asyncIterator
  ]()

  return () =>
    map(
      tryPromise({
        catch: (error) => error,
        try: () => iterator.next(),
      }),
      (result) => (result.done === true ? undefined : result.value)
    )
}

const toDataSourceInput = (
  source: AddressImportSource
): Omit<DataSourceRecord, "createdAt" | "updatedAt"> => {
  const input: Omit<DataSourceRecord, "createdAt" | "updatedAt"> = {
    attribution: source.attribution,
    cachePolicy: source.cachePolicy,
    countryCode: source.countryCode,
    id: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
  }

  if (source.datasetVersion !== undefined) {
    input.datasetVersion = source.datasetVersion
  }
  if (source.modificationNoteSha256 !== undefined) {
    input.modificationNoteSha256 = source.modificationNoteSha256
  }

  if (source.region !== undefined) {
    input.region = source.region
  }

  return input
}

const importInputSourceLineage = (
  input: AddressDatasetImportInput
): AddressSnapshotSourceLineage | undefined => {
  if ("kind" in input) {
    return input.kind === "address"
      ? input.row.sourceLineage
      : input.tombstone.sourceLineage
  }

  return input.sourceLineage
}

const firstAddressSnapshotSourceLineage = (
  rows: readonly AddressDatasetImportInput[]
) => rows.map(importInputSourceLineage).find((lineage) => lineage !== undefined)

const toImportKind = (
  fileKind: string | undefined
): NonNullable<ImportRunRecord["importKind"]> =>
  fileKind === "baseline" || fileKind === "delta" ? fileKind : "manual"

const toImportSourceUri = ({
  source,
  sourceLineage,
}: {
  source: AddressImportSource
  sourceLineage: AddressSnapshotSourceLineage | undefined
}) =>
  sourceLineage?.sourceUri ?? sourceLineage?.snapshotUri ?? source.snapshotUri

const toStartedImportRunInput = ({
  runId,
  source,
  sourceLineage,
}: {
  runId: string
  source: AddressImportSource
  sourceLineage: AddressSnapshotSourceLineage | undefined
}): Parameters<SmartSuggestRepositories["importRuns"]["startImportRun"]>[0] => {
  const input: Parameters<
    SmartSuggestRepositories["importRuns"]["startImportRun"]
  >[0] = {
    id: runId,
    importKind: toImportKind(sourceLineage?.fileKind),
    shardCountryCode: source.shardCountryCode,
    sourceId: source.id,
  }
  const sourceUri = toImportSourceUri({ source, sourceLineage })

  if (sourceLineage?.atomEntryId !== undefined) {
    input.atomEntryId = sourceLineage.atomEntryId
  }
  if (sourceLineage?.checksumSha256 !== undefined) {
    input.checksumSha256 = sourceLineage.checksumSha256
  }
  if (sourceLineage?.feedId !== undefined) {
    input.sourceFeedId = sourceLineage.feedId
  }
  if (sourceLineage?.sourceGeneratedAt !== undefined) {
    input.sourceGeneratedAt = sourceLineage.sourceGeneratedAt
  }
  if (sourceUri !== undefined) {
    input.sourceUri = sourceUri
  }
  if (sourceLineage?.sourceValidAt !== undefined) {
    input.sourceValidAt = sourceLineage.sourceValidAt
  }
  if (sourceLineage?.sourceVersion !== undefined) {
    input.sourceVersion = sourceLineage.sourceVersion
  }

  return input
}

const assertRuianDeltaContinuity = ({
  repositories,
  runId,
  source,
  sourceLineage,
}: {
  repositories: SmartSuggestRepositories
  runId: string
  source: AddressImportSource
  sourceLineage: AddressSnapshotSourceLineage | undefined
}): Effect<void, AddressDatasetImportEffectError, never> =>
  gen(function* () {
    if (sourceLineage?.fileKind !== "delta") {
      return
    }

    const existingRun = yield* repositories.importRuns.getImportRun(runId)

    if (existingRun !== undefined) {
      return
    }

    if (sourceLineage.previousAtomEntryId === undefined) {
      return yield* fail(
        new RuianDeltaContinuityError({
          message: `RUIAN delta import ${runId} requires previousAtomEntryId from vf:PredchoziSoubor.`,
          reason: "previous-atom-entry-id-missing",
          runId,
          shardCountryCode: source.shardCountryCode,
          sourceId: source.id,
        })
      )
    }

    const latestCompletedRun =
      yield* repositories.importRuns.findLatestCompletedImportRun({
        importKinds: ["baseline", "delta"],
        shardCountryCode: source.shardCountryCode,
        sourceId: source.id,
      })

    if (latestCompletedRun === undefined) {
      return yield* fail(
        new RuianDeltaContinuityError({
          message: `RUIAN delta import ${runId} requires a completed baseline or previous delta before ${sourceLineage.previousAtomEntryId}.`,
          previousAtomEntryId: sourceLineage.previousAtomEntryId,
          reason: "no-completed-baseline-or-delta",
          runId,
          shardCountryCode: source.shardCountryCode,
          sourceId: source.id,
        })
      )
    }

    if (latestCompletedRun.atomEntryId === undefined) {
      return yield* fail(
        new RuianDeltaContinuityError({
          latestImportRunId: latestCompletedRun.id,
          message: `RUIAN delta import ${runId} cannot verify continuity because latest completed import ${latestCompletedRun.id} has no Atom entry id.`,
          previousAtomEntryId: sourceLineage.previousAtomEntryId,
          reason: "latest-import-missing-atom-entry-id",
          runId,
          shardCountryCode: source.shardCountryCode,
          sourceId: source.id,
        })
      )
    }

    if (latestCompletedRun.atomEntryId !== sourceLineage.previousAtomEntryId) {
      return yield* fail(
        new RuianDeltaContinuityError({
          latestImportRunId: latestCompletedRun.id,
          message: `RUIAN delta import ${runId} is out of order: previousAtomEntryId ${sourceLineage.previousAtomEntryId} does not match latest completed import ${latestCompletedRun.id} atomEntryId ${latestCompletedRun.atomEntryId}.`,
          previousAtomEntryId: sourceLineage.previousAtomEntryId,
          reason: "out-of-order-atom-entry-id",
          runId,
          shardCountryCode: source.shardCountryCode,
          sourceId: source.id,
        })
      )
    }
  })

const toCompletedImportRunInput = ({
  errors,
  insertedRows,
  runId,
  tombstonedRows,
  totalRows,
}: {
  errors: readonly AddressImportRowError[]
  insertedRows: number
  runId: string
  tombstonedRows: number
  totalRows: number
}): Parameters<
  SmartSuggestRepositories["importRuns"]["finishImportRun"]
>[0] => {
  const input: Parameters<
    SmartSuggestRepositories["importRuns"]["finishImportRun"]
  >[0] = {
    completedAt: new Date().toISOString(),
    failedRows: errors.length,
    id: runId,
    insertedRows,
    skippedRows: errors.length,
    status:
      insertedRows === 0 &&
      tombstonedRows === 0 &&
      errors.length > 0 &&
      totalRows > 0
        ? "failed"
        : "completed",
    tombstonedRows,
    totalRows,
    upsertedRows: insertedRows,
  }
  const errorSummary = toImportRunErrorSummary(errors)

  if (errorSummary !== undefined) {
    input.errorSummary = errorSummary
  }

  return input
}

const toFailedImportRunInput = ({
  insertedRows,
  message,
  runId,
  tombstonedRows,
  totalRows,
}: {
  insertedRows: number
  message: string
  runId: string
  tombstonedRows: number
  totalRows: number
}): Parameters<
  SmartSuggestRepositories["importRuns"]["finishImportRun"]
>[0] => {
  const failedRows = Math.max(1, totalRows - insertedRows)

  return {
    completedAt: new Date().toISOString(),
    errorSummary: toBoundedImportRunErrorSummary(message),
    failedRows,
    id: runId,
    insertedRows,
    skippedRows: failedRows,
    status: "failed",
    tombstonedRows,
    totalRows,
    upsertedRows: insertedRows,
  }
}

type AddressImportChunkRecordsResult = {
  errors: readonly AddressImportRowError[]
  nextRowIndex: number
  records: readonly AddressSearchRecordInput[]
  tombstones: readonly AddressTombstoneRecordInput[]
}

const toAddressTombstoneRecordSourceLineage = ({
  row,
  runId,
}: {
  row: AddressTombstoneRow
  runId: string
}): AddressRecordSourceLineage | undefined => {
  if (row.sourceLineage === undefined) {
    return
  }

  return {
    ...row.sourceLineage,
    lastImportRunId: runId,
    sourceRecordId:
      row.ruian?.addressPlaceCode ?? row.sourceLineage.sourceRowId,
    sourceRecordType: "address-place",
  }
}

const normalizeAddressTombstoneRowForImport = (
  row: AddressTombstoneRow,
  source: AddressImportSource,
  index: number,
  runId: string
): AddressTombstoneRecordInput | AddressImportRowError => {
  if (row.id.trim() === "") {
    return { index, message: "Missing tombstone row id." }
  }

  const tombstone: AddressTombstoneRecordInput = {
    countryCode: source.shardCountryCode,
    id: row.id,
    sourceId: source.id,
  }
  const sourceLineage = toAddressTombstoneRecordSourceLineage({ row, runId })

  if (row.deletedAt !== undefined) {
    tombstone.deletedAt = row.deletedAt
  }
  if (row.reason !== undefined) {
    tombstone.reason = row.reason
  }
  if (row.ruian !== undefined) {
    tombstone.ruian = row.ruian
  }
  if (sourceLineage !== undefined) {
    tombstone.sourceLineage = sourceLineage
  }

  return tombstone
}

const isImportTombstoneInput = (
  input: AddressDatasetImportInput
): input is Extract<RuianOfficialCsvSnapshotChange, { kind: "tombstone" }> =>
  "kind" in input && input.kind === "tombstone"

const isImportAddressChangeInput = (
  input: AddressDatasetImportInput
): input is Extract<RuianOfficialCsvSnapshotChange, { kind: "address" }> =>
  "kind" in input && input.kind === "address"

type AddressDatasetAddressInput =
  | AddressSnapshotRow
  | Extract<RuianOfficialCsvSnapshotChange, { kind: "address" }>

const toImportAddressRow = (
  input: AddressDatasetAddressInput
): AddressSnapshotRow => (isImportAddressChangeInput(input) ? input.row : input)

const collectAddressImportChunkRecords = (
  chunk: readonly AddressDatasetImportInput[],
  source: AddressImportSource,
  startRowIndex: number,
  runId: string
): AddressImportChunkRecordsResult => {
  const errors: AddressImportRowError[] = []
  const records: AddressSearchRecordInput[] = []
  const tombstones: AddressTombstoneRecordInput[] = []
  let nextRowIndex = startRowIndex

  for (const input of chunk) {
    if (isImportTombstoneInput(input)) {
      const normalized = normalizeAddressTombstoneRowForImport(
        input.tombstone,
        source,
        nextRowIndex,
        runId
      )
      nextRowIndex += 1

      if ("message" in normalized) {
        errors.push(normalized)
        continue
      }

      tombstones.push(normalized)
      continue
    }

    const normalized = normalizeAddressSnapshotRowForImport(
      toImportAddressRow(input),
      source,
      nextRowIndex,
      runId
    )
    nextRowIndex += 1

    if ("message" in normalized) {
      errors.push(normalized)
      continue
    }

    records.push(normalized)
  }

  return { errors, nextRowIndex, records, tombstones }
}

const assertAddressDatasetImportOptionsEffect = (
  source: AddressImportSource
): Effect<void, AddressDatasetImportEffectError, never> =>
  tryEffect({
    catch: (error) => error as AddressDatasetImportEffectError,
    try: () => {
      assertAddressImportSourceAllowsPermanentImport(source)

      if (source.countryCode !== source.shardCountryCode) {
        throw new AddressImportShardMismatchError({
          message: `Import source country ${source.countryCode} does not match shard ${source.shardCountryCode}.`,
          shardCountryCode: source.shardCountryCode,
          sourceCountryCode: source.countryCode,
          sourceId: source.id,
        })
      }
    },
  })

export const runAddressDatasetImportEffect = (
  options: AddressDatasetImportOptions
): AddressDatasetImportEffect => {
  const chunkSize = Math.max(
    1,
    Math.trunc(options.chunkSize ?? DEFAULT_IMPORT_CHUNK_SIZE)
  )
  const readNextChunk = createAddressDatasetImportChunkReader(
    options.rows,
    chunkSize
  )
  const errors: AddressImportRowError[] = []
  let insertedRows = 0
  let processedRows = 0
  let startedRun: ImportRunRecord | undefined
  let tombstonedRows = 0

  const startImportRun = (chunk: readonly AddressDatasetImportInput[] = []) =>
    gen(function* () {
      const sourceLineage =
        options.sourceLineage ?? firstAddressSnapshotSourceLineage(chunk)

      yield* assertRuianDeltaContinuity({
        repositories: options.repositories,
        runId: options.runId,
        source: options.source,
        sourceLineage,
      })

      return yield* options.repositories.importRuns.startImportRun(
        toStartedImportRunInput({
          runId: options.runId,
          source: options.source,
          sourceLineage,
        })
      )
    })

  const importEffect = gen(function* () {
    yield* assertAddressDatasetImportOptionsEffect(options.source)

    const registeredSource =
      yield* options.repositories.dataSources.registerDataSource(
        toDataSourceInput(options.source)
      )

    if (options.sourceLineage !== undefined) {
      startedRun = yield* startImportRun()
    }

    while (true) {
      const chunk = yield* readNextChunk()

      if (chunk === undefined) {
        break
      }

      if (startedRun === undefined) {
        startedRun = yield* startImportRun(chunk)
      }

      const chunkResult = collectAddressImportChunkRecords(
        chunk,
        options.source,
        processedRows,
        options.runId
      )
      processedRows = chunkResult.nextRowIndex
      errors.push(...chunkResult.errors)

      if (chunkResult.records.length > 0) {
        insertedRows +=
          (yield* options.repositories.addressRecords.upsertAddressRecords(
            chunkResult.records
          )).length
      }
      if (chunkResult.tombstones.length > 0) {
        tombstonedRows +=
          (yield* options.repositories.addressTombstones.upsertAddressTombstones(
            chunkResult.tombstones
          )).length
      }
    }

    if (startedRun === undefined) {
      startedRun = yield* startImportRun()
    }

    const importRun = startedRun
    const completedRun = yield* options.repositories.importRuns.finishImportRun(
      toCompletedImportRunInput({
        errors,
        insertedRows,
        runId: importRun.id,
        tombstonedRows,
        totalRows: processedRows,
      })
    )

    const result: AddressDatasetImportResult = {
      errors,
      importRun: completedRun,
      insertedRows,
      rawSnapshotStoredInD1: false,
      restartable: true,
      shardCountryCode: options.source.shardCountryCode,
      source: registeredSource,
      tombstonedRows,
      totalRows: processedRows,
      upsertedRows: insertedRows,
    }

    if (options.source.snapshotUri !== undefined) {
      result.snapshotUri = options.source.snapshotUri
    }

    return result
  })

  return catchEffect(importEffect, (error) =>
    gen(function* () {
      const message = toErrorMessage(error, "Address dataset import failed.")

      if (startedRun !== undefined) {
        yield* options.repositories.importRuns.finishImportRun(
          toFailedImportRunInput({
            insertedRows,
            message,
            runId: startedRun.id,
            tombstonedRows,
            totalRows: processedRows,
          })
        )
      }

      if (!isTaggedEffectError(error)) {
        return yield* fail(
          new AddressDatasetImportFailedError({
            insertedRows,
            message,
            runId: startedRun?.id ?? options.runId,
            shardCountryCode: options.source.shardCountryCode,
            sourceId: options.source.id,
            tombstonedRows,
            totalRows: processedRows,
          })
        )
      }

      return yield* fail(error as AddressDatasetImportEffectError)
    })
  )
}
