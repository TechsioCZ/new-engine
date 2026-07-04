import type { SmartSuggestCountryCode } from '@techsio/smart-suggest-core';
import { rankAddressCandidates } from '@techsio/smart-suggest-indexing';
import type {
  AddressRecord,
  AddressSearchRecordInput,
  AddressTombstoneRecordInput,
  SmartSuggestRepositories,
} from '@techsio/smart-suggest-storage';
import { Effect } from 'effect';

const maxShardSearchFanout = 14;
const shardHashModulus = 2_147_483_647;
const shardAddressNumberPattern = /\d/u;

const hashStringToPositiveInteger = (value: string) => {
  let hash = 0;

  for (const character of value) {
    hash = (Math.imul(hash, 131) + (character.codePointAt(0) ?? 0)) % shardHashModulus;

    if (hash < 0) {
      hash += shardHashModulus;
    }
  }

  return hash;
};

const deterministicShardBindingForRouteKey = (
  routeKey: string,
  shardBindingNames: readonly string[],
) => {
  if (shardBindingNames.length === 0 || shardBindingNames.length > maxShardSearchFanout) {
    return;
  }

  return shardBindingNames[hashStringToPositiveInteger(routeKey) % shardBindingNames.length];
};

const deterministicShardBindingForRecord = (
  record: AddressSearchRecordInput,
  shardBindingNames: readonly string[],
) =>
  deterministicShardBindingForRouteKey(
    record.ruian?.stableAddressId ?? record.ruian?.addressPlaceCode ?? record.id,
    shardBindingNames,
  );

const deterministicShardBindingForTombstone = (
  tombstone: AddressTombstoneRecordInput,
  shardBindingNames: readonly string[],
) =>
  deterministicShardBindingForRouteKey(
    tombstone.ruian?.stableAddressId ?? tombstone.ruian?.addressPlaceCode ?? tombstone.id,
    shardBindingNames,
  );

const extractPostalRouteHint = (query: string) => {
  const match = /\b\d{3}\s?\d{2}\b/u.exec(query);

  return match?.[0];
};

const isStrongShardSearchQuery = (query: string) =>
  shardAddressNumberPattern.test(query) || extractPostalRouteHint(query) !== undefined;

const activeShardCandidatesForFanout = (
  router: SmartSuggestRepositories,
  input: {
    countryCode?: SmartSuggestCountryCode;
  },
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* activeShardCandidatesForFanoutProgram() {
    const listInput: Parameters<typeof router.shardRegistry.listShardMetadata>[0] =
      input.countryCode === undefined
        ? { state: 'active' }
        : { countryCode: input.countryCode, state: 'active' };
    const listed = yield* router.shardRegistry.listShardMetadata(listInput);
    const activeCandidates = listed.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );

    return activeCandidates.length > 0
      ? activeCandidates
      : shardBindingNames.map((bindingName) => ({ bindingName }));
  });

export const boundedShardCandidates = (
  router: SmartSuggestRepositories,
  input: {
    countryCode?: SmartSuggestCountryCode;
    query: string;
  },
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* boundedShardCandidatesProgram() {
    if (input.countryCode === undefined) {
      return isStrongShardSearchQuery(input.query)
        ? yield* activeShardCandidatesForFanout(router, input, shardBindingNames)
        : [];
    }

    const routeInput: Parameters<typeof router.shardRegistry.resolveShardMetadata>[0] = {
      countryCode: input.countryCode,
      states: ['active'],
    };
    const postalCode = extractPostalRouteHint(input.query);

    if (postalCode !== undefined) {
      routeInput.postalCode = postalCode;
    }

    const routed = yield* router.shardRegistry.resolveShardMetadata(routeInput);

    if (routed.length > 0) {
      return routed;
    }

    if (shardBindingNames.length > maxShardSearchFanout) {
      return isStrongShardSearchQuery(input.query)
        ? yield* activeShardCandidatesForFanout(router, input, shardBindingNames)
        : [];
    }

    return yield* router.shardRegistry.listShardMetadata({
      countryCode: input.countryCode,
      state: 'active',
    });
  });

