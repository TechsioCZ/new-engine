import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core";
import { normalizeSearchText } from "@techsio/smart-suggest-indexing";
import type {
  AcceptEventRecord,
  AddressRecord,
  AddressRecordVisibility,
  AddressSearchTokenInsert,
  AddressTombstoneRecord,
  AddressTombstoneRecordInput,
  ApiKeyRecord,
  DataSourceRecord,
  ImportRunRecord,
  ProviderEventRecord,
  SmartSuggestRepositories,
  SmartSuggestShardMetadataListInput,
  SmartSuggestShardMetadataRecord,
  SuggestCacheRecord,
  TenantRecord,
} from "./schema";
import {
  SmartSuggestStorageError,
  artifactFirstTokenPrefixForQuery,
  assertCachePolicyAllowsWrite,
  assertImportRunRestartCompatible,
  assertNoActiveSequencedImportRun,
  createAddressSearchFtsQuery,
  createAddressSearchTokenRows,
  createQuerySearchPrefixes,
  hasAddressSearchPrefixToken,
  isCacheExpired,
  isSequencedImportKind,
  localityRecordMatchesQueryPrefix,
  normalizePostalCodeDigits,
  normalizeReplicationStatus,
  normalizeSearchVisible,
  normalizeShardMetadataInput,
  nowIso,
  rankAddressRecordResults,
  rankLocalityCityRecords,
  resolveShardMetadataMatches,
  selectPostalLocalityAddressRecords,
  storageEffect,
  withTimestamps,
} from "./schema";

