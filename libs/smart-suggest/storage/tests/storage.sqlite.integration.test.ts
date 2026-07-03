import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  createD1SmartSuggestRepositories,
  type AddressSearchRecordInput,
  type SmartSuggestD1Binding,
} from "../src/storage";

type SQLiteValue = string | number | bigint | Uint8Array | null;

const testDatabases: DatabaseSync[] = [];

const migrationDirectory = join(dirname(fileURLToPath(import.meta.url)), "../drizzle");

const runStorageEffect = <T>(effect: Effect.Effect<T, unknown, never>) => Effect.runPromise(effect);

const normalizeD1Parameter = (value: unknown): SQLiteValue => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    value instanceof Uint8Array ||
    value === null
  ) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (value === undefined) {
    return null;
  }

  throw new TypeError(`Unsupported SQLite test parameter: ${typeof value}`);
};

const bindStatement = (statement: StatementSync, params: readonly unknown[]) =>
  params.map((param) => normalizeD1Parameter(param));

const createSQLiteD1Binding = (database: DatabaseSync): SmartSuggestD1Binding =>
  ({
    prepare: (query: string) => ({
      bind: (...params: readonly unknown[]) => {
        const statement = database.prepare(query);
        const boundParams = bindStatement(statement, params);

        return {
          all: async () => ({
            results: statement.all(...boundParams),
            success: true,
          }),
          first: async () => statement.get(...boundParams),
          raw: async () => statement.all(...boundParams).map((row) => Object.values(row)),
          run: async () => {
            statement.run(...boundParams);

            return { success: true };
          },
        };
      },
      first: async () => database.prepare(query).get(),
      raw: async () =>
        database
          .prepare(query)
          .all()
          .map((row) => Object.values(row)),
      run: async () => {
        database.prepare(query).run();

        return { success: true };
      },
    }),
  }) as SmartSuggestD1Binding;

const runStorageMigrations = (database: DatabaseSync) => {
  const migrationFiles = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  expect(migrationFiles).toEqual([
    "0000_fat_ser_duncan.sql",
    "0001_address_search_fts.sql",
    "0002_ruian_replication_metadata.sql",
    "0003_shard_registry.sql",
    "0004_import_run_active_guard.sql",
    "0005_data_source_provenance.sql",
    "0006_logical_shard_regions.sql",
  ]);

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationDirectory, file), "utf8");

    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmedStatement = statement.trim();

      if (trimmedStatement.length > 0) {
        database.exec(trimmedStatement);
      }
    }
  }
};

const createMigratedRepositories = (
  options: Parameters<typeof createD1SmartSuggestRepositories>[1] = {},
) => {
  const database = new DatabaseSync(":memory:");
  testDatabases.push(database);
  database.exec("PRAGMA foreign_keys = ON");
  runStorageMigrations(database);

  return {
    database,
    repositories: createD1SmartSuggestRepositories(createSQLiteD1Binding(database), options),
  };
};

const registerRuianSource = async (
  repositories: ReturnType<typeof createD1SmartSuggestRepositories>,
) =>
  runStorageEffect(
    repositories.dataSources.registerDataSource({
      attribution: {
        label: "CUZK RUIAN",
        license: "CC BY 4.0",
        url: "https://ruian.cuzk.cz/",
      },
      cachePolicy: { kind: "permanent" },
      countryCode: "CZ",
      datasetVersion: "ruian-cz-2026-05-31",
      id: "ruian-cz",
      name: "RUIAN Czech address registry",
      sourceKind: "owned-dataset",
    }),
  );

const createCzAddress = (
  input: {
    readonly city: string;
    readonly displayLabel: string;
    readonly houseNumber: string;
    readonly id: string;
    readonly municipalityCode: string;
    readonly orientationNumber?: string;
    readonly postalCode: string;
    readonly quality?: number;
    readonly regionCode: string;
    readonly searchLabel: string;
    readonly street: string;
  },
  sourceId: string,
): AddressSearchRecordInput => ({
  countryCode: "CZ",
  displayLabel: input.displayLabel,
  id: input.id,
  parts: {
    city: input.city,
    countryCode: "CZ",
    houseNumber: input.houseNumber,
    line1:
      input.orientationNumber === undefined
        ? `${input.street} ${input.houseNumber}`
        : `${input.street} ${input.houseNumber}/${input.orientationNumber}`,
    ...(input.orientationNumber === undefined
      ? {}
      : { orientationNumber: input.orientationNumber }),
    postalCode: input.postalCode,
    street: input.street,
  },
  quality: input.quality ?? 0.95,
  ruian: {
    addressPlaceCode: input.id.replace(/^ruian-cz:/u, ""),
    municipalityCode: input.municipalityCode,
    postalCode: input.postalCode,
    regionCode: input.regionCode,
  },
  searchLabel: input.searchLabel,
  sourceId,
});

