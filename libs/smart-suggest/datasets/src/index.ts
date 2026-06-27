import type {
  AddressParts,
  SmartSuggestCountryCode,
  SuggestionAttribution,
} from "@techsio/smart-suggest-core";
import {
  createAddressIndexDocument,
  rankAddressCandidates,
  scoreAddressRecordQuality,
} from "@techsio/smart-suggest-indexing";
import type {
  AddressRecord,
  AddressSearchRecordInput,
  DataSourceRecord,
  ImportRunRecord,
  SmartSuggestRepositories,
} from "@techsio/smart-suggest-storage";

export type SampleAddressFixture = {
  id: string;
  sourceId: string;
  countryCode: SmartSuggestCountryCode;
  parts: AddressParts;
  quality: number;
  latitude?: number;
  longitude?: number;
};

export type SeedSampleDatasetResult = {
  sources: readonly DataSourceRecord[];
  records: readonly AddressRecord[];
};

export type AddressSnapshotRow = {
  id: string;
  parts: AddressParts;
  quality?: number;
  latitude?: number;
  longitude?: number;
};

export type AddressImportSource = Omit<DataSourceRecord, "createdAt" | "updatedAt"> & {
  shardCountryCode: SmartSuggestCountryCode;
  snapshotUri?: string;
};

export type AddressImportRowError = {
  index: number;
  message: string;
  rowId?: string;
};

export type AddressDatasetImportOptions = {
  chunkSize?: number;
  repositories: SmartSuggestRepositories;
  rows: readonly AddressSnapshotRow[];
  runId: string;
  source: AddressImportSource;
};

export type AddressDatasetImportResult = {
  errors: readonly AddressImportRowError[];
  importRun: ImportRunRecord;
  insertedRows: number;
  rawSnapshotStoredInD1: false;
  restartable: true;
  shardCountryCode: SmartSuggestCountryCode;
  snapshotUri?: string;
  source: DataSourceRecord;
  totalRows: number;
};

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

export const seedSampleAddressDatasets = async (
  repositories: SmartSuggestRepositories,
): Promise<SeedSampleDatasetResult> => {
  const sources = await Promise.all(
    SAMPLE_DATA_SOURCES.map((source) => repositories.dataSources.registerDataSource(source)),
  );
  const records = await repositories.addressRecords.upsertAddressRecords(
    SAMPLE_ADDRESS_FIXTURES.map(sampleAddressFixtureToRecordInput),
  );

  return { records, sources };
};

export const searchSampleAddressFixtures = (
  query: string,
  options: {
    countryCode?: SmartSuggestCountryCode;
    limit?: number;
  } = {},
) => {
  const candidates = SAMPLE_ADDRESS_FIXTURES.filter(
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
    ({ candidate, reasons, score }) => ({
      ...candidate,
      ranking: { reasons, score },
    }),
  );
};

const DEFAULT_IMPORT_CHUNK_SIZE = 500;

const toImportRunErrorSummary = (errors: readonly AddressImportRowError[]) => {
  if (errors.length === 0) {
    return;
  }

  return errors
    .slice(0, 5)
    .map((error) => `row:${error.index}:${error.message}`)
    .join("; ");
};

type ImportableAddressParts = AddressParts & {
  city: string;
  countryCode: SmartSuggestCountryCode;
};

const isImportableAddressParts = (parts: AddressParts): parts is ImportableAddressParts =>
  parts.countryCode !== undefined &&
  parts.city !== undefined &&
  (parts.street !== undefined || parts.line1 !== undefined);

const normalizeSnapshotRow = (
  row: AddressSnapshotRow,
  source: AddressImportSource,
  index: number,
): AddressSearchRecordInput | AddressImportRowError => {
  if (row.id.trim() === "") {
    return { index, message: "Missing row id." };
  }

  if (!isImportableAddressParts(row.parts)) {
    return {
      index,
      message: "Address row needs countryCode, city, and street or line1.",
      rowId: row.id,
    };
  }

  if (row.parts.countryCode !== source.shardCountryCode) {
    return {
      index,
      message: `Address row country ${row.parts.countryCode} does not match shard ${source.shardCountryCode}.`,
      rowId: row.id,
    };
  }

  const indexDocument = createAddressIndexDocument(row.parts);
  const quality = scoreAddressRecordQuality(row.parts);
  const record: AddressSearchRecordInput = {
    attribution: source.attribution,
    countryCode: row.parts.countryCode,
    displayLabel: indexDocument.displayLabel,
    id: row.id,
    parts: row.parts,
    quality: row.quality ?? quality.score,
    searchLabel: indexDocument.searchLabel,
    sourceId: source.id,
  };

  if (row.latitude !== undefined) {
    record.latitude = row.latitude;
  }

  if (row.longitude !== undefined) {
    record.longitude = row.longitude;
  }

  return record;
};

