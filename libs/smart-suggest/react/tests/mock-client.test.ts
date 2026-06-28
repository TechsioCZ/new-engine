import { describe, expect, it } from '@effect/vitest';
import { gen, succeed } from 'effect/Effect';

import { createMockSmartSuggestClient } from '../src/react';

describe('createMockSmartSuggestClient', () => {
  it.effect('returns deterministic mock suggestions', () =>
    gen(function* deterministicMockSuggestionsProgram() {
      const client = createMockSmartSuggestClient();
      const result = yield* client.suggest({ kind: 'address', query: 'Praha' });

      expect(result).toMatchObject({
        cacheStatus: 'disabled',
        requestId: 'mock-address',
        suggestions: [],
      });
    }),
  );

  it.effect('uses validation package behavior for phone and postal mocks', () =>
    gen(function* mockValidationProgram() {
      const client = createMockSmartSuggestClient();
      const phone = yield* client.validatePhone({
        defaultCountry: 'CZ',
        rawInput: 'not a phone',
      });
      const postal = yield* client.validatePostal({ countryCode: 'CZ', rawInput: '12345' });

      expect(phone).toMatchObject({
        errors: [expect.objectContaining({ code: 'phone.invalid_shape' })],
        isValid: false,
      });
      expect(postal).toMatchObject({
        displayValue: '12345',
        isValid: 'unknown',
      });
    }),
  );

  it.effect('allows method overrides', () =>
    gen(function* methodOverridesProgram() {
      const client = createMockSmartSuggestClient({
        suggest: () =>
          succeed({
            cacheStatus: 'hit',
            requestId: 'override',
            suggestions: [],
          }),
      });
      const result = yield* client.suggest({ kind: 'address', query: 'Praha' });

      expect(result).toMatchObject({ cacheStatus: 'hit', requestId: 'override' });
    }),
  );
});
