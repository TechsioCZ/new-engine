import type {
  SmartSuggestCountryCode,
  SuggestionAttribution,
  SuggestionSourceKind,
} from '@techsio/smart-suggest-core';
import { Schema } from 'effect';

export type SmartSuggestCatalogSourceKind = Exclude<SuggestionSourceKind, 'cache'>;

export type SmartSuggestSourceLicenseStatus =
  | 'confirmed'
  | 'deployment-approved'
  | 'endpoint-terms-unverified'
  | 'not-production-allowed'
  | 'pending-confirmation'
  | 'source-dependent';

export type SmartSuggestSourceStatus =
  | 'allowed'
  | 'blocked'
  | 'deployment-approved'
  | 'pending'
  | 'terms-unverified'
  | 'transient-only'
  | 'ttl-cache-only';

export type SmartSuggestSourceAttribution = SuggestionAttribution & {
  licenseStatus: SmartSuggestSourceLicenseStatus;
  modificationNoticeRequired: boolean;
  notes: readonly string[];
  required: boolean;
};

export type SmartSuggestSourceCountryCoverage =
  | {
      countryCodes: readonly SmartSuggestCountryCode[];
      kind: 'countries';
      notes: readonly string[];
    }
  | {
      kind: 'global';
      notes: readonly string[];
    }
  | {
      kind: 'source-dependent';
      notes: readonly string[];
    };

export type SmartSuggestSourceCachePolicy =
  | {
      kind: 'conditional-ttl';
      maxTtlDays: number;
      notes: readonly string[];
      requires: readonly string[];
    }
  | {
      kind: 'none';
      notes: readonly string[];
    }
  | {
      kind: 'pending-license';
      notes: readonly string[];
    }
  | {
      kind: 'per-source';
      notes: readonly string[];
    }
  | {
      kind: 'permanent';
      notes: readonly string[];
    }
  | {
      kind: 'ttl';
      maxTtlDays: number;
      notes: readonly string[];
    };

export type SmartSuggestSourcePermission =
  | {
      allowed: false;
      notes: readonly string[];
      reason: string;
    }
  | {
      allowed: true;
      notes: readonly string[];
    };

export type SmartSuggestSourceRefreshRequirement = {
  cadence:
    | 'endpoint-terms'
    | 'monthly'
    | 'none'
    | 'pending-license'
    | 'per-source'
    | 'provider-cache-headers';
  discovery:
    | 'atom'
    | 'endpoint-terms'
    | 'manual'
    | 'none'
    | 'per-source-policy'
    | 'provider-cache-headers';
  notes: readonly string[];
  required: boolean;
};

export type SmartSuggestSourcePolicy = {
  attribution: SmartSuggestSourceAttribution;
  bulkImport: SmartSuggestSourcePermission;
  cachePolicy: SmartSuggestSourceCachePolicy;
  countryCoverage: SmartSuggestSourceCountryCoverage;
  durableRetention: SmartSuggestSourcePermission;
  id: string;
  name: string;
  notes: readonly string[];
  refresh: SmartSuggestSourceRefreshRequirement;
  sourceKind: SmartSuggestCatalogSourceKind;
  status: SmartSuggestSourceStatus;
};