const seedRepresentativeCzAddresses = async (
  repositories: ReturnType<typeof createD1SmartSuggestRepositories>,
) => {
  const source = await registerRuianSource(repositories);

  return runStorageEffect(
    repositories.addressRecords.upsertAddressRecords([
      createCzAddress(
        {
          city: "Praha",
          displayLabel: "K Louži 1258/12, Vršovice, Praha 10, 101 00 Praha",
          houseNumber: "1258",
          id: "ruian-cz:1203603",
          municipalityCode: "554782",
          orientationNumber: "12",
          postalCode: "101 00",
          regionCode: "CZ010",
          searchLabel: "k louzi 1258 12 vrsovice praha 10 101 00 praha",
          street: "K Louži",
        },
        source.id,
      ),
      createCzAddress(
        {
          city: "Brno",
          displayLabel: "Česká 20, Brno-město, 602 00 Brno",
          houseNumber: "20",
          id: "ruian-cz:brno-ceska-20",
          municipalityCode: "582786",
          postalCode: "602 00",
          quality: 0.9,
          regionCode: "CZ064",
          searchLabel: "ceska 20 brno mesto 602 00 brno",
          street: "Česká",
        },
        source.id,
      ),
      createCzAddress(
        {
          city: "Ostrava",
          displayLabel: "Nádražní 10, Moravská Ostrava, 702 00 Ostrava",
          houseNumber: "10",
          id: "ruian-cz:ostrava-nadrazni-10",
          municipalityCode: "554821",
          postalCode: "702 00",
          quality: 0.88,
          regionCode: "CZ080",
          searchLabel: "nadrazni 10 moravska ostrava 702 00 ostrava",
          street: "Nádražní",
        },
        source.id,
      ),
    ]),
  );
};

afterEach(() => {
  for (const database of testDatabases.splice(0)) {
    database.close();
  }
});

describe("smart suggest storage SQLite integration", () => {
  it("runs every storage migration against a real SQLite engine", () => {
    const { database } = createMigratedRepositories();

    expect(
      database
        .prepare("select name from sqlite_master where type = 'table' and name = ?")
        .get("smart_suggest_address_records"),
    ).toMatchObject({ name: "smart_suggest_address_records" });
    expect(
      database
        .prepare("select name from sqlite_master where name = ?")
        .get("smart_suggest_address_search_fts"),
    ).toMatchObject({ name: "smart_suggest_address_search_fts" });
    expect(
      database
        .prepare("select count(*) count from pragma_table_info(?)")
        .get("smart_suggest_address_records"),
    ).toMatchObject({ count: expect.any(Number) });
  });

  it("uses FTS5 prefix search for representative CZ address and locality queries", async () => {
    const { database, repositories } = createMigratedRepositories({
      searchIndexMode: "fts-only",
    });

    await seedRepresentativeCzAddresses(repositories);

    expect(
      database.prepare("select count(*) count from smart_suggest_address_search_fts").get(),
    ).toMatchObject({ count: 3 });

    await expect(
      runStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 5,
          query: "Lou",
        }),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "ruian-cz:1203603",
        parts: expect.objectContaining({ city: "Praha", street: "K Louži" }),
      }),
    ]);

    await expect(
      runStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 5,
          query: "Ceska Brno",
        }),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "ruian-cz:brno-ceska-20",
        parts: expect.objectContaining({ city: "Brno", street: "Česká" }),
      }),
    ]);

    await expect(
      runStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 5,
          query: "Ostr",
        }),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "ruian-cz:ostrava-nadrazni-10",
        parts: expect.objectContaining({ city: "Ostrava" }),
      }),
    ]);
  });

  it("falls back to token-prefix search when FTS is unavailable", async () => {
    const { database, repositories } = createMigratedRepositories();

    await seedRepresentativeCzAddresses(repositories);
    database.exec("drop table smart_suggest_address_search_fts");

    await expect(
      runStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 5,
          query: "Lou",
        }),
      ),
    ).resolves.toEqual([expect.objectContaining({ id: "ruian-cz:1203603" })]);

    await expect(
      runStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          limit: 5,
          query: "Lo",
        }),
      ),
    ).resolves.toEqual([]);
  });

  it("supports postal and postal-locality CZ queries from migrated columns", async () => {
    const { repositories } = createMigratedRepositories();

    await seedRepresentativeCzAddresses(repositories);

    await expect(
      runStorageEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: "CZ",
          kind: "postal",
          limit: 5,
          query: "101",
        }),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "ruian-cz:1203603",
        parts: expect.objectContaining({ city: "Praha", postalCode: "101 00" }),
      }),
    ]);

    await expect(
      runStorageEffect(
        repositories.addressRecords.listPostalLocalityAddressRecords({
          countryCode: "CZ",
          postalCode: "60200",
        }),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "ruian-cz:brno-ceska-20",
        parts: expect.objectContaining({ city: "Brno", postalCode: "602 00" }),
      }),
    ]);
  });
});
