import { type D1ClientConfig, layer as d1ClientLayer } from "@effect/sql-d1/D1Client";
import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core";
import { normalizeSearchText } from "@techsio/smart-suggest-indexing";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm/sql";
import { makeWithDefaults as makeD1DrizzleWithDefaults } from "drizzle-orm/effect-d1";
import { Cause, Effect, Exit } from "effect";
import type {
  AddressImportKind,
  AddressRecord,
  AddressRecordRuianIdentifiers,
  AddressRecordSourceLineage,
  AddressSearchRecordInput,
  AddressTombstoneRecord,
  AddressTombstoneRecordInput,
  SmartSuggestRepositories,
  SmartSuggestShardMetadataListInput,
  SmartSuggestShardMetadataRecord,
  SmartSuggestStorageEffect,
  StartImportRunInput,
} from "./schema";
import {
  D1_ADDRESS_IMPORT_SUBCHUNK_SIZE,
  D1_TOKEN_INSERT_SUBCHUNK_SIZE,
  SmartSuggestStorageError,
  activeSequencedImportRunConflict,
  addressRecordExcludedUpdateSet,
  addressSearchFtsUnavailablePattern,
  artifactFirstTokenPrefixForQuery,
  assertCachePolicyAllowsWrite,
  assertImportRunRestartCompatible,
  assertNoActiveSequencedImportRun,
  chunkItems,
  createAddressSearchFtsQuery,
  createAddressSearchTokenRows,
  createQuerySearchPrefixes,
  hasAddressSearchPrefixToken,
  isCacheExpired,
  isImportRunUniqueConstraintError,
  isSequencedImportKind,
  localityRecordMatchesQueryPrefix,
  normalizePostalCodeDigits,
  normalizeReplicationStatus,
  normalizeSearchVisible,
  normalizeShardMetadataInput,
  normalizeShardResolveStates,
  nowIso,
  postalCodeLookupValues,
  rankAddressRecordResults,
  rankLocalityCityRecords,
  resolveShardMetadataMatches,
  selectPostalLocalityAddressRecords,
  sequencedImportKinds,
  smartSuggestAcceptEvents,
  smartSuggestAddressRecords,
  smartSuggestAddressSearchTokens,
  smartSuggestAddressTombstones,
  smartSuggestApiKeys,
  smartSuggestCacheEntries,
  smartSuggestDataSources,
  smartSuggestImportRuns,
  smartSuggestProviderEvents,
  smartSuggestShardRegistry,
  smartSuggestTenants,
  sourceRecordIdForRecord,
  sourceRecordTypeForLineage,
  storageEffect,
  toAcceptEventRecord,
  toAddressRecord,
  toAddressRecordRow,
  toAddressTombstoneRecord,
  toAddressTombstoneRow,
  toAddressTombstoneUpdateSet,
  toApiKeyRecord,
  toDataSourceRecord,
  toImportRunRecord,
  toProviderEventRecord,
  toShardMetadataInsert,
  toShardMetadataRecord,
  toSmartSuggestStorageError,
  toStoredRuianColumns,
  toStoredSourceLineageColumns,
  toSuggestCacheRecord,
  toTenantRecord,
} from "./schema";

type SmartSuggestD1PreparedStatement = ReturnType<D1ClientConfig["db"]["prepare"]>;
type SmartSuggestD1BatchResult<T = Record<string, unknown>> = {
  readonly results: T[];
};

export type SmartSuggestD1Binding = Omit<D1ClientConfig["db"], "batch"> & {
  readonly batch?: <T = Record<string, unknown>>(
    statements: SmartSuggestD1PreparedStatement[],
  ) => Promise<SmartSuggestD1BatchResult<T>[]>;
};

type SmartSuggestD1BatchQuery = {
  readonly params: readonly unknown[];
  readonly sql: string;
};

export type SmartSuggestD1SearchIndexMode = "fts-and-prefix" | "fts-only";

export type SmartSuggestD1RepositoryOptions = {
  readonly searchIndexMode?: SmartSuggestD1SearchIndexMode;
};

type SmartSuggestD1Operation<T> = Effect.Effect<T, unknown, never>;

const d1StorageOperation = <T>(
  operation: SmartSuggestD1Operation<T>,
): SmartSuggestStorageEffect<T> => Effect.mapError(operation, toSmartSuggestStorageError);

export const createSmartSuggestD1DatabaseEffect = (binding: SmartSuggestD1Binding) =>
  makeD1DrizzleWithDefaults({}).pipe(
    Effect.provide(d1ClientLayer({ db: binding as D1ClientConfig["db"] })),
  );

export type SmartSuggestD1Database = Effect.Success<
  ReturnType<typeof createSmartSuggestD1DatabaseEffect>
>;