export const SMART_SUGGEST_SOURCE_CATALOG = {
  'ruian-cz': {
    attribution: {
      label: 'CUZK RUIAN',
      license: 'CC BY 4.0',
      licenseStatus: 'confirmed',
      modificationNoticeRequired: true,
      notes: ['Show CUZK/RUIAN attribution and note Smart Suggest modifications.'],
      required: true,
      url: 'https://ruian.cuzk.cz/',
    },
    bulkImport: {
      allowed: true,
      notes: ['Bulk import is allowed from Atom-discovered RUIAN exchange snapshots.'],
    },
    cachePolicy: {
      kind: 'permanent',
      notes: ['Owned authoritative dataset may be cached permanently.'],
    },
    countryCoverage: {
      countryCodes: ['CZ'],
      kind: 'countries',
      notes: ['Czech Republic authoritative address dataset.'],
    },
    durableRetention: {
      allowed: true,
      notes: ['Permanent address records and offline indexes are allowed.'],
    },
    id: 'ruian-cz',
    name: 'RUIAN Czech Republic',
    notes: ['Discover the current ZIP through Atom; do not hardcode dated ZIP URLs.'],
    refresh: {
      cadence: 'monthly',
      discovery: 'atom',
      notes: ['Monthly refresh is required and Atom discovery is required.'],
      required: true,
    },
    sourceKind: 'owned-dataset',
    status: 'allowed',
  },
  'register-adries-sk': {
    attribution: {
      label: 'Register adries SK',
      licenseStatus: 'pending-confirmation',
      modificationNoticeRequired: false,
      notes: ['Official Slovakia address register attribution and license are not confirmed.'],
      required: true,
      url: 'https://www.geoportal.sk/sk/udaje/registre/register-adries/',
    },
    bulkImport: {
      allowed: false,
      notes: ['Promising owned dataset candidate, but production import is blocked for now.'],
      reason: 'License and attribution terms must be confirmed before production import.',
    },
    cachePolicy: {
      kind: 'pending-license',
      notes: ['Permanent cache is only allowed after license confirmation.'],
    },
    countryCoverage: {
      countryCodes: ['SK'],
      kind: 'countries',
      notes: ['Slovakia candidate authoritative address register.'],
    },
    durableRetention: {
      allowed: false,
      notes: ['Do not retain production records until the license is confirmed.'],
      reason: 'License confirmation is pending.',
    },
    id: 'register-adries-sk',
    name: 'Register adries Slovakia',
    notes: ['Keep this source pending; do not enable permanent production import yet.'],
    refresh: {
      cadence: 'pending-license',
      discovery: 'manual',
      notes: ['Refresh cadence must be decided with the confirmed license terms.'],
      required: true,
    },
    sourceKind: 'owned-dataset',
    status: 'pending',
  },
  openaddresses: {
    attribution: {
      label: 'OpenAddresses',
      licenseStatus: 'source-dependent',
      modificationNoticeRequired: false,
      notes: ['OpenAddresses attribution and license must be resolved per source config.'],
      required: true,
      url: 'https://openaddresses.io/',
    },
    bulkImport: {
      allowed: false,
      notes: ['A per-source catalog entry must approve import before production use.'],
      reason: 'OpenAddresses is an aggregator and has no blanket permanent import policy.',
    },
    cachePolicy: {
      kind: 'per-source',
      notes: ['Never treat OpenAddresses as one blanket permanent cache source.'],
    },
    countryCoverage: {
      kind: 'source-dependent',
      notes: ['Coverage and terms are source-config dependent.'],
    },
    durableRetention: {
      allowed: false,
      notes: ['Blanket durable retention is blocked until a child source policy permits it.'],
      reason: 'Each OpenAddresses source has its own license and attribution requirements.',
    },
    id: 'openaddresses',
    name: 'OpenAddresses blanket source',
    notes: ['Represent approved OpenAddresses imports as per-source child policies.'],
    refresh: {
      cadence: 'per-source',
      discovery: 'per-source-policy',
      notes: ['Refresh requirements must come from each approved OpenAddresses source.'],
      required: true,
    },
    sourceKind: 'owned-dataset',
    status: 'pending',
  },
  'mapy-cz': {
    attribution: {
      label: 'Mapy.com / Mapy.cz',
      licenseStatus: 'deployment-approved',
      modificationNoticeRequired: false,
      notes: [
        'Mapy attribution is required near Mapy-powered results.',
        'Durable retention is allowed only when this source policy is enabled for the deployment.',
      ],
      required: true,
      url: 'https://developer.mapy.com/',
    },
    bulkImport: {
      allowed: false,
      notes: [
        'Provider-result retention policy does not grant bulk import, offline harvesting, or training use.',
      ],
      reason: 'No separate Mapy bulk-import/backfill permission is recorded.',
    },
    cachePolicy: {
      kind: 'permanent',
      notes: [
        'Permanent cache/storage is represented as an explicit deployment source-policy decision.',
      ],
    },
    countryCoverage: {
      kind: 'source-dependent',
      notes: ['Coverage follows the configured Mapy provider endpoints.'],
    },
    durableRetention: {
      allowed: true,
      notes: [
        'Mapy provider suggestions may be written to durable Smart Suggest address records when this source policy is enabled.',
      ],
    },
    id: 'mapy-cz',
    name: 'Mapy.cz provider policy',
    notes: [
      'Keep source metadata and attribution with retained rows.',
      'Deployments without durable-retention approval must use a separate transient-only policy.',
    ],
    refresh: {
      cadence: 'none',
      discovery: 'none',
      notes: ['Live provider retention has no bulk dataset refresh.'],
      required: false,
    },
    sourceKind: 'live-provider',
    status: 'deployment-approved',
  },
  'radar-autocomplete': {
    attribution: {
      label: 'Radar Autocomplete',
      licenseStatus: 'endpoint-terms-unverified',
      modificationNoticeRequired: false,
      notes: ['Radar attribution is required when Radar data is shown.'],
      required: true,
      url: 'https://radar.com/',
    },
    bulkImport: {
      allowed: false,
      notes: ['Do not import Radar suggestions into the address DB or offline index.'],
      reason: 'Radar is a live provider with TTL cache only.',
    },
    cachePolicy: {
      kind: 'ttl',
      maxTtlDays: 30,
      notes: ['TTL cache only; cap at 30 days.'],
    },
    countryCoverage: {
      kind: 'source-dependent',
      notes: ['Coverage depends on Radar provider configuration.'],
    },
    durableRetention: {
      allowed: false,
      notes: ['Radar suggestions must not become durable address records.'],
      reason: 'Radar is TTL-cache-only and has no durable retention approval.',
    },
    id: 'radar-autocomplete',
    name: 'Radar Autocomplete live provider',
    notes: ['Allowed only as live fallback/enrichment with a max 30 day TTL cache.'],
    refresh: {
      cadence: 'none',
      discovery: 'none',
      notes: ['Cache entries must expire within the approved TTL; no dataset refresh applies.'],
      required: false,
    },
    sourceKind: 'live-provider',
    status: 'ttl-cache-only',
  },
  'here-discover': {
    attribution: {
      label: 'HERE Discover',
      licenseStatus: 'deployment-approved',
      modificationNoticeRequired: false,
      notes: [
        'HERE attribution and supplier notices are required.',
        'Durable retention is allowed only when this source policy is enabled for the deployment.',
      ],
      required: true,
      url: 'https://www.here.com/',
    },
    bulkImport: {
      allowed: false,
      notes: [
        'Provider-result retention policy does not grant bulk import, offline harvesting, or training use.',
      ],
      reason: 'No separate HERE bulk-import/backfill permission is recorded.',
    },
    cachePolicy: {
      kind: 'permanent',
      notes: [
        'Permanent cache/storage is represented as an explicit deployment source-policy decision.',
      ],
    },
    countryCoverage: {
      kind: 'global',
      notes: ['Coverage follows the configured HERE provider endpoints.'],
    },
    durableRetention: {
      allowed: true,
      notes: [
        'HERE provider suggestions may be written to durable Smart Suggest address records when this source policy is enabled.',
      ],
    },
    id: 'here-discover',
    name: 'HERE Discover provider policy',
    notes: [
      'Keep source metadata and attribution with retained rows.',
      'Deployments without durable-retention approval must use a separate no-persistence policy.',
    ],
    refresh: {
      cadence: 'none',
      discovery: 'none',
      notes: ['Live provider retention has no bulk dataset refresh.'],
      required: false,
    },
    sourceKind: 'live-provider',
    status: 'deployment-approved',
  },
  'nominatim-managed': {
    attribution: {
      label: 'OpenStreetMap contributors',
      license: 'ODbL',
      licenseStatus: 'deployment-approved',
      modificationNoticeRequired: true,
      notes: [
        'OSM attribution is required when configured Nominatim data is displayed or retained.',
        'Durable retention is allowed only when this source policy is enabled for the deployment.',
      ],
      required: true,
      url: 'https://nominatim.org/',
    },
    bulkImport: {
      allowed: false,
      notes: [
        'Provider-result retention policy does not grant bulk import, offline harvesting, or training use.',
      ],
      reason: 'No separate Nominatim bulk-import/backfill permission is recorded.',
    },
    cachePolicy: {
      kind: 'permanent',
      notes: [
        'Permanent cache/storage is represented as an explicit deployment source-policy decision for the configured Nominatim provider.',
      ],
    },
    countryCoverage: {
      kind: 'global',
      notes: ['Coverage follows the configured Nominatim endpoint/account.'],
    },
    durableRetention: {
      allowed: true,
      notes: [
        'Configured Nominatim provider suggestions may be written to durable Smart Suggest address records when this source policy is enabled.',
      ],
    },
    id: 'nominatim-managed',
    name: 'Managed Nominatim provider policy',
    notes: [
      'This is intentionally separate from the public Nominatim service policy.',
      'Deployments without durable-retention approval must use `nominatim-public`, which remains blocked.',
    ],
    refresh: {
      cadence: 'none',
      discovery: 'none',
      notes: ['Live provider retention has no bulk dataset refresh.'],
      required: false,
    },
    sourceKind: 'live-provider',
    status: 'deployment-approved',
  },
  'nominatim-public': {
    attribution: {
      label: 'OpenStreetMap contributors',
      license: 'ODbL',
      licenseStatus: 'not-production-allowed',
      modificationNoticeRequired: false,
      notes: [
        'Public Nominatim is not approved for Smart Suggest autocomplete or production fallback.',
      ],
      required: true,
      url: 'https://operations.osmfoundation.org/policies/nominatim/',
    },
    bulkImport: {
      allowed: false,
      notes: ['Do not use the public Nominatim service for bulk import or index building.'],
      reason: 'Public Nominatim is not allowed for autocomplete or production fallback.',
    },
    cachePolicy: {
      kind: 'none',
      notes: ['No cache is approved for the public Nominatim service.'],
    },
    countryCoverage: {
      kind: 'global',
      notes: ['Public service coverage is irrelevant because the source is blocked for this use.'],
    },
    durableRetention: {
      allowed: false,
      notes: ['Do not retain public Nominatim responses as durable records.'],
      reason: 'Public Nominatim is not allowed for this production autocomplete path.',
    },
    id: 'nominatim-public',
    name: 'Public Nominatim service',
    notes: ['Exclude from autocomplete and production provider fallback priority.'],
    refresh: {
      cadence: 'none',
      discovery: 'none',
      notes: ['Blocked live service; no dataset refresh applies.'],
      required: false,
    },
    sourceKind: 'live-provider',
    status: 'blocked',
  },
  'ruian-geocode': {
    attribution: {
      label: 'CUZK RUIAN geocode',
      licenseStatus: 'endpoint-terms-unverified',
      modificationNoticeRequired: true,
      notes: ['Verify endpoint-specific terms before retaining live geocoder results.'],
      required: true,
      url: 'https://ruian.cuzk.cz/',
    },
    bulkImport: {
      allowed: false,
      notes: ['Prefer the owned RUIAN bulk import path instead of live geocoder retention.'],
      reason: 'Live endpoint-specific persistence terms are not verified.',
    },
    cachePolicy: {
      kind: 'none',
      notes: ['No cache until endpoint-specific terms are verified.'],
    },
    countryCoverage: {
      countryCodes: ['CZ'],
      kind: 'countries',
      notes: ['Czech Republic live geocode helper.'],
    },
    durableRetention: {
      allowed: false,
      notes: ['Do not persist live geocoder results until endpoint terms are verified.'],
      reason: 'Endpoint-specific retention terms are unverified.',
    },
    id: 'ruian-geocode',
    name: 'RUIAN live geocode provider',
    notes: [
      'Prefer bulk RUIAN import; do not let live-provider persistence bypass catalog policy.',
    ],
    refresh: {
      cadence: 'endpoint-terms',
      discovery: 'endpoint-terms',
      notes: ['Endpoint terms must be verified before changing retention policy.'],
      required: true,
    },
    sourceKind: 'live-provider',
    status: 'terms-unverified',
  },
} as const satisfies Record<string, SmartSuggestSourcePolicy>;

