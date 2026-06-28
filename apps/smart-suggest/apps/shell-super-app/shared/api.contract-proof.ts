import type {
  SmartSuggestAcceptEvent as CoreSmartSuggestAcceptEvent,
  SmartSuggestResponse as CoreSmartSuggestResponse,
} from '@techsio/smart-suggest-core';
import type {
  PhoneValidationRequest as ValidationPhoneValidationRequest,
  PhoneValidationResult as ValidationPhoneValidationResult,
  PostalValidationRequest as ValidationPostalValidationRequest,
  PostalValidationResult as ValidationPostalValidationResult,
} from '@techsio/smart-suggest-validation';
import { Schema } from 'effect';
import type {
  PhoneValidationRequest,
  PhoneValidationResult,
  PostalValidationRequest,
  PostalValidationResult,
  SmartSuggestAcceptEvent,
  SmartSuggestResponse,
  SmartSuggestStatusResponse,
} from './api';
import {
  PhoneValidationRequestSchema,
  PhoneValidationResultSchema,
  PostalValidationRequestSchema,
  PostalValidationResultSchema,
  SmartSuggestAcceptEventSchema,
  SmartSuggestBadRequestErrorBodySchema,
  SmartSuggestInternalErrorBodySchema,
  SmartSuggestQuerySchema,
  SmartSuggestResponseSchema,
  SmartSuggestStatusResponseSchema,
} from './api';

type AssertAssignable<_T extends U, U> = true;

type SmartSuggestAcceptedTelemetryRecord = SmartSuggestAcceptEvent & {
  acceptedAt: string;
};

export type SmartSuggestAcceptEventContractProof = AssertAssignable<
  SmartSuggestAcceptedTelemetryRecord,
  CoreSmartSuggestAcceptEvent
>;
export type SmartSuggestPhoneRequestContractProof = AssertAssignable<
  PhoneValidationRequest,
  ValidationPhoneValidationRequest
>;
export type SmartSuggestPhoneResultContractProof = AssertAssignable<
  PhoneValidationResult,
  ValidationPhoneValidationResult
>;
export type SmartSuggestPostalRequestContractProof = AssertAssignable<
  PostalValidationRequest,
  ValidationPostalValidationRequest
>;
export type SmartSuggestPostalResultContractProof = AssertAssignable<
  PostalValidationResult,
  ValidationPostalValidationResult
>;
export type SmartSuggestResponseContractProof = AssertAssignable<
  SmartSuggestResponse,
  CoreSmartSuggestResponse
>;

export type SmartSuggestContractTypeProof = readonly [
  SmartSuggestAcceptEventContractProof,
  SmartSuggestPhoneRequestContractProof,
  SmartSuggestPhoneResultContractProof,
  SmartSuggestPostalRequestContractProof,
  SmartSuggestPostalResultContractProof,
  SmartSuggestResponseContractProof,
];

export const smartSuggestContractProofDecoders = {
  acceptEvent: Schema.decodeUnknownOption(SmartSuggestAcceptEventSchema),
  badRequestError: Schema.decodeUnknownOption(SmartSuggestBadRequestErrorBodySchema),
  internalError: Schema.decodeUnknownOption(SmartSuggestInternalErrorBodySchema),
  phoneRequest: Schema.decodeUnknownOption(PhoneValidationRequestSchema),
  phoneResult: Schema.decodeUnknownOption(PhoneValidationResultSchema),
  postalRequest: Schema.decodeUnknownOption(PostalValidationRequestSchema),
  postalResult: Schema.decodeUnknownOption(PostalValidationResultSchema),
  statusResponse: Schema.decodeUnknownOption(SmartSuggestStatusResponseSchema),
  suggestQuery: Schema.decodeUnknownOption(SmartSuggestQuerySchema),
  suggestResponse: Schema.decodeUnknownOption(SmartSuggestResponseSchema),
} as const;

