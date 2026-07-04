import type {
  AddressParts,
  SmartSuggestCountryCode,
  SuggestionAttribution,
} from "@techsio/smart-suggest-core";
import type {
  AddressRankedCandidate,
  AddressRankingCandidate,
} from "@techsio/smart-suggest-indexing";
import { createAddressIndexDocument, rankAddressCandidates } from "@techsio/smart-suggest-indexing";
import type {
  AddressRecord,
  AddressSearchRecordInput,
  DataSourceRecord,
  SmartSuggestRepositories,
  SmartSuggestStorageEffect,
} from "@techsio/smart-suggest-storage";
import { all, gen } from "effect/Effect";

export const SAMPLE_ADDRESS_FIXTURE_USAGE = {
  allowedUses: ["dataset tests", "import proof tests", "synthetic demos"],
  forbiddenUses: ["runtime BFF startup", "production seed", "provider cache"],
  kind: "sample-fixture",
  productionRuntime: false,
} as const;

export type SampleAddressFixture = {
  id: string;
  sourceId: string;
  countryCode: SmartSuggestCountryCode;
  parts: AddressParts;
  quality: number;
  latitude?: number;
  longitude?: number;
};

export type SeedSampleAddressFixtureDatasetResult = {
  sources: readonly DataSourceRecord[];
  records: readonly AddressRecord[];
};

/**
 * @deprecated Use `SeedSampleAddressFixtureDatasetResult`; sample data is a
 * fixture/import-proof helper and is not a production runtime seed contract.
 */
export type SeedSampleDatasetResult = SeedSampleAddressFixtureDatasetResult;

export const RUIAN_SAMPLE_ATTRIBUTION = {
  label: "RUIAN sample",
  license: "CC BY 4.0",
  url: "https://ruian.cuzk.cz/",
} satisfies SuggestionAttribution;

export const REGISTER_ADRIES_SAMPLE_ATTRIBUTION = {
  label: "Register adries sample",
  license: "CC BY 4.0",
  url: "https://www.geoportal.sk/sk/udaje/registre/register-adries/",
} satisfies SuggestionAttribution;

export const OPENADDRESSES_SAMPLE_ATTRIBUTION = {
  label: "OpenAddresses sample",
  license: "source-dependent sample fixture",
  url: "https://openaddresses.io/",
} satisfies SuggestionAttribution;

export const RUIAN_CZ_SAMPLE_SOURCE = {
  attribution: RUIAN_SAMPLE_ATTRIBUTION,
  cachePolicy: { kind: "permanent" },
  countryCode: "CZ",
  datasetVersion: "sample-2026-06-26",
  id: "ruian-cz-sample",
  name: "RUIAN CZ sample",
  sourceKind: "owned-dataset",
} satisfies Omit<DataSourceRecord, "createdAt" | "updatedAt">;

export const REGISTER_ADRIES_SK_SAMPLE_SOURCE = {
  attribution: REGISTER_ADRIES_SAMPLE_ATTRIBUTION,
  cachePolicy: { kind: "permanent" },
  countryCode: "SK",
  datasetVersion: "sample-2026-06-26",
  id: "register-adries-sk-sample",
  name: "Register adries SK sample",
  sourceKind: "owned-dataset",
} satisfies Omit<DataSourceRecord, "createdAt" | "updatedAt">;

export const OPENADDRESSES_US_CA_SAMPLE_SOURCE = {
  attribution: OPENADDRESSES_SAMPLE_ATTRIBUTION,
  cachePolicy: { kind: "permanent" },
  countryCode: "US",
  datasetVersion: "sample-2026-06-26",
  id: "openaddresses-us-ca-sample",
  name: "OpenAddresses US CA sample",
  region: "CA",
  sourceKind: "owned-dataset",
} satisfies Omit<DataSourceRecord, "createdAt" | "updatedAt">;