export const shardCandidatesForAddressRecord = (
  router: SmartSuggestRepositories,
  record: AddressSearchRecordInput,
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* shardCandidatesForAddressRecordProgram() {
    const routeInput: Parameters<typeof router.shardRegistry.resolveShardMetadata>[0] = {
      countryCode: record.countryCode,
      states: ['active'],
    };
    const postalCode = record.parts.postalCode ?? record.ruian?.postalCode;
    const municipalityHint = record.parts.city;

    if (postalCode !== undefined) {
      routeInput.postalCode = postalCode;
    }
    if (municipalityHint !== undefined) {
      routeInput.municipalityHint = municipalityHint;
    }
    if (record.ruian?.regionCode !== undefined) {
      routeInput.regionCode = record.ruian.regionCode;
    }
    if (record.ruian?.municipalityCode !== undefined) {
      routeInput.municipalityCode = record.ruian.municipalityCode;
    }

    const activeCandidates = yield* router.shardRegistry.resolveShardMetadata(routeInput);
    const routedCandidates = activeCandidates.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );

    if (routedCandidates.length > 0) {
      return routedCandidates;
    }

    const fallbackBindingName = deterministicShardBindingForRecord(record, shardBindingNames);

    return fallbackBindingName === undefined ? [] : [{ bindingName: fallbackBindingName }];
  });

export const shardCandidatesForAddressTombstone = (
  router: SmartSuggestRepositories,
  tombstone: AddressTombstoneRecordInput,
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* shardCandidatesForAddressTombstoneProgram() {
    const routeInput: Parameters<typeof router.shardRegistry.resolveShardMetadata>[0] = {
      countryCode: tombstone.countryCode,
      states: ['active'],
    };

    if (tombstone.ruian?.postalCode !== undefined) {
      routeInput.postalCode = tombstone.ruian.postalCode;
    }
    if (tombstone.ruian?.regionCode !== undefined) {
      routeInput.regionCode = tombstone.ruian.regionCode;
    }
    if (tombstone.ruian?.municipalityCode !== undefined) {
      routeInput.municipalityCode = tombstone.ruian.municipalityCode;
    }

    const activeCandidates = yield* router.shardRegistry.resolveShardMetadata(routeInput);
    const routedCandidates = activeCandidates.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );

    if (routedCandidates.length > 0) {
      return routedCandidates;
    }

    const fallbackBindingName = deterministicShardBindingForTombstone(tombstone, shardBindingNames);

    return fallbackBindingName === undefined ? [] : [{ bindingName: fallbackBindingName }];
  });

export const uniqueShardMetadataByBindingName = <
  T extends {
    bindingName: string;
  },
>(
  candidates: readonly T[],
) => {
  const unique = new Map<string, T>();

  for (const candidate of candidates) {
    if (!unique.has(candidate.bindingName)) {
      unique.set(candidate.bindingName, candidate);
    }
  }

  return [...unique.values()];
};

type RankedShardAddressRecordCandidate = AddressRecord & {
  confidence: number;
};

export const rankShardAddressRecordResults = (
  query: string,
  records: readonly AddressRecord[],
  limit: number,
): AddressRecord[] => {
  const byRecordId = new Map<string, AddressRecord>();

  for (const record of records) {
    byRecordId.set(record.id, record);
  }

  const candidates: RankedShardAddressRecordCandidate[] = [...byRecordId.values()].map(
    (record) => ({
      ...record,
      confidence: record.quality,
    }),
  );

  return rankAddressCandidates(query, candidates, { limit }).map(({ candidate }) => {
    const { confidence: _confidence, ...record } = candidate;

    return byRecordId.get(record.id) ?? record;
  });
};
