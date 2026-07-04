import type { AddressParts, SmartSuggestCountryCode } from "@techsio/smart-suggest-core";
import { extractPostalCodeCandidates, tokenizeAddressText } from "@techsio/smart-suggest-indexing";
import { Cause, Effect, Exit, Schema } from "effect";
import type {
  AddressRecord,
  DataSourceRecord,
  ImportRunRecord,
  SmartSuggestArtifactFetch,
  SmartSuggestArtifactRepositoryOptions,
  SmartSuggestOwnedDataArtifactManifest,
  SmartSuggestOwnedDataArtifactTokenBucketEntry,
  SmartSuggestOwnedDataArtifactTokenBucketManifest,
  SmartSuggestOwnedDataArtifactTokenBucketPage,
  SmartSuggestOwnedDataArtifactTokenManifest,
  SmartSuggestRepositories,
  SmartSuggestShardMetadataRecord,
  SmartSuggestStorageEffect,
} from "./schema";
import {
  ARTIFACT_MAX_RECORD_ID_FANOUT_WITHOUT_PREVIEW,
  ARTIFACT_MAX_SEQUENCE_RECORD_ID_FANOUT_WITHOUT_PREVIEW,
  ARTIFACT_SEQUENCE_RECORD_ID_PREFIX_READ_LIMIT,
  ArtifactAddressPartsSchema,
  ArtifactAddressRecordSchema,
  ArtifactTokenBucketEntrySchema,
  SmartSuggestOwnedDataArtifactAddressRecordsSchema,
  SmartSuggestOwnedDataArtifactManifestSchema,
  SmartSuggestOwnedDataArtifactTokenBucketManifestSchema,
  SmartSuggestOwnedDataArtifactTokenBucketPageSchema,
  SmartSuggestOwnedDataArtifactTokenManifestSchema,
  SmartSuggestStorageError,
  addressCountForRecord,
  artifactFirstTokenPrefixForQuery,
  asCountryCode,
  hasAddressSearchPrefixToken,
  localityRecordMatchesQueryPrefix,
  mergeUniqueAddressRecords,
  normalizePostalCodeDigits,
  nowIso,
  rankAddressRecordResults,
  rankLocalityCityRecords,
  resolveShardMetadataMatches,
  sanitizeStorageErrorMessage,
  selectPostalLocalityAddressRecords,
  toSmartSuggestStorageError,
} from "./schema";

const missingArtifactJsonBody = { _tag: "MissingArtifactJsonBody" } as const;

const defaultArtifactFetch: SmartSuggestArtifactFetch = (input, init) => fetch(input, init);

const artifactStorageError = (message: string) =>
  new SmartSuggestStorageError("storage-unavailable", message);

const artifactBaseUrl = (manifestUrl: string) => new URL(".", manifestUrl).toString();

const artifactReplacementValue = (replacements: Readonly<Record<string, string>>, key: string) =>
  encodeURIComponent(replacements[key] ?? "");

const renderArtifactPath = (template: string, replacements: Readonly<Record<string, string>>) =>
  template.replaceAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/gu, (_match, key: string) =>
    artifactReplacementValue(replacements, key),
  );

const artifactUrlForPath = (manifestUrl: string, artifactPath: string) =>
  new URL(artifactPath, artifactBaseUrl(manifestUrl)).toString();

const formatArtifactPageIndex = (page: number) => String(page).padStart(4, "0");

const formatArtifactBucket = (bucket: number) => String(bucket).padStart(4, "0");

const artifactHashModulus = 2_147_483_647;

const hashArtifactKey = (value: string) => {
  let hash = 0;

  for (const character of value) {
    hash = (Math.imul(hash, 131) + (character.codePointAt(0) ?? 0)) % artifactHashModulus;

    if (hash < 0) {
      hash += artifactHashModulus;
    }
  }

  return hash;
};

const artifactBucketForKey = (value: string, bucketCount: number) =>
  formatArtifactBucket(hashArtifactKey(value) % bucketCount);

const decodeArtifactJson = <TSchema extends Schema.Constraint>(schema: TSchema, body: unknown) =>
  Schema.decodeUnknownEffect(schema)(body).pipe(Effect.mapError(toSmartSuggestStorageError));

const fetchArtifactJson = <TSchema extends Schema.Constraint>({
  allowMissing,
  fetchImpl,
  schema,
  url,
}: {
  allowMissing: boolean;
  fetchImpl: SmartSuggestArtifactFetch;
  schema: TSchema;
  url: string;
}) =>
  Effect.tryPromise({
    catch: toSmartSuggestStorageError,
    try: (signal) =>
      fetchImpl(url, { signal }).then((response) => {
        if (allowMissing && response.status === 404) {
          return missingArtifactJsonBody;
        }
        if (!response.ok) {
          return Promise.reject(
            artifactStorageError(`Smart Suggest artifact ${url} failed with ${response.status}.`),
          );
        }

        return response.json() as Promise<unknown>;
      }),
  }).pipe(
    Effect.flatMap((body) =>
      body === missingArtifactJsonBody
        ? Effect.succeed(undefined)
        : decodeArtifactJson(schema, body),
    ),
  );

const fetchArtifactText = ({
  allowMissing,
  fetchImpl,
  url,
}: {
  allowMissing: boolean;
  fetchImpl: SmartSuggestArtifactFetch;
  url: string;
}) =>
  Effect.tryPromise({
    catch: toSmartSuggestStorageError,
    try: async (signal): Promise<string | typeof missingArtifactJsonBody> => {
      const response = await fetchImpl(url, { signal });

      if (allowMissing && response.status === 404) {
        return missingArtifactJsonBody;
      }

      if (!response.ok) {
        return Promise.reject(
          artifactStorageError(`Smart Suggest artifact ${url} failed with ${response.status}.`),
        );
      }

      return response.text();
    },
  });