export type SmartSuggestSourceId = keyof typeof SMART_SUGGEST_SOURCE_CATALOG;

export const SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES = {
  'here-discover': 'here-discover',
  'mapy-cz': 'mapy-cz',
  nominatim: 'nominatim-managed',
  'radar-autocomplete': 'radar-autocomplete',
  'ruian-geocode': 'ruian-geocode',
} as const satisfies Record<string, SmartSuggestSourceId>;

export type SmartSuggestProviderSourceIdAlias =
  keyof typeof SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES;

export type SmartSuggestSourceWriteTarget = 'bulk-import' | 'durable-retention' | 'permanent-cache';

export type SmartSuggestSourcePolicyReference = SmartSuggestSourcePolicy | string;

export type SmartSuggestTtlCachePolicyContext = {
  deploymentAllowsTtl?: boolean;
};

const SmartSuggestSourceStatusSchema = Schema.Literals([
  'allowed',
  'blocked',
  'deployment-approved',
  'pending',
  'terms-unverified',
  'transient-only',
  'ttl-cache-only',
]);

const SmartSuggestSourceCachePolicyKindSchema = Schema.Literals([
  'conditional-ttl',
  'none',
  'pending-license',
  'per-source',
  'permanent',
  'ttl',
]);

export class SmartSuggestSourcePolicyNotFoundError extends Schema.TaggedErrorClass<SmartSuggestSourcePolicyNotFoundError>()(
  'SmartSuggestSourcePolicyNotFoundError',
  {
    message: Schema.String,
    sourceId: Schema.NonEmptyString,
  },
) {}