export const createD1SmartSuggestRepositories = (
  binding: SmartSuggestD1Binding,
  options: SmartSuggestD1RepositoryOptions = {},
): SmartSuggestRepositories => {
  const searchIndexMode = options.searchIndexMode ?? "fts-and-prefix";
  const writeAddressSearchTokens = searchIndexMode === "fts-and-prefix";
  let cachedD1DatabaseEffect: SmartSuggestD1Operation<SmartSuggestD1Database> | undefined;
  const acquireD1Database = (): SmartSuggestD1Operation<SmartSuggestD1Database> => {
    if (cachedD1DatabaseEffect !== undefined) {
      return cachedD1DatabaseEffect;
    }

    return Effect.cached(createSmartSuggestD1DatabaseEffect(binding)).pipe(
      Effect.flatMap((cached) => {
        cachedD1DatabaseEffect = cached;
        return cached;
      }),
    );
  };
  const withD1Database = <T>(
    operation: (db: SmartSuggestD1Database) => SmartSuggestD1Operation<T>,
  ): SmartSuggestStorageEffect<T> =>
    d1StorageOperation(acquireD1Database().pipe(Effect.flatMap(operation)));
  const isAddressSearchFtsUnavailable = (error: unknown) =>
    error instanceof Error && addressSearchFtsUnavailablePattern.test(error.message);
  const ignoreAddressSearchFtsUnavailable = <T>(
    operation: SmartSuggestStorageEffect<T>,
  ): SmartSuggestStorageEffect<T | undefined> =>
    Effect.catch(operation, (error) =>
      isAddressSearchFtsUnavailable(error) ? Effect.succeed(undefined) : Effect.fail(error),
    );
  const toD1BatchQuery = (query: { toSQL(): SmartSuggestD1BatchQuery }): SmartSuggestD1BatchQuery =>
    query.toSQL();
  const executeD1BatchQueries = (
    queries: readonly SmartSuggestD1BatchQuery[],
  ): SmartSuggestStorageEffect<void> => {
    const batch = binding.batch?.bind(binding);

    if (queries.length === 0) {
      return Effect.succeed(undefined);
    }

    if (batch === undefined) {
      return Effect.fail(
        new SmartSuggestStorageError(
          "storage-unavailable",
          "Smart Suggest D1 binding does not support batch execution.",
        ),
      );
    }

    return d1StorageOperation(
      Effect.tryPromise({
        catch: toSmartSuggestStorageError,
        try: async () => {
          await batch(
            queries.map((query) => binding.prepare(query.sql).bind(...query.params)),
          );
        },
      }),
    ).pipe(Effect.asVoid);
  };
  const executeD1BatchQueriesWithFtsFallback = (
    queriesWithFts: readonly SmartSuggestD1BatchQuery[],
    queriesWithoutFts: readonly SmartSuggestD1BatchQuery[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.catch(executeD1BatchQueries(queriesWithFts), (error) =>
      isAddressSearchFtsUnavailable(error)
        ? executeD1BatchQueries(queriesWithoutFts)
        : Effect.fail(error),
    );
  const createD1Placeholders = (count: number) => Array.from({ length: count }, () => "?").join(", ");
  const createDeleteAddressSearchFtsQueries = (
    recordIds: readonly string[],
  ): SmartSuggestD1BatchQuery[] =>
    chunkItems(recordIds, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE).flatMap((recordIdChunk) =>
      recordIdChunk.length === 0
        ? []
        : [
            {
              params: recordIdChunk,
              sql: `
                delete from smart_suggest_address_search_fts
                where record_id in (${createD1Placeholders(recordIdChunk.length)})
              `,
            },
          ],
    );
  const createInsertAddressSearchFtsQueries = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestD1BatchQuery[] =>
    chunkItems(records, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE).flatMap((recordChunk) =>
      recordChunk.length === 0
        ? []
        : [
            {
              params: recordChunk.flatMap((record) => [
                record.id,
                record.countryCode,
                record.displayLabel,
                record.searchLabel,
                record.parts.street ?? "",
                record.parts.city ?? "",
                record.parts.district ?? "",
                record.parts.postalCode ?? "",
                record.parts.houseNumber ?? "",
                record.parts.orientationNumber ?? "",
              ]),
              sql: `
                insert into smart_suggest_address_search_fts (
                  record_id,
                  country_code,
                  display_label,
                  search_label,
                  street,
                  city,
                  district,
                  postal_code,
                  house_number,
                  orientation_number
                )
                values ${recordChunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
              `,
            },
          ],
    );
  const createDeleteAddressSearchTokenQueries = (
    db: SmartSuggestD1Database,
    recordIds: readonly string[],
  ): SmartSuggestD1BatchQuery[] =>
    chunkItems(recordIds, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE).flatMap((recordIdChunk) =>
      recordIdChunk.length === 0
        ? []
        : [
            toD1BatchQuery(
              db
                .delete(smartSuggestAddressSearchTokens)
                .where(inArray(smartSuggestAddressSearchTokens.recordId, recordIdChunk)),
            ),
          ],
    );
  const createRefreshAddressSearchTokenQueries = (
    db: SmartSuggestD1Database,
    allRecords: readonly AddressSearchRecordInput[],
    indexedRecords: readonly AddressSearchRecordInput[],
  ): SmartSuggestD1BatchQuery[] => {
    const queries = createDeleteAddressSearchTokenQueries(
      db,
      allRecords.map((record) => record.id),
    );

    if (!writeAddressSearchTokens) {
      return queries;
    }

    const tokenRows = indexedRecords.flatMap((record) => createAddressSearchTokenRows(record));

    for (const tokenChunk of chunkItems(tokenRows, D1_TOKEN_INSERT_SUBCHUNK_SIZE)) {
      if (tokenChunk.length > 0) {
        queries.push(
          toD1BatchQuery(
            db
              .insert(smartSuggestAddressSearchTokens)
              .values(tokenChunk)
              .onConflictDoNothing({ target: smartSuggestAddressSearchTokens.id }),
          ),
        );
      }
    }

    return queries;
  };
  const createAddressSearchIndexBatchQueries = (
    db: SmartSuggestD1Database,
    records: readonly AddressSearchRecordInput[],
    includeFts: boolean,
  ): SmartSuggestD1BatchQuery[] => {
    const indexedRecords = records.filter(
      (record) => normalizeSearchVisible(record) && normalizeReplicationStatus(record) === "active",
    );

    return [
      ...(includeFts ? createDeleteAddressSearchFtsQueries(records.map((record) => record.id)) : []),
      ...(includeFts ? createInsertAddressSearchFtsQueries(indexedRecords) : []),
      ...createRefreshAddressSearchTokenQueries(db, records, indexedRecords),
    ];
  };
  const deleteAddressSearchFtsRecords = (
    recordIds: readonly string[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      for (const recordIdChunk of chunkItems(recordIds, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
        if (recordIdChunk.length === 0) {
          continue;
        }

        yield* ignoreAddressSearchFtsUnavailable(
          withD1Database((db) =>
            db.run(sql`
              delete from smart_suggest_address_search_fts
              where record_id in (${sql.join(
                recordIdChunk.map((recordId) => sql`${recordId}`),
                sql`, `,
              )})
            `),
          ),
        );
      }
    });
  const insertAddressSearchFtsRecords = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      for (const recordChunk of chunkItems(records, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
        if (recordChunk.length === 0) {
          continue;
        }

        yield* ignoreAddressSearchFtsUnavailable(
          withD1Database((db) =>
            db.run(sql`
              insert into smart_suggest_address_search_fts (
                record_id,
                country_code,
                display_label,
                search_label,
                street,
                city,
                district,
                postal_code,
                house_number,
                orientation_number
              )
              values ${sql.join(
                recordChunk.map(
                  (record) => sql`(
                    ${record.id},
                    ${record.countryCode},
                    ${record.displayLabel},
                    ${record.searchLabel},
                    ${record.parts.street ?? ""},
                    ${record.parts.city ?? ""},
                    ${record.parts.district ?? ""},
                    ${record.parts.postalCode ?? ""},
                    ${record.parts.houseNumber ?? ""},
                    ${record.parts.orientationNumber ?? ""}
                  )`,
                ),
                sql`, `,
              )}
            `),
          ),
        );
      }
    });
  const refreshAddressSearchTokensBatch = (
    allRecords: readonly AddressSearchRecordInput[],
    indexedRecords: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      for (const recordChunk of chunkItems(allRecords, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
        const recordIds = recordChunk.map((record) => record.id);

        if (recordIds.length === 0) {
          continue;
        }

        yield* withD1Database((db) =>
          db
            .delete(smartSuggestAddressSearchTokens)
            .where(inArray(smartSuggestAddressSearchTokens.recordId, recordIds)),
        );
      }

      if (!writeAddressSearchTokens) {
        return;
      }

      const tokenRows = indexedRecords.flatMap((record) => createAddressSearchTokenRows(record));

      for (const tokenChunk of chunkItems(tokenRows, D1_TOKEN_INSERT_SUBCHUNK_SIZE)) {
        if (tokenChunk.length > 0) {
          yield* withD1Database((db) =>
            db
              .insert(smartSuggestAddressSearchTokens)
              .values(tokenChunk)
              .onConflictDoNothing({ target: smartSuggestAddressSearchTokens.id }),
          );
        }
      }
    });
  const refreshAddressSearchIndexesBatch = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      if (binding.batch !== undefined) {
        const queriesWithFts = yield* withD1Database((db) =>
          Effect.sync(() => createAddressSearchIndexBatchQueries(db, records, true)),
        );
        const queriesWithoutFts = yield* withD1Database((db) =>
          Effect.sync(() => createAddressSearchIndexBatchQueries(db, records, false)),
        );

        yield* executeD1BatchQueriesWithFtsFallback(queriesWithFts, queriesWithoutFts);
        return;
      }

      const indexedRecords = records.filter(
        (record) =>
          normalizeSearchVisible(record) && normalizeReplicationStatus(record) === "active",
      );

      yield* deleteAddressSearchFtsRecords(records.map((record) => record.id));
      yield* insertAddressSearchFtsRecords(indexedRecords);
      yield* refreshAddressSearchTokensBatch(records, indexedRecords);
    });
  const upsertAddressRecordSubchunk = (
    records: readonly AddressSearchRecordInput[],
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* () {
      const timestamp = nowIso();
      const rows = records.map((input) => toAddressRecordRow(input, timestamp));

      if (binding.batch !== undefined) {
        const queriesWithFts = yield* withD1Database((db) =>
          Effect.sync(() => [
            toD1BatchQuery(
              db
                .insert(smartSuggestAddressRecords)
                .values(rows)
                .onConflictDoUpdate({
                  set: addressRecordExcludedUpdateSet,
                  target: smartSuggestAddressRecords.id,
                }),
            ),
            ...createAddressSearchIndexBatchQueries(db, records, true),
          ]),
        );
        const queriesWithoutFts = yield* withD1Database((db) =>
          Effect.sync(() => [
            toD1BatchQuery(
              db
                .insert(smartSuggestAddressRecords)
                .values(rows)
                .onConflictDoUpdate({
                  set: addressRecordExcludedUpdateSet,
                  target: smartSuggestAddressRecords.id,
                }),
            ),
            ...createAddressSearchIndexBatchQueries(db, records, false),
          ]),
        );

        yield* executeD1BatchQueriesWithFtsFallback(queriesWithFts, queriesWithoutFts);
        return rows.map(toAddressRecord);
      }

      const storedRows = yield* withD1Database((db) =>
        db
          .insert(smartSuggestAddressRecords)
          .values(rows)
          .onConflictDoUpdate({
            set: addressRecordExcludedUpdateSet,
            target: smartSuggestAddressRecords.id,
          })
          .returning(),
      );

      yield* refreshAddressSearchIndexesBatch(records);

      return (storedRows.length > 0 ? storedRows : rows).map(toAddressRecord);
    });
  const searchAddressSearchFts = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    Effect.gen(function* () {
      const ftsQuery = createAddressSearchFtsQuery(query);

      if (ftsQuery === undefined) {
        return;
      }

      const rows =
        countryCode === undefined
          ? yield* ignoreAddressSearchFtsUnavailable(
              withD1Database((db) =>
                db.all<{ recordId: string }>(sql`
                  select record_id as recordId
                  from smart_suggest_address_search_fts
                  where smart_suggest_address_search_fts match ${ftsQuery}
                  order by rank
                  limit ${limit}
                `),
              ),
            )
          : yield* ignoreAddressSearchFtsUnavailable(
              withD1Database((db) =>
                db.all<{ recordId: string }>(sql`
                  select record_id as recordId
                  from smart_suggest_address_search_fts
                  where smart_suggest_address_search_fts match ${ftsQuery}
                    and country_code = ${countryCode}
                  order by rank
                  limit ${limit}
                `),
              ),
            );

      return rows?.map((row) => row.recordId);
    });
  const fetchAddressRecordsByIds = ({
    countryCode,
    recordIds,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    recordIds: readonly string[];
  }) => {
    const recordFilters = [
      inArray(smartSuggestAddressRecords.id, recordIds),
      eq(smartSuggestAddressRecords.searchVisible, true),
      eq(smartSuggestAddressRecords.replicationStatus, "active"),
    ];

    if (countryCode !== undefined) {
      recordFilters.push(eq(smartSuggestAddressRecords.countryCode, countryCode));
    }

    return withD1Database((db) =>
      db
        .select()
        .from(smartSuggestAddressRecords)
        .where(and(...recordFilters))
        .limit(recordIds.length),
    );
  };
  const searchAddressRecordsByFts = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[] | undefined> =>
    Effect.gen(function* () {
      const indexedRecordLimit = Math.max(limit * 20, 50);
      const recordIds = yield* searchAddressSearchFts({
        countryCode,
        limit: indexedRecordLimit,
        query,
      });

      if (recordIds === undefined || recordIds.length === 0) {
        return;
      }

      const indexedRows = yield* fetchAddressRecordsByIds({
        countryCode,
        recordIds,
      });

      return rankAddressRecordResults(query, indexedRows.map(toAddressRecord), limit);
    });
  const searchAddressRecordsByTokens = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[] | undefined> =>
    Effect.gen(function* () {
      const prefixes = [...new Set(createQuerySearchPrefixes(query))];

      if (prefixes.length === 0) {
        return;
      }

      const indexedRecordLimit = Math.max(limit * 20, 50);
      const tokenFilters = [
        inArray(smartSuggestAddressSearchTokens.prefix, prefixes),
        eq(smartSuggestAddressRecords.searchVisible, true),
        eq(smartSuggestAddressRecords.replicationStatus, "active"),
      ];

      if (countryCode !== undefined) {
        tokenFilters.push(eq(smartSuggestAddressSearchTokens.countryCode, countryCode));
        tokenFilters.push(eq(smartSuggestAddressRecords.countryCode, countryCode));
      }

      const tokenMatchScoreOrder = sql`sum(${smartSuggestAddressSearchTokens.weight}) desc`;
      const tokenMatches = yield* withD1Database((db) =>
        db
          .select({ recordId: smartSuggestAddressSearchTokens.recordId })
          .from(smartSuggestAddressSearchTokens)
          .innerJoin(
            smartSuggestAddressRecords,
            eq(smartSuggestAddressRecords.id, smartSuggestAddressSearchTokens.recordId),
          )
          .where(and(...tokenFilters))
          .groupBy(
            smartSuggestAddressSearchTokens.recordId,
            smartSuggestAddressRecords.quality,
            smartSuggestAddressRecords.displayLabel,
          )
          .orderBy(
            tokenMatchScoreOrder,
            desc(smartSuggestAddressRecords.quality),
            sql`${smartSuggestAddressRecords.displayLabel} asc`,
            sql`${smartSuggestAddressSearchTokens.recordId} asc`,
          )
          .limit(indexedRecordLimit),
      );
      const recordIds = [...new Set(tokenMatches.map((match) => match.recordId))];

      if (recordIds.length === 0) {
        return;
      }

      const indexedRows = yield* fetchAddressRecordsByIds({
        countryCode,
        recordIds,
      });

      return rankAddressRecordResults(query, indexedRows.map(toAddressRecord), limit);
    });
  const searchAddressRecordsByLabel = ({
    countryCode,
    limit,
    query,
  }: {
    countryCode: SmartSuggestCountryCode | undefined;
    limit: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* () {
      const filters = [
        like(smartSuggestAddressRecords.searchLabel, `%${normalizeSearchText(query)}%`),
        eq(smartSuggestAddressRecords.searchVisible, true),
        eq(smartSuggestAddressRecords.replicationStatus, "active"),
      ];

      if (countryCode !== undefined) {
        filters.push(eq(smartSuggestAddressRecords.countryCode, countryCode));
      }

      const rows = yield* withD1Database((db) =>
        db
          .select()
          .from(smartSuggestAddressRecords)
          .where(and(...filters))
          .orderBy(desc(smartSuggestAddressRecords.quality))
          .limit(limit),
      );

      return rankAddressRecordResults(query, rows.map(toAddressRecord), limit);
    });
  const tombstoneRecordFilters = (tombstone: AddressTombstoneRecordInput) => {
    const filters = [eq(smartSuggestAddressRecords.id, tombstone.id)];

    if (tombstone.ruian?.addressPlaceCode !== undefined) {
      filters.push(
        eq(smartSuggestAddressRecords.ruianAddressPlaceCode, tombstone.ruian.addressPlaceCode),
      );
    }

    return filters.length === 1 ? filters[0] : or(...filters);
  };
  const toTombstonedAddressRecordUpdateSet = (
    tombstone: AddressTombstoneRecordInput,
    timestamp: string,
  ) => {
    const updateSet = {
      replicationStatus: "tombstoned",
      searchVisible: false,
      tombstoneReason: tombstone.reason ?? null,
      tombstonedAt: tombstone.deletedAt ?? timestamp,
      updatedAt: timestamp,
    };

    if (tombstone.sourceLineage !== undefined) {
      const recordIdentity: {
        id: string;
        ruian?: AddressRecordRuianIdentifiers;
        sourceLineage?: AddressRecordSourceLineage;
      } = {
        id: tombstone.id,
        sourceLineage: tombstone.sourceLineage,
      };

      if (tombstone.ruian !== undefined) {
        recordIdentity.ruian = tombstone.ruian;
      }

      Object.assign(updateSet, {
        sourceRecordId: sourceRecordIdForRecord(recordIdentity),
        sourceRecordType: sourceRecordTypeForLineage(tombstone.sourceLineage),
        ...toStoredSourceLineageColumns(tombstone.sourceLineage),
      });
    }

    if (tombstone.ruian !== undefined) {
      Object.assign(updateSet, toStoredRuianColumns(tombstone.ruian));
    }

    return updateSet;
  };
  const markAddressRecordTombstoned = (
    tombstone: AddressTombstoneRecordInput,
  ): SmartSuggestStorageEffect<void> =>
    Effect.gen(function* () {
      const matchedRows = yield* withD1Database((db) =>
        db
          .select({ id: smartSuggestAddressRecords.id })
          .from(smartSuggestAddressRecords)
          .where(tombstoneRecordFilters(tombstone)),
      );
      const matchedRecordIds = matchedRows.map((row) => row.id);

      if (matchedRecordIds.length === 0) {
        return;
      }

    const timestamp = nowIso();
    const updateSet = toTombstonedAddressRecordUpdateSet(tombstone, timestamp);

    if (binding.batch !== undefined) {
      const queriesWithFts = yield* withD1Database((db) =>
        Effect.sync(() => [
          ...createDeleteAddressSearchTokenQueries(db, matchedRecordIds),
          ...createDeleteAddressSearchFtsQueries(matchedRecordIds),
          toD1BatchQuery(
            db
              .update(smartSuggestAddressRecords)
              .set(updateSet)
              .where(inArray(smartSuggestAddressRecords.id, matchedRecordIds)),
          ),
        ]),
      );
      const queriesWithoutFts = yield* withD1Database((db) =>
        Effect.sync(() => [
          ...createDeleteAddressSearchTokenQueries(db, matchedRecordIds),
          toD1BatchQuery(
            db
              .update(smartSuggestAddressRecords)
              .set(updateSet)
              .where(inArray(smartSuggestAddressRecords.id, matchedRecordIds)),
          ),
        ]),
      );

      yield* executeD1BatchQueriesWithFtsFallback(queriesWithFts, queriesWithoutFts);
      return;
    }

    yield* withD1Database((db) =>
      db
        .delete(smartSuggestAddressSearchTokens)
        .where(inArray(smartSuggestAddressSearchTokens.recordId, matchedRecordIds)),
    );
    yield* deleteAddressSearchFtsRecords(matchedRecordIds);
    yield* withD1Database((db) =>
      db
        .update(smartSuggestAddressRecords)
        .set(updateSet)
        .where(inArray(smartSuggestAddressRecords.id, matchedRecordIds)),
    );
  });
  const listD1ShardMetadata = (
    input: SmartSuggestShardMetadataListInput = {},
  ): SmartSuggestStorageEffect<readonly SmartSuggestShardMetadataRecord[]> => {
    if (input.countryCode !== undefined && input.state !== undefined) {
      const countryCode = input.countryCode;
      const state = input.state;

      return withD1Database((db) =>
        db
          .select()
          .from(smartSuggestShardRegistry)
          .where(
            and(
              eq(smartSuggestShardRegistry.countryCode, countryCode),
              eq(smartSuggestShardRegistry.state, state),
            ),
          )
          .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
      ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
    }

    if (input.countryCode !== undefined) {
      const countryCode = input.countryCode;

      return withD1Database((db) =>
        db
          .select()
          .from(smartSuggestShardRegistry)
          .where(eq(smartSuggestShardRegistry.countryCode, countryCode))
          .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
      ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
    }

    if (input.state !== undefined) {
      const state = input.state;

      return withD1Database((db) =>
        db
          .select()
          .from(smartSuggestShardRegistry)
          .where(eq(smartSuggestShardRegistry.state, state))
          .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
      ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
    }

    return withD1Database((db) =>
      db
        .select()
        .from(smartSuggestShardRegistry)
        .orderBy(desc(smartSuggestShardRegistry.updatedAt)),
    ).pipe(Effect.map((rows) => rows.map(toShardMetadataRecord)));
  };
  const assertD1ImportRunRestartCompatible = (
    existing: typeof smartSuggestImportRuns.$inferSelect | undefined,
    input: StartImportRunInput,
  ): SmartSuggestStorageEffect<void> =>
    existing === undefined
      ? Effect.succeed(undefined)
      : storageEffect(() => assertImportRunRestartCompatible(toImportRunRecord(existing), input));
  const assertNoD1ActiveSequencedImportRun = (
    input: StartImportRunInput,
    importKind: AddressImportKind,
  ): SmartSuggestStorageEffect<void> => {
    if (!isSequencedImportKind(importKind)) {
      return Effect.succeed(undefined);
    }

    return Effect.gen(function* () {
      const activeRun = yield* withD1Database((db) =>
        db
          .select()
          .from(smartSuggestImportRuns)
          .where(
            and(
              eq(smartSuggestImportRuns.status, "running"),
              eq(smartSuggestImportRuns.sourceId, input.sourceId),
              eq(smartSuggestImportRuns.shardCountryCode, input.shardCountryCode),
              inArray(smartSuggestImportRuns.importKind, sequencedImportKinds),
            ),
          )
          .get(),
      );

      yield* storageEffect(() =>
        assertNoActiveSequencedImportRun(
          input,
          activeRun === undefined ? undefined : toImportRunRecord(activeRun),
        ),
      );
    });
  };
  const toD1ImportRunInsertRow = (input: StartImportRunInput, importKind: AddressImportKind) =>
    ({
      sourceAtomEntryId: input.atomEntryId ?? null,
      sourceChecksumSha256: input.checksumSha256 ?? null,
      completedAt: null,
      errorSummary: null,
      failedRows: 0,
      id: input.id,
      importKind,
      insertedRows: 0,
      skippedRows: 0,
      shardCountryCode: input.shardCountryCode,
      sourceFeedId: input.sourceFeedId ?? null,
      sourceGeneratedAt: input.sourceGeneratedAt ?? null,
      sourceId: input.sourceId,
      sourceUri: input.sourceUri ?? null,
      sourceValidAt: input.sourceValidAt ?? null,
      sourceVersion: input.sourceVersion ?? null,
      startedAt: nowIso(),
      status: "running",
      tombstonedRows: 0,
      totalRows: 0,
      upsertedRows: 0,
    }) satisfies typeof smartSuggestImportRuns.$inferInsert;
  const toD1ImportRunRestartUpdateSet = (
    row: typeof smartSuggestImportRuns.$inferInsert,
  ) => ({
    completedAt: row.completedAt,
    errorSummary: row.errorSummary,
    failedRows: row.failedRows,
    importKind: row.importKind,
    insertedRows: row.insertedRows,
    skippedRows: row.skippedRows,
    shardCountryCode: row.shardCountryCode,
    sourceAtomEntryId: row.sourceAtomEntryId,
    sourceChecksumSha256: row.sourceChecksumSha256,
    sourceFeedId: row.sourceFeedId,
    sourceGeneratedAt: row.sourceGeneratedAt,
    sourceId: row.sourceId,
    sourceUri: row.sourceUri,
    sourceValidAt: row.sourceValidAt,
    sourceVersion: row.sourceVersion,
    startedAt: row.startedAt,
    status: row.status,
    tombstonedRows: row.tombstonedRows,
    totalRows: row.totalRows,
    upsertedRows: row.upsertedRows,
  });
  const insertD1ImportRunRow = (
    input: StartImportRunInput,
    importKind: AddressImportKind,
    row: typeof smartSuggestImportRuns.$inferInsert,
  ) =>
    Effect.catch(
      withD1Database((db) =>
        db
          .insert(smartSuggestImportRuns)
          .values(row)
          .onConflictDoNothing({ target: smartSuggestImportRuns.id })
          .returning(),
      ),
      (error) =>
        isSequencedImportKind(importKind) && isImportRunUniqueConstraintError(error)
          ? Effect.fail(activeSequencedImportRunConflict(input, undefined))
          : Effect.fail(error),
    );
  const restartD1ImportRunRow = (row: typeof smartSuggestImportRuns.$inferInsert) =>
    withD1Database((db) =>
      db
        .update(smartSuggestImportRuns)
        .set(toD1ImportRunRestartUpdateSet(row))
        .where(eq(smartSuggestImportRuns.id, row.id))
        .returning(),
    );
  const toReadSuggestCacheRecord = (
    row: typeof smartSuggestCacheEntries.$inferSelect | undefined,
  ) => {
    if (row === undefined) {
      return;
    }

    const record = toSuggestCacheRecord(row);

    return isCacheExpired(record)
      ? { ...record, status: "stale" as const }
      : { ...record, status: "hit" as const };
  };

  return {
    health: {
      check: () =>
        Effect.gen(function* () {
          const checkedAt = nowIso();
          const result = yield* Effect.exit(withD1Database((db) => db.run(sql`select 1`)));

          if (Exit.isFailure(result)) {
            const error = Cause.squash(result.cause);

            return {
              checkedAt,
              error: error instanceof Error ? error.message : "D1 check failed.",
              ok: false,
            };
          }

          return { checkedAt: nowIso(), ok: true };
        }),
    },
    tenants: {
      upsertTenant: (input) =>
        Effect.gen(function* () {
          const timestamp = nowIso();
          const row = {
            allowedOriginsJson: JSON.stringify(input.allowedOrigins),
            countryConfigJson: JSON.stringify(input.countryConfig),
            createdAt: timestamp,
            id: input.id,
            name: input.name,
            providerPriorityJson: JSON.stringify(input.providerPriority),
            status: input.status,
            updatedAt: timestamp,
          } satisfies typeof smartSuggestTenants.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestTenants)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  allowedOriginsJson: row.allowedOriginsJson,
                  countryConfigJson: row.countryConfigJson,
                  name: row.name,
                  providerPriorityJson: row.providerPriorityJson,
                  status: row.status,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestTenants.id,
              })
              .returning(),
          );

          return toTenantRecord(stored ?? row);
        }),
      getTenant: (tenantId) =>
        withD1Database((db) =>
          db.select().from(smartSuggestTenants).where(eq(smartSuggestTenants.id, tenantId)).get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toTenantRecord(row)))),
    },
    apiKeys: {
      upsertApiKey: (input) =>
        Effect.gen(function* () {
          const row = {
            createdAt: nowIso(),
            id: input.id,
            keyHash: input.keyHash,
            label: input.label,
            revokedAt: input.revokedAt ?? null,
            status: input.status,
            tenantId: input.tenantId,
          } satisfies typeof smartSuggestApiKeys.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestApiKeys)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  keyHash: row.keyHash,
                  label: row.label,
                  revokedAt: row.revokedAt,
                  status: row.status,
                  tenantId: row.tenantId,
                },
                target: smartSuggestApiKeys.id,
              })
              .returning(),
          );

          return toApiKeyRecord(stored ?? row);
        }),
      getApiKeyByHash: (keyHash) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestApiKeys)
            .where(eq(smartSuggestApiKeys.keyHash, keyHash))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toApiKeyRecord(row)))),
      listApiKeysForTenant: (tenantId) =>
        withD1Database((db) =>
          db.select().from(smartSuggestApiKeys).where(eq(smartSuggestApiKeys.tenantId, tenantId)),
        ).pipe(Effect.map((rows) => rows.map(toApiKeyRecord))),
    },
    dataSources: {
      registerDataSource: (input) =>
        Effect.gen(function* () {
          const timestamp = nowIso();
          const row = {
            attributionLabel: input.attribution.label,
            attributionLicense: input.attribution.license ?? null,
            attributionUrl: input.attribution.url ?? null,
            cachePolicyJson: JSON.stringify(input.cachePolicy),
            countryCode: input.countryCode,
            createdAt: timestamp,
            datasetVersion: input.datasetVersion ?? null,
            id: input.id,
            modificationNoteSha256: input.modificationNoteSha256 ?? null,
            name: input.name,
            region: input.region ?? null,
            sourceKind: input.sourceKind,
            updatedAt: timestamp,
          } satisfies typeof smartSuggestDataSources.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestDataSources)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  attributionLabel: row.attributionLabel,
                  attributionLicense: row.attributionLicense,
                  attributionUrl: row.attributionUrl,
                  cachePolicyJson: row.cachePolicyJson,
                  countryCode: row.countryCode,
                  datasetVersion: row.datasetVersion,
                  modificationNoteSha256: row.modificationNoteSha256,
                  name: row.name,
                  region: row.region,
                  sourceKind: row.sourceKind,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestDataSources.id,
              })
              .returning(),
          );

          return toDataSourceRecord(stored ?? row);
        }),
      getDataSource: (sourceId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestDataSources)
            .where(eq(smartSuggestDataSources.id, sourceId))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toDataSourceRecord(row)))),
    },
    importRuns: {
      startImportRun: (input) =>
        Effect.gen(function* () {
          const existing = yield* withD1Database((db) =>
            db
              .select()
              .from(smartSuggestImportRuns)
              .where(eq(smartSuggestImportRuns.id, input.id))
              .get(),
          );

          yield* assertD1ImportRunRestartCompatible(existing, input);
          const importKind = input.importKind ?? "manual";

          if (existing === undefined) {
            yield* assertNoD1ActiveSequencedImportRun(input, importKind);
        }

        const row = toD1ImportRunInsertRow(input, importKind);

        if (existing !== undefined) {
          const [stored] = yield* restartD1ImportRunRow(row);

          return toImportRunRecord(stored ?? row);
        }

        const [stored] = yield* insertD1ImportRunRow(input, importKind, row);

        if (stored === undefined) {
          return yield* Effect.fail(
            new SmartSuggestStorageError(
              "import-run-conflict",
              `Import run ${input.id} already exists.`,
            ),
          );
        }

        return toImportRunRecord(stored);
      }),
      finishImportRun: (input) =>
        Effect.gen(function* () {
          const [stored] = yield* withD1Database((db) =>
            db
              .update(smartSuggestImportRuns)
              .set({
                completedAt: input.completedAt,
                errorSummary: input.errorSummary ?? null,
                failedRows: input.failedRows,
                insertedRows: input.insertedRows,
                skippedRows: input.skippedRows ?? input.failedRows,
                status: input.status,
                tombstonedRows: input.tombstonedRows ?? 0,
                totalRows: input.totalRows,
                upsertedRows: input.upsertedRows ?? input.insertedRows,
              })
              .where(eq(smartSuggestImportRuns.id, input.id))
              .returning(),
          );

          if (stored === undefined) {
            return yield* Effect.fail(
              new SmartSuggestStorageError(
                "import-run-not-found",
                `Import run ${input.id} does not exist.`,
              ),
            );
          }

          return toImportRunRecord(stored);
        }),
      getImportRun: (runId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestImportRuns)
            .where(eq(smartSuggestImportRuns.id, runId))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toImportRunRecord(row)))),
      findLatestCompletedImportRun: (input) =>
        Effect.gen(function* () {
          if (input.importKinds.length === 0) {
            return;
          }

          const row = yield* withD1Database((db) =>
            db
              .select()
              .from(smartSuggestImportRuns)
              .where(
                and(
                  eq(smartSuggestImportRuns.status, "completed"),
                  eq(smartSuggestImportRuns.sourceId, input.sourceId),
                  eq(smartSuggestImportRuns.shardCountryCode, input.shardCountryCode),
                  inArray(smartSuggestImportRuns.importKind, input.importKinds),
                ),
              )
              .orderBy(
                desc(smartSuggestImportRuns.completedAt),
                desc(smartSuggestImportRuns.startedAt),
              )
              .get(),
          );

          return row === undefined ? undefined : toImportRunRecord(row);
        }),
      listRecentImportRuns: (limit = 10) => {
        const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

        return withD1Database((db) =>
          db
            .select()
            .from(smartSuggestImportRuns)
            .orderBy(desc(smartSuggestImportRuns.startedAt))
            .limit(normalizedLimit),
        ).pipe(Effect.map((rows) => rows.map(toImportRunRecord)));
      },
    },
    shardRegistry: {
      upsertShardMetadata: (input) =>
        Effect.gen(function* () {
          const shardId = input.shardId.trim();
          const previous = yield* withD1Database((db) =>
            db
              .select({ createdAt: smartSuggestShardRegistry.createdAt })
              .from(smartSuggestShardRegistry)
              .where(eq(smartSuggestShardRegistry.shardId, shardId))
              .get(),
          );
          const record = normalizeShardMetadataInput(input, previous);
          const row = toShardMetadataInsert(record);
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestShardRegistry)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  bindingName: row.bindingName,
                  countryCode: row.countryCode,
                  estimatedSizeBytes: row.estimatedSizeBytes,
                  importVersion: row.importVersion,
                  lastImportCompletedAt: row.lastImportCompletedAt,
                  municipalityCodesJson: row.municipalityCodesJson,
                  municipalityHintsJson: row.municipalityHintsJson,
                  postalPrefixesJson: row.postalPrefixesJson,
                  regionCode: row.regionCode,
                  regionKind: row.regionKind,
                  regionName: row.regionName,
                  rowCount: row.rowCount,
                  sourceFreshnessAt: row.sourceFreshnessAt,
                  state: row.state,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestShardRegistry.shardId,
              })
              .returning(),
          );

          return toShardMetadataRecord(stored ?? row);
        }),
      listShardMetadata: listD1ShardMetadata,
      resolveShardMetadata: (input) =>
        Effect.gen(function* () {
          const states = normalizeShardResolveStates(input.states);

          if (states.length === 0) {
            return [];
          }

          const [state] = states;
          const rows =
            states.length === 1 && state !== undefined
              ? yield* withD1Database((db) =>
                  db
                    .select()
                    .from(smartSuggestShardRegistry)
                    .where(
                      and(
                        eq(smartSuggestShardRegistry.countryCode, input.countryCode),
                        eq(smartSuggestShardRegistry.state, state),
                      ),
                    ),
                )
              : yield* withD1Database((db) =>
                  db
                    .select()
                    .from(smartSuggestShardRegistry)
                    .where(
                      and(
                        eq(smartSuggestShardRegistry.countryCode, input.countryCode),
                        inArray(smartSuggestShardRegistry.state, states),
                      ),
                    ),
                );

          return resolveShardMetadataMatches(rows.map(toShardMetadataRecord), input);
        }),
    },
    addressRecords: {
      upsertAddressRecords: (records) =>
        Effect.gen(function* () {
          const storedRecords: AddressRecord[] = [];

          for (const recordChunk of chunkItems(records, D1_ADDRESS_IMPORT_SUBCHUNK_SIZE)) {
            storedRecords.push(...(yield* upsertAddressRecordSubchunk(recordChunk)));
          }

          return storedRecords;
        }),
      listPostalLocalityAddressRecords: (input) =>
        Effect.gen(function* () {
          const postalDigits = normalizePostalCodeDigits(input.postalCode);
          const postalValues = postalCodeLookupValues(input.postalCode);

          if (postalDigits.length === 0 || postalValues.length === 0) {
            return [];
          }

          const postalFilter = or(
            inArray(smartSuggestAddressRecords.postalCode, postalValues),
            inArray(smartSuggestAddressRecords.ruianPostalCode, postalValues),
            sql`replace(${smartSuggestAddressRecords.postalCode}, ' ', '') = ${postalDigits}`,
            sql`replace(${smartSuggestAddressRecords.ruianPostalCode}, ' ', '') = ${postalDigits}`,
          );

          if (postalFilter === undefined) {
            return [];
          }

          const filters = [
            postalFilter,
            eq(smartSuggestAddressRecords.searchVisible, true),
            eq(smartSuggestAddressRecords.replicationStatus, "active"),
          ];

          if (input.countryCode !== undefined) {
            filters.push(eq(smartSuggestAddressRecords.countryCode, input.countryCode));
          }

          const rows = yield* withD1Database((db) =>
            db
              .select()
              .from(smartSuggestAddressRecords)
              .where(and(...filters))
              .orderBy(desc(smartSuggestAddressRecords.quality)),
          );

          return selectPostalLocalityAddressRecords(rows.map(toAddressRecord), input);
        }),
      searchAddressRecords: ({ countryCode, kind = "address", limit = 10, query }) =>
        Effect.gen(function* () {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

          if (kind === "postal") {
            const postalDigits = normalizePostalCodeDigits(query).slice(0, 5);

            if (postalDigits.length === 0) {
              return [];
            }

            const postalFilter = or(
              sql`replace(${smartSuggestAddressRecords.postalCode}, ' ', '') like ${`${postalDigits}%`}`,
              sql`replace(${smartSuggestAddressRecords.ruianPostalCode}, ' ', '') like ${`${postalDigits}%`}`,
            );

            if (postalFilter === undefined) {
              return [];
            }

            const filters = [
              postalFilter,
              eq(smartSuggestAddressRecords.searchVisible, true),
              eq(smartSuggestAddressRecords.replicationStatus, "active"),
            ];

            if (countryCode !== undefined) {
              filters.push(eq(smartSuggestAddressRecords.countryCode, countryCode));
            }

            const rows = yield* withD1Database((db) =>
              db
                .select()
                .from(smartSuggestAddressRecords)
                .where(and(...filters))
                .orderBy(
                  sql`replace(${smartSuggestAddressRecords.postalCode}, ' ', '') asc`,
                  desc(smartSuggestAddressRecords.quality),
                  sql`${smartSuggestAddressRecords.city} asc`,
                  sql`${smartSuggestAddressRecords.displayLabel} asc`,
                )
                .limit(Math.max(normalizedLimit * 20, 50)),
            );

            return selectPostalLocalityAddressRecords(
              rows.map(toAddressRecord),
              countryCode === undefined
                ? { postalCode: postalDigits }
                : { countryCode, postalCode: postalDigits },
            ).slice(0, normalizedLimit);
          }

          if (kind === "place") {
            const prefix = artifactFirstTokenPrefixForQuery(query, 64);

            if (prefix.length === 0) {
              return [];
            }

            const rows = yield* withD1Database((db) =>
              db
                .select()
                .from(smartSuggestAddressRecords)
                .where(
                  and(
                    like(smartSuggestAddressRecords.searchLabel, `%${prefix}%`),
                    eq(smartSuggestAddressRecords.searchVisible, true),
                    eq(smartSuggestAddressRecords.replicationStatus, "active"),
                    ...(countryCode === undefined
                      ? []
                      : [eq(smartSuggestAddressRecords.countryCode, countryCode)]),
                  ),
                )
                .orderBy(
                  desc(smartSuggestAddressRecords.quality),
                  sql`${smartSuggestAddressRecords.city} asc`,
                  sql`${smartSuggestAddressRecords.displayLabel} asc`,
                )
                .limit(Math.max(normalizedLimit * 20, 50)),
            );

            return rankLocalityCityRecords(
              normalizedLimit,
              rows
                .map(toAddressRecord)
                .filter((record) => localityRecordMatchesQueryPrefix(prefix, record)),
            );
          }

          const ftsQuery = createAddressSearchFtsQuery(query);
          const canUsePrefixIndex = hasAddressSearchPrefixToken(query);

          const indexedResults =
            ftsQuery === undefined
              ? undefined
              : yield* searchAddressRecordsByFts({
                  countryCode,
                  limit: normalizedLimit,
                  query,
                });

          if (indexedResults !== undefined) {
            return indexedResults;
          }

          const tokenResults = canUsePrefixIndex
            ? yield* searchAddressRecordsByTokens({
                countryCode,
                limit: normalizedLimit,
                query,
              })
            : undefined;

          if (tokenResults !== undefined) {
            return tokenResults;
          }

          if (ftsQuery === undefined) {
            return [];
          }

          return yield* searchAddressRecordsByLabel({
            countryCode,
            limit: normalizedLimit,
            query,
          });
        }),
      getAddressRecord: (recordId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestAddressRecords)
            .where(eq(smartSuggestAddressRecords.id, recordId))
            .get(),
        ).pipe(Effect.map((row) => (row === undefined ? undefined : toAddressRecord(row)))),
    },
    addressTombstones: {
      upsertAddressTombstones: (tombstones) =>
        Effect.gen(function* () {
          const storedTombstones: AddressTombstoneRecord[] = [];

          for (const input of tombstones) {
            const timestamp = nowIso();
            const row = toAddressTombstoneRow(input, timestamp);
            const [stored] = yield* withD1Database((db) =>
              db
                .insert(smartSuggestAddressTombstones)
                .values(row)
                .onConflictDoUpdate({
                  set: toAddressTombstoneUpdateSet(row),
                  target: smartSuggestAddressTombstones.id,
                })
                .returning(),
            );
            yield* markAddressRecordTombstoned(input);

            storedTombstones.push(toAddressTombstoneRecord(stored ?? row));
          }

          return storedTombstones;
        }),
      listAddressTombstones: (limit = 10) => {
        const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

        return withD1Database((db) =>
          db
            .select()
            .from(smartSuggestAddressTombstones)
            .orderBy(desc(smartSuggestAddressTombstones.updatedAt))
            .limit(normalizedLimit),
        ).pipe(Effect.map((rows) => rows.map(toAddressTombstoneRecord)));
      },
    },
    suggestCache: {
      readSuggestCache: (cacheKey) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestCacheEntries)
            .where(eq(smartSuggestCacheEntries.cacheKey, cacheKey))
            .get(),
        ).pipe(Effect.map(toReadSuggestCacheRecord)),
      writeSuggestCache: (input) =>
        Effect.gen(function* () {
          yield* storageEffect(() => assertCachePolicyAllowsWrite(input.cachePolicy));

          const timestamp = nowIso();
          const row = {
            cacheKey: input.cacheKey,
            cachePolicyJson: JSON.stringify(input.cachePolicy),
            countryCode: input.countryCode ?? null,
            createdAt: timestamp,
            expiresAt: input.expiresAt ?? null,
            kind: input.kind,
            language: input.language ?? null,
            payloadJson: JSON.stringify(input.payload),
            queryHash: input.queryHash,
            status: input.status ?? "written",
            tenantId: input.tenantId ?? null,
            updatedAt: timestamp,
          } satisfies typeof smartSuggestCacheEntries.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestCacheEntries)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  cachePolicyJson: row.cachePolicyJson,
                  countryCode: row.countryCode,
                  expiresAt: row.expiresAt,
                  kind: row.kind,
                  language: row.language,
                  payloadJson: row.payloadJson,
                  queryHash: row.queryHash,
                  status: row.status,
                  tenantId: row.tenantId,
                  updatedAt: row.updatedAt,
                },
                target: smartSuggestCacheEntries.cacheKey,
              })
              .returning(),
          );

          return toSuggestCacheRecord(stored ?? row);
        }),
    },
    providerEvents: {
      recordProviderEvent: (input) =>
        Effect.gen(function* () {
          const row = {
            createdAt: nowIso(),
            errorCode: input.errorCode ?? null,
            id: input.id,
            latencyMs: input.latencyMs ?? null,
            providerId: input.providerId,
            queryHash: input.queryHash ?? null,
            requestId: input.requestId,
            status: input.status,
            tenantId: input.tenantId ?? null,
          } satisfies typeof smartSuggestProviderEvents.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db.insert(smartSuggestProviderEvents).values(row).returning(),
          );

          return toProviderEventRecord(stored ?? row);
        }),
      listProviderEvents: (requestId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestProviderEvents)
            .where(eq(smartSuggestProviderEvents.requestId, requestId)),
        ).pipe(Effect.map((rows) => rows.map(toProviderEventRecord))),
    },
    acceptEvents: {
      recordAcceptEvent: (input) =>
        Effect.gen(function* () {
          const row = {
            acceptedAt: input.acceptedAt,
            id: input.id,
            requestId: input.requestId,
            sourceId: input.sourceId,
            suggestionId: input.suggestionId,
            tenantJson: input.tenant === undefined ? null : JSON.stringify(input.tenant),
          } satisfies typeof smartSuggestAcceptEvents.$inferInsert;
          const [stored] = yield* withD1Database((db) =>
            db
              .insert(smartSuggestAcceptEvents)
              .values(row)
              .onConflictDoUpdate({
                set: {
                  acceptedAt: row.acceptedAt,
                  requestId: row.requestId,
                  sourceId: row.sourceId,
                  suggestionId: row.suggestionId,
                  tenantJson: row.tenantJson,
                },
                target: smartSuggestAcceptEvents.id,
              })
              .returning(),
          );

          return toAcceptEventRecord(stored ?? row);
        }),
      listAcceptEvents: (requestId) =>
        withD1Database((db) =>
          db
            .select()
            .from(smartSuggestAcceptEvents)
            .where(eq(smartSuggestAcceptEvents.requestId, requestId)),
        ).pipe(Effect.map((rows) => rows.map(toAcceptEventRecord))),
    },
  };
};