const extractJsonObjectAt = (text: string, objectStart: number): string | undefined => {
  if (text[objectStart] !== "{") {
    return undefined;
  }

  let depth = 0;
  let escaped = false;
  let inString = false;

  for (let index = objectStart; index < text.length; index += 1) {
    const character = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = inString;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(objectStart, index + 1);
      }
    }
  }

  return undefined;
};

const extractTokenBucketEntryJson = (text: string, token: string): string | undefined => {
  const tokensPropertyIndex = text.indexOf('"tokens"');

  if (tokensPropertyIndex < 0) {
    return undefined;
  }

  const tokenKeyIndex = text.indexOf(`${JSON.stringify(token)}:{`, tokensPropertyIndex);

  if (tokenKeyIndex < 0) {
    return undefined;
  }

  const objectStart = tokenKeyIndex + JSON.stringify(token).length + 1;

  return extractJsonObjectAt(text, objectStart);
};

const extractJsonObjectArrayPrefix = (
  text: string,
  property: string,
  limit: number,
): readonly unknown[] | undefined => {
  // D1 json_group_array emits a single JSON object whose array property is serialized
  // as `"property":[{...},{...}]`; this prefix scanner only relies on that exact shape.
  const propertyPrefix = `${JSON.stringify(property)}:[`;
  const propertyIndex = text.indexOf(propertyPrefix);

  if (propertyIndex < 0) {
    return undefined;
  }

  const values: unknown[] = [];
  let index = propertyIndex + propertyPrefix.length;

  while (values.length < limit && index < text.length) {
    while (/[\s,]/u.test(text[index] ?? "")) {
      index += 1;
    }

    if (text[index] === "]") {
      return values;
    }

    const objectText = extractJsonObjectAt(text, index);

    if (objectText === undefined) {
      return undefined;
    }

    values.push(JSON.parse(objectText) as unknown);
    index += objectText.length;
  }

  return values;
};

const toArtifactCountryCode = (value: string): SmartSuggestCountryCode =>
  asCountryCode(value, "artifact country code");

const toArtifactAddressParts = (
  parts: Schema.Schema.Type<typeof ArtifactAddressPartsSchema>,
): AddressParts => {
  const addressParts: AddressParts = {};

  if (parts.city !== undefined) {
    addressParts.city = parts.city;
  }
  if (parts.countryCode !== undefined) {
    addressParts.countryCode = toArtifactCountryCode(parts.countryCode);
  }
  if (parts.district !== undefined) {
    addressParts.district = parts.district;
  }
  if (parts.houseNumber !== undefined) {
    addressParts.houseNumber = parts.houseNumber;
  }
  if (parts.line1 !== undefined) {
    addressParts.line1 = parts.line1;
  }
  if (parts.line2 !== undefined) {
    addressParts.line2 = parts.line2;
  }
  if (parts.orientationNumber !== undefined) {
    addressParts.orientationNumber = parts.orientationNumber;
  }
  if (parts.postalCode !== undefined) {
    addressParts.postalCode = parts.postalCode;
  }
  if (parts.region !== undefined) {
    addressParts.region = parts.region;
  }
  if (parts.street !== undefined) {
    addressParts.street = parts.street;
  }

  return addressParts;
};

const toArtifactDataSourceRecord = (
  source: SmartSuggestOwnedDataArtifactManifest["dataset"]["source"],
): DataSourceRecord => {
  const record: DataSourceRecord = {
    attribution: source.attribution,
    cachePolicy: source.cachePolicy,
    countryCode: toArtifactCountryCode(source.countryCode),
    createdAt: source.createdAt,
    id: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
    updatedAt: source.updatedAt,
  };

  if (source.datasetVersion !== undefined) {
    record.datasetVersion = source.datasetVersion;
  }
  if (source.modificationNoteSha256 !== undefined) {
    record.modificationNoteSha256 = source.modificationNoteSha256;
  }
  if (source.region !== undefined) {
    record.region = source.region;
  }

  return record;
};

const toArtifactImportRunRecord = (
  run: SmartSuggestOwnedDataArtifactManifest["dataset"]["importRun"],
): ImportRunRecord => {
  const record: ImportRunRecord = {
    failedRows: run.failedRows,
    id: run.id,
    insertedRows: run.insertedRows,
    shardCountryCode: toArtifactCountryCode(run.shardCountryCode),
    skippedRows: run.skippedRows,
    sourceId: run.sourceId,
    startedAt: run.startedAt,
    status: run.status,
    tombstonedRows: run.tombstonedRows,
    totalRows: run.totalRows,
    upsertedRows: run.upsertedRows,
  };

  if (run.atomEntryId !== undefined) {
    record.atomEntryId = run.atomEntryId;
  }
  if (run.checksumSha256 !== undefined) {
    record.checksumSha256 = run.checksumSha256;
  }
  if (run.completedAt !== undefined) {
    record.completedAt = run.completedAt;
  }
  if (run.errorSummary !== undefined) {
    record.errorSummary = run.errorSummary;
  }
  if (run.importKind !== undefined) {
    record.importKind = run.importKind;
  }
  if (run.sourceFeedId !== undefined) {
    record.sourceFeedId = run.sourceFeedId;
  }
  if (run.sourceGeneratedAt !== undefined) {
    record.sourceGeneratedAt = run.sourceGeneratedAt;
  }
  if (run.sourceUri !== undefined) {
    record.sourceUri = run.sourceUri;
  }
  if (run.sourceValidAt !== undefined) {
    record.sourceValidAt = run.sourceValidAt;
  }
  if (run.sourceVersion !== undefined) {
    record.sourceVersion = run.sourceVersion;
  }

  return record;
};