export class SmartSuggestPermanentImportPolicyError extends Schema.TaggedErrorClass<SmartSuggestPermanentImportPolicyError>()(
  'SmartSuggestPermanentImportPolicyError',
  {
    cachePolicyKind: SmartSuggestSourceCachePolicyKindSchema,
    message: Schema.String,
    reason: Schema.String,
    sourceId: Schema.NonEmptyString,
    status: SmartSuggestSourceStatusSchema,
  },
) {}

export const SMART_SUGGEST_SOURCE_IDS = Object.keys(
  SMART_SUGGEST_SOURCE_CATALOG,
) as SmartSuggestSourceId[];

export const SMART_SUGGEST_SOURCE_POLICIES: readonly SmartSuggestSourcePolicy[] = Object.values(
  SMART_SUGGEST_SOURCE_CATALOG,
);

export const isSmartSuggestSourceId = (sourceId: string): sourceId is SmartSuggestSourceId =>
  sourceId in SMART_SUGGEST_SOURCE_CATALOG;

export const isSmartSuggestProviderSourceIdAlias = (
  sourceId: string,
): sourceId is SmartSuggestProviderSourceIdAlias =>
  sourceId in SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES;

export const resolveSmartSuggestSourceId = (sourceId: string): SmartSuggestSourceId | undefined => {
  if (isSmartSuggestSourceId(sourceId)) {
    return sourceId;
  }

  if (isSmartSuggestProviderSourceIdAlias(sourceId)) {
    return SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES[sourceId];
  }

  return;
};