export const SAMPLE_DATA_SOURCES = [
  RUIAN_CZ_SAMPLE_SOURCE,
  REGISTER_ADRIES_SK_SAMPLE_SOURCE,
  OPENADDRESSES_US_CA_SAMPLE_SOURCE,
] satisfies readonly Omit<DataSourceRecord, "createdAt" | "updatedAt">[];

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
] satisfies readonly SampleAddressFixture[];

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
] satisfies readonly SampleAddressFixture[];

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
] satisfies readonly SampleAddressFixture[];

export const SAMPLE_ADDRESS_FIXTURES = [
  ...CZ_SAMPLE_ADDRESSES,
  ...SK_SAMPLE_ADDRESSES,
  ...OPENADDRESSES_US_CA_SAMPLE_ADDRESSES,
] satisfies readonly SampleAddressFixture[];

const sampleSourceById = new Map(SAMPLE_DATA_SOURCES.map((source) => [source.id, source]));

const sampleAttributionForSourceId = (sourceId: string) =>
  sampleSourceById.get(sourceId)?.attribution ?? OPENADDRESSES_SAMPLE_ATTRIBUTION;

export const sampleAddressFixtureToRecordInput = (
  fixture: SampleAddressFixture,
): AddressSearchRecordInput => {
  const indexDocument = createAddressIndexDocument(fixture.parts);
  const record: AddressSearchRecordInput = {
    attribution: sampleAttributionForSourceId(fixture.sourceId),
    countryCode: fixture.countryCode,
    displayLabel: indexDocument.displayLabel,
    id: fixture.id,
    parts: fixture.parts,
    quality: fixture.quality,
    searchLabel: indexDocument.searchLabel,
    sourceId: fixture.sourceId,
  };

  if (fixture.latitude !== undefined) {
    record.latitude = fixture.latitude;
  }

  if (fixture.longitude !== undefined) {
    record.longitude = fixture.longitude;
  }

  return record;
};

export const seedSampleAddressFixtureDatasetsEffect = (
  repositories: SmartSuggestRepositories,
): SmartSuggestStorageEffect<SeedSampleAddressFixtureDatasetResult> =>
  gen(function* () {
    const sources = yield* all(
      SAMPLE_DATA_SOURCES.map((source) => repositories.dataSources.registerDataSource(source)),
    );
    const records = yield* repositories.addressRecords.upsertAddressRecords(
      SAMPLE_ADDRESS_FIXTURES.map(sampleAddressFixtureToRecordInput),
    );

    return { records, sources };
  });

/**
 * @deprecated Fixture/import-proof only. Runtime BFF startup and production
 * seeding must use configured D1 data sources/providers instead.
 */
export const seedSampleAddressDatasetsEffect = seedSampleAddressFixtureDatasetsEffect;

type SampleAddressRankingCandidate = AddressSearchRecordInput &
  AddressRankingCandidate & {
    address: AddressParts;
    confidence: number;
  };

export const searchSampleAddressFixtureProofs = (
  query: string,
  options: {
    countryCode?: SmartSuggestCountryCode;
    limit?: number;
  } = {},
) => {
  const candidates: SampleAddressRankingCandidate[] = SAMPLE_ADDRESS_FIXTURES.filter(
    (fixture) => options.countryCode === undefined || fixture.countryCode === options.countryCode,
  ).map((fixture) => {
    const recordInput = sampleAddressFixtureToRecordInput(fixture);

    return {
      ...recordInput,
      address: recordInput.parts,
      confidence: recordInput.quality,
    };
  });

  const rankingOptions = options.limit === undefined ? {} : { limit: options.limit };

  return rankAddressCandidates(query, candidates, rankingOptions).map(
    ({ candidate, reasons, score }: AddressRankedCandidate<SampleAddressRankingCandidate>) => ({
      ...candidate,
      ranking: { reasons, score },
    }),
  );
};

/**
 * @deprecated Use `searchSampleAddressFixtureProofs`; this helper is only for
 * fixture-backed tests and import proofs.
 */
export const searchSampleAddressFixtures = searchSampleAddressFixtureProofs;