export const smartSuggestContractValidProtocolFixtures = {
  acceptEvent: {
    acceptedAt: '2026-06-28T12:00:00.000Z',
    requestId: 'request-1',
    source: {
      id: 'ruian-cz',
      kind: 'owned-dataset',
      name: 'RUIAN CZ',
    },
    suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
    tenant: {
      cartId: 'cart-1',
      salesChannelId: 'channel-web',
      sessionId: 'session-1',
      tenantId: 'tenant-1',
    },
  } satisfies typeof SmartSuggestAcceptEventSchema.Type,
  badRequestError: {
    errors: [
      {
        code: 'bad-request',
        field: 'q',
        message: 'Expected q or query.',
      },
    ],
    message: 'Expected q or query.',
  } satisfies typeof SmartSuggestBadRequestErrorBodySchema.Type,
  internalError: {
    errors: [
      {
        code: 'internal-error',
        message: 'Smart Suggest request failed.',
        retryable: true,
      },
    ],
    message: 'Smart Suggest request failed.',
  } satisfies typeof SmartSuggestInternalErrorBodySchema.Type,
  phoneRequest: {
    allowedCountries: ['CZ', 'SK'],
    defaultCountry: 'CZ',
    rawInput: '+420777123456',
    requireCountryMatch: true,
    requireMobile: true,
  } satisfies typeof PhoneValidationRequestSchema.Type,
  phoneResult: {
    callingCode: '420',
    detectedCountry: 'CZ',
    displayValue: '+420 777 123 456',
    e164: '+420777123456',
    errors: [],
    isPossible: true,
    isValid: true,
    nationalNumber: '777123456',
    rawInput: '+420777123456',
    type: 'MOBILE',
  } satisfies typeof PhoneValidationResultSchema.Type,
  postalRequest: {
    countryCode: 'CZ',
    rawInput: '12345',
  } satisfies typeof PostalValidationRequestSchema.Type,
  postalResult: {
    countryCode: 'CZ',
    displayValue: '123 45',
    errors: [],
    inputHints: {
      autoComplete: 'postal-code',
      inputMode: 'numeric',
    },
    isValid: true,
    normalizedValue: '12345',
    rawInput: '12345',
  } satisfies typeof PostalValidationResultSchema.Type,
  statusResponse: {
    db: {
      checkedAt: '2026-06-28T12:00:00.000Z',
      ok: true,
    },
    imports: {
      freshness: {
        rowCounts: {
          failedRows: 0,
          skippedRows: 0,
          tombstonedRows: 0,
          totalRows: 1,
          upsertedRows: 1,
        },
        sla: {
          maxDeltaAgeHours: 48,
          measuredAt: '2026-06-28T12:00:00.000Z',
          status: 'fresh',
        },
      },
      recentRuns: [],
    },
    metrics: {
      accept: { total: 0 },
      providerEvents: {
        error: 0,
        skipped: 0,
        success: 0,
        timeout: 0,
      },
      suggest: {
        averageLatencyMs: 0,
        cacheHitRate: 0,
        cacheStatus: {
          disabled: 0,
          hit: 0,
          miss: 0,
          stale: 0,
          written: 0,
        },
        errors: 0,
        ownedSuccess: 0,
        providerFallback: 0,
        total: 0,
      },
    },
    service: 'smart-suggest',
    shards: {
      activeCount: 0,
      disabledCount: 0,
      maxEstimatedSizeBytes: 0,
      maxPhysicalShardEstimatedSizeBytes: 0,
      physicalShardCount: 0,
      rowCount: 0,
      shards: [],
      sizeGuard: {
        blockBytes: 6_000_000_000,
        status: 'ok',
        warnBytes: 5_000_000_000,
      },
      standbyCount: 0,
      totalCount: 0,
    },
    sourcePolicy: {
      providerSources: {
        durableRetentionAllowed: ['here-discover'],
        noDurableRetention: ['radar-autocomplete'],
        permanentCacheAllowed: ['here-discover'],
        ttlCacheOnly: [{ maxTtlDays: 30, sourceId: 'radar-autocomplete' }],
      },
      rawQueryStorage: 'disabled',
    },
    sourceProvenance: {
      authoritativeSources: [
        {
          modificationNoteSha256Present: true,
          present: true,
          sourceId: 'ruian-cz',
          sourceKind: 'owned-dataset',
        },
      ],
    },
    timestamp: '2026-06-28T12:00:00.000Z',
  } satisfies SmartSuggestStatusResponse,
  suggestQueryByLongAlias: {
    countryCode: 'CZ',
    kind: 'address',
    limit: 5,
    query: 'Vaclavske namesti',
    tenantId: 'tenant-1',
  } satisfies typeof SmartSuggestQuerySchema.Type,
  suggestQueryByShortAlias: {
    countryCode: 'CZ',
    kind: 'address',
    limit: 5,
    q: 'Vaclavske namesti',
    tenantId: 'tenant-1',
  } satisfies typeof SmartSuggestQuerySchema.Type,
  suggestResponse: {
    cacheStatus: 'miss',
    providerEvents: [
      {
        latencyMs: 12,
        providerId: 'owned-db',
        status: 'success',
      },
    ],
    requestId: 'request-1',
    suggestions: [
      {
        address: {
          city: 'Praha',
          countryCode: 'CZ',
          line1: 'Vaclavske namesti 832/19',
          postalCode: '110 00',
          street: 'Vaclavske namesti',
        },
        confidence: 0.99,
        displayLabel: 'Vaclavske namesti 832/19, Praha',
        id: 'cz-ruian-vaclavske-namesti-832-19',
        kind: 'address',
        source: {
          id: 'ruian-cz',
          kind: 'owned-dataset',
          name: 'RUIAN CZ',
        },
      },
    ],
  } satisfies SmartSuggestResponse,
} as const;

export const smartSuggestContractInvalidProtocolFixtures = {
  lowercaseCountryCode: {
    countryCode: 'cz',
    kind: 'address',
    q: 'Praha',
  },
  mismatchedSuggestAliases: {
    kind: 'address',
    q: 'Praha',
    query: 'Brno',
  },
  missingSuggestAlias: {
    countryCode: 'CZ',
    kind: 'address',
  },
  oversizedLimit: {
    kind: 'address',
    limit: 21,
    q: 'Praha',
  },
  untrustedAcceptEvent: {
    requestId: 'request-1',
    suggestionId: 'suggestion-1',
  },
} satisfies Record<string, unknown>;