export const getSmartSuggestSourcePolicy = (
  sourceId: string,
): SmartSuggestSourcePolicy | undefined => {
  const resolvedSourceId = resolveSmartSuggestSourceId(sourceId);

  if (resolvedSourceId === undefined) {
    return;
  }

  return SMART_SUGGEST_SOURCE_CATALOG[resolvedSourceId];
};

export const requireSmartSuggestSourcePolicy = (sourceId: string): SmartSuggestSourcePolicy => {
  const policy = getSmartSuggestSourcePolicy(sourceId);

  if (policy === undefined) {
    throw new SmartSuggestSourcePolicyNotFoundError({
      message: `Unknown Smart Suggest source policy "${sourceId}".`,
      sourceId,
    });
  }

  return policy;
};

const readSmartSuggestSourcePolicy = (
  source: SmartSuggestSourcePolicyReference,
): SmartSuggestSourcePolicy | undefined =>
  typeof source === 'string' ? getSmartSuggestSourcePolicy(source) : source;

const sourceStatusAllowsPermanentWrite = (policy: SmartSuggestSourcePolicy) =>
  policy.status === 'allowed' || policy.status === 'deployment-approved';

export const smartSuggestSourceAllowsWrite = (
  source: SmartSuggestSourcePolicyReference,
  target: SmartSuggestSourceWriteTarget,
) => {
  const policy = readSmartSuggestSourcePolicy(source);

  if (policy === undefined || !sourceStatusAllowsPermanentWrite(policy)) {
    return false;
  }

  if (target === 'permanent-cache') {
    return policy.cachePolicy.kind === 'permanent';
  }

  if (target === 'durable-retention') {
    return policy.durableRetention.allowed;
  }

  return policy.bulkImport.allowed;
};