const toArtifactShardMetadataRecord = (
  shard: SmartSuggestOwnedDataArtifactManifest["shards"][number],
): SmartSuggestShardMetadataRecord => {
  const record: SmartSuggestShardMetadataRecord = {
    bindingName: shard.bindingName,
    countryCode: toArtifactCountryCode(shard.countryCode),
    createdAt: shard.createdAt,
    municipalityCodes: shard.municipalityCodes,
    municipalityHints: shard.municipalityHints,
    postalPrefixes: shard.postalPrefixes,
    regionCode: shard.regionCode,
    regionKind: shard.regionKind,
    regionName: shard.regionName,
    rowCount: shard.rowCount,
    shardId: shard.shardId,
    state: shard.state,
    updatedAt: shard.updatedAt,
  };

  if (shard.estimatedSizeBytes !== undefined) {
    record.estimatedSizeBytes = shard.estimatedSizeBytes;
  }
  if (shard.importVersion !== undefined) {
    record.importVersion = shard.importVersion;
  }
  if (shard.lastImportCompletedAt !== undefined) {
    record.lastImportCompletedAt = shard.lastImportCompletedAt;
  }
  if (shard.sourceFreshnessAt !== undefined) {
    record.sourceFreshnessAt = shard.sourceFreshnessAt;
  }

  return record;
};

const toArtifactAddressRecord = (
  input: Schema.Schema.Type<typeof ArtifactAddressRecordSchema>,
): AddressRecord => {
  const record: AddressRecord = {
    countryCode: toArtifactCountryCode(input.countryCode),
    createdAt: input.createdAt,
    displayLabel: input.displayLabel,
    id: input.id,
    parts: toArtifactAddressParts(input.parts),
    quality: input.quality,
    replicationStatus: input.replicationStatus,
    searchLabel: input.searchLabel,
    searchVisible: input.searchVisible,
    sourceId: input.sourceId,
    updatedAt: input.updatedAt,
  };

  if (input.attribution !== undefined) {
    record.attribution = input.attribution;
  }
  if (input.latitude !== undefined) {
    record.latitude = input.latitude;
  }
  if (input.longitude !== undefined) {
    record.longitude = input.longitude;
  }
  if (input.ranking !== undefined) {
    record.ranking = input.ranking;
  }
  if (input.ruian !== undefined) {
    record.ruian = input.ruian;
  }
  if (input.sourceLineage !== undefined) {
    record.sourceLineage = input.sourceLineage;
  }
  if (input.visibility !== undefined) {
    record.visibility = input.visibility;
  }

  return record;
};

const artifactManifestComplete = (
  manifest: SmartSuggestOwnedDataArtifactManifest,
  allowIncomplete: boolean,
) =>
  allowIncomplete ||
  (manifest.dataset.complete &&
    manifest.indexes.addressRecords.complete &&
    manifest.indexes.addressTokens.complete &&
    manifest.indexes.localityCities.complete &&
    manifest.indexes.postalLocalities.complete &&
    manifest.indexes.postalPrefixes.complete);

const incompleteArtifactError = () =>
  artifactStorageError(
    "Smart Suggest owned-data artifact manifest is incomplete and cannot serve production traffic.",
  );

const mergeRankedAddressRecords = (
  query: string,
  limit: number,
  records: readonly AddressRecord[],
) => rankAddressRecordResults(query, mergeUniqueAddressRecords(records), limit);

const artifactPrefixCandidates = (prefix: string) =>
  Array.from({ length: prefix.length }, (_, index) => prefix.slice(0, prefix.length - index));

const rankPostalPrefixRecords = (
  postalPrefix: string,
  limit: number,
  records: readonly AddressRecord[],
) =>
  mergeUniqueAddressRecords(records)
    .filter((record) =>
      normalizePostalCodeDigits(record.parts.postalCode ?? record.ruian?.postalCode).startsWith(
        postalPrefix,
      ),
    )
    .toSorted((left, right) => {
      const leftPostalCode = normalizePostalCodeDigits(
        left.parts.postalCode ?? left.ruian?.postalCode,
      );
      const rightPostalCode = normalizePostalCodeDigits(
        right.parts.postalCode ?? right.ruian?.postalCode,
      );

      return (
        leftPostalCode.localeCompare(rightPostalCode, "cs-CZ") ||
        addressCountForRecord(right) - addressCountForRecord(left) ||
        right.quality - left.quality ||
        (left.parts.city ?? left.displayLabel).localeCompare(
          right.parts.city ?? right.displayLabel,
          "cs-CZ",
        ) ||
        left.id.localeCompare(right.id, "cs-CZ")
      );
    })
    .slice(0, limit);

const artifactSequenceToken = (left: string, right: string) => `${left} ${right}`;
const artifactRecordIdFanoutLimit = (token: string) =>
  token.includes(" ")
    ? ARTIFACT_MAX_SEQUENCE_RECORD_ID_FANOUT_WITHOUT_PREVIEW
    : ARTIFACT_MAX_RECORD_ID_FANOUT_WITHOUT_PREVIEW;

const artifactRecordIdsForLookup = (token: string, recordIds: readonly string[], _limit: number) =>
  token.includes(" ")
    ? recordIds.slice(0, ARTIFACT_SEQUENCE_RECORD_ID_PREFIX_READ_LIMIT)
    : recordIds;

