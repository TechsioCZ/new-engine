import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "@effect/vitest";

import {
  createAddressRecordFromSuggestion,
  createAddressSearchFtsQuery,
  createArtifactSmartSuggestRepositories,
  createD1SmartSuggestRepositories,
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHashEffect,
  type SmartSuggestArtifactFetch,
  type SmartSuggestD1Binding,
  type SmartSuggestStorageEffect,
  SmartSuggestStorageError,
  smartSuggestSchema,
} from "../src/storage";

const hmacSha256HashPattern = /^hmac-sha256:[a-f0-9]{64}$/u;
const artifactGeneratedAt = "2026-06-30T00:00:00.000Z";
const artifactManifestUrl = "https://static.example.test/smart-suggest/manifest.json";

const resolveStorageEffect = <T>(effect: SmartSuggestStorageEffect<T>) => effect;

const assertStorageEffect = <T>(
  effect: SmartSuggestStorageEffect<T>,
  assertion: (value: T) => void,
) => Effect.map(effect, assertion);

const assertStorageFailure = <T>(
  effect: SmartSuggestStorageEffect<T>,
  assertion: (error: unknown) => void,
) =>
  Effect.map(Effect.exit(effect), (result) => {
    expect(Exit.isFailure(result)).toBe(true);

    if (!Exit.isFailure(result)) {
      return;
    }

    assertion(Cause.squash(result.cause));
  });

const createArtifactFetch =
  (artifacts: ReadonlyMap<string, unknown>): SmartSuggestArtifactFetch =>
  async (input) => {
    const url = String(input);
    const artifact = artifacts.get(url);

    if (artifact === undefined) {
      return new Response("{}", { status: 404 });
    }

    return Response.json(artifact);
  };

const createArtifactAddressRecord = ({
  city,
  houseNumber,
  id,
  orientationNumber,
  postalCode = "101 00",
  searchLabel,
  street = "K Louzi",
}: {
  city: string;
  houseNumber: string;
  id: string;
  orientationNumber?: string;
  postalCode?: string;
  searchLabel: string;
  street?: string;
}) => {
  const displayNumber =
    orientationNumber === undefined ? houseNumber : `${houseNumber}/${orientationNumber}`;

  return {
    countryCode: "CZ",
    createdAt: artifactGeneratedAt,
    displayLabel: `${street} ${displayNumber}, ${postalCode} ${city}, CZ`,
    id,
    parts: {
      city,
      countryCode: "CZ",
      houseNumber,
      orientationNumber,
      postalCode,
      street,
    },
    quality: 0.99,
    replicationStatus: "active",
    searchLabel,
    searchVisible: true,
    sourceId: "ruian-cz",
    updatedAt: artifactGeneratedAt,
  };
};

const createArtifactManifest = ({ rowCount }: { rowCount: number }) => ({
  dataset: {
    complete: true,
    countryCode: "CZ",
    estimatedSizeBytes: rowCount * 512,
    importRun: {
      checksumSha256: "f".repeat(64),
      completedAt: artifactGeneratedAt,
      failedRows: 0,
      id: "artifact-ruian-cz-2026-05-31",
      importKind: "baseline",
      insertedRows: rowCount,
      shardCountryCode: "CZ",
      skippedRows: 0,
      sourceId: "ruian-cz",
      sourceUri: "https://vdp.cuzk.gov.cz/vymenny_format/csv/20260531_OB_ADR_csv.zip",
      sourceValidAt: "2026-05-31",
      sourceVersion: "ruian-cz-2026-05-31",
      startedAt: artifactGeneratedAt,
      status: "completed",
      tombstonedRows: 0,
      totalRows: rowCount,
      upsertedRows: rowCount,
    },
    rowCount,
    source: {
      attribution: {
        label: "CUZK RUIAN",
        license: "CC BY 4.0",
        url: "https://ruian.cuzk.cz/",
      },
      cachePolicy: { kind: "permanent" },
      countryCode: "CZ",
      createdAt: artifactGeneratedAt,
      datasetVersion: "ruian-cz-2026-05-31",
      id: "ruian-cz",
      modificationNoteSha256: "a".repeat(64),
      name: "RUIAN CZ",
      sourceKind: "owned-dataset",
      updatedAt: artifactGeneratedAt,
    },
  },
  generatedAt: artifactGeneratedAt,
  indexes: {
    addressRecords: {
      bucketCount: 1,
      complete: true,
      pathTemplate: "records/{countryCode}/{recordBucket}.json",
    },
    addressTokens: {
      bucketCount: 1,
      bucketManifestPathTemplate: "token/{countryCode}/bucket-{tokenBucket}/manifest.json",
      bucketPagePathTemplate: "token/{countryCode}/bucket-{tokenBucket}/{page}.json",
      bucketPathTemplate: "token/{countryCode}/bucket-{tokenBucket}.json",
      complete: true,
      manifestPathTemplate: "token/{countryCode}/{token}/manifest.json",
      maxFileSizeBytes: 26_214_400,
      maxPagesPerQuery: 4,
      maxTokenLength: 16,
      minTokenLength: 2,
      pagePathTemplate: "token/{countryCode}/{token}/{page}.json",
      pageSize: 50,
    },
    postalLocalities: {
      complete: true,
      pathTemplate: "postal/{countryCode}/{postalCode}.json",
    },
  },
  schemaVersion: "smart-suggest-owned-artifacts/v1",
  shards: [
    {
      bindingName: "SMART_SUGGEST_OWNED_ARTIFACTS",
      countryCode: "CZ",
      createdAt: artifactGeneratedAt,
      estimatedSizeBytes: rowCount * 512,
      importVersion: "ruian-cz-2026-05-31",
      lastImportCompletedAt: artifactGeneratedAt,
      municipalityCodes: [],
      municipalityHints: [],
      postalPrefixes: [],
      regionCode: "CZ",
      regionKind: "country",
      regionName: "Czech Republic owned artifact index",
      rowCount,
      shardId: "smart-suggest-cz-owned-artifacts",
      sourceFreshnessAt: "2026-05-31",
      state: "active",
      updatedAt: artifactGeneratedAt,
    },
  ],
});