export const createInMemorySmartSuggestRepositories = (): SmartSuggestRepositories => {
  const tenants = new Map<string, TenantRecord>();
  const apiKeys = new Map<string, ApiKeyRecord>();
  const dataSources = new Map<string, DataSourceRecord>();
  const importRuns = new Map<string, ImportRunRecord>();
  const shardRegistry = new Map<string, SmartSuggestShardMetadataRecord>();
  const addressRecords = new Map<string, AddressRecord>();
  const addressTombstones = new Map<string, AddressTombstoneRecord>();
  const addressSearchTokensByRecordId = new Map<string, AddressSearchTokenInsert[]>();
  const suggestCache = new Map<string, SuggestCacheRecord>();
  const providerEvents = new Map<string, ProviderEventRecord[]>();
  const acceptEvents = new Map<string, AcceptEventRecord[]>();
  const indexAddressRecord = (record: AddressRecord) => {
    if (!record.searchVisible || record.replicationStatus !== "active") {
      addressSearchTokensByRecordId.delete(record.id);
      return;
    }

    addressSearchTokensByRecordId.set(record.id, createAddressSearchTokenRows(record));
  };
  const findIndexedAddressRecords = (
    query: string,
    countryCode: SmartSuggestCountryCode | undefined,
  ) => {
    const prefixes = new Set(createQuerySearchPrefixes(query));
    const recordIds = new Set<string>();

    if (prefixes.size === 0) {
      return [];
    }

    for (const tokens of addressSearchTokensByRecordId.values()) {
      for (const token of tokens) {
        if (
          prefixes.has(token.prefix) &&
          (countryCode === undefined || token.countryCode === countryCode)
        ) {
          recordIds.add(token.recordId);
        }
      }
    }

    return [...recordIds]
      .map((recordId) => addressRecords.get(recordId))
      .filter(
        (record): record is AddressRecord =>
          record?.searchVisible === true && record.replicationStatus === "active",
      );
  };
  const toInMemoryTombstonedAddressRecord = (
    record: AddressRecord,
    tombstone: AddressTombstoneRecordInput,
  ) => {
    const visibility: AddressRecordVisibility = {
      ...(record.visibility ?? {
        replicationStatus: "tombstoned",
        searchVisible: false,
      }),
      replicationStatus: "tombstoned",
      searchVisible: false,
    };
    const reason = tombstone.reason ?? record.visibility?.reason;
    const validTo = tombstone.deletedAt ?? record.visibility?.validTo;

    if (reason !== undefined) {
      visibility.reason = reason;
    }
    if (validTo !== undefined) {
      visibility.validTo = validTo;
    }

    const updated: AddressRecord = {
      ...record,
      replicationStatus: "tombstoned",
      searchVisible: false,
      updatedAt: nowIso(),
      visibility,
    };

    if (tombstone.sourceLineage !== undefined) {
      updated.sourceLineage = tombstone.sourceLineage;
    }
    if (tombstone.ruian !== undefined) {
      updated.ruian = tombstone.ruian;
    }

    return updated;
  };
  const markInMemoryAddressRecordTombstoned = (tombstone: AddressTombstoneRecordInput) => {
    const matchedRecords = [...addressRecords.values()].filter(
      (record) =>
        record.id === tombstone.id ||
        (tombstone.ruian?.addressPlaceCode !== undefined &&
          record.ruian?.addressPlaceCode === tombstone.ruian.addressPlaceCode),
    );

    for (const record of matchedRecords) {
      const updated = toInMemoryTombstonedAddressRecord(record, tombstone);
      addressRecords.set(updated.id, updated);
      addressSearchTokensByRecordId.delete(updated.id);
    }
  };
  const listInMemoryShardMetadata = (input: SmartSuggestShardMetadataListInput = {}) =>
    [...shardRegistry.values()]
      .filter((record) => {
        if (input.countryCode !== undefined && record.countryCode !== input.countryCode) {
          return false;
        }

        return input.state === undefined || record.state === input.state;
      })
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    health: {
      check: () => storageEffect(() => ({ checkedAt: nowIso(), ok: true })),
    },
    tenants: {
      upsertTenant: (input) =>
        storageEffect(() => {
          const record = withTimestamps(input, tenants.get(input.id));
          tenants.set(record.id, record);
          return record;
        }),
      getTenant: (tenantId) => storageEffect(() => tenants.get(tenantId)),
    },
    apiKeys: {
      upsertApiKey: (input) =>
        storageEffect(() => {
          const timestamp = nowIso();
          const existing = apiKeys.get(input.id);
          const record: ApiKeyRecord = {
            ...input,
            createdAt: existing?.createdAt ?? timestamp,
          };
          apiKeys.set(record.id, record);
          return record;
        }),
      getApiKeyByHash: (keyHash) =>
        storageEffect(() => [...apiKeys.values()].find((record) => record.keyHash === keyHash)),
      listApiKeysForTenant: (tenantId) =>
        storageEffect(() => [...apiKeys.values()].filter((record) => record.tenantId === tenantId)),
    },
    dataSources: {
      registerDataSource: (input) =>
        storageEffect(() => {
          const record = withTimestamps(input, dataSources.get(input.id));
          dataSources.set(record.id, record);
          return record;
        }),
      getDataSource: (sourceId) => storageEffect(() => dataSources.get(sourceId)),
    },
    importRuns: {
      startImportRun: (input) =>
        storageEffect(() => {
          const existing = importRuns.get(input.id);

          if (existing !== undefined) {
            assertImportRunRestartCompatible(existing, input);
          }

          const importKind = input.importKind ?? "manual";

          if (existing === undefined && isSequencedImportKind(importKind)) {
            const activeRun = [...importRuns.values()].find(
              (run) =>
                run.status === "running" &&
                run.sourceId === input.sourceId &&
                run.shardCountryCode === input.shardCountryCode &&
                isSequencedImportKind(run.importKind),
            );

            assertNoActiveSequencedImportRun(input, activeRun);
          }

          const record: ImportRunRecord = {
            ...input,
            failedRows: 0,
            importKind,
            insertedRows: 0,
            skippedRows: 0,
            startedAt: nowIso(),
            status: "running",
            tombstonedRows: 0,
            totalRows: 0,
            upsertedRows: 0,
          };
          importRuns.set(record.id, record);
          return record;
        }),
      finishImportRun: (input) =>
        storageEffect(() => {
          const existing = importRuns.get(input.id);

          if (existing === undefined) {
            throw new SmartSuggestStorageError(
              "import-run-not-found",
              `Import run ${input.id} does not exist.`,
            );
          }

          const record: ImportRunRecord = {
            ...existing,
            ...input,
            skippedRows: input.skippedRows ?? input.failedRows,
            tombstonedRows: input.tombstonedRows ?? 0,
            upsertedRows: input.upsertedRows ?? input.insertedRows,
          };
          importRuns.set(record.id, record);
          return record;
        }),
      getImportRun: (runId) => storageEffect(() => importRuns.get(runId)),
      findLatestCompletedImportRun: (input) =>
        storageEffect(() => {
          if (input.importKinds.length === 0) {
            return;
          }

          const importKinds = new Set(input.importKinds);

          return [...importRuns.values()]
            .filter(
              (run) =>
                run.status === "completed" &&
                run.sourceId === input.sourceId &&
                run.shardCountryCode === input.shardCountryCode &&
                run.importKind !== undefined &&
                importKinds.has(run.importKind),
            )
            .toSorted((left, right) => {
              const byCompletedAt = (right.completedAt ?? "").localeCompare(left.completedAt ?? "");

              return byCompletedAt === 0
                ? right.startedAt.localeCompare(left.startedAt)
                : byCompletedAt;
            })[0];
        }),
      listRecentImportRuns: (limit = 10) =>
        storageEffect(() => {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

          return [...importRuns.values()]
            .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))
            .slice(0, normalizedLimit);
        }),
    },
    shardRegistry: {
      upsertShardMetadata: (input) =>
        storageEffect(() => {
          const shardId = input.shardId.trim();
          const record = normalizeShardMetadataInput(input, shardRegistry.get(shardId));
          shardRegistry.set(record.shardId, record);
          return record;
        }),
      listShardMetadata: (input) => storageEffect(() => listInMemoryShardMetadata(input)),
      resolveShardMetadata: (input) =>
        storageEffect(() =>
          resolveShardMetadataMatches(
            listInMemoryShardMetadata({ countryCode: input.countryCode }),
            input,
          ),
        ),
    },
    addressRecords: {
      upsertAddressRecords: (records) =>
        storageEffect(() =>
          records.map((input) => {
            const previous = addressRecords.get(input.id);
            const replicationStatus = normalizeReplicationStatus(input);
            const searchVisible = normalizeSearchVisible(input);
            const visibility: AddressRecordVisibility = {
              ...(input.visibility ?? {
                replicationStatus,
                searchVisible,
              }),
              replicationStatus,
              searchVisible,
            };
            const record = withTimestamps(
              {
                ...input,
                replicationStatus,
                searchVisible,
                visibility,
              },
              previous,
            );
            addressRecords.set(record.id, record);
            indexAddressRecord(record);
            return record;
          }),
        ),
      listPostalLocalityAddressRecords: (input) =>
        storageEffect(() =>
          selectPostalLocalityAddressRecords([...addressRecords.values()], input),
        ),
      searchAddressRecords: ({ countryCode, kind = "address", limit = 10, query }) =>
        storageEffect(() => {
          const normalizedQuery = normalizeSearchText(query);
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

          if (kind === "postal") {
            const postalPrefix = normalizePostalCodeDigits(query).slice(0, 5);

            return postalPrefix.length === 0
              ? []
              : selectPostalLocalityAddressRecords(
                  [...addressRecords.values()],
                  countryCode === undefined
                    ? { postalCode: postalPrefix }
                    : { countryCode, postalCode: postalPrefix },
                ).slice(0, normalizedLimit);
          }

          if (kind === "place") {
            const prefix = artifactFirstTokenPrefixForQuery(query, 64);

            return prefix.length === 0
              ? []
              : rankLocalityCityRecords(
                  normalizedLimit,
                  [...addressRecords.values()].filter(
                    (record) =>
                      record.searchVisible &&
                      record.replicationStatus === "active" &&
                      (countryCode === undefined || record.countryCode === countryCode) &&
                      localityRecordMatchesQueryPrefix(prefix, record),
                  ),
                );
          }

          const ftsQuery = createAddressSearchFtsQuery(query);
          const canUsePrefixIndex = hasAddressSearchPrefixToken(query);

          const indexedRecords = canUsePrefixIndex
            ? findIndexedAddressRecords(query, countryCode)
            : [];
          if (indexedRecords.length === 0 && ftsQuery === undefined) {
            return [];
          }

          const candidates =
            indexedRecords.length > 0
              ? indexedRecords
              : [...addressRecords.values()].filter((record) => {
                  if (countryCode !== undefined && record.countryCode !== countryCode) {
                    return false;
                  }
                  if (!record.searchVisible || record.replicationStatus !== "active") {
                    return false;
                  }

                  return normalizeSearchText(record.searchLabel).includes(normalizedQuery);
                });

          return rankAddressRecordResults(query, candidates, normalizedLimit);
        }),
      getAddressRecord: (recordId) => storageEffect(() => addressRecords.get(recordId)),
    },
    addressTombstones: {
      upsertAddressTombstones: (tombstones) =>
        storageEffect(() =>
          tombstones.map((input) => {
            const record = withTimestamps(input, addressTombstones.get(input.id));
            addressTombstones.set(record.id, record);
            markInMemoryAddressRecordTombstoned(input);
            return record;
          }),
        ),
      listAddressTombstones: (limit = 10) =>
        storageEffect(() => {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

          return [...addressTombstones.values()]
            .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, normalizedLimit);
        }),
    },
    suggestCache: {
      readSuggestCache: (cacheKey) =>
        storageEffect(() => {
          const record = suggestCache.get(cacheKey);

          if (record === undefined) {
            return;
          }

          return isCacheExpired(record)
            ? { ...record, status: "stale" }
            : { ...record, status: "hit" };
        }),
      writeSuggestCache: (input) =>
        storageEffect(() => {
          assertCachePolicyAllowsWrite(input.cachePolicy);

          const timestamp = nowIso();
          const existing = suggestCache.get(input.cacheKey);
          const record: SuggestCacheRecord = {
            ...input,
            createdAt: existing?.createdAt ?? timestamp,
            status: input.status ?? "written",
            updatedAt: timestamp,
          };
          suggestCache.set(record.cacheKey, record);
          return record;
        }),
    },
    providerEvents: {
      recordProviderEvent: (input) =>
        storageEffect(() => {
          const record = { ...input, createdAt: nowIso() };
          const requestEvents = providerEvents.get(record.requestId) ?? [];
          providerEvents.set(record.requestId, [...requestEvents, record]);
          return record;
        }),
      listProviderEvents: (requestId) => storageEffect(() => providerEvents.get(requestId) ?? []),
    },
    acceptEvents: {
      recordAcceptEvent: (input) =>
        storageEffect(() => {
          const requestEvents = acceptEvents.get(input.requestId) ?? [];
          acceptEvents.set(input.requestId, [...requestEvents, input]);
          return input;
        }),
      listAcceptEvents: (requestId) => storageEffect(() => acceptEvents.get(requestId) ?? []),
    },
  };
};