const artifactTokensForQuery = (
  query: string,
  index: SmartSuggestOwnedDataArtifactManifest["indexes"]["addressTokens"],
) => {
  const queryTokens = tokenizeAddressText(query);
  const singleTokens = new Set(queryTokens);
  const sequenceTokens = new Set<string>();

  for (const token of queryTokens) {
    const clippedToken = token.slice(0, index.maxTokenLength);

    if (clippedToken.length > 4) {
      singleTokens.add(clippedToken.slice(0, 4));
    }
  }

  for (let indexOfToken = 1; indexOfToken < queryTokens.length; indexOfToken += 1) {
    const left = queryTokens[indexOfToken - 1]?.slice(0, index.maxTokenLength);
    const right = queryTokens[indexOfToken]?.slice(0, index.maxTokenLength);

    if (
      left !== undefined &&
      right !== undefined &&
      left.length > 0 &&
      right.length >= index.minTokenLength
    ) {
      sequenceTokens.add(artifactSequenceToken(left, right));
    }
  }

  for (const postalCode of extractPostalCodeCandidates(query)) {
    singleTokens.add(postalCode.value);
  }

  const prioritizedSequenceTokens = [...sequenceTokens].toSorted(
    (left, right) => right.length - left.length || left.localeCompare(right),
  );
  const prioritizedSingleTokens = [...singleTokens]
    .map((token) => token.slice(0, index.maxTokenLength))
    .filter((token) => token.length >= index.minTokenLength)
    .toSorted((left, right) => right.length - left.length || left.localeCompare(right))
    .slice(0, 8);

  return [...prioritizedSequenceTokens, ...prioritizedSingleTokens].slice(0, 12);
};

const matchesArtifactCountry = (
  manifest: SmartSuggestOwnedDataArtifactManifest,
  countryCode: SmartSuggestCountryCode | undefined,
) =>
  countryCode === undefined || countryCode === toArtifactCountryCode(manifest.dataset.countryCode);

