import { DateTime } from 'effect';
import type { StorageHealth } from '@techsio/smart-suggest-storage';
import { ultramodernApiMarker } from './ultramodern-build';
import type { SmartSuggestHealthResponse } from './api';

interface SmartSuggestHealthRuntimeEnv {
  CF_PAGES_BRANCH?: string;
  MODERNJS_DEPLOY?: string;
  NODE_ENV?: string;
  SMART_SUGGEST_ENVIRONMENT?: string;
}

const normalizeEnvironmentId = (value: string | undefined) => {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '');

  return normalized === undefined || normalized === '' ? undefined : normalized;
};

const resolveHealthEnvironment = (env?: SmartSuggestHealthRuntimeEnv) =>
  normalizeEnvironmentId(env?.SMART_SUGGEST_ENVIRONMENT) ??
  normalizeEnvironmentId(env?.MODERNJS_DEPLOY) ??
  normalizeEnvironmentId(env?.CF_PAGES_BRANCH) ??
  normalizeEnvironmentId(env?.NODE_ENV) ??
  'local';

export const getHealthPayload = (
  storage?: StorageHealth,
  env?: SmartSuggestHealthRuntimeEnv,
): SmartSuggestHealthResponse => ({
  buildId: ultramodernApiMarker.build,
  db: storage ?? {
    checkedAt: DateTime.formatIso(DateTime.nowUnsafe()),
    error: 'D1 binding is not configured for this local shell.',
    ok: false,
  },
  deployProfile: ultramodernApiMarker.deployProfile,
  environment: resolveHealthEnvironment(env),
  service: 'smart-suggest' as const,
  timestamp: DateTime.formatIso(DateTime.nowUnsafe()),
  version: ultramodernApiMarker.version,
});