describe("smart suggest storage", () => {
  it("exposes Drizzle tables for migration generation", () => {
    expect(Object.keys(smartSuggestSchema).sort()).toEqual([
      "smartSuggestAcceptEvents",
      "smartSuggestAddressRecords",
      "smartSuggestAddressSearchTokens",
      "smartSuggestAddressTombstones",
      "smartSuggestApiKeys",
      "smartSuggestCacheEntries",
      "smartSuggestDataSources",
      "smartSuggestImportRuns",
      "smartSuggestProviderEvents",
      "smartSuggestShardRegistry",
      "smartSuggestTenants",
    ]);
  });

  it("exposes a D1 repository factory for Worker runtime bindings", () => {
    expect(createD1SmartSuggestRepositories).toBeTypeOf("function");
  });

  it.effect("runs D1 repository checks through Drizzle Effect D1", () =>
    Effect.gen(function* () {
      const preparedQueries: string[] = [];
      const binding = {
        prepare: (query: string) => {
          preparedQueries.push(query);

          return {
            bind: () => ({
              all: async () => ({ results: [] }),
              raw: async () => [],
            }),
          };
        },
      } as unknown as SmartSuggestD1Binding;

      const repositories = createD1SmartSuggestRepositories(binding);

      yield* assertStorageEffect(repositories.health.check(), (result) => {
        expect(result).toMatchObject({ ok: true });
      });
      expect(preparedQueries).toContain("select 1");
    }),
  );

  it.effect("sanitizes D1 SQL failure details from storage errors", () =>
    Effect.gen(function* () {
      const rawFailure = new Error(
        'Failed query: insert into smart_suggest_address_records values (?)\nparams: ["K Louzi 1258/12"]',
      );
      const binding = {
        prepare: () => ({
          bind: () => ({
            all: async () => {
              throw rawFailure;
            },
            raw: async () => {
              throw rawFailure;
            },
          }),
        }),
      } as unknown as SmartSuggestD1Binding;
      const repositories = createD1SmartSuggestRepositories(binding);

      const health = yield* resolveStorageEffect(repositories.health.check());

      expect(health).toMatchObject({
        error: "Smart Suggest storage operation failed during D1 SQL execution.",
        ok: false,
      });
      expect(health.error).not.toContain("K Louzi");
      expect(health.error).not.toContain("params:");
      expect(health.error).not.toContain("Failed query:");
    }),
  );

  it.effect("orders FTS address candidates before applying the candidate limit", () =>
    Effect.gen(function* () {
      const preparedQueries: string[] = [];
      const binding = {
        prepare: (query: string) => {
          preparedQueries.push(query);

          return {
            bind: () => ({
              all: async () => ({ results: [] }),
              raw: async () => [],
            }),
          };
        },
      } as unknown as SmartSuggestD1Binding;
      const repositories = createD1SmartSuggestRepositories(binding);

      yield* resolveStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 1,
          query: "Lou",
        }),
      );

      const ftsQuery = preparedQueries.find(
        (query) => query.includes("smart_suggest_address_search_fts") && query.includes(" match "),
      );

      expect(ftsQuery?.replaceAll(/\s+/g, " ").toLowerCase()).toContain("order by rank limit");
    }),
  );

  it.effect("orders prefix-token address candidates before applying the candidate window limit", () =>
    Effect.gen(function* () {
      const preparedQueries: string[] = [];
      const binding = {
        prepare: (query: string) => {
          preparedQueries.push(query);

          return {
            bind: () => ({
              all: async () => ({ results: [] }),
              raw: async () => [],
            }),
          };
        },
      } as unknown as SmartSuggestD1Binding;
      const repositories = createD1SmartSuggestRepositories(binding);

      yield* resolveStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 1,
          query: "Lo",
        }),
      );

      const tokenQuery = preparedQueries.find(
        (query) =>
          query.toLowerCase().includes("select") &&
          query.includes("smart_suggest_address_search_tokens"),
      );
      const normalizedTokenQuery = tokenQuery?.replaceAll(/\s+/g, " ").toLowerCase();

      expect(normalizedTokenQuery).toBeDefined();
      if (normalizedTokenQuery === undefined) {
        return;
      }

      expect(normalizedTokenQuery).toContain("inner join");
      expect(normalizedTokenQuery).toContain("group by");
      expect(normalizedTokenQuery).toContain("order by sum(");
      expect(normalizedTokenQuery).toContain("quality");
      expect(normalizedTokenQuery).toContain("display_label");
      expect(normalizedTokenQuery.indexOf("order by")).toBeLessThan(
        normalizedTokenQuery.lastIndexOf("limit"),
      );
    }),
  );

  it.effect("uses conflict-safe deterministic address search token writes", () =>
    Effect.gen(function* () {
      const preparedQueries: string[] = [];
      const binding = {
        prepare: (query: string) => {
          preparedQueries.push(query);

          return {
            bind: () => ({
              all: async () => ({ results: [] }),
              raw: async () => [],
            }),
          };
        },
      } as unknown as SmartSuggestD1Binding;
      const repositories = createD1SmartSuggestRepositories(binding);

      yield* resolveStorageEffect(
        repositories.addressRecords.upsertAddressRecords([
          {
            countryCode: "CZ",
            displayLabel: "K Louži 1258/12, 101 00 Praha 10, CZ",
            id: "ruian-cz:1203603",
            parts: {
              city: "Praha 10",
              countryCode: "CZ",
              houseNumber: "1258",
              orientationNumber: "12",
              postalCode: "101 00",
              street: "K Louži",
            },
            quality: 0.99,
            searchLabel: "k louzi 1258 12 101 00 praha 10 cz",
            sourceId: "ruian-cz",
          },
        ]),
      );

      const tokenInsertQuery = preparedQueries.find(
        (query) =>
          query.toLowerCase().includes("insert") &&
          query.includes("smart_suggest_address_search_tokens"),
      );
      const normalizedTokenInsertQuery = tokenInsertQuery?.replaceAll(/\s+/g, " ").toLowerCase();

      expect(normalizedTokenInsertQuery).toContain("on conflict");
      expect(normalizedTokenInsertQuery).toContain("do nothing");
    }),
  );

  it.effect("marks D1 tombstone matches hidden and clears their search indexes", () =>
    Effect.gen(function* () {
      const preparedQueries: string[] = [];
      const binding = {
        prepare: (query: string) => {
          preparedQueries.push(query);
          const matchedAddressRows = () => {
            const normalizedQuery = query.replaceAll(/\s+/g, " ").toLowerCase();

            return normalizedQuery.includes("select") &&
              normalizedQuery.includes("smart_suggest_address_records")
              ? [["ruian-cz:1203603"]]
              : [];
          };

          return {
            bind: () => ({
              all: async () => ({ results: matchedAddressRows() }),
              raw: async () => matchedAddressRows(),
            }),
          };
        },
      } as unknown as SmartSuggestD1Binding;
      const repositories = createD1SmartSuggestRepositories(binding);

      yield* resolveStorageEffect(
        repositories.addressTombstones.upsertAddressTombstones([
          {
            countryCode: "CZ",
            deletedAt: "2026-06-27",
            id: "ruian-cz:1203603",
            reason: "removed by RUIAN delta",
            ruian: {
              addressPlaceCode: "1203603",
            },
            sourceId: "ruian-cz",
          },
        ]),
      );

      const normalizedQueries = preparedQueries.map((query) =>
        query.replaceAll(/\s+/g, " ").toLowerCase(),
      );

      expect(
        normalizedQueries.some(
          (query) =>
            query.includes("update") &&
            query.includes("smart_suggest_address_records") &&
            query.includes("replication_status") &&
            query.includes("search_visible"),
        ),
      ).toBe(true);
      expect(
        normalizedQueries.some(
          (query) =>
            query.includes("delete") &&
            query.includes("smart_suggest_address_search_tokens") &&
            query.includes("record_id"),
        ),
      ).toBe(true);
      expect(
        normalizedQueries.some(
          (query) =>
            query.includes("delete") &&
            query.includes("smart_suggest_address_search_fts") &&
            query.includes("record_id"),
        ),
      ).toBe(true);
    }),
  );

  it.effect("stores and resolves CZ VUSC shard routing metadata", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();
      const praha = yield* resolveStorageEffect(
        repositories.shardRegistry.upsertShardMetadata({
          bindingName: "SMART_SUGGEST_CZ_VUSC_19",
          countryCode: "CZ",
          estimatedSizeBytes: 421_600_000,
          importVersion: "ruian-cz-2026-06-26",
          lastImportCompletedAt: "2026-06-26T12:00:00.000Z",
          municipalityCodes: ["554782"],
          municipalityHints: ["Hlavní město Praha"],
          postalPrefixes: ["110", "111"],
          regionCode: "19",
          regionKind: "vusc",
          regionName: "Praha",
          rowCount: 123_456,
          shardId: "smart-suggest-cz-vusc-19",
          sourceFreshnessAt: "2026-06-26T00:00:00.000Z",
          state: "active",
        }),
      );

      const updatedPraha = yield* resolveStorageEffect(
        repositories.shardRegistry.upsertShardMetadata({
          bindingName: "SMART_SUGGEST_CZ_VUSC_19",
          countryCode: "CZ",
          estimatedSizeBytes: 421_700_000,
          importVersion: "ruian-cz-2026-06-27",
          municipalityCodes: ["554782", "554782"],
          municipalityHints: ["Hlavní město Praha", "hlavni mesto praha"],
          postalPrefixes: ["110 00", "110"],
          regionCode: "19",
          regionKind: "vusc",
          regionName: "Praha",
          rowCount: 123_789,
          shardId: "smart-suggest-cz-vusc-19",
          state: "active",
        }),
      );

      yield* resolveStorageEffect(
        repositories.shardRegistry.upsertShardMetadata({
          bindingName: "SMART_SUGGEST_CZ_VUSC_19_STANDBY",
          countryCode: "CZ",
          importVersion: "ruian-cz-2026-06-28-build",
          regionCode: "19",
          regionKind: "vusc",
          regionName: "Praha",
          rowCount: 0,
          shardId: "smart-suggest-cz-vusc-19-standby",
          state: "standby",
        }),
      );
      yield* resolveStorageEffect(
        repositories.shardRegistry.upsertShardMetadata({
          bindingName: "SMART_SUGGEST_CZ_VUSC_116",
          countryCode: "CZ",
          municipalityCodes: ["582786"],
          postalPrefixes: ["602"],
          regionCode: "116",
          regionKind: "vusc",
          regionName: "Jihomoravský",
          rowCount: 300_000,
          shardId: "smart-suggest-cz-vusc-116",
          state: "disabled",
        }),
      );
      yield* resolveStorageEffect(
        repositories.shardRegistry.upsertShardMetadata({
          bindingName: "SMART_SUGGEST_CZ_VUSC_19",
          countryCode: "CZ",
          municipalityCodes: ["539686"],
          postalPrefixes: ["252"],
          regionCode: "86",
          regionKind: "vusc",
          regionName: "Středočeský",
          rowCount: 250_000,
          shardId: "smart-suggest-cz-vusc-86",
          state: "active",
        }),
      );

      expect(updatedPraha.createdAt).toBe(praha.createdAt);
      expect(updatedPraha).toMatchObject({
        bindingName: "SMART_SUGGEST_CZ_VUSC_19",
        countryCode: "CZ",
        estimatedSizeBytes: 421_700_000,
        importVersion: "ruian-cz-2026-06-27",
        municipalityCodes: ["554782"],
        municipalityHints: ["hlavni mesto praha"],
        postalPrefixes: ["11000", "110"],
        regionCode: "19",
        regionKind: "vusc",
        regionName: "Praha",
        rowCount: 123_789,
        shardId: "smart-suggest-cz-vusc-19",
        state: "active",
      });
      yield* assertStorageEffect(
        repositories.shardRegistry.listShardMetadata({
          countryCode: "CZ",
          state: "active",
        }),
        (result) =>
          expect(result).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
              expect.objectContaining({ shardId: "smart-suggest-cz-vusc-86" }),
            ]),
          ),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          regionCode: "19",
        }),
        (result) =>
          expect(result).toEqual([
            expect.objectContaining({ bindingName: "SMART_SUGGEST_CZ_VUSC_19" }),
          ]),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          postalCode: "110 00",
        }),
        (result) =>
          expect(result).toEqual([
            expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
          ]),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          municipalityCode: "554782",
        }),
        (result) =>
          expect(result).toEqual([
            expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
          ]),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          municipalityHint: "Hlavní město Praha",
        }),
        (result) =>
          expect(result).toEqual([
            expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
          ]),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          regionCode: "116",
        }),
        (result) => expect(result).toEqual([]),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          regionCode: "86",
        }),
        (result) =>
          expect(result).toEqual([
            expect.objectContaining({
              bindingName: "SMART_SUGGEST_CZ_VUSC_19",
              shardId: "smart-suggest-cz-vusc-86",
            }),
          ]),
      );
      yield* assertStorageEffect(
        repositories.shardRegistry.resolveShardMetadata({
          countryCode: "CZ",
          regionCode: "19",
          states: ["active", "standby"],
        }),
        (result) =>
          expect(result).toEqual([
            expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
            expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19-standby" }),
          ]),
      );
    }),
  );

  it.effect("stores repository data without raw user query fields", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();
      const source = yield* resolveStorageEffect(
        repositories.dataSources.registerDataSource({
          attribution: {
            label: "RUIAN sample",
            license: "CC BY 4.0",
            url: "https://ruian.cuzk.cz/",
          },
          cachePolicy: { kind: "permanent" },
          countryCode: "CZ",
          id: "ruian-cz-sample",
          modificationNoteSha256: "a".repeat(64),
          name: "RUIAN CZ sample",
          sourceKind: "owned-dataset",
        }),
      );

      const storedSource = yield* resolveStorageEffect(
        repositories.dataSources.getDataSource(source.id),
      );

      expect(storedSource).toMatchObject({
        modificationNoteSha256: "a".repeat(64),
      });

      yield* resolveStorageEffect(
        repositories.addressRecords.upsertAddressRecords([
          {
            countryCode: "CZ",
            displayLabel: "Václavské náměstí 1, 110 00 Praha",
            id: "cz-1",
            parts: {
              city: "Praha",
              countryCode: "CZ",
              houseNumber: "1",
              postalCode: "110 00",
              street: "Václavské náměstí",
            },
            quality: 0.95,
            searchLabel: "vaclavske namesti 1 110 00 praha",
            sourceId: source.id,
          },
        ]),
      );

      const results = yield* resolveStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          query: "václavské",
        }),
      );

      expect(results).toHaveLength(1);
      yield* assertStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          query: "vaclavske nam",
        }),
        (searchResults) => expect(searchResults).toHaveLength(1),
      );
      yield* assertStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          query: "11000",
        }),
        (searchResults) => expect(searchResults).toHaveLength(1),
      );
      expect(JSON.stringify(results)).not.toContain("rawQuery");
      expect(JSON.stringify(results)).not.toContain("query:");
    }),
  );

  it.effect("lists every owned postal locality without applying search limits", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();
      const source = yield* resolveStorageEffect(
        repositories.dataSources.registerDataSource({
          attribution: {
            label: "RUIAN postal localities",
            url: "https://ruian.cuzk.cz/",
          },
          cachePolicy: { kind: "permanent" },
          countryCode: "CZ",
          id: "ruian-cz",
          name: "RUIAN CZ",
          sourceKind: "owned-dataset",
        }),
      );

      yield* resolveStorageEffect(
        repositories.addressRecords.upsertAddressRecords(
          Array.from({ length: 55 }, (_, index) => {
            const localityNumber = String(index + 1).padStart(2, "0");

            return {
              countryCode: "CZ" as const,
              displayLabel: `Hlavní ${index + 1}, 10100 Obec ${localityNumber}`,
              id: `ruian-cz-postal-${localityNumber}`,
              parts: {
                city: `Obec ${localityNumber}`,
                countryCode: "CZ" as const,
                houseNumber: String(index + 1),
                postalCode: index % 2 === 0 ? "101 00" : "10100",
                street: "Hlavní",
              },
              quality: 0.95,
              searchLabel: `hlavni ${index + 1} 10100 obec ${localityNumber}`,
              sourceId: source.id,
            };
          }),
        ),
      );

      const localities = yield* resolveStorageEffect(
        repositories.addressRecords.listPostalLocalityAddressRecords({
          countryCode: "CZ",
          postalCode: "101 00",
        }),
      );

      expect(localities).toHaveLength(55);
      expect(localities.map((record) => record.parts.city)).toContain("Obec 55");
    }),
  );

  it.effect("serves address suggestions and provenance from owned data artifacts", () =>
    Effect.gen(function* () {
      const records = [
        createArtifactAddressRecord({
          city: "Praha 10",
          houseNumber: "1258",
          id: "ruian-cz:1203603",
          orientationNumber: "12",
          searchLabel: "k louzi 1258 12 101 00 praha 10 vrsovice cz",
        }),
        createArtifactAddressRecord({
          city: "Praha 10",
          houseNumber: "1258",
          id: "ruian-cz:1203604",
          orientationNumber: "7",
          searchLabel: "k louzi 1258 7 101 00 praha 10 vrsovice cz",
        }),
        createArtifactAddressRecord({
          city: "Praha 10",
          houseNumber: "784",
          id: "ruian-cz:1203605",
          orientationNumber: "3",
          searchLabel: "k louzi 784 3 101 00 praha 10 vrsovice cz",
        }),
        createArtifactAddressRecord({
          city: "Praha 10",
          houseNumber: "1312",
          id: "ruian-cz:1203606",
          orientationNumber: "1",
          searchLabel: "k louzi 1312 1 101 00 praha 10 vrsovice cz",
        }),
      ];
      const artifacts = new Map<string, unknown>([
        [artifactManifestUrl, createArtifactManifest({ rowCount: records.length })],
        [
          "https://static.example.test/smart-suggest/token/CZ/bucket-0000.json",
          {
            bucket: 0,
            complete: true,
            countryCode: "CZ",
            datasetVersion: "ruian-cz-2026-05-31",
            schemaVersion: "smart-suggest-address-token-bucket/v1",
            tokens: {
              louzi: {
                recordCount: records.length,
                recordIds: records.map((record) => record.id),
              },
            },
          },
        ],
        [
          "https://static.example.test/smart-suggest/records/CZ/0000.json",
          {
            complete: true,
            countryCode: "CZ",
            datasetVersion: "ruian-cz-2026-05-31",
            query: {
              kind: "address-record-bucket",
              value: "0000",
            },
            records,
            schemaVersion: "smart-suggest-address-records/v1",
          },
        ],
      ]);
      const repositories = createArtifactSmartSuggestRepositories({
        fallback: createInMemorySmartSuggestRepositories(),
        fetch: createArtifactFetch(artifacts),
        manifestUrl: artifactManifestUrl,
      });

      const suggestions = yield* resolveStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 10,
          query: "K Louzi",
        }),
      );
      const source = yield* resolveStorageEffect(
        repositories.dataSources.getDataSource("ruian-cz"),
      );
      const runs = yield* resolveStorageEffect(repositories.importRuns.listRecentImportRuns(5));
      const shards = yield* resolveStorageEffect(
        repositories.shardRegistry.listShardMetadata({ countryCode: "CZ", state: "active" }),
      );

      expect(suggestions.map((record) => record.id).toSorted()).toEqual([
        "ruian-cz:1203603",
        "ruian-cz:1203604",
        "ruian-cz:1203605",
        "ruian-cz:1203606",
      ]);
      expect(source).toMatchObject({
        datasetVersion: "ruian-cz-2026-05-31",
        id: "ruian-cz",
        sourceKind: "owned-dataset",
      });
      expect(runs[0]).toMatchObject({
        id: "artifact-ruian-cz-2026-05-31",
        sourceId: "ruian-cz",
        status: "completed",
        totalRows: records.length,
      });
      expect(shards).toEqual([
        expect.objectContaining({
          bindingName: "SMART_SUGGEST_OWNED_ARTIFACTS",
          rowCount: records.length,
          shardId: "smart-suggest-cz-owned-artifacts",
        }),
      ]);
    }),
  );

  it.effect("serves address suggestions from paged owned-data token buckets", () =>
    Effect.gen(function* () {
      const records = [
        createArtifactAddressRecord({
          city: "Praha 10",
          houseNumber: "1258",
          id: "ruian-cz:1203603",
          orientationNumber: "12",
          searchLabel: "k louzi 1258 12 101 00 praha 10 vrsovice cz",
        }),
        createArtifactAddressRecord({
          city: "Praha 10",
          houseNumber: "1258",
          id: "ruian-cz:1203604",
          orientationNumber: "7",
          searchLabel: "k louzi 1258 7 101 00 praha 10 vrsovice cz",
        }),
      ];
      const artifacts = new Map<string, unknown>([
        [artifactManifestUrl, createArtifactManifest({ rowCount: records.length })],
        [
          "https://static.example.test/smart-suggest/token/CZ/bucket-0000/manifest.json",
          {
            bucket: 0,
            complete: true,
            countryCode: "CZ",
            datasetVersion: "ruian-cz-2026-05-31",
            pageCount: 1,
            pages: [
              {
                page: 0,
                path: "token/CZ/bucket-0000/0000.json",
                recordCount: records.length,
                tokenCount: 1,
              },
            ],
            schemaVersion: "smart-suggest-address-token-bucket-manifest/v1",
            tokens: {
              louzi: {
                page: 0,
                recordCount: records.length,
              },
            },
          },
        ],
        [
          "https://static.example.test/smart-suggest/token/CZ/bucket-0000/0000.json",
          {
            bucket: 0,
            complete: true,
            countryCode: "CZ",
            datasetVersion: "ruian-cz-2026-05-31",
            page: 0,
            schemaVersion: "smart-suggest-address-token-bucket-page/v1",
            tokens: {
              louzi: {
                recordCount: records.length,
                recordIds: records.map((record) => record.id),
              },
            },
          },
        ],
        [
          "https://static.example.test/smart-suggest/records/CZ/0000.json",
          {
            complete: true,
            countryCode: "CZ",
            datasetVersion: "ruian-cz-2026-05-31",
            query: {
              kind: "address-record-bucket",
              value: "0000",
            },
            records,
            schemaVersion: "smart-suggest-address-records/v1",
          },
        ],
      ]);
      const repositories = createArtifactSmartSuggestRepositories({
        fallback: createInMemorySmartSuggestRepositories(),
        fetch: createArtifactFetch(artifacts),
        manifestUrl: artifactManifestUrl,
      });

      const suggestions = yield* resolveStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 10,
          query: "K Louzi",
        }),
      );

      expect(suggestions.map((record) => record.id).toSorted()).toEqual([
        "ruian-cz:1203603",
        "ruian-cz:1203604",
      ]);
    }),
  );

  it.effect("serves every exact ZIP locality from owned data artifacts", () =>
    Effect.gen(function* () {
      const records = Array.from({ length: 55 }, (_, index) => {
        const localityNumber = String(index + 1).padStart(2, "0");

        return createArtifactAddressRecord({
          city: `Obec ${localityNumber}`,
          houseNumber: String(index + 1),
          id: `ruian-cz:postal:${localityNumber}`,
          postalCode: index % 2 === 0 ? "101 00" : "10100",
          searchLabel: `hlavni ${index + 1} 10100 obec ${localityNumber}`,
          street: "Hlavni",
        });
      });
      const artifacts = new Map<string, unknown>([
        [artifactManifestUrl, createArtifactManifest({ rowCount: records.length })],
        [
          "https://static.example.test/smart-suggest/postal/CZ/10100.json",
          {
            complete: true,
            countryCode: "CZ",
            datasetVersion: "ruian-cz-2026-05-31",
            query: {
              kind: "postal-code",
              value: "10100",
            },
            records,
            schemaVersion: "smart-suggest-address-records/v1",
          },
        ],
      ]);
      const repositories = createArtifactSmartSuggestRepositories({
        fallback: createInMemorySmartSuggestRepositories(),
        fetch: createArtifactFetch(artifacts),
        manifestUrl: artifactManifestUrl,
      });

      const localities = yield* resolveStorageEffect(
        repositories.addressRecords.listPostalLocalityAddressRecords({
          countryCode: "CZ",
          postalCode: "101 00",
        }),
      );

      expect(localities).toHaveLength(55);
      expect(localities.map((record) => record.parts.city)).toContain("Obec 55");
    }),
  );

  it.effect(
    "stores RUIAN lineage and hides invalid or tombstoned address records from search",
    () =>
      Effect.gen(function* () {
        const repositories = createInMemorySmartSuggestRepositories();
        const source = yield* resolveStorageEffect(
          repositories.dataSources.registerDataSource({
            attribution: {
              label: "RUIAN CZ",
              license: "CC BY 4.0",
              url: "https://ruian.cuzk.gov.cz/",
            },
            cachePolicy: { kind: "permanent" },
            countryCode: "CZ",
            datasetVersion: "2026-06-26",
            id: "ruian-cz",
            name: "RUIAN CZ",
            sourceKind: "owned-dataset",
          }),
        );

        yield* resolveStorageEffect(
          repositories.addressRecords.upsertAddressRecords([
            {
              countryCode: "CZ",
              displayLabel: "K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ",
              id: "ruian-cz:1203603",
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
              ruian: {
                addressPlaceCode: "1203603",
                buildingObjectCode: "2168187",
                municipalityCode: "554782",
                postalCode: "10100",
                regionCode: "19",
                stableAddressId: "ruian-cz:1203603",
                streetCode: "456891",
              },
              searchLabel: "k louzi 1258 12 101 00 praha 10 vrsovice cz",
              sourceId: source.id,
              sourceLineage: {
                checksumSha256: "sha256-test-checksum",
                datasetVersion: "2026-06-26",
                feedId: "RUIAN-S-ZA-U",
                fileKind: "baseline",
                lastImportRunId: "import-ruian-cz-2026-06-26",
                sourceId: "ruian-cz",
                sourceRecordId: "1203603",
                sourceRecordType: "address-place",
                sourceRowId: "1203603",
                sourceUri: "https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/example.zip",
              },
              visibility: {
                replicationStatus: "active",
                searchVisible: true,
                sourceStatus: "platný",
                validFrom: "2026-01-01",
              },
            },
            {
              countryCode: "CZ",
              displayLabel: "K Louži 999/99, 101 00 Praha 10, Vršovice, CZ",
              id: "ruian-cz:999999",
              parts: {
                city: "Praha 10",
                countryCode: "CZ",
                houseNumber: "999",
                orientationNumber: "99",
                postalCode: "101 00",
                street: "K Louži",
              },
              quality: 0.99,
              replicationStatus: "invalid",
              ruian: {
                addressPlaceCode: "999999",
                regionCode: "19",
              },
              searchLabel: "k louzi 999 99 101 00 praha 10 vrsovice cz",
              searchVisible: false,
              sourceId: source.id,
              sourceLineage: {
                sourceId: "ruian-cz",
                sourceRecordId: "999999",
                sourceRowId: "999999",
              },
              visibility: {
                invalid: true,
                reason: "invalid by source",
                replicationStatus: "invalid",
                searchVisible: false,
                validTo: "2026-06-26",
              },
            },
          ]),
        );

        const activeSearchResults = yield* resolveStorageEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: "CZ",
            query: "K Louži",
          }),
        );
        const invalidRecord = yield* resolveStorageEffect(
          repositories.addressRecords.getAddressRecord("ruian-cz:999999"),
        );

        expect(activeSearchResults).toEqual([
          expect.objectContaining({
            id: "ruian-cz:1203603",
            ruian: expect.objectContaining({
              addressPlaceCode: "1203603",
              regionCode: "19",
            }),
            sourceLineage: expect.objectContaining({
              feedId: "RUIAN-S-ZA-U",
              sourceRecordId: "1203603",
            }),
          }),
        ]);
        expect(invalidRecord).toMatchObject({
          replicationStatus: "invalid",
          searchVisible: false,
          visibility: { invalid: true, reason: "invalid by source" },
        });

        yield* resolveStorageEffect(
          repositories.addressTombstones.upsertAddressTombstones([
            {
              countryCode: "CZ",
              deletedAt: "2026-06-27",
              id: "ruian-cz:1203603",
              reason: "removed by RUIAN delta",
              ruian: {
                addressPlaceCode: "1203603",
                regionCode: "19",
              },
              sourceId: source.id,
              sourceLineage: {
                feedId: "RUIAN-S-ZA-Z",
                fileKind: "delta",
                sourceId: "ruian-cz",
                sourceRecordId: "1203603",
                sourceRowId: "1203603",
              },
            },
          ]),
        );

        const tombstonedSearchResults = yield* resolveStorageEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: "CZ",
            query: "K Louži 1258",
          }),
        );
        const tombstonedRecord = yield* resolveStorageEffect(
          repositories.addressRecords.getAddressRecord("ruian-cz:1203603"),
        );
        const tombstones = yield* resolveStorageEffect(
          repositories.addressTombstones.listAddressTombstones(),
        );

        expect(tombstonedSearchResults).toEqual([]);
        expect(tombstonedRecord).toMatchObject({
          replicationStatus: "tombstoned",
          searchVisible: false,
          visibility: {
            reason: "removed by RUIAN delta",
            replicationStatus: "tombstoned",
          },
        });
        expect(tombstones).toEqual([
          expect.objectContaining({
            id: "ruian-cz:1203603",
            reason: "removed by RUIAN delta",
            ruian: expect.objectContaining({ addressPlaceCode: "1203603" }),
          }),
        ]);
      }),
  );

  it("builds gated FTS5 queries for address-specific input", () => {
    expect(createAddressSearchFtsQuery("K")).toBeUndefined();
    expect(createAddressSearchFtsQuery("K L")).toBeUndefined();
    expect(createAddressSearchFtsQuery("Lo")).toBeUndefined();
    expect(createAddressSearchFtsQuery("Lou")).toBe("lou*");
    expect(createAddressSearchFtsQuery("K Louži 1258/12")).toBe("louzi* 1258* 12*");
    expect(createAddressSearchFtsQuery("10100 K Louzi")).toBe("10100* louzi*");
  });

  it.effect(
    "lets the prefix index handle meaningful address queries and gates weak fragments",
    () =>
      Effect.gen(function* () {
        const repositories = createInMemorySmartSuggestRepositories();
        const source = yield* resolveStorageEffect(
          repositories.dataSources.registerDataSource({
            attribution: {
              label: "Live provider cache",
            },
            cachePolicy: { kind: "ttl", ttlSeconds: 43_200 },
            countryCode: "CZ",
            id: "live-provider:nominatim:CZ",
            name: "Nominatim CZ cache",
            sourceKind: "live-provider",
          }),
        );

        yield* resolveStorageEffect(
          repositories.addressRecords.upsertAddressRecords([
            {
              countryCode: "CZ",
              displayLabel: "1312/1, K Louži, Vršovice, Praha 10, Praha, 101 00, Česko",
              id: "cz-k-louzi",
              parts: {
                city: "Praha",
                countryCode: "CZ",
                houseNumber: "1312",
                line1: "K Louži 1",
                orientationNumber: "1",
                postalCode: "101 00",
                street: "K Louži",
              },
              quality: 0.95,
              searchLabel: "1312 1 k louzi vrsovice praha 10 praha 101 00 cesko",
              sourceId: source.id,
            },
            {
              countryCode: "CZ",
              displayLabel: "Vinohradská 12/34, 120 00 Praha, Praha 2, CZ",
              id: "cz-vinohradska",
              parts: {
                city: "Praha",
                countryCode: "CZ",
                houseNumber: "12",
                orientationNumber: "34",
                postalCode: "120 00",
                street: "Vinohradská",
              },
              quality: 0.95,
              searchLabel: "vinohradska 12 34 120 00 praha praha 2 cz",
              sourceId: source.id,
            },
          ]),
        );

        const kLouziResults = yield* resolveStorageEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: "CZ",
            limit: 5,
            query: "K Louži Praha",
          }),
        );
        const shortKResults = yield* resolveStorageEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: "CZ",
            limit: 5,
            query: "K",
          }),
        );
        const shortLoResults = yield* resolveStorageEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: "CZ",
            limit: 5,
            query: "Lo",
          }),
        );

        expect(kLouziResults).toEqual([expect.objectContaining({ id: "cz-k-louzi" })]);
        expect(shortKResults).toEqual([]);
        expect(shortLoResults).toEqual([expect.objectContaining({ id: "cz-k-louzi" })]);
      }),
  );

  it.effect("keeps K Louži typo, weak-query, number-order, and wrong-city behavior bounded", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();
      const source = yield* resolveStorageEffect(
        repositories.dataSources.registerDataSource({
          attribution: {
            label: "RUIAN synthetic benchmark rows",
          },
          cachePolicy: { kind: "permanent" },
          countryCode: "CZ",
          id: "ruian-cz-benchmark",
          name: "RUIAN CZ benchmark rows",
          sourceKind: "owned-dataset",
        }),
      );

      yield* resolveStorageEffect(
        repositories.addressRecords.upsertAddressRecords([
          {
            countryCode: "CZ",
            displayLabel: "K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ",
            id: "ruian-cz:1203603",
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
            searchLabel: "k louzi 1258 12 101 00 praha 10 vrsovice cz",
            sourceId: source.id,
          },
          {
            countryCode: "CZ",
            displayLabel: "K Louži 1258/7, 101 00 Praha 10, Vršovice, CZ",
            id: "ruian-cz:1203604",
            parts: {
              city: "Praha 10",
              countryCode: "CZ",
              district: "Vršovice",
              houseNumber: "1258",
              orientationNumber: "7",
              postalCode: "101 00",
              street: "K Louži",
            },
            quality: 0.99,
            searchLabel: "k louzi 1258 7 101 00 praha 10 vrsovice cz",
            sourceId: source.id,
          },
          {
            countryCode: "CZ",
            displayLabel: "K Louži 1258/12, 602 00 Brno, Stránice, CZ",
            id: "ruian-cz:4401258",
            parts: {
              city: "Brno",
              countryCode: "CZ",
              district: "Stránice",
              houseNumber: "1258",
              orientationNumber: "12",
              postalCode: "602 00",
              street: "K Louži",
            },
            quality: 0.99,
            searchLabel: "k louzi 1258 12 602 00 brno stranice cz",
            sourceId: source.id,
          },
        ]),
      );

      const searchIds = (query: string) =>
        Effect.map(
          resolveStorageEffect(
            repositories.addressRecords.searchAddressRecords({
              countryCode: "CZ",
              limit: 5,
              query,
            }),
          ),
          (records) => records.map((record) => record.id),
        );

      expect(yield* searchIds("K L")).toEqual([]);
      expect(yield* searchIds("K Louzy 1258/12 Praha 10")).toEqual(["ruian-cz:1203603"]);
      expect(yield* searchIds("1258 K Louži")).toEqual([
        "ruian-cz:1203603",
        "ruian-cz:4401258",
        "ruian-cz:1203604",
      ]);
      expect(yield* searchIds("12 K Louži")).toEqual(["ruian-cz:1203603", "ruian-cz:4401258"]);
      expect(yield* searchIds("K Louži 1258/12 Brno")).toEqual(["ruian-cz:4401258"]);
    }),
  );

  it("builds searchable address records from sanitized live-provider suggestions", () => {
    expect(
      createAddressRecordFromSuggestion({
        countryCode: "CZ",
        sourceId: "live-provider:here-discover:CZ",
        suggestion: {
          address: {
            city: "Praha",
            countryCode: "CZ",
            line1: "K Louži 1",
            postalCode: "101 00",
          },
          confidence: 0.95,
          displayLabel: "K Louži 1, Praha",
          id: "here-discover:abc",
          kind: "address",
          metadata: {
            latitude: "50.03",
            longitude: "14.5",
          },
          source: {
            id: "here-discover",
            kind: "live-provider",
            name: "HERE Discover",
          },
        },
      }),
    ).toMatchObject({
      countryCode: "CZ",
      displayLabel: "K Louži 1, Praha",
      id: "live:live-provider:here-discover:CZ:here-discover-abc",
      latitude: 50.03,
      longitude: 14.5,
      searchLabel: "k louzi 1 praha",
      sourceId: "live-provider:here-discover:CZ",
    });
  });

  it.effect("stores tenant API key metadata by hash without exposing raw keys", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();

      yield* resolveStorageEffect(
        repositories.tenants.upsertTenant({
          allowedOrigins: ["https://shop.example"],
          countryConfig: {},
          id: "tenant-api-key-test",
          name: "Tenant API Key Test",
          providerPriority: [],
          status: "active",
        }),
      );

      const activeKey = yield* resolveStorageEffect(
        repositories.apiKeys.upsertApiKey({
          id: "key-1",
          keyHash: "sha256:active-key-hash",
          label: "Checkout client",
          status: "active",
          tenantId: "tenant-api-key-test",
        }),
      );

      expect(activeKey).toMatchObject({
        keyHash: "sha256:active-key-hash",
        status: "active",
        tenantId: "tenant-api-key-test",
      });

      const keyByHash = yield* resolveStorageEffect(
        repositories.apiKeys.getApiKeyByHash("sha256:active-key-hash"),
      );

      expect(keyByHash).toMatchObject({
        id: "key-1",
        label: "Checkout client",
      });

      const revokedKey = yield* resolveStorageEffect(
        repositories.apiKeys.upsertApiKey({
          id: "key-1",
          keyHash: "sha256:active-key-hash",
          label: "Checkout client",
          revokedAt: "2026-06-27T12:00:00.000Z",
          status: "revoked",
          tenantId: "tenant-api-key-test",
        }),
      );
      const tenantKeys = yield* resolveStorageEffect(
        repositories.apiKeys.listApiKeysForTenant("tenant-api-key-test"),
      );

      expect(revokedKey).toMatchObject({
        revokedAt: "2026-06-27T12:00:00.000Z",
        status: "revoked",
      });
      expect(tenantKeys).toHaveLength(1);
      expect(JSON.stringify(tenantKeys)).not.toContain("sk_live_raw_secret");
    }),
  );

  it.effect("hashes normalized queries and builds cache keys from derived data only", () =>
    Effect.gen(function* () {
      const firstHash = yield* resolveStorageEffect(
        createSuggestQueryHashEffect({
          countryCode: "CZ",
          kind: "address",
          query: "  Václavské   náměstí ",
          tenantId: "tenant-a",
        }),
      );
      const secondHash = yield* resolveStorageEffect(
        createSuggestQueryHashEffect({
          countryCode: "CZ",
          kind: "address",
          query: "václavské náměstí",
          tenantId: "tenant-a",
        }),
      );
      const limitedHash = yield* resolveStorageEffect(
        createSuggestQueryHashEffect({
          countryCode: "CZ",
          kind: "address",
          limit: 1,
          query: "václavské náměstí",
          tenantId: "tenant-a",
        }),
      );

      expect(firstHash).toBe(secondHash);
      expect(limitedHash).not.toBe(firstHash);
      expect(firstHash).toHaveLength(64);
      expect(
        createSuggestCacheKey({
          countryCode: "CZ",
          kind: "address",
          queryHash: firstHash,
          tenantId: "tenant-a",
        }),
      ).not.toContain("Václavské");
    }),
  );

  it.effect("supports keyed query hashes for telemetry that may be exposed outside storage", () =>
    Effect.gen(function* () {
      const input = {
        countryCode: "CZ",
        kind: "address" as const,
        query: "K Louži 1258/12",
        tenantId: "tenant-a",
      } satisfies Parameters<typeof createSuggestQueryHashEffect>[0];
      const unkeyedHash = yield* resolveStorageEffect(createSuggestQueryHashEffect(input));
      const firstKeyedHash = yield* resolveStorageEffect(
        createSuggestQueryHashEffect(input, {
          secret: "operator-secret-a",
        }),
      );
      const secondKeyedHash = yield* resolveStorageEffect(
        createSuggestQueryHashEffect(
          { ...input, query: "  k   louži 1258/12 " },
          { secret: "operator-secret-a" },
        ),
      );
      const otherSecretHash = yield* resolveStorageEffect(
        createSuggestQueryHashEffect(input, {
          secret: "operator-secret-b",
        }),
      );

      expect(firstKeyedHash).toBe(secondKeyedHash);
      expect(firstKeyedHash).not.toBe(unkeyedHash);
      expect(otherSecretHash).not.toBe(firstKeyedHash);
      expect(firstKeyedHash).toMatch(hmacSha256HashPattern);
    }),
  );

  it.effect("reports cache miss, hit, stale, and policy violation states", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();

      const missingCache = yield* resolveStorageEffect(
        repositories.suggestCache.readSuggestCache("missing"),
      );

      expect(missingCache).toBeUndefined();

      yield* resolveStorageEffect(
        repositories.suggestCache.writeSuggestCache({
          cacheKey: "owned-hit",
          cachePolicy: { kind: "permanent" },
          expiresAt: "2999-01-01T00:00:00.000Z",
          kind: "address",
          payload: [],
          queryHash: "derived-hash",
        }),
      );

      const cacheHit = yield* resolveStorageEffect(
        repositories.suggestCache.readSuggestCache("owned-hit"),
      );

      expect(cacheHit).toMatchObject({
        status: "hit",
      });

      yield* resolveStorageEffect(
        repositories.suggestCache.writeSuggestCache({
          cacheKey: "owned-stale",
          cachePolicy: { kind: "ttl", ttlSeconds: 60 },
          expiresAt: "2000-01-01T00:00:00.000Z",
          kind: "address",
          payload: [],
          queryHash: "derived-hash",
        }),
      );

      const staleCache = yield* resolveStorageEffect(
        repositories.suggestCache.readSuggestCache("owned-stale"),
      );

      expect(staleCache).toMatchObject({
        status: "stale",
      });

      yield* assertStorageFailure(
        repositories.suggestCache.writeSuggestCache({
          cacheKey: "provider-none",
          cachePolicy: { kind: "none" },
          kind: "address",
          payload: [],
          queryHash: "hash",
        }),
        (error) => {
          expect(error).toBeInstanceOf(SmartSuggestStorageError);
          expect(error).toMatchObject({
            _tag: "SmartSuggestStorageError",
            code: "cache-policy-violation",
          });
        },
      );
    }),
  );

  it.effect("lists recent import runs for operational status without raw query data", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();

      yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          id: "import-a",
          shardCountryCode: "CZ",
          sourceId: "source-a",
        }),
      );
      yield* resolveStorageEffect(
        repositories.importRuns.finishImportRun({
          completedAt: "2026-06-26T12:00:00.000Z",
          failedRows: 0,
          id: "import-a",
          insertedRows: 1,
          status: "completed",
          totalRows: 1,
        }),
      );

      const importRuns = yield* resolveStorageEffect(
        repositories.importRuns.listRecentImportRuns(1),
      );

      expect(importRuns).toEqual([
        expect.objectContaining({
          id: "import-a",
          shardCountryCode: "CZ",
          status: "completed",
        }),
      ]);
    }),
  );

  it.effect(
    "finds the latest completed import run for one source and shard without relying on recent global runs",
    () =>
      Effect.gen(function* () {
        const repositories = createInMemorySmartSuggestRepositories();

        yield* resolveStorageEffect(
          repositories.importRuns.startImportRun({
            atomEntryId: "baseline-entry",
            id: "ruian-cz-baseline",
            importKind: "baseline",
            shardCountryCode: "CZ",
            sourceId: "ruian-cz",
          }),
        );
        yield* resolveStorageEffect(
          repositories.importRuns.finishImportRun({
            completedAt: "2026-06-26T12:00:00.000Z",
            failedRows: 0,
            id: "ruian-cz-baseline",
            insertedRows: 1,
            status: "completed",
            totalRows: 1,
          }),
        );

        yield* resolveStorageEffect(
          repositories.importRuns.startImportRun({
            atomEntryId: "delta-entry",
            id: "ruian-cz-delta",
            importKind: "delta",
            shardCountryCode: "CZ",
            sourceId: "ruian-cz",
          }),
        );
        yield* resolveStorageEffect(
          repositories.importRuns.finishImportRun({
            completedAt: "2026-06-27T12:00:00.000Z",
            failedRows: 0,
            id: "ruian-cz-delta",
            insertedRows: 1,
            status: "completed",
            totalRows: 1,
          }),
        );

        for (let index = 0; index < 55; index += 1) {
          const id = `unrelated-import-${index}`;
          yield* resolveStorageEffect(
            repositories.importRuns.startImportRun({
              id,
              importKind: "baseline",
              shardCountryCode: "SK",
              sourceId: "register-adries-sk",
            }),
          );
          yield* resolveStorageEffect(
            repositories.importRuns.finishImportRun({
              completedAt: `2026-06-28T12:${String(index).padStart(2, "0")}:00.000Z`,
              failedRows: 0,
              id,
              insertedRows: 1,
              status: "completed",
              totalRows: 1,
            }),
          );
        }

        const latestRun = yield* resolveStorageEffect(
          repositories.importRuns.findLatestCompletedImportRun({
            importKinds: ["baseline", "delta"],
            shardCountryCode: "CZ",
            sourceId: "ruian-cz",
          }),
        );

        expect(latestRun).toMatchObject({
          atomEntryId: "delta-entry",
          id: "ruian-cz-delta",
        });
      }),
  );

  it.effect("allows only one running baseline or delta import per source and shard", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();

      yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          id: "ruian-cz-running-baseline",
          importKind: "baseline",
          shardCountryCode: "CZ",
          sourceId: "ruian-cz",
        }),
      );

      yield* assertStorageFailure(
        repositories.importRuns.startImportRun({
          id: "ruian-cz-competing-delta",
          importKind: "delta",
          shardCountryCode: "CZ",
          sourceId: "ruian-cz",
        }),
        (error) =>
          expect(error).toMatchObject({
            _tag: "SmartSuggestStorageError",
            code: "import-run-conflict",
            message: expect.stringContaining("ruian-cz-running-baseline"),
          }),
      );

      const unrelatedRun = yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          id: "ruian-sk-unrelated-source",
          importKind: "baseline",
          shardCountryCode: "SK",
          sourceId: "register-adries-sk",
        }),
      );
      const manualRun = yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          id: "ruian-cz-manual-repair",
          importKind: "manual",
          shardCountryCode: "CZ",
          sourceId: "ruian-cz",
        }),
      );

      expect(unrelatedRun).toMatchObject({
        id: "ruian-sk-unrelated-source",
        status: "running",
      });
      expect(manualRun).toMatchObject({
        id: "ruian-cz-manual-repair",
        status: "running",
      });

      yield* resolveStorageEffect(
        repositories.importRuns.finishImportRun({
          completedAt: "2026-06-26T12:00:00.000Z",
          failedRows: 0,
          id: "ruian-cz-running-baseline",
          insertedRows: 1,
          status: "completed",
          totalRows: 1,
        }),
      );

      const nextDeltaRun = yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          id: "ruian-cz-next-delta",
          importKind: "delta",
          shardCountryCode: "CZ",
          sourceId: "ruian-cz",
        }),
      );

      expect(nextDeltaRun).toMatchObject({
        id: "ruian-cz-next-delta",
        status: "running",
      });
    }),
  );

  it.effect("rejects reused import run ids with different source checksum metadata", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();

      yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          checksumSha256: "checksum-a",
          id: "import-restart-guard",
          importKind: "baseline",
          shardCountryCode: "CZ",
          sourceFeedId: "RUIAN-CSV-ADR-ST",
          sourceId: "ruian-cz",
          sourceUri: "https://example.invalid/ruian-a.zip",
          sourceVersion: "20260626",
        }),
      );
      yield* resolveStorageEffect(
        repositories.importRuns.finishImportRun({
          completedAt: "2026-06-26T12:00:00.000Z",
          failedRows: 0,
          id: "import-restart-guard",
          insertedRows: 1,
          status: "completed",
          totalRows: 1,
        }),
      );

      const restartedRun = yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          checksumSha256: "checksum-a",
          id: "import-restart-guard",
          importKind: "baseline",
          shardCountryCode: "CZ",
          sourceFeedId: "RUIAN-CSV-ADR-ST",
          sourceId: "ruian-cz",
          sourceUri: "https://example.invalid/ruian-a.zip",
          sourceVersion: "20260626",
        }),
      );

      expect(restartedRun).toMatchObject({
        checksumSha256: "checksum-a",
        id: "import-restart-guard",
        status: "running",
      });

      yield* assertStorageFailure(
        repositories.importRuns.startImportRun({
          checksumSha256: "checksum-b",
          id: "import-restart-guard",
          importKind: "baseline",
          shardCountryCode: "CZ",
          sourceFeedId: "RUIAN-CSV-ADR-ST",
          sourceId: "ruian-cz",
          sourceUri: "https://example.invalid/ruian-b.zip",
          sourceVersion: "20260627",
        }),
        (error) =>
          expect(error).toMatchObject({
            _tag: "SmartSuggestStorageError",
            code: "import-run-conflict",
            message: expect.stringContaining("checksumSha256"),
          }),
      );
    }),
  );

  it.effect("records provider and accept events without raw query storage", () =>
    Effect.gen(function* () {
      const repositories = createInMemorySmartSuggestRepositories();

      yield* resolveStorageEffect(
        repositories.providerEvents.recordProviderEvent({
          id: "provider-event-1",
          providerId: "owned-cz",
          queryHash: "derived-hash",
          requestId: "request-1",
          status: "success",
        }),
      );
      yield* resolveStorageEffect(
        repositories.acceptEvents.recordAcceptEvent({
          acceptedAt: "2026-06-26T12:00:00.000Z",
          id: "accept-1",
          requestId: "request-1",
          sourceId: "owned-cz",
          suggestionId: "suggestion-1",
        }),
      );

      const providerEvents = yield* resolveStorageEffect(
        repositories.providerEvents.listProviderEvents("request-1"),
      );
      const acceptEvents = yield* resolveStorageEffect(
        repositories.acceptEvents.listAcceptEvents("request-1"),
      );

      expect(providerEvents).toHaveLength(1);
      expect(acceptEvents).toHaveLength(1);
    }),
  );
});