const chunkRecords = <TRecord>(records: readonly TRecord[], chunkSize: number) => {
  const chunks: TRecord[][] = [];

  for (let index = 0; index < records.length; index += chunkSize) {
    chunks.push(records.slice(index, index + chunkSize));
  }

  return chunks;
};

const toDataSourceInput = (
  source: AddressImportSource,
): Omit<DataSourceRecord, "createdAt" | "updatedAt"> => {
  const input: Omit<DataSourceRecord, "createdAt" | "updatedAt"> = {
    attribution: source.attribution,
    cachePolicy: source.cachePolicy,
    countryCode: source.countryCode,
    id: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
  };

  if (source.datasetVersion !== undefined) {
    input.datasetVersion = source.datasetVersion;
  }

  if (source.region !== undefined) {
    input.region = source.region;
  }

  return input;
};

export const runAddressDatasetImport = async (
  options: AddressDatasetImportOptions,
): Promise<AddressDatasetImportResult> => {
  if (options.source.countryCode !== options.source.shardCountryCode) {
    throw new Error(
      `Import source country ${options.source.countryCode} does not match shard ${options.source.shardCountryCode}.`,
    );
  }

  const source = await options.repositories.dataSources.registerDataSource(
    toDataSourceInput(options.source),
  );
  const startedRun = await options.repositories.importRuns.startImportRun({
    id: options.runId,
    shardCountryCode: options.source.shardCountryCode,
    sourceId: options.source.id,
  });
  const chunkSize = Math.max(1, Math.trunc(options.chunkSize ?? DEFAULT_IMPORT_CHUNK_SIZE));
  const errors: AddressImportRowError[] = [];
  let insertedRows = 0;
  let processedRows = 0;

  try {
    for (const chunk of chunkRecords(options.rows, chunkSize)) {
      const records: AddressSearchRecordInput[] = [];

      for (const row of chunk) {
        const rowIndex = processedRows;
        processedRows += 1;
        const normalized = normalizeSnapshotRow(row, options.source, rowIndex);

        if ("message" in normalized) {
          errors.push(normalized);
          continue;
        }

        records.push(normalized);
      }

      if (records.length > 0) {
        insertedRows += (await options.repositories.addressRecords.upsertAddressRecords(records))
          .length;
      }
    }

    const errorSummary = toImportRunErrorSummary(errors);
    const completedRunInput: Pick<
      ImportRunRecord,
      "completedAt" | "errorSummary" | "failedRows" | "id" | "insertedRows" | "status" | "totalRows"
    > = {
      completedAt: new Date().toISOString(),
      failedRows: errors.length,
      id: startedRun.id,
      insertedRows,
      status:
        insertedRows === 0 && errors.length > 0 && options.rows.length > 0 ? "failed" : "completed",
      totalRows: options.rows.length,
    };

    if (errorSummary !== undefined) {
      completedRunInput.errorSummary = errorSummary;
    }

    const completedRun = await options.repositories.importRuns.finishImportRun(completedRunInput);

    const result: AddressDatasetImportResult = {
      errors,
      importRun: completedRun,
      insertedRows,
      rawSnapshotStoredInD1: false,
      restartable: true,
      shardCountryCode: options.source.shardCountryCode,
      source,
      totalRows: options.rows.length,
    };

    if (options.source.snapshotUri !== undefined) {
      result.snapshotUri = options.source.snapshotUri;
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Address dataset import failed.";
    await options.repositories.importRuns.finishImportRun({
      completedAt: new Date().toISOString(),
      errorSummary: message,
      failedRows: Math.max(1, options.rows.length - insertedRows),
      id: startedRun.id,
      insertedRows,
      status: "failed",
      totalRows: options.rows.length,
    });
    throw error;
  }
};