export const smartSuggestSourceAllowsPermanentImport = (
  source: SmartSuggestSourcePolicyReference,
) =>
  smartSuggestSourceAllowsWrite(source, 'permanent-cache') &&
  smartSuggestSourceAllowsWrite(source, 'durable-retention') &&
  smartSuggestSourceAllowsWrite(source, 'bulk-import');

export const smartSuggestSourceMaxTtlDays = (
  source: SmartSuggestSourcePolicyReference,
): number | undefined => {
  const policy = readSmartSuggestSourcePolicy(source);

  if (policy?.cachePolicy.kind === 'ttl' || policy?.cachePolicy.kind === 'conditional-ttl') {
    return policy.cachePolicy.maxTtlDays;
  }

  return;
};

export const smartSuggestSourceAllowsTtlCache = (
  source: SmartSuggestSourcePolicyReference,
  ttlDays: number,
  context: SmartSuggestTtlCachePolicyContext = {},
) => {
  const policy = readSmartSuggestSourcePolicy(source);

  if (policy === undefined || !Number.isFinite(ttlDays) || ttlDays <= 0) {
    return false;
  }

  if (policy.cachePolicy.kind === 'ttl') {
    return ttlDays <= policy.cachePolicy.maxTtlDays;
  }

  if (policy.cachePolicy.kind === 'conditional-ttl') {
    return context.deploymentAllowsTtl === true && ttlDays <= policy.cachePolicy.maxTtlDays;
  }

  return false;
};

const explainPermanentSourceWriteBlock = (policy: SmartSuggestSourcePolicy) => {
  if (!sourceStatusAllowsPermanentWrite(policy)) {
    return `source status is "${policy.status}"`;
  }

  if (policy.cachePolicy.kind !== 'permanent') {
    return `cache policy is "${policy.cachePolicy.kind}"`;
  }

  if (!policy.durableRetention.allowed) {
    return policy.durableRetention.reason;
  }

  if (!policy.bulkImport.allowed) {
    return policy.bulkImport.reason;
  }

  return 'permanent import requires allowed status, permanent cache, durable retention, and bulk import';
};

export const assertSmartSuggestSourceAllowsPermanentImport = (
  source: SmartSuggestSourcePolicyReference,
) => {
  const policy = readSmartSuggestSourcePolicy(source);
  const sourceId = typeof source === 'string' ? source : source.id;

  if (policy === undefined) {
    throw new SmartSuggestSourcePolicyNotFoundError({
      message: `Unknown Smart Suggest source policy "${sourceId}".`,
      sourceId,
    });
  }

  if (!smartSuggestSourceAllowsPermanentImport(policy)) {
    const reason = explainPermanentSourceWriteBlock(policy);

    throw new SmartSuggestPermanentImportPolicyError({
      cachePolicyKind: policy.cachePolicy.kind,
      message: `Source "${sourceId}" is not allowed for permanent Smart Suggest source writes: ${reason}.`,
      reason,
      sourceId,
      status: policy.status,
    });
  }
};