export const createArtifactSmartSuggestRepositories = ({
  allowIncomplete = false,
  fallback,
  fetch: fetchImpl = defaultArtifactFetch,
  manifestUrl,
  maxAddressTokenPages,
  readFallbackAddressRecords = false,
}: SmartSuggestArtifactRepositoryOptions): SmartSuggestRepositories => {
  let manifestCache: SmartSuggestOwnedDataArtifactManifest | undefined;
  const tokenManifestCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenManifest | undefined
  >();
  const tokenBucketEntryCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenBucketEntry | undefined
  >();
  const tokenBucketManifestCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenBucketManifest | undefined
  >();
  const tokenBucketPageCache = new Map<
    string,
    SmartSuggestOwnedDataArtifactTokenBucketPage | undefined
  >();
  const recordShardCache = new Map<string, readonly AddressRecord[]>();

  const readManifest = (): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactManifest> => {
    if (manifestCache !== undefined) {
      return Effect.succeed(manifestCache);
    }

    return fetchArtifactJson({
      allowMissing: false,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactManifestSchema,
      url: manifestUrl,
    }).pipe(
      Effect.flatMap((manifest) =>
        manifest === undefined
          ? Effect.fail(
              artifactStorageError("Smart Suggest owned-data artifact manifest is missing."),
            )
          : Effect.sync(() => {
              manifestCache = manifest;
              return manifest;
            }),
      ),
    );
  };

  const readCompleteManifest =
    (): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactManifest> =>
      readManifest().pipe(
        Effect.flatMap((manifest) =>
          artifactManifestComplete(manifest, allowIncomplete)
            ? Effect.succeed(manifest)
            : Effect.fail(incompleteArtifactError()),
        ),
      );

  const readRecordShard = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    artifactPath: string,
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> => {
    const url = artifactUrlForPath(manifestUrl, artifactPath);
    const cached = recordShardCache.get(url);

    if (cached !== undefined) {
      return Effect.succeed(cached);
    }

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactAddressRecordsSchema,
      url,
    }).pipe(
      Effect.map((shard) => {
        const records =
          shard === undefined ||
          (!allowIncomplete && !shard.complete) ||
          shard.countryCode !== manifest.dataset.countryCode
            ? []
            : shard.records.map(toArtifactAddressRecord);

        recordShardCache.set(url, records);

        return records;
      }),
    );
  };

  const readRecordShardPrefix = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    artifactPath: string,
    recordLimit: number,
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    fetchArtifactText({
      allowMissing: true,
      fetchImpl,
      url: artifactUrlForPath(manifestUrl, artifactPath),
    }).pipe(
      Effect.flatMap((body) => {
        if (typeof body !== "string") {
          return Effect.succeed([]);
        }

        return Effect.try({
          catch: toSmartSuggestStorageError,
          try: () => extractJsonObjectArrayPrefix(body, "records", recordLimit) ?? [],
        }).pipe(
          Effect.flatMap((records) =>
            Effect.all(
              records.map((record) =>
                decodeArtifactJson(ArtifactAddressRecordSchema, record).pipe(
                  Effect.map(toArtifactAddressRecord),
                ),
              ),
            ),
          ),
        );
      }),
    );

  const readRecordShardByIds = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    recordBucket: string,
    recordIds: readonly string[],
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> => {
    const recordIdSet = new Set(recordIds);

    if (recordIdSet.size === 0) {
      return Effect.succeed([]);
    }

    const url = artifactUrlForPath(
      manifestUrl,
      renderArtifactPath(manifest.indexes.addressRecords.pathTemplate, {
        countryCode: manifest.dataset.countryCode,
        recordBucket,
      }),
    );

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactAddressRecordsSchema,
      url,
    }).pipe(
      Effect.map((shard) => {
        if (
          shard === undefined ||
          (!allowIncomplete && !shard.complete) ||
          shard.countryCode !== manifest.dataset.countryCode
        ) {
          return [];
        }

        return shard.records
          .filter((record) => recordIdSet.has(record.id))
          .map(toArtifactAddressRecord);
      }),
    );
  };

  const readAddressRecordsById = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    recordIds: readonly string[],
  ): SmartSuggestStorageEffect<readonly AddressRecord[]> => {
    const uniqueRecordIds = [...new Set(recordIds)];

    if (uniqueRecordIds.length === 0) {
      return Effect.succeed([]);
    }

    const idsByBucket = new Map<string, string[]>();

    for (const recordId of uniqueRecordIds) {
      const bucket = artifactBucketForKey(recordId, manifest.indexes.addressRecords.bucketCount);
      const ids = idsByBucket.get(bucket);

      if (ids === undefined) {
        idsByBucket.set(bucket, [recordId]);
      } else {
        ids.push(recordId);
      }
    }

    return Effect.gen(function* readAddressRecordsByIdProgram() {
      const recordsById = new Map<string, AddressRecord>();

      for (const [bucket, bucketRecordIds] of idsByBucket) {
        const bucketRecordIdSet = new Set(bucketRecordIds);
        const records = yield* readRecordShardByIds(manifest, bucket, bucketRecordIds);

        for (const record of records) {
          if (bucketRecordIdSet.has(record.id)) {
            recordsById.set(record.id, record);
          }
        }
      }

      return uniqueRecordIds.flatMap((recordId) => {
        const record = recordsById.get(recordId);

        return record === undefined ? [] : [record];
      });
    });
  };

  const readTokenBucketEntry = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketEntry | undefined> => {
    const { bucketCount, bucketPathTemplate } = manifest.indexes.addressTokens;

    if (bucketCount === undefined || bucketPathTemplate === undefined) {
      return Effect.succeed(undefined);
    }

    const tokenBucket = artifactBucketForKey(token, bucketCount);
    const cacheKey = `${manifest.dataset.countryCode}:${tokenBucket}:${token}`;

    if (tokenBucketEntryCache.has(cacheKey)) {
      return Effect.succeed(tokenBucketEntryCache.get(cacheKey));
    }

    const path = renderArtifactPath(bucketPathTemplate, {
      countryCode: manifest.dataset.countryCode,
      tokenBucket,
    });

    return fetchArtifactText({
      allowMissing: true,
      fetchImpl,
      url: artifactUrlForPath(manifestUrl, path),
    }).pipe(
      Effect.flatMap((body) => {
        if (typeof body !== "string") {
          tokenBucketEntryCache.set(cacheKey, undefined);
          return Effect.succeed(undefined);
        }

        const entryJson = extractTokenBucketEntryJson(body, token);

        if (entryJson === undefined) {
          tokenBucketEntryCache.set(cacheKey, undefined);
          return Effect.succeed(undefined);
        }

        return Effect.try({
          catch: toSmartSuggestStorageError,
          try: () => JSON.parse(entryJson) as unknown,
        }).pipe(
          Effect.flatMap((entry) => decodeArtifactJson(ArtifactTokenBucketEntrySchema, entry)),
          Effect.map((entry) => {
            tokenBucketEntryCache.set(cacheKey, entry);

            return entry;
          }),
        );
      }),
    );
  };

  const readTokenBucketManifest = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    tokenBucket: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketManifest | undefined> => {
    const { bucketManifestPathTemplate } = manifest.indexes.addressTokens;

    if (bucketManifestPathTemplate === undefined) {
      return Effect.succeed(undefined);
    }

    const cacheKey = `${manifest.dataset.countryCode}:${tokenBucket}`;

    if (tokenBucketManifestCache.has(cacheKey)) {
      return Effect.succeed(tokenBucketManifestCache.get(cacheKey));
    }

    const path = renderArtifactPath(bucketManifestPathTemplate, {
      countryCode: manifest.dataset.countryCode,
      tokenBucket,
    });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenBucketManifestSchema,
      url: artifactUrlForPath(manifestUrl, path),
    }).pipe(
      Effect.map((bucketManifest) => {
        const usableManifest =
          bucketManifest === undefined ||
          bucketManifest.countryCode !== manifest.dataset.countryCode ||
          bucketManifest.bucket !== Number(tokenBucket) ||
          (!allowIncomplete && !bucketManifest.complete)
            ? undefined
            : bucketManifest;

        tokenBucketManifestCache.set(cacheKey, usableManifest);

        return usableManifest;
      }),
    );
  };

  const readTokenBucketPage = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    tokenBucketManifest: SmartSuggestOwnedDataArtifactTokenBucketManifest,
    pageReference: SmartSuggestOwnedDataArtifactTokenBucketManifest["pages"][number],
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketPage | undefined> => {
    const { bucketPagePathTemplate } = manifest.indexes.addressTokens;
    const tokenBucket = formatArtifactBucket(tokenBucketManifest.bucket);
    const pageKey = formatArtifactPageIndex(pageReference.page);
    const cacheKey = `${manifest.dataset.countryCode}:${tokenBucket}:${pageKey}`;

    if (tokenBucketPageCache.has(cacheKey)) {
      return Effect.succeed(tokenBucketPageCache.get(cacheKey));
    }

    if (pageReference.path === undefined && bucketPagePathTemplate === undefined) {
      return Effect.succeed(undefined);
    }

    const pagePath =
      pageReference.path ??
      renderArtifactPath(bucketPagePathTemplate ?? "", {
        countryCode: manifest.dataset.countryCode,
        page: pageKey,
        tokenBucket,
      });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenBucketPageSchema,
      url: artifactUrlForPath(manifestUrl, pagePath),
    }).pipe(
      Effect.map((page) => {
        const usablePage =
          page === undefined ||
          page.countryCode !== manifest.dataset.countryCode ||
          page.bucket !== tokenBucketManifest.bucket ||
          page.page !== pageReference.page ||
          (!allowIncomplete && !page.complete)
            ? undefined
            : page;

        tokenBucketPageCache.set(cacheKey, usablePage);

        return usablePage;
      }),
    );
  };

  const readPagedTokenBucketCandidateEntry = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
    tokenBucket: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketEntry | undefined> =>
    readTokenBucketManifest(manifest, tokenBucket).pipe(
      Effect.flatMap((bucketManifest) => {
        const tokenReference = bucketManifest?.tokens[token];

        if (bucketManifest === undefined || tokenReference === undefined) {
          return Effect.succeed(undefined);
        }

        const pageReference = bucketManifest.pages.find(
          (page) => page.page === tokenReference.page,
        );

        if (pageReference === undefined) {
          return Effect.succeed(undefined);
        }

        return readTokenBucketPage(manifest, bucketManifest, pageReference).pipe(
          Effect.map((page) => page?.tokens[token]),
        );
      }),
    );

  const readBucketedTokenCandidateEntry = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketEntry | undefined> =>
    readTokenBucketEntry(manifest, token).pipe(
      Effect.flatMap((entry) => {
        if (entry !== undefined) {
          return Effect.succeed(entry);
        }

        const bucketCount = manifest.indexes.addressTokens.bucketCount;

        return bucketCount === undefined
          ? Effect.succeed(undefined)
          : readPagedTokenBucketCandidateEntry(
              manifest,
              token,
              artifactBucketForKey(token, bucketCount),
            );
      }),
    );

  const readTokenManifest = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenManifest | undefined> => {
    const cacheKey = `${manifest.dataset.countryCode}:${token}`;

    if (tokenManifestCache.has(cacheKey)) {
      return Effect.succeed(tokenManifestCache.get(cacheKey));
    }

    const path = renderArtifactPath(manifest.indexes.addressTokens.manifestPathTemplate, {
      countryCode: manifest.dataset.countryCode,
      token,
    });

    return fetchArtifactJson({
      allowMissing: true,
      fetchImpl,
      schema: SmartSuggestOwnedDataArtifactTokenManifestSchema,
      url: artifactUrlForPath(manifestUrl, path),
    }).pipe(
      Effect.map((tokenManifest) => {
        const usableManifest =
          tokenManifest === undefined ||
          tokenManifest.countryCode !== manifest.dataset.countryCode ||
          tokenManifest.token !== token ||
          (!allowIncomplete && !tokenManifest.complete)
            ? undefined
            : tokenManifest;

        tokenManifestCache.set(cacheKey, usableManifest);

        return usableManifest;
      }),
    );
  };

  const readTokenPageRecords = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    tokenManifest: SmartSuggestOwnedDataArtifactTokenManifest,
    page: SmartSuggestOwnedDataArtifactTokenManifest["pages"][number],
  ) => {
    const pagePath =
      page.path ??
      renderArtifactPath(manifest.indexes.addressTokens.pagePathTemplate, {
        countryCode: manifest.dataset.countryCode,
        page: formatArtifactPageIndex(page.page),
        token: tokenManifest.token,
      });

    return readRecordShard(manifest, pagePath);
  };

  const readLegacyTokenCandidateIds = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<readonly string[] | undefined> =>
    readTokenManifest(manifest, token).pipe(
      Effect.flatMap((tokenManifest) => {
        if (tokenManifest === undefined || tokenManifest.recordCount <= 0) {
          return Effect.succeed(undefined);
        }

        const maxPages = Math.max(
          1,
          Math.min(
            tokenManifest.pageCount,
            maxAddressTokenPages ??
              manifest.indexes.addressTokens.maxPagesPerQuery ??
              tokenManifest.pageCount,
          ),
        );

        return Effect.gen(function* readLegacyTokenCandidateIdsProgram() {
          const ids: string[] = [];

          for (const page of tokenManifest.pages
            .toSorted((left, right) => left.page - right.page)
            .slice(0, maxPages)) {
            const records = yield* readTokenPageRecords(manifest, tokenManifest, page);

            ids.push(...records.map((record) => record.id));
          }

          return ids;
        });
      }),
    );

  const readTokenCandidateEntry = (
    manifest: SmartSuggestOwnedDataArtifactManifest,
    token: string,
  ): SmartSuggestStorageEffect<SmartSuggestOwnedDataArtifactTokenBucketEntry | undefined> =>
    readBucketedTokenCandidateEntry(manifest, token).pipe(
      Effect.flatMap((entry) =>
        entry === undefined
          ? readLegacyTokenCandidateIds(manifest, token).pipe(
              Effect.map((recordIds) =>
                recordIds === undefined
                  ? undefined
                  : {
                      recordCount: recordIds.length,
                      recordIds,
                    },
              ),
            )
          : Effect.succeed(entry),
      ),
    );

  const searchArtifactAddressRecords = ({
    countryCode,
    kind = "address",
    limit = 10,
    query,
  }: {
    countryCode?: SmartSuggestCountryCode;
    kind?: "address" | "place" | "postal";
    limit?: number;
    query: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* searchArtifactAddressRecordsProgram() {
      const manifest = yield* readCompleteManifest();

      if (!matchesArtifactCountry(manifest, countryCode)) {
        return [];
      }

      const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));

      if (kind === "place") {
        const queryPrefix = artifactFirstTokenPrefixForQuery(query, 64);
        const prefix = artifactFirstTokenPrefixForQuery(
          query,
          manifest.indexes.localityCities.maxPrefixLength ?? 64,
        );

      if (prefix.length === 0) {
        return [];
      }

    if (prefix.length === 1) {
      const path = renderArtifactPath(manifest.indexes.localityCities.pathTemplate, {
        countryCode: manifest.dataset.countryCode,
        prefix,
      });
      const records = yield* readRecordShardPrefix(manifest, path, 128);
      const matchedRecords = records.filter((record) =>
        localityRecordMatchesQueryPrefix(queryPrefix, record),
      );

        if (matchedRecords.length > 0) {
          return rankLocalityCityRecords(normalizedLimit, matchedRecords);
        }
      }

      for (const candidatePrefix of artifactPrefixCandidates(prefix)) {
        const path = renderArtifactPath(manifest.indexes.localityCities.pathTemplate, {
          countryCode: manifest.dataset.countryCode,
            prefix: candidatePrefix,
          });
          const records = yield* readRecordShard(manifest, path);
          const matchedRecords = records.filter((record) =>
            localityRecordMatchesQueryPrefix(queryPrefix, record),
          );

          if (matchedRecords.length > 0) {
            return rankLocalityCityRecords(normalizedLimit, matchedRecords);
          }
        }

        return [];
      }

      if (kind === "postal") {
        const prefix = normalizePostalCodeDigits(query).slice(0, 5);

        if (prefix.length === 0) {
          return [];
        }

        for (const candidatePrefix of artifactPrefixCandidates(prefix)) {
          const path = renderArtifactPath(manifest.indexes.postalPrefixes.pathTemplate, {
            countryCode: manifest.dataset.countryCode,
            prefix: candidatePrefix,
          });
          const records = yield* readRecordShard(manifest, path);
          const rankedRecords = rankPostalPrefixRecords(prefix, normalizedLimit, records);

          if (rankedRecords.length > 0) {
            return rankedRecords;
          }
        }

        return [];
      }

      if (!hasAddressSearchPrefixToken(query)) {
        return [];
      }

      const tokens = artifactTokensForQuery(query, manifest.indexes.addressTokens);

      if (tokens.length === 0) {
        return [];
      }

    const collectedRecords = new Map<string, AddressRecord>();
    const candidateLimit = Math.max(normalizedLimit * 20, 50);
    const sparseTokenEntries: {
      readonly entry: SmartSuggestOwnedDataArtifactTokenBucketEntry;
      readonly token: string;
    }[] = [];
    const sparseSequenceTokenEntries: {
      readonly entry: SmartSuggestOwnedDataArtifactTokenBucketEntry;
      readonly token: string;
    }[] = [];

    for (const token of tokens) {
      const entry = yield* readTokenCandidateEntry(manifest, token);

      if (entry === undefined || entry.recordIds.length === 0) {
        continue;
      }

      if (entry.records !== undefined && entry.records.length > 0) {
        for (const record of entry.records.map(toArtifactAddressRecord)) {
          if (collectedRecords.size >= candidateLimit && !collectedRecords.has(record.id)) {
            break;
          }

          collectedRecords.set(record.id, record);
        }

        if (collectedRecords.size >= candidateLimit) {
          break;
        }

        continue;
      }

      if (entry.recordIds.length <= artifactRecordIdFanoutLimit(token)) {
        if (token.includes(" ")) {
          sparseSequenceTokenEntries.push({ entry, token });
        } else {
          sparseTokenEntries.push({ entry, token });
        }
      }
    }

    for (const { entry, token } of sparseSequenceTokenEntries) {
      const records = yield* readAddressRecordsById(
        manifest,
        artifactRecordIdsForLookup(token, entry.recordIds, candidateLimit),
      );

      for (const record of records) {
        if (collectedRecords.size >= candidateLimit && !collectedRecords.has(record.id)) {
          break;
        }

        collectedRecords.set(record.id, record);
      }

      if (collectedRecords.size >= candidateLimit) {
        break;
      }
    }

    if (collectedRecords.size > 0) {
      return mergeRankedAddressRecords(query, normalizedLimit, [...collectedRecords.values()]);
    }

    for (const { entry, token } of sparseTokenEntries) {
      const records = yield* readAddressRecordsById(
      manifest,
      artifactRecordIdsForLookup(token, entry.recordIds, candidateLimit),
    );

    for (const record of records) {
      if (collectedRecords.size >= candidateLimit && !collectedRecords.has(record.id)) {
        break;
      }

      collectedRecords.set(record.id, record);
    }

    if (collectedRecords.size >= candidateLimit) {
      break;
    }
  }

    return mergeRankedAddressRecords(query, normalizedLimit, [...collectedRecords.values()]);
  });

  const listArtifactPostalLocalityAddressRecords = (input: {
    countryCode?: SmartSuggestCountryCode;
    postalCode: string;
  }): SmartSuggestStorageEffect<readonly AddressRecord[]> =>
    Effect.gen(function* listArtifactPostalLocalityAddressRecordsProgram() {
      const manifest = yield* readCompleteManifest();

      if (!matchesArtifactCountry(manifest, input.countryCode)) {
        return [];
      }

      const postalCode = normalizePostalCodeDigits(input.postalCode);

      if (postalCode.length === 0) {
        return [];
      }

      const path = renderArtifactPath(manifest.indexes.postalLocalities.pathTemplate, {
        countryCode: manifest.dataset.countryCode,
        postalCode,
      });
      const records = yield* readRecordShard(manifest, path);

      return selectPostalLocalityAddressRecords(records, input);
    });

  const fallbackAddressSearch = (
    input: Parameters<SmartSuggestRepositories["addressRecords"]["searchAddressRecords"]>[0],
  ) =>
    readFallbackAddressRecords
      ? fallback.addressRecords.searchAddressRecords(input)
      : Effect.succeed([]);

  const fallbackPostalLocalities = (
    input: Parameters<
      SmartSuggestRepositories["addressRecords"]["listPostalLocalityAddressRecords"]
    >[0],
  ) =>
    readFallbackAddressRecords
      ? fallback.addressRecords.listPostalLocalityAddressRecords(input)
      : Effect.succeed([]);

  const artifactDataSource = (
    sourceId: string,
  ): SmartSuggestStorageEffect<DataSourceRecord | undefined> =>
    readCompleteManifest().pipe(
      Effect.map((manifest) =>
        manifest.dataset.source.id === sourceId
          ? toArtifactDataSourceRecord(manifest.dataset.source)
          : undefined,
      ),
      Effect.catch(() => Effect.succeed(undefined)),
    );

  const artifactImportRuns = (): SmartSuggestStorageEffect<readonly ImportRunRecord[]> =>
    readCompleteManifest().pipe(
      Effect.map((manifest) => [toArtifactImportRunRecord(manifest.dataset.importRun)]),
      Effect.catch(() => Effect.succeed([])),
    );

  const artifactShardMetadata = (): SmartSuggestStorageEffect<
    readonly SmartSuggestShardMetadataRecord[]
  > =>
    readCompleteManifest().pipe(
      Effect.map((manifest) => manifest.shards.map(toArtifactShardMetadataRecord)),
      Effect.catch(() => Effect.succeed([])),
    );

  return {
    ...fallback,
    addressRecords: {
      ...fallback.addressRecords,
      listPostalLocalityAddressRecords: (input) =>
        Effect.gen(function* listPostalLocalityAddressRecordsProgram() {
          const [artifactRecords, fallbackRecords] = yield* Effect.all([
            listArtifactPostalLocalityAddressRecords(input).pipe(
              Effect.catch(() => Effect.succeed([])),
            ),
            fallbackPostalLocalities(input),
          ]);

          return selectPostalLocalityAddressRecords(
            mergeUniqueAddressRecords([...artifactRecords, ...fallbackRecords]),
            input,
          );
        }),
      searchAddressRecords: (input) =>
        Effect.gen(function* searchAddressRecordsProgram() {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(input.limit ?? 10), 50));
          const [artifactRecords, fallbackRecords] = yield* Effect.all([
            searchArtifactAddressRecords(input).pipe(Effect.catch(() => Effect.succeed([]))),
            fallbackAddressSearch(input),
          ]);
          const records = mergeUniqueAddressRecords([...artifactRecords, ...fallbackRecords]);

          if (input.kind === "place") {
            return rankLocalityCityRecords(normalizedLimit, records);
          }

          if (input.kind === "postal") {
            const postalPrefix = normalizePostalCodeDigits(input.query).slice(0, 5);

            return postalPrefix.length === 0
              ? []
              : rankPostalPrefixRecords(postalPrefix, normalizedLimit, records);
          }

          const rankedRecords = mergeRankedAddressRecords(input.query, normalizedLimit, records);

          return rankedRecords.length > 0 ? rankedRecords : records.slice(0, normalizedLimit);
        }),
    },
    dataSources: {
      ...fallback.dataSources,
      getDataSource: (sourceId) =>
        Effect.gen(function* getDataSourceProgram() {
          const source = yield* artifactDataSource(sourceId);

          return source ?? (yield* fallback.dataSources.getDataSource(sourceId));
        }),
    },
    health: {
      check: () =>
        Effect.gen(function* artifactHealthProgram() {
          const checkedAt = nowIso();
          const manifestExit = yield* Effect.exit(readCompleteManifest());

          if (Exit.isFailure(manifestExit)) {
            const error = Cause.squash(manifestExit.cause);

            return {
              checkedAt,
              error:
                error instanceof Error
                  ? sanitizeStorageErrorMessage(error)
                  : "Smart Suggest owned-data artifact manifest check failed.",
              ok: false,
            };
          }

          const fallbackHealth = yield* fallback.health
            .check()
            .pipe(Effect.catch(() => Effect.succeed({ checkedAt, ok: true })));

          return fallbackHealth.ok ? { checkedAt: nowIso(), ok: true } : fallbackHealth;
        }),
    },
    importRuns: {
      ...fallback.importRuns,
      findLatestCompletedImportRun: (input) =>
        Effect.gen(function* findLatestCompletedImportRunProgram() {
          const [artifactRun] = yield* artifactImportRuns();

          if (
            artifactRun !== undefined &&
            artifactRun.status === "completed" &&
            artifactRun.sourceId === input.sourceId &&
            artifactRun.shardCountryCode === input.shardCountryCode &&
            artifactRun.importKind !== undefined &&
            input.importKinds.includes(artifactRun.importKind)
          ) {
            return artifactRun;
          }

          return yield* fallback.importRuns.findLatestCompletedImportRun(input);
        }),
      listRecentImportRuns: (limit = 10) =>
        Effect.gen(function* listRecentImportRunsProgram() {
          const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 50));
          const [artifactRuns, fallbackRuns] = yield* Effect.all([
            artifactImportRuns(),
            fallback.importRuns.listRecentImportRuns(normalizedLimit),
          ]);

          return [...artifactRuns, ...fallbackRuns]
            .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))
            .slice(0, normalizedLimit);
        }),
    },
    shardRegistry: {
      ...fallback.shardRegistry,
      listShardMetadata: (input = {}) =>
        Effect.gen(function* listShardMetadataProgram() {
          const [artifactShards, fallbackShards] = yield* Effect.all([
            artifactShardMetadata(),
            fallback.shardRegistry.listShardMetadata(input),
          ]);

          return [...artifactShards, ...fallbackShards].filter((record) => {
            if (input.countryCode !== undefined && record.countryCode !== input.countryCode) {
              return false;
            }

            return input.state === undefined || record.state === input.state;
          });
        }),
      resolveShardMetadata: (input) =>
        Effect.gen(function* resolveShardMetadataProgram() {
          const [artifactShards, fallbackShards] = yield* Effect.all([
            artifactShardMetadata(),
            fallback.shardRegistry.resolveShardMetadata(input),
          ]);

          return resolveShardMetadataMatches([...artifactShards, ...fallbackShards], input);
        }),
    },
  };
};
