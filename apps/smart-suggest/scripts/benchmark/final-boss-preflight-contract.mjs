export const finalBossApiBaseConfigCheckId = 'api-base-config';

export const finalBossBaseRequiredPreflightCheckIds = Object.freeze([
  finalBossApiBaseConfigCheckId,
  'live-provider-opt-in',
  'owned-active-cz-shards',
  'owned-failed-rows',
  'owned-freshness-age',
  'owned-latest-import-run',
  'owned-row-count',
  'owned-shard-size-guard',
  'owned-source-attribution',
  'owned-source-modification-note',
  'owned-source-provenance-present',
  'owned-suggest-fetch',
  'owned-suggest-owned-source',
  'owned-suggest-top1',
  'owned-suggest-required-results',
  'owned-suggest-provider-events',
  'status-fetch',
  'status-service',
]);

export function finalBossProviderConfigCheckId(providerId) {
  return `${providerId}-provider-config`;
}

export function finalBossRequiredPreflightCheckIds(providerIds, options = {}) {
  const includeProviderConfig = options.includeProviderConfig !== false;

  return [
    ...finalBossBaseRequiredPreflightCheckIds,
    ...(includeProviderConfig ? providerIds.map(finalBossProviderConfigCheckId) : []),
  ];
}
